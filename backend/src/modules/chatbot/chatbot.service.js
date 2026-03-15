import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../config/database.js';
import { sendText } from '../../config/evolution.js';
import { getSettings } from '../settings/settings.service.js';
import { createOrder } from '../orders/orders.service.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Deduplication (prevent double-processing duplicate webhooks) ──────────────
const processedIds = new Map(); // messageId → timestamp
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isDuplicate(msgId) {
  if (processedIds.has(msgId)) return true;
  processedIds.set(msgId, Date.now());
  // Prune old entries
  if (processedIds.size > 1000) {
    const cutoff = Date.now() - DEDUP_TTL_MS;
    for (const [id, ts] of processedIds) {
      if (ts < cutoff) processedIds.delete(id);
    }
  }
  return false;
}

// ── Build catalog context string ──────────────────────────────────────────────
async function buildCatalogContext() {
  const products = await prisma.product.findMany({
    where: { status: true },
    include: { category: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  if (products.length === 0) return 'No products currently available.';

  return products.map(p => {
    const tiers = (p.pricingTiers ?? []);
    const priceLines = tiers.length > 0
      ? tiers.map(t => `  - ${t.label}: ₦${Number(t.price).toLocaleString()}${t.quantity ? ` (qty: ${t.quantity})` : ''}`).join('\n')
      : `  - Price: contact store`;

    const variations = (p.variations ?? []);
    const varLines = variations.length > 0
      ? `  Variations: ${variations.map(v => v.name).join(', ')}`
      : '';

    const pm = p.paymentMethod === 'COD' ? 'Cash on Delivery'
             : p.paymentMethod === 'PBD' ? 'Pay Before Delivery'
             : 'COD or Pay Before Delivery';

    return [
      `Product: ${p.name} (ID: ${p.id})`,
      `  Category: ${p.category?.name ?? 'Uncategorised'}`,
      priceLines,
      varLines,
      `  Payment: ${pm}`,
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}

// ── Load / create conversation ────────────────────────────────────────────────
async function getConversation(phone, pushName) {
  const conv = await prisma.chatbotConversation.upsert({
    where: { phone },
    update: pushName ? { pushName, lastMessageAt: new Date() } : { lastMessageAt: new Date() },
    create: { phone, pushName: pushName ?? null, messages: [] },
  });
  // Keep last 40 messages in memory context (last 20 turns)
  const messages = Array.isArray(conv.messages) ? conv.messages.slice(-40) : [];
  return { conv, messages };
}

// ── Save updated messages ─────────────────────────────────────────────────────
async function saveMessages(phone, messages) {
  // Trim to last 60 for storage, but only send last 40 to Claude
  const trimmed = messages.slice(-60);
  await prisma.chatbotConversation.update({
    where: { phone },
    data: { messages: trimmed, lastMessageAt: new Date() },
  });
}

// ── Tool definitions for Claude ───────────────────────────────────────────────
const TOOLS = [
  {
    name: 'create_order',
    description: 'Create an order in the CRM when you have collected all required customer details. Required: customerName, customerPhone, address, state, and at least one item.',
    input_schema: {
      type: 'object',
      properties: {
        customerName:  { type: 'string', description: 'Full name of the customer' },
        customerPhone: { type: 'string', description: 'Customer phone number (the number they are messaging from)' },
        address:       { type: 'string', description: 'Delivery address' },
        state:         { type: 'string', description: 'Nigerian state for delivery' },
        city:          { type: 'string', description: 'City (optional)' },
        notes:         { type: 'string', description: 'Any special instructions or notes' },
        items: {
          type: 'array',
          description: 'Products ordered',
          items: {
            type: 'object',
            properties: {
              productId:   { type: 'string', description: 'Product ID from the catalog' },
              pricingTier: { type: 'string', description: 'Package/tier label chosen' },
              variation:   { type: 'string', description: 'Variation chosen (if applicable)' },
              quantity:    { type: 'integer', description: 'Quantity ordered', default: 1 },
              unitPrice:   { type: 'number', description: 'Unit price in NGN' },
            },
            required: ['productId', 'unitPrice'],
          },
        },
      },
      required: ['customerName', 'customerPhone', 'address', 'state', 'items'],
    },
  },
  {
    name: 'lookup_order',
    description: 'Look up the status of an existing order. Customer may provide an order number (e.g. ORD-001) or you can search by their phone number.',
    input_schema: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string', description: 'Order number like ORD-001' },
        phone:       { type: 'string', description: 'Customer phone number to search by' },
      },
    },
  },
  {
    name: 'notify_staff',
    description: 'Notify the business owner/staff when you cannot handle a query. Use when: customer asks for a human, question is outside your scope, or you are unsure how to proceed.',
    input_schema: {
      type: 'object',
      properties: {
        reason:  { type: 'string', description: 'Why you cannot handle this' },
        summary: { type: 'string', description: 'Brief summary of what the customer needs' },
      },
      required: ['reason', 'summary'],
    },
  },
];

// ── Execute a tool call ───────────────────────────────────────────────────────
async function executeTool(toolName, toolInput, phone, settings, instanceName) {
  if (toolName === 'create_order') {
    try {
      const items = (toolInput.items ?? []).map(i => ({
        productId:   i.productId,
        variation:   i.variation ?? null,
        pricingTier: i.pricingTier ?? null,
        quantity:    i.quantity ?? 1,
        unitPrice:   i.unitPrice,
        subtotal:    (i.unitPrice * (i.quantity ?? 1)),
      }));
      const totalAmount = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const order = await createOrder({
        customerName:  toolInput.customerName,
        customerPhone: toolInput.customerPhone ?? phone,
        address:       toolInput.address,
        state:         toolInput.state,
        city:          toolInput.city ?? null,
        notes:         toolInput.notes ?? null,
        source:        'whatsapp',
        totalAmount,
        items,
      }, null);
      return { success: true, orderNumber: order.orderNumber, totalAmount };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  if (toolName === 'lookup_order') {
    try {
      const where = {};
      if (toolInput.orderNumber) {
        where.orderNumber = { contains: toolInput.orderNumber, mode: 'insensitive' };
      } else if (toolInput.phone) {
        where.customerPhone = { contains: toolInput.phone.replace(/\D/g, '').slice(-10) };
      } else {
        where.customerPhone = { contains: phone.replace(/\D/g, '').slice(-10) };
      }
      const orders = await prisma.order.findMany({
        where: { ...where, status: { notIn: ['DELETED'] } },
        select: { orderNumber: true, status: true, totalAmount: true, createdAt: true, state: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });
      if (orders.length === 0) return { found: false };
      return {
        found: true,
        orders: orders.map(o => ({
          orderNumber: o.orderNumber,
          status:      o.status.replace(/_/g, ' '),
          amount:      `₦${Number(o.totalAmount).toLocaleString()}`,
          date:        o.createdAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
          state:       o.state,
        })),
      };
    } catch (e) {
      return { found: false, error: e.message };
    }
  }

  if (toolName === 'notify_staff') {
    const fallbackPhone = settings.chatbotFallbackPhone;
    if (fallbackPhone && instanceName) {
      const msg = `🤖 Chatbot handoff request\n\nCustomer: ${phone}\nReason: ${toolInput.reason}\nSummary: ${toolInput.summary}`;
      sendText(instanceName, fallbackPhone, msg).catch(e =>
        console.error('[Chatbot] Failed to notify staff:', e.message)
      );
    }
    console.log(`[Chatbot] Notify staff — customer: ${phone}, reason: ${toolInput.reason}`);
    return { notified: true };
  }

  return { error: `Unknown tool: ${toolName}` };
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function processMessage(phone, pushName, text, instanceName, messageId) {
  // Deduplication
  if (messageId && isDuplicate(messageId)) {
    console.log(`[Chatbot] Duplicate message ${messageId}, skipping`);
    return;
  }

  try {
    const [settings, catalog, { messages }] = await Promise.all([
      getSettings(),
      buildCatalogContext(),
      getConversation(phone, pushName),
    ]);

    // Build system prompt
    const basePrompt = `You are a helpful WhatsApp sales assistant for ${settings.storeName ?? 'this business'}.
You help customers learn about products, place orders, and check order status.
Always be friendly, professional, and concise — this is a WhatsApp chat, keep replies short and readable.
Use line breaks and simple formatting — no markdown headers or bullet lists with special characters.
The customer's phone number is: ${phone}

PRODUCT CATALOG (always use these exact IDs and prices):
${catalog}

ORDERING RULES:
- To place an order you need: customer's full name, delivery address, state, product choice and package
- Collect missing details naturally in conversation — do not ask for everything at once
- Once you have all required info, call create_order() immediately
- After placing an order, tell the customer their order number and that the team will follow up
- If payment is "Pay Before Delivery", let the customer know they will receive a payment link

ORDER LOOKUP:
- When asked about an order, call lookup_order() with the order number or their phone

FALLBACK:
- If you genuinely cannot help or the customer insists on speaking to a human, call notify_staff()
- Only discuss products and orders for this business — politely decline unrelated topics
${settings.chatbotSystemPrompt ? `\nADDITIONAL INSTRUCTIONS:\n${settings.chatbotSystemPrompt}` : ''}`;

    // Append new message
    const updatedMessages = [
      ...messages,
      { role: 'user', content: text },
    ];

    // Agentic loop — keep going until Claude stops calling tools
    let loopMessages = [...updatedMessages];
    let finalResponse = '';
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const response = await client.messages.create({
        model:      settings.chatbotModel ?? 'claude-sonnet-4-6',
        max_tokens: 1024,
        system:     basePrompt,
        tools:      TOOLS,
        messages:   loopMessages,
      });

      // Collect any text from this response
      const textBlock = response.content.find(b => b.type === 'text');
      if (textBlock) finalResponse = textBlock.text;

      // If no tool calls, we're done
      if (response.stop_reason !== 'tool_use') break;

      // Execute all tool calls and build the tool_result messages
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input, phone, settings, instanceName);
        toolResults.push({
          type:        'tool_result',
          tool_use_id: toolUse.id,
          content:     JSON.stringify(result),
        });
      }

      // Append assistant message + tool results to loop
      loopMessages = [
        ...loopMessages,
        { role: 'assistant', content: response.content },
        { role: 'user',      content: toolResults },
      ];
    }

    if (!finalResponse) {
      finalResponse = "I'm here to help! How can I assist you today?";
    }

    // Save the full turn (user message + assistant response) to DB
    const savedMessages = [
      ...updatedMessages,
      { role: 'assistant', content: finalResponse },
    ];
    await saveMessages(phone, savedMessages);

    // Send reply via Evolution API
    if (instanceName) {
      await sendText(instanceName, phone, finalResponse);
    }

    return finalResponse;
  } catch (e) {
    console.error('[Chatbot] processMessage error:', e.message);
    // Send a graceful fallback so customer isn't left hanging
    if (instanceName) {
      sendText(instanceName, phone, "Sorry, I'm having a moment! Our team will be in touch shortly.").catch(() => {});
    }
  }
}

// ── Admin: list conversations ─────────────────────────────────────────────────
export async function listConversations({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.chatbotConversation.findMany({
      skip, take: limit,
      orderBy: { lastMessageAt: 'desc' },
      select: {
        id: true, phone: true, pushName: true,
        lastMessageAt: true, messages: true, createdAt: true,
      },
    }),
    prisma.chatbotConversation.count(),
  ]);

  return {
    items: items.map(c => {
      const msgs = Array.isArray(c.messages) ? c.messages : [];
      const lastMsg = msgs[msgs.length - 1];
      return {
        ...c,
        messageCount: msgs.length,
        lastPreview: lastMsg ? String(lastMsg.content).slice(0, 100) : '',
        messages: undefined, // don't send full history in list
      };
    }),
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function getConversationMessages(phone) {
  const conv = await prisma.chatbotConversation.findUnique({ where: { phone } });
  if (!conv) return null;
  return conv;
}

export async function clearConversation(phone) {
  return prisma.chatbotConversation.update({
    where: { phone },
    data: { messages: [], lastMessageAt: new Date() },
  });
}
