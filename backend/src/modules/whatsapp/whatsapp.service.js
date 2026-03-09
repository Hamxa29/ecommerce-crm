import { prisma } from '../../config/database.js';
import { sendText, sendMedia, getConnectionState, getQRCode, createInstance, logoutInstance } from '../../config/evolution.js';
import { applyTemplate } from '../../utils/templateEngine.js';
import { normalizePhone } from '../../utils/phoneNormalizer.js';

// ── Accounts ─────────────────────────────────────────────────────────────────

export async function listAccounts() {
  return prisma.whatsappAccount.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createAccount(instanceName, displayName) {
  // If already in our DB, just return it (idempotent)
  const existing = await prisma.whatsappAccount.findUnique({ where: { instanceName } });
  if (existing) return existing;

  // Try to create in Evolution API; ignore 403 (instance already exists there)
  // Axios v1 stores status on both err.response?.status AND err.status
  try {
    await createInstance(instanceName);
  } catch (err) {
    const status = err.response?.status ?? err.status;
    if (status !== 403) throw err;
    // 403 = instance already exists in Evolution API, safe to continue
  }

  return prisma.whatsappAccount.create({
    data: {
      instanceName,
      displayName: displayName || instanceName,
      phoneNumber: '',
      status: 'DISCONNECTED',
    },
  });
}

export async function getAccountQR(id) {
  const account = await prisma.whatsappAccount.findUniqueOrThrow({ where: { id } });
  const qrData = await getQRCode(account.instanceName);
  return qrData;
}

export async function refreshAccountState(id) {
  const account = await prisma.whatsappAccount.findUniqueOrThrow({ where: { id } });
  const state = await getConnectionState(account.instanceName);

  const status = state === 'open' ? 'CONNECTED'
    : state === 'connecting' ? 'CONNECTING'
    : 'DISCONNECTED';

  await prisma.whatsappAccount.update({ where: { id }, data: { status } });
  return { state, status };
}

export async function deleteAccount(id) {
  const account = await prisma.whatsappAccount.findUniqueOrThrow({ where: { id } });
  try { await logoutInstance(account.instanceName); } catch (_) { /* ignore */ }
  return prisma.whatsappAccount.delete({ where: { id } });
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function listTemplates(accountId) {
  return prisma.whatsappTemplate.findMany({
    where: accountId ? { accountId } : undefined,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createTemplate(data) {
  return prisma.whatsappTemplate.create({ data });
}

export async function updateTemplate(id, data) {
  return prisma.whatsappTemplate.update({ where: { id }, data });
}

export async function deleteTemplate(id) {
  return prisma.whatsappTemplate.delete({ where: { id } });
}

// ── Automation ───────────────────────────────────────────────────────────────

export async function listAutomation() {
  return prisma.whatsappAutomation.findMany({
    include: { account: { select: { displayName: true, instanceName: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAutomation(data) {
  return prisma.whatsappAutomation.create({ data });
}

export async function updateAutomation(id, data) {
  return prisma.whatsappAutomation.update({ where: { id }, data });
}

export async function deleteAutomation(id) {
  return prisma.whatsappAutomation.delete({ where: { id } });
}

// ── Send / Broadcast ─────────────────────────────────────────────────────────

export async function sendSingleMessage({ accountId, phone, message, mediaUrl, mediaType }) {
  const account = await prisma.whatsappAccount.findUniqueOrThrow({ where: { id: accountId } });

  let result;
  if (mediaUrl) {
    result = await sendMedia(account.instanceName, phone, message, mediaUrl, mediaType ?? 'image');
  } else {
    result = await sendText(account.instanceName, phone, message);
  }

  await prisma.whatsappMessageLog.create({
    data: {
      accountId,
      toPhone: normalizePhone(phone),
      message,
      mediaUrl,
      evolutionMsgId: result?.key?.id,
    },
  });

  return result;
}

export async function sendBroadcast({ accountId, orderIds, templateId, customMessage, mediaUrl }) {
  const account = await prisma.whatsappAccount.findUniqueOrThrow({ where: { id: accountId } });
  const template = templateId
    ? await prisma.whatsappTemplate.findUnique({ where: { id: templateId } })
    : null;

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: { items: { include: { product: true } }, agent: true },
  });

  const results = [];

  for (const order of orders) {
    const msgTemplate = template?.content ?? customMessage ?? '';
    const msg = applyTemplate(msgTemplate, {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      orderNumber: order.orderNumber,
      state: order.state,
      productName: order.items[0]?.product?.name ?? '',
      price: order.totalAmount,
      brandName: '',
      brandPhone: '',
      assignedStaffName: '',
    });

    const useMediaUrl = mediaUrl || template?.mediaUrl;
    const useMediaType = template?.mediaType ?? 'image';

    try {
      let evResult;
      if (useMediaUrl) {
        evResult = await sendMedia(account.instanceName, order.customerPhone, msg, useMediaUrl, useMediaType);
      } else {
        evResult = await sendText(account.instanceName, order.customerPhone, msg);
      }

      await prisma.whatsappMessageLog.create({
        data: {
          accountId,
          orderId: order.id,
          toPhone: normalizePhone(order.customerPhone),
          message: msg,
          mediaUrl: useMediaUrl,
          evolutionMsgId: evResult?.key?.id,
        },
      });

      results.push({ orderId: order.id, success: true });
    } catch (err) {
      await prisma.whatsappMessageLog.create({
        data: {
          accountId,
          orderId: order.id,
          toPhone: normalizePhone(order.customerPhone),
          message: msg,
          status: 'failed',
          errorMessage: err.message,
        },
      });
      results.push({ orderId: order.id, success: false, error: err.message });
    }

    // Delay between sends
    await new Promise(r => setTimeout(r, account.broadcastDelay ?? 3000));
  }

  return results;
}

export async function getLogs({ accountId, page = 1, limit = 50 }) {
  const skip = (page - 1) * limit;
  const where = accountId ? { accountId } : {};

  const [data, total] = await Promise.all([
    prisma.whatsappMessageLog.findMany({
      where,
      include: { order: { select: { orderNumber: true, customerName: true } } },
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.whatsappMessageLog.count({ where }),
  ]);

  return { data, pagination: { total, page, totalPages: Math.ceil(total / limit) } };
}

// ── Automation trigger (called from orders service) ──────────────────────────

export async function triggerAutomationForOrder(order, newStatus) {
  const rules = await prisma.whatsappAutomation.findMany({
    where: { triggerStatus: newStatus, enabled: true },
  });

  for (const rule of rules) {
    if (rule.delayMinutes === 0) {
      try {
        await sendBroadcast({
          accountId: rule.accountId,
          orderIds: [order.id],
          templateId: rule.templateId,
          customMessage: rule.customMessage,
          mediaUrl: rule.mediaUrl,
        });
      } catch (err) {
        console.error('[Automation] Failed to send:', err.message);
      }
    }
    // Delayed sends handled by job runner (future)
  }
}
