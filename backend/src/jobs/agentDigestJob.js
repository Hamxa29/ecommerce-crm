import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { sendText } from '../config/evolution.js';
import { normalizePhone } from '../utils/phoneNormalizer.js';

export function startAgentDigestJob() {
  // Run every hour at :00 minutes, check if it's time to send the digest
  cron.schedule('0 * * * *', async () => {
    try {
      const settings = await prisma.storeSettings.findUnique({ where: { id: 'singleton' } });
      if (!settings?.agentDigestEnabled) return;

      const nowHour = new Date().toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos', hour: 'numeric', hour12: false,
      });

      if (Number(nowHour) !== settings.agentDigestHour) return;

      await sendStaffDigests(settings.agentDigestDelayMin ?? 2);
    } catch (err) {
      console.error('[StaffDigest] Job error:', err.message);
    }
  });
  console.log('[StaffDigest] Staff digest job started (checks hourly)');
}

export async function sendStaffDigests(delayMinutes = 2) {
  const account = await prisma.whatsappAccount.findFirst({
    where: { status: 'CONNECTED' },
  });
  if (!account) {
    console.log('[StaffDigest] No connected WhatsApp account, skipping');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all scheduled orders for today with an assigned staff member who has a WhatsApp number
  const orders = await prisma.order.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledDate: { gte: today, lt: tomorrow },
      assignedStaffId: { not: null },
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      agent: { select: { name: true } },
      assignedStaff: { select: { id: true, name: true, whatsappPhone: true } },
    },
    orderBy: { scheduledDate: 'asc' },
  });

  if (orders.length === 0) {
    console.log('[StaffDigest] No scheduled orders for today');
    return;
  }

  // Group by staff member
  const byStaff = {};
  for (const order of orders) {
    if (!order.assignedStaff?.whatsappPhone) continue;
    const key = order.assignedStaff.id;
    if (!byStaff[key]) byStaff[key] = { staff: order.assignedStaff, orders: [] };
    byStaff[key].orders.push(order);
  }

  if (Object.keys(byStaff).length === 0) {
    console.log('[StaffDigest] No staff with WhatsApp numbers assigned to today\'s orders');
    return;
  }

  const delayMs = delayMinutes * 60 * 1000;

  for (const { staff, orders: staffOrders } of Object.values(byStaff)) {
    const phone = normalizePhone(staff.whatsappPhone);
    const orderLines = staffOrders.map((o, idx) => {
      const time = o.scheduledDate
        ? new Date(o.scheduledDate).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' })
        : '—';
      const products = o.items.map(i => `${i.product.name} x${i.quantity}`).join(', ');
      const agentLine = o.agent ? `\n   🚚 Agent: ${o.agent.name}` : '';
      return `${idx + 1}. *#${o.orderNumber}* | ${o.customerName} | ${o.customerPhone}\n   📍 ${o.address}, ${o.state}\n   🛍️ ${products}\n   💰 ₦${Number(o.totalAmount).toLocaleString()} | 🕐 ${time}${agentLine}`;
    }).join('\n\n');

    const msg = `📋 *Good morning ${staff.name}!*\n\nYou have *${staffOrders.length}* order${staffOrders.length !== 1 ? 's' : ''} scheduled for delivery today:\n\n${orderLines}\n\nPlease follow up on all deliveries. Have a great day! 🚀`;

    try {
      await sendText(account.instanceName, phone, msg);
      await prisma.whatsappMessageLog.create({
        data: {
          accountId: account.id,
          toPhone: phone,
          message: msg,
          status: 'sent',
        },
      });
      console.log(`[StaffDigest] Sent digest to staff ${staff.name} (${phone}) — ${staffOrders.length} orders`);
    } catch (err) {
      console.error(`[StaffDigest] Failed for staff ${staff.name}:`, err.message);
    }

    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }
}
