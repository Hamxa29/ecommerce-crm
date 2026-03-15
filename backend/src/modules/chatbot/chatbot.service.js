import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { prisma } from '../../config/database.js';
import { sendText } from '../../config/evolution.js';
import { getSettings } from '../settings/settings.service.js';
import { createOrder } from '../orders/orders.service.js';

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
  // Trim to last 60 for storage, but only send last 40 to AI
  const trimmed = messages.slice(-60);
  await prisma.chatbotConversation.update({
    where: { phone },
    data: { messages: trimmed, lastMessageAt: new Date() },
  });
}

// ── Tool definitions ──────────────────────────────────────────────────────────
// Anthropic format
const ANTHROPIC_TOOLS = [
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

// OpenAI format (function calling)
const OPENAI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_order',
      description: 'Create an order in the CRM when you have collected all required customer details.',
      parameters: {
        type: 'object',
        properties: {
          customerName:  { type: 'string' },
          customerPhone: { type: 'string' },
          address:       { type: 'string' },
          state:         { type: 'string' },
          city:          { type: 'string' },
          notes:         { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId:   { type: 'string' },
                pricingTier: { type: 'string' },
                variation:   { type: 'string' },
                quantity:    { type: 'integer' },
                unitPrice:   { type: 'number' },
              },
              required: ['productId', 'unitPrice'],
            },
          },
        },
        required: ['customerName', 'customerPhone', 'address', 'state', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_order',
      description: 'Look up the status of an existing order by order number or phone.',
      parameters: {
        type: 'object',
        properties: {
          orderNumber: { type: 'string' },
          phone:       { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'notify_staff',
      description: 'Notify staff when the bot cannot handle a query.',
      parameters: {
        type: 'object',
        properties: {
          reason:  { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['reason', 'summary'],
      },
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

// ── Key helpers ───────────────────────────────────────────────────────────────
function getAnthropicKey(settings) {
  return settings.chatbotAnthropicKey || process.env.ANTHROPIC_API_KEY;
}
function getOpenaiKey(settings) {
  return settings.chatbotOpenaiKey || process.env.OPENAI_API_KEY;
}

// ── Detect credit/quota exhaustion errors ─────────────────────────────────────
function isCreditExhausted(err) {
  const msg  = (err.message ?? '').toLowerCase();
  const code = err.status ?? err.statusCode ?? 0;
  return code === 401 || code === 402 || code === 429
    || msg.includes('credit') || msg.includes('quota')
    || msg.includes('billing') || msg.includes('insufficient')
    || msg.includes('overloaded') || msg.includes('rate limit');
}

// ── Anthropic agentic loop ────────────────────────────────────────────────────
async function runAnthropicLoop(systemPrompt, messages, model, phone, settings, instanceName) {
  const apiKey = getAnthropicKey(settings);
  const anthropic = new Anthropic({ apiKey });
  let loopMessages = [...messages];
  let finalResponse = '';
  const MAX_ITERATIONS = 5;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const resolvedModel = (model && model !== 'claude-sonnet-4-6') ? model : 'claude-sonnet-4-6';
    const response = await anthropic.messages.create({
      model:      resolvedModel,
      max_tokens: 1024,
      system:     systemPrompt,
      tools:      ANTHROPIC_TOOLS,
      messages:   loopMessages,
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (textBlock) finalResponse = textBlock.text;

    if (response.stop_reason !== 'tool_use') break;

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

    loopMessages = [
      ...loopMessages,
      { role: 'assistant', content: response.content },
      { role: 'user',      content: toolResults },
    ];
  }

  return finalResponse || "I'm here to help! How can I assist you today?";
}

// ── OpenAI agentic loop ───────────────────────────────────────────────────────
async function runOpenAILoop(systemPrompt, messages, model, phone, settings, instanceName) {
  const apiKey = getOpenaiKey(settings);
  const openai = new OpenAI({ apiKey });
  // Convert Anthropic-style messages to OpenAI format (they're compatible for simple text messages)
  let loopMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role:    m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
  ];
  let finalResponse = '';
  const MAX_ITERATIONS = 5;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const resolvedModel = (model && model !== 'claude-sonnet-4-6') ? model : 'gpt-4o-mini';
    const response = await openai.chat.completions.create({
      model:      resolvedModel,
      max_tokens: 1024,
      tools:      OPENAI_TOOLS,
      messages:   loopMessages,
    });

    const choice = response.choices[0];
    const assistantMsg = choice.message;

    if (assistantMsg.content) finalResponse = assistantMsg.content;

    if (choice.finish_reason !== 'tool_calls' || !assistantMsg.tool_calls?.length) break;

    // Append assistant message with tool calls
    loopMessages.push(assistantMsg);

    // Execute each tool call and append results
    for (const tc of assistantMsg.tool_calls) {
      let toolInput;
      try { toolInput = JSON.parse(tc.function.arguments); } catch { toolInput = {}; }
      const result = await executeTool(tc.function.name, toolInput, phone, settings, instanceName);
      loopMessages.push({
        role:         'tool',
        tool_call_id: tc.id,
        content:      JSON.stringify(result),
      });
    }
  }

  return finalResponse || "I'm here to help! How can I assist you today?";
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

    const provider = settings.chatbotProvider ?? 'anthropic';

    // Build system prompt
    const systemPrompt = `You are a helpful WhatsApp sales assistant for ${settings.storeName ?? 'this business'}.
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

    let finalResponse;
    const model = settings.chatbotModel;
    try {
      if (provider === 'openai') {
        finalResponse = await runOpenAILoop(systemPrompt, updatedMessages, model, phone, settings, instanceName);
      } else {
        finalResponse = await runAnthropicLoop(systemPrompt, updatedMessages, model, phone, settings, instanceName);
      }
    } catch (primaryErr) {
      if (isCreditExhausted(primaryErr)) {
        console.warn(`[Chatbot] ${provider} failed (${primaryErr.message}) — switching to fallback provider`);
        try {
          if (provider === 'openai') {
            finalResponse = await runAnthropicLoop(systemPrompt, updatedMessages, model, phone, settings, instanceName);
          } else {
            finalResponse = await runOpenAILoop(systemPrompt, updatedMessages, model, phone, settings, instanceName);
          }
        } catch (fallbackErr) {
          console.error('[Chatbot] Fallback provider also failed:', fallbackErr.message);
          throw fallbackErr;
        }
      } else {
        throw primaryErr;
      }
    }

    // Save the full turn to DB
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
    if (instanceName) {
      // Real WhatsApp message — send graceful fallback to customer
      sendText(instanceName, phone, "Sorry, I'm having a moment! Our team will be in touch shortly.").catch(() => {});
    } else {
      // Test mode — re-throw so the caller can surface the real error
      throw e;
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
