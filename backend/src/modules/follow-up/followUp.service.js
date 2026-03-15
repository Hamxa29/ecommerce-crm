import { prisma } from '../../config/database.js';
import { sendText } from '../../config/evolution.js';
import { parseGroupMessage } from '../delivery-monitor/deliveryMonitor.parser.js';
import { getSettings } from '../settings/settings.service.js';
import { normalizePhone } from '../../utils/phoneNormalizer.js';

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

// ── Find order by number or phone ─────────────────────────────────────────────
async function findOrder(orderNumber, customerPhone, customerName) {
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
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true, customerName: true, customerPhone: true, totalAmount: true },
    });
    if (order) return order;
  }
  if (customerName) {
    const order = await prisma.order.findFirst({
      where: { customerName: { contains: customerName, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true, customerName: true, customerPhone: true, totalAmount: true },
    });
    if (order) return order;
  }
  return null;
}

// ── Build DM message to send to customer ─────────────────────────────────────
function buildCustomerDm({ issue, order, settings }) {
  const brandName = settings.storeName ?? 'us';
  const brandPhone = settings.whatsappNumber ?? settings.phoneNumber ?? '';
  const name = order?.customerName ?? 'there';

  if (issue === 'SWITCHED_OFF') {
    return `Hi ${name}, this is ${brandName}. We tried to reach you today regarding your delivery but your number appears to be switched off. Please call us back or send a message so we can reschedule.${brandPhone ? ` You can reach us at ${brandPhone}.` : ''}`;
  }
  if (issue === 'NOT_PICKING') {
    return `Hi ${name}, this is ${brandName}. Our delivery agent tried to reach you today but couldn't get through. Please call us back so we can complete your delivery.${brandPhone ? ` You can reach us at ${brandPhone}.` : ''}`;
  }
  if (issue === 'REFUSED_DELIVERY') {
    return `Hi ${name}, this is ${brandName}. We noticed there may have been an issue with your delivery today. Please contact us so we can resolve it.${brandPhone ? ` You can reach us at ${brandPhone}.` : ''}`;
  }
  return `Hi ${name}, this is ${brandName}. Our delivery agent flagged an issue with your delivery. Please contact us at your earliest convenience.${brandPhone ? ` You can reach us at ${brandPhone}.` : ''}`;
}

// ── Main entry: process a group message from VersaCommerce instance ───────────
export async function processGroupMessage(body) {
  try {
    const event = body.event ?? body.type;
    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') return;

    const data = body.data ?? body;
    const key = data.key ?? {};

    if (key.fromMe === true) return;

    const groupJid = key.remoteJid ?? '';
    if (!groupJid.includes('@g.us')) return;

    const senderName = data.pushName ?? null;
    const rawMessage = extractText(data).trim();
    if (!rawMessage) return;

    const instanceName = body.instance ?? body.instanceName ?? null;

    // Parse with Claude AI
    const parsed = await parseGroupMessage({ rawMessage, senderName, groupName: groupJid });

    // Only care about follow_up messages
    if (parsed.type !== 'follow_up') return;

    const issue = parsed.issue ?? 'OTHER';

    // Find the related CRM order
    const order = await findOrder(parsed.orderNumber, parsed.customerPhone, parsed.customerName);

    // Determine customer phone to DM
    const customerPhone = order?.customerPhone ?? parsed.customerPhone ?? null;

    // Create follow-up alert record
    const alert = await prisma.followUpAlert.create({
      data: {
        groupJid,
        orderId: order?.id ?? null,
        issue,
        customerPhone,
        rawMessage,
        agentName: senderName ?? 'Unknown',
        dmSent: false,
      },
    });

    // Send DM to customer if we have their phone
    if (customerPhone && instanceName) {
      try {
        const settings = await getSettings();
        const dm = buildCustomerDm({ issue, order, settings });

        let phoneToSend;
        try {
          phoneToSend = normalizePhone(customerPhone);
        } catch {
          phoneToSend = customerPhone.replace(/\D/g, '');
        }

        await sendText(instanceName, `${phoneToSend}@s.whatsapp.net`, dm);

        await prisma.followUpAlert.update({
          where: { id: alert.id },
          data: { dmSent: true },
        });

        console.log(`[FollowUp] DM sent to ${phoneToSend} for issue: ${issue}`);
      } catch (e) {
        console.error('[FollowUp] Failed to send customer DM:', e.message);
      }
    } else {
      console.log(`[FollowUp] Alert created but no phone found for DM. Order: ${order?.orderNumber ?? 'unknown'}`);
    }

  } catch (e) {
    console.error('[FollowUp] processGroupMessage error:', e.message);
  }
}
