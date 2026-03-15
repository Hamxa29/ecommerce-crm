import { prisma } from '../../config/database.js';
import { sendText } from '../../config/evolution.js';
import { parseGroupMessage } from './deliveryMonitor.parser.js';

// ── Extract text from Evolution API webhook body ───────────────────────────────
function extractText(data) {
  const msg = data.message ?? {};
  return (
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    msg.videoMessage?.caption ??
    ''
  );
}

// ── Resolve group display name from registered DeliveryGroup or use JID ───────
async function resolveGroupName(groupJid) {
  const group = await prisma.deliveryGroup.findUnique({
    where: { groupJid },
    select: { name: true },
  });
  return group?.name ?? groupJid;
}

// ── Find CRM order by order number or customer phone ─────────────────────────
async function findOrder(orderNumber, customerPhone) {
  if (orderNumber) {
    const order = await prisma.order.findFirst({
      where: { orderNumber: { equals: orderNumber, mode: 'insensitive' } },
      select: { id: true, orderNumber: true, customerName: true, customerPhone: true, totalAmount: true },
    });
    if (order) return order;
  }
  if (customerPhone) {
    const normalized = customerPhone.replace(/\D/g, '');
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { customerPhone: { contains: normalized } },
          { customerPhone: normalized },
        ],
        status: { in: ['CONFIRMED', 'AWAITING', 'SHIPPED', 'SCHEDULED'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true, customerName: true, customerPhone: true, totalAmount: true },
    });
    if (order) return order;
  }
  return null;
}

// ── Main entry: process a group message from the delivery-monitor instance ────
export async function processGroupMessage(body) {
  try {
    const event = body.event ?? body.type;
    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') return;

    const data = body.data ?? body;
    const key = data.key ?? {};

    // Skip outgoing messages
    if (key.fromMe === true) return;

    const groupJid = key.remoteJid ?? '';
    if (!groupJid.includes('@g.us')) return;

    // In groups, the actual sender is in key.participant
    const senderJid = key.participant ?? key.remoteJid ?? '';
    const senderName = data.pushName ?? null;
    const rawMessage = extractText(data).trim();
    if (!rawMessage) return;

    const instanceName = body.instance ?? body.instanceName ?? null;
    const groupName = await resolveGroupName(groupJid);

    // Only process messages from registered active groups
    const group = await prisma.deliveryGroup.findUnique({ where: { groupJid } });
    if (!group || !group.isActive) return;

    // Parse with Claude AI
    const parsed = await parseGroupMessage({ rawMessage, senderName, groupName });

    // Map AI type to enum
    const typeMap = {
      delivery: 'DELIVERY',
      remittance: 'REMITTANCE',
      follow_up: 'FOLLOW_UP',
      stock_update: 'STOCK_UPDATE',
      other: 'OTHER',
    };
    const messageType = typeMap[parsed.type] ?? 'OTHER';

    // Try to link to a CRM order
    let linkedOrder = null;
    if (parsed.orderNumber || parsed.customerPhone) {
      linkedOrder = await findOrder(parsed.orderNumber, parsed.customerPhone);
    }

    // Create DeliveryLog
    const log = await prisma.deliveryLog.create({
      data: {
        groupJid,
        senderJid,
        senderName,
        rawMessage,
        messageType,
        parsedData: parsed,
        orderId: linkedOrder?.id ?? null,
      },
    });

    // Handle based on type
    if (parsed.type === 'delivery') {
      await handleDelivery({ log, parsed, senderName, linkedOrder });
    } else if (parsed.type === 'remittance') {
      await handleRemittance({ log, parsed, senderName, groupJid, instanceName, group });
    } else if (parsed.type === 'stock_update') {
      await handleStockUpdate({ parsed, groupJid, senderName, rawMessage });
    }
    // follow_up from delivery-monitor instance: just log it (VersaCommerce handles DMs)

  } catch (e) {
    console.error('[DeliveryMonitor] processGroupMessage error:', e.message);
  }
}

// ── Handle delivery confirmation ───────────────────────────────────────────────
async function handleDelivery({ log, parsed, senderName, linkedOrder }) {
  await prisma.deliveryRecord.create({
    data: {
      logId: log.id,
      agentName: senderName ?? 'Unknown',
      orderNumber: parsed.orderNumber ?? linkedOrder?.orderNumber ?? null,
      orderId: linkedOrder?.id ?? null,
      amountCollected: parsed.amountCollected ? parseFloat(parsed.amountCollected) : null,
      deliveredAt: new Date(),
    },
  });
}

