import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { sendText } from '../config/evolution.js';
import { applyTemplate } from '../utils/templateEngine.js';
import { normalizePhone } from '../utils/phoneNormalizer.js';

export function startPendingOrderJob() {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await processPendingReminders();
      await processPendingAutoDelete();
    } catch (err) {
      console.error('[PendingOrders] Job error:', err.message);
    }
  });

  console.log('[Scheduler] Pending order job started (checks hourly)');
}

async function processPendingReminders() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'singleton' } });
  if (!settings?.pendingReminderEnabled) return;

  const { pendingReminderDays = 3, pendingReminderAccountId, pendingReminderMessage } = settings;
  if (!pendingReminderAccountId || !pendingReminderMessage) return;

  const account = await prisma.whatsappAccount.findUnique({ where: { id: pendingReminderAccountId } });
  if (!account || account.status !== 'CONNECTED') {
    console.log('[PendingOrders] Reminder account not connected, skipping');
    return;
  }

  const cutoff = new Date(Date.now() - pendingReminderDays * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      pendingReminderSentAt: null,
      createdAt: { lte: cutoff },
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      assignedStaff: { select: { name: true } },
    },
  });

  if (orders.length === 0) return;

  const brandName  = settings.storeName  ?? '';
  const brandPhone = settings.brandPhone ?? '';

  for (const order of orders) {
    try {
      const phone = normalizePhone(order.customerPhone);
      const msg = applyTemplate(pendingReminderMessage, {
        customerName:      order.customerName,
        customerPhone:     phone,
        orderNumber:       order.orderNumber,
        state:             order.state,
        productName:       order.items[0]?.product?.name ?? '',
        price:             order.totalAmount,
        brandName,
        brandPhone,
        assignedStaffName: order.assignedStaff?.name ?? '',
        formlink:          '',
      });

      await sendText(account.instanceName, phone, msg);

      await prisma.order.update({
        where: { id: order.id },
        data: { pendingReminderSentAt: new Date() },
      });

      await prisma.whatsappMessageLog.create({
        data: {
          accountId: account.id,
          orderId:   order.id,
          toPhone:   phone,
          message:   msg,
          status:    'sent',
        },
      });

      console.log(`[PendingOrders] Reminder sent for order ${order.orderNumber}`);
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`[PendingOrders] Failed for ${order.orderNumber}:`, err.message);
    }
  }
}

async function processPendingAutoDelete() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'singleton' } });
  if (!settings?.pendingAutoDeleteEnabled) return;

  const days = settings.pendingAutoDeleteDays ?? 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await prisma.order.updateMany({
    where: {
      status: 'PENDING',
      createdAt: { lte: cutoff },
    },
    data: { status: 'DELETED' },
  });

  if (result.count > 0) {
    console.log(`[PendingOrders] Auto-deleted ${result.count} stale pending orders (>${days} days old)`);
  }
}
