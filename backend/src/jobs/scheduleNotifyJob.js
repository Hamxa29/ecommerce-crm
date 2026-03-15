import { prisma } from '../config/database.js';
import { sendText } from '../config/evolution.js';
import { normalizePhone } from '../utils/phoneNormalizer.js';

/**
 * Notifies the staff member who scheduled the order via WhatsApp.
 * (Delivery agents receive their daily digest separately each morning.)
 * Called immediately when an order is marked SCHEDULED.
 */
export async function notifyScheduled(order, actorId) {
  if (!actorId) return;

  const staff = await prisma.user.findUnique({
    where: { id: actorId },
    select: { name: true, whatsappPhone: true },
  });
  if (!staff?.whatsappPhone) return;

  const account = await prisma.whatsappAccount.findFirst({
    where: { status: 'CONNECTED' },
  });
  if (!account) return;

  // Fetch full order details
  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: { include: { product: { select: { name: true } } } },
      agent: { select: { name: true } },
    },
  });
  if (!fullOrder) return;

  const scheduledStr = fullOrder.scheduledDate
    ? new Date(fullOrder.scheduledDate).toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Not set';

  const productLines = fullOrder.items.length
    ? fullOrder.items.map(i => `  • ${i.product.name} x${i.quantity} @ ₦${Number(i.unitPrice).toLocaleString()}`).join('\n')
    : '  • (no items recorded)';

  const msg = `✅ *Order Scheduled Successfully*

📦 *Order #${fullOrder.orderNumber}*

👤 *Customer:* ${fullOrder.customerName}
📞 *Phone:* ${fullOrder.customerPhone}${fullOrder.customerPhone2 ? ` / ${fullOrder.customerPhone2}` : ''}
📍 *Address:* ${fullOrder.address}, ${fullOrder.city ? fullOrder.city + ', ' : ''}${fullOrder.state}

🛍️ *Products:*
${productLines}

💰 *Total:* ₦${Number(fullOrder.totalAmount).toLocaleString()}
🤝 *Delivery Agent:* ${fullOrder.agent?.name ?? 'Not assigned'}

📅 *Scheduled for:* ${scheduledStr}`;

  try {
    const phone = normalizePhone(staff.whatsappPhone);
    await sendText(account.instanceName, phone, msg);
    await prisma.whatsappMessageLog.create({
      data: {
        accountId: account.id,
        orderId: fullOrder.id,
        toPhone: phone,
        message: msg,
        status: 'sent',
      },
    });
    console.log(`[ScheduleNotify] Sent confirmation to staff ${staff.name} for order ${fullOrder.orderNumber}`);
  } catch (err) {
    console.error(`[ScheduleNotify] Failed for staff ${staff.name}:`, err.message);
  }
}