// ── Handle remittance claim — verify against logged deliveries ─────────────────
async function handleRemittance({ log, parsed, senderName, groupJid, instanceName, group }) {
  const agentName = senderName ?? 'Unknown';
  const claimed = parseFloat(parsed.totalAmount ?? 0);
  if (!claimed) return;

  // Sum all unremitted deliveries for this agent
  const unremitted = await prisma.deliveryRecord.findMany({
    where: { agentName, remitted: false },
    select: { id: true, amountCollected: true, orderNumber: true },
  });

  const calculated = unremitted.reduce(
    (sum, r) => sum + (r.amountCollected ? parseFloat(r.amountCollected) : 0),
    0,
  );

  const discrepancy = claimed - calculated;

  // Save remittance record
  const remittance = await prisma.remittanceRecord.create({
    data: {
      agentName,
      groupJid,
      claimedAmount: claimed,
      calculatedAmount: calculated,
      discrepancy,
      period: parsed.period ?? null,
    },
  });

  // Mark those delivery records as remitted
  if (unremitted.length > 0) {
    await prisma.deliveryRecord.updateMany({
      where: { id: { in: unremitted.map(r => r.id) } },
      data: { remitted: true, remittanceId: remittance.id },
    });
  }

  // Reply in the group
  if (instanceName) {
    const abs = Math.abs(discrepancy).toLocaleString('en-NG', { minimumFractionDigits: 2 });
    let reply;
    if (Math.abs(discrepancy) < 1) {
      reply = `✅ Verified: ₦${claimed.toLocaleString('en-NG', { minimumFractionDigits: 2 })} matches ${unremitted.length} recorded deliveries.`;
    } else if (discrepancy > 0) {
      reply = `⚠️ Discrepancy detected, ${agentName}:\nYou claimed ₦${claimed.toLocaleString('en-NG', { minimumFractionDigits: 2 })} but records show ₦${calculated.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.\nDifference: ₦${abs} (claimed more than recorded).`;
    } else {
      reply = `⚠️ Discrepancy detected, ${agentName}:\nYou claimed ₦${claimed.toLocaleString('en-NG', { minimumFractionDigits: 2 })} but records show ₦${calculated.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.\nDifference: ₦${abs} (recorded more than claimed).`;
    }
    try {
      await sendText(instanceName, groupJid, reply);
    } catch (e) {
      console.error('[DeliveryMonitor] Failed to send remittance reply:', e.message);
    }
  }
}

// ── Handle stock update ────────────────────────────────────────────────────────
async function handleStockUpdate({ parsed, groupJid, senderName, rawMessage }) {
  await prisma.stockUpdate.create({
    data: {
      groupJid,
      productName: parsed.productName ?? 'Unknown',
      quantity: parsed.quantity ?? null,
      note: parsed.note ?? null,
      rawMessage,
      postedBy: senderName ?? 'Unknown',
    },
  });
}

// ── Admin: register a delivery group ─────────────────────────────────────────
export async function createGroup({ groupJid, name, agentId }) {
  return prisma.deliveryGroup.upsert({
    where: { groupJid },
    update: { name, agentId: agentId ?? null, isActive: true },
    create: { groupJid, name, agentId: agentId ?? null },
  });
}

export async function listGroups() {
  return prisma.deliveryGroup.findMany({
    include: { agent: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function updateGroup(id, data) {
  return prisma.deliveryGroup.update({ where: { id }, data });
}

// ── Admin: list logs / deliveries / remittances / stock / follow-ups ──────────
export async function listLogs({ groupJid, type, page = 1, limit = 50 }) {
  const where = {};
  if (groupJid) where.groupJid = groupJid;
  if (type) where.messageType = type;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.deliveryLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { order: { select: { orderNumber: true, customerName: true } } },
    }),
    prisma.deliveryLog.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function listDeliveries({ agentName, remitted, page = 1, limit = 50 }) {
  const where = {};
  if (agentName) where.agentName = { contains: agentName, mode: 'insensitive' };
  if (remitted !== undefined) where.remitted = remitted;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.deliveryRecord.findMany({
      where,
      orderBy: { deliveredAt: 'desc' },
      skip,
      take: limit,
      include: { order: { select: { orderNumber: true, customerName: true, totalAmount: true } } },
    }),
    prisma.deliveryRecord.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function listRemittances({ agentName, page = 1, limit = 50 }) {
  const where = agentName ? { agentName: { contains: agentName, mode: 'insensitive' } } : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.remittanceRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.remittanceRecord.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function listStock({ groupJid, page = 1, limit = 50 }) {
  const where = groupJid ? { groupJid } : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.stockUpdate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.stockUpdate.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function listFollowUps({ resolved, page = 1, limit = 50 }) {
  const where = {};
  if (resolved === false) where.resolvedAt = null;
  if (resolved === true) where.resolvedAt = { not: null };
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.followUpAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { order: { select: { orderNumber: true, customerName: true, customerPhone: true, totalAmount: true } } },
    }),
    prisma.followUpAlert.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function resolveFollowUp(id) {
  return prisma.followUpAlert.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });
}

export async function getAgentReport(agentName) {
  const [deliveries, remittances] = await Promise.all([
    prisma.deliveryRecord.findMany({
      where: { agentName: { contains: agentName, mode: 'insensitive' } },
      orderBy: { deliveredAt: 'desc' },
      include: { order: { select: { orderNumber: true, customerName: true, totalAmount: true } } },
    }),
    prisma.remittanceRecord.findMany({
      where: { agentName: { contains: agentName, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalDelivered = deliveries.length;
  const totalCollected = deliveries.reduce((s, d) => s + (d.amountCollected ? parseFloat(d.amountCollected) : 0), 0);
  const totalRemitted = remittances.reduce((s, r) => s + parseFloat(r.claimedAmount), 0);
  const pendingDeliveries = deliveries.filter(d => !d.remitted);
  const pendingAmount = pendingDeliveries.reduce((s, d) => s + (d.amountCollected ? parseFloat(d.amountCollected) : 0), 0);

  return {
    agentName,
    totalDeliveries: totalDelivered,
    totalCollected,
    totalRemitted,
    pendingRemittance: pendingAmount,
    pendingDeliveries: pendingDeliveries.length,
    deliveries,
    remittances,
  };
}
