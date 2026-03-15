import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { sendText } from '../config/evolution.js';
import { normalizePhone } from '../utils/phoneNormalizer.js';

export function startScheduledRemindersJob() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      await processReminders();
    } catch (err) {
      console.error('[Reminders] Job error:', err.message);
    }
  });
  console.log('[Reminders] Scheduled reminders job started');
}

async function processReminders() {
  const now = new Date();

  const orders = await prisma.order.findMany({
    where: {
      status: 'SCHEDULED',
      reminderEnabled: true,
      reminderSentAt: null,
      scheduledDate: { not: null },
    },
  });

  if (orders.length === 0) return;

  const account = await prisma.whatsappAccount.findFirst({
    where: { status: 'CONNECTED' },
  });
  if (!account) {
    console.log('[Reminders] No connected WhatsApp account, skipping');
    return;
  }

  for (const order of orders) {
    const triggerTime = new Date(order.scheduledDate.getTime() - order.reminderOffset * 60 * 1000);
    if (now < triggerTime) continue;

    const scheduledStr = order.scheduledDate.toLocaleString('en-NG', {
      timeZone: 'Africa/Lagos',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const message = `Hi ${order.customerName}, this is a reminder that your order *#${order.orderNumber}* is scheduled for delivery on *${scheduledStr}*.\n\nPlease ensure someone is available to receive it.\n\nThank you! 🙏`;

    try {
      await sendText(account.instanceName, order.customerPhone, message);

      await prisma.whatsappMessageLog.create({
        data: {
          accountId: account.id,
          orderId: order.id,
          toPhone: normalizePhone(order.customerPhone),
          message,
          status: 'sent',
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { reminderSentAt: now },
      });

      console.log(`[Reminders] Sent reminder for order ${order.orderNumber}`);
    } catch (err) {
      console.error(`[Reminders] Failed for ${order.orderNumber}:`, err.message);
    }
  }
}
