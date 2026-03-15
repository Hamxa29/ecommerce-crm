import { prisma } from '../../config/database.js';
import { sendText, sendMedia, getConnectionState, getQRCode, createInstance, logoutInstance } from '../../config/evolution.js';
import { applyTemplate } from '../../utils/templateEngine.js';
import { normalizePhone } from '../../utils/phoneNormalizer.js';

// ── Accounts ─────────────────────────────────────────────────────────────────

export async function listAccounts() {
  return prisma.whatsappAccount.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getQRByName(instanceName) {
  try {
    return await getQRCode(instanceName);
  } catch (err) {
    const status = err.response?.status ?? err.status;
    if (status === 404) {
      // Evolution API returns 404 when instance is already connected (no QR needed)
      return { status: 'already_connected' };
    }
    throw err;
  }
}

export async function createAccount(instanceName, displayName) {
  // If already in our DB, just return it (idempotent)
  const existing = await prisma.whatsappAccount.findUnique({ where: { instanceName } });
  if (existing) return existing;

  // Attempt to create instance in Evolution API — ignore ALL errors.
  // The instance likely already exists (403) or API is temporarily unavailable.
  // Any real connectivity issues surface when user clicks "Scan QR".
  try { await createInstance(instanceName); } catch (_) { /* ignore */ }

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
  try {
    return await getQRCode(account.instanceName);
  } catch (err) {
    const status = err.response?.status ?? err.status;
    if (status === 404) return { status: 'already_connected' };
    throw err;
  }
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

  const settings = await prisma.storeSettings.findUnique({ where: { id: 'singleton' } });
  const brandName  = settings?.storeName ?? '';
  const brandPhone = settings?.brandPhone ?? '';

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: { items: { include: { product: true } }, agent: true, assignedStaff: { select: { name: true } } },
  });

  const results = [];

  for (const order of orders) {
    const msgTemplate = template?.content ?? customMessage ?? '';
    const msg = applyTemplate(msgTemplate, {
      customerName:      order.customerName,
      customerPhone:     order.customerPhone,
      orderNumber:       order.orderNumber,
      state:             order.state,
      productName:       order.items[0]?.product?.name ?? '',
      price:             order.totalAmount,
      brandName,
      brandPhone,
      assignedStaffName: order.assignedStaff?.name ?? '',
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
  if (rules.length === 0) return;

  // Fetch brand details from store settings once
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'singleton' } });
  const brandName  = settings?.storeName ?? '';
  const brandPhone = settings?.brandPhone ?? '';

  for (const rule of rules) {
    const execute = async () => {
      try {
        const account = await prisma.whatsappAccount.findUnique({ where: { id: rule.accountId } });
        if (!account || account.status !== 'CONNECTED') {
          console.warn(`[Automation] Account ${rule.accountId} not connected, skipping`);
          return;
        }

        const template = rule.templateId
          ? await prisma.whatsappTemplate.findUnique({ where: { id: rule.templateId } })
          : null;

        const msgTemplate = template?.content ?? rule.customMessage ?? '';
        if (!msgTemplate) return;

        const msg = applyTemplate(msgTemplate, {
          customerName:      order.customerName,
          customerPhone:     order.customerPhone,
          orderNumber:       order.orderNumber,
          state:             order.state,
          productName:       order.items?.[0]?.product?.name ?? '',
          price:             order.totalAmount,
          brandName,
          brandPhone,
          assignedStaffName: order.assignedStaff?.name ?? '',
          formlink:          '',
        });

        const phone = normalizePhone(order.customerPhone);
        if (template?.mediaUrl) {
          await sendMedia(account.instanceName, phone, msg, template.mediaUrl, template.mediaType ?? 'image');
        } else {
          await sendText(account.instanceName, phone, msg);
        }

        await prisma.whatsappMessageLog.create({
          data: {
            accountId: rule.accountId,
            orderId:   order.id,
            toPhone:   phone,
            message:   msg,
            status:    'sent',
          },
        });

        await prisma.whatsappAutomation.update({
          where: { id: rule.id },
          data: { sentCount: { increment: 1 } },
        });

        console.log(`[Automation] Sent to ${phone} for order ${order.orderNumber} (status: ${newStatus})`);
      } catch (err) {
        console.error('[Automation] Failed to send:', err.message);
      }
    };

    if (rule.delayMinutes === 0) {
      await execute();
    } else {
      setTimeout(execute, rule.delayMinutes * 60 * 1000);
      console.log(`[Automation] Rule ${rule.id} scheduled in ${rule.delayMinutes} min for order ${order.orderNumber}`);
    }
  }
}
