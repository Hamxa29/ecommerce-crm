import crypto from 'crypto';
import axios from 'axios';

export async function createPaymentLink(order, settings) {
  const reference = `CRM-${order.orderNumber}-${Date.now()}`;
  const { data } = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email: order.customerEmail || `${order.customerPhone.replace(/\D/g, '')}@crm.placeholder.com`,
      amount: Math.round(Number(order.totalAmount) * 100), // kobo
      reference,
      callback_url: `${process.env.APP_URL || 'http://localhost:5173'}/pay/${order.orderNumber}?status=success`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    },
    { headers: { Authorization: `Bearer ${settings.paymentProviderKey}` } }
  );
  return { url: data.data.authorization_url, reference };
}

export async function verifyPayment(reference, settings) {
  const { data } = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    { headers: { Authorization: `Bearer ${settings.paymentProviderKey}` } }
  );
  return {
    paid: data.data.status === 'success',
    amount: data.data.amount / 100, // kobo → NGN
    reference,
  };
}

export function parseWebhook(body, headers, settings) {
  // Verify Paystack HMAC-SHA512 signature
  const hash = crypto
    .createHmac('sha512', settings.paymentWebhookSecret ?? '')
    .update(JSON.stringify(body))
    .digest('hex');
  if (hash !== headers['x-paystack-signature']) return null;
  if (body.event !== 'charge.success') return null;
  return {
    reference: body.data.reference,
    paid: true,
    amount: body.data.amount / 100,
  };
}
