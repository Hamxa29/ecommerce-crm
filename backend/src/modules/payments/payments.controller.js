import * as paymentService from '../../integrations/payments/payment.service.js';
import { sendText } from '../../config/evolution.js';
import { prisma } from '../../config/database.js';
import { getSettings } from '../settings/settings.service.js';

export async function getOrderInfo(req, res, next) {
  try {
    const info = await paymentService.getPublicOrderInfo(req.params.orderNumber);
    if (!info) return res.status(404).json({ error: 'Order not found' });
    res.json(info);
  } catch (err) { next(err); }
}

export async function receiveWebhook(req, res) {
  // Always respond 200 immediately — never let gateway retry due to our errors
  try {
    const { provider } = req.params;
    // req.body may be a Buffer (raw) or parsed object depending on route order
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    const result = await paymentService.handleWebhook(provider, body, req.headers);
    res.json(result);
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.json({ processed: false, error: err.message });
  }
}

export async function whatsappRedirect(req, res, next) {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'OPEN_RECORD',
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: 'OPEN_RECORD',
            note: 'Customer chose to complete purchase on WhatsApp',
          },
        },
      },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function sendPaymentLink(req, res, next) {
  try {
    const { orderId } = req.params;
    const { url, reference } = await paymentService.createPaymentLink(orderId);

    // Send payment link via WhatsApp
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerPhone: true, customerName: true, orderNumber: true },
    });

    if (order?.customerPhone) {
      const settings = await getSettings();
      let instanceName = null;
      if (settings.paymentLinkAccountId) {
        const acc = await prisma.whatsappAccount.findUnique({ where: { id: settings.paymentLinkAccountId } });
        instanceName = acc?.instanceName ?? null;
      }
      if (!instanceName) {
        const acc = await prisma.whatsappAccount.findFirst({ where: { status: 'CONNECTED' } });
        instanceName = acc?.instanceName ?? null;
      }
      if (instanceName) {
        await sendText(
          instanceName,
          order.customerPhone,
          `Hi ${order.customerName}! Here is your payment link for Order ${order.orderNumber}:\n${url}\n\nPlease complete your payment to confirm the order. Thank you!`
        ).catch(e => console.error('[Payments] WA send failed:', e.message));
      }
    }

    res.json({ ok: true, url, reference });
  } catch (err) { next(err); }
}

export async function verifyPaymentManual(req, res, next) {
  try {
    const result = await paymentService.verifyPayment(req.params.reference);
    res.json(result);
  } catch (err) { next(err); }
}
