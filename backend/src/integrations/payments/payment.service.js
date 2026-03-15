import { prisma } from '../../config/database.js';
import { getSettings } from '../../modules/settings/settings.service.js';
import { sendText } from '../../config/evolution.js';

// Static provider map — avoids dynamic import issues
import * as paystack    from './providers/paystack.js';
import * as opay        from './providers/opay.js';
import * as flutterwave from './providers/flutterwave.js';
import * as mock        from './providers/mock.js';

const PROVIDERS = { paystack, opay, flutterwave, mock };

function getProvider(settings) {
  const name = settings?.paymentProvider;
  if (!name || !PROVIDERS[name]) throw new Error(`Payment provider "${name}" is not configured or not supported.`);
  return PROVIDERS[name];
}

async function getWhatsAppInstance(settings) {
  if (settings.paymentLinkAccountId) {
    const account = await prisma.whatsappAccount.findUnique({
      where: { id: settings.paymentLinkAccountId },
    });
    if (account?.instanceName) return account.instanceName;
  }
  // Fallback: first connected account
  const account = await prisma.whatsappAccount.findFirst({
    where: { status: 'CONNECTED' },
  });
  return account?.instanceName ?? null;
}

export async function createPaymentLink(orderId) {
  const [order, settings] = await Promise.all([
    prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
    getSettings(),
  ]);
  const provider = getProvider(settings);
  const { url, reference } = await provider.createPaymentLink(order, settings);

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentLink: url, paymentReference: reference },
  });

  return { url, reference };
}

export async function verifyPayment(reference) {
  const settings = await getSettings();
  const provider = getProvider(settings);
  const result = await provider.verifyPayment(reference, settings);

  if (result.paid) {
    await prisma.order.updateMany({
      where: { paymentReference: reference },
      data: { paymentStatus: 'PAID', paymentConfirmedAt: new Date() },
    });
  }
  return result;
}

export async function handleWebhook(providerName, body, headers) {
  const settings = await getSettings();
  const provider = PROVIDERS[providerName];
  if (!provider) return { processed: false, reason: `Unknown provider: ${providerName}` };

  const event = provider.parseWebhook(body, headers, settings);
  if (!event || !event.paid) return { processed: false };

  const order = await prisma.order.findFirst({
    where: { paymentReference: event.reference },
  });
  if (!order) return { processed: false, reason: 'Order not found for reference' };

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      paymentConfirmedAt: new Date(),
      status: 'CONFIRMED',
      statusHistory: {
        create: {
          fromStatus: order.status,
          toStatus: 'CONFIRMED',
          note: `Payment confirmed via ${providerName} (ref: ${event.reference})`,
        },
      },
    },
  });

  // Send WhatsApp confirmation
  try {
    const instanceName = await getWhatsAppInstance(settings);
    if (instanceName && order.customerPhone) {
      await sendText(
        instanceName,
        order.customerPhone,
        `Hi ${order.customerName}! ✅ Your payment for Order ${order.orderNumber} has been confirmed. We'll process your delivery shortly. Thank you!`
      );
    }
  } catch (waErr) {
    console.error('[Payment] WA confirmation failed:', waErr.message);
  }

  return { processed: true, orderId: order.id };
}

export async function getPublicOrderInfo(orderNumber) {
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        totalAmount: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentConfirmedAt: true,
        paymentLink: true,
        paymentReference: true,
        status: true,
        formId: true,
      },
    }),
    getSettings(),
  ]);

  if (!order) return null;

  // Resolve effective payment method from form if available
  let effectiveMethod = order.paymentMethod;
  if (order.formId) {
    const form = await prisma.form.findUnique({
      where: { id: order.formId },
      select: { paymentMethod: true },
    });
    if (form?.paymentMethod) effectiveMethod = form.paymentMethod;
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    totalAmount: Number(order.totalAmount),
    paymentMethod: effectiveMethod,
    paymentStatus: order.paymentStatus,
    paymentConfirmedAt: order.paymentConfirmedAt,
    orderStatus: order.status,
    // Settings for payment page display (no secrets)
    paymentProvider: settings.paymentProvider ?? null,
    pbdEnabled: settings.pbdEnabled ?? false,
    bankName: settings.bankName ?? null,
    bankAccountNumber: settings.bankAccountNumber ?? null,
    bankAccountName: settings.bankAccountName ?? null,
    businessWhatsapp: settings.whatsappNumber ?? null,
  };
}
