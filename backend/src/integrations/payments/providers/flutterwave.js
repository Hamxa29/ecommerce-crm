import axios from 'axios';

export async function createPaymentLink(order, settings) {
  const txRef = `CRM-${order.orderNumber}-${Date.now()}`;
  const { data } = await axios.post(
    'https://api.flutterwave.com/v3/payments',
    {
      tx_ref: txRef,
      amount: Number(order.totalAmount),
      currency: 'NGN',
      redirect_url: `${process.env.APP_URL || 'http://localhost:5173'}/pay/${order.orderNumber}?status=success`,
      customer: {
        email: order.customerEmail || `${order.customerPhone.replace(/\D/g, '')}@crm.placeholder.com`,
        phone_number: order.customerPhone,
        name: order.customerName,
      },
      customizations: {
        title: 'Order Payment',
        description: `Payment for Order ${order.orderNumber}`,
      },
    },
    { headers: { Authorization: `Bearer ${settings.paymentProviderKey}` } }
  );
  return { url: data.data.link, reference: txRef };
}

export async function verifyPayment(reference, settings) {
  // Flutterwave verify by tx_ref: search transactions
  const { data } = await axios.get(
    `https://api.flutterwave.com/v3/transactions?tx_ref=${reference}`,
    { headers: { Authorization: `Bearer ${settings.paymentProviderKey}` } }
  );
  const tx = data.data?.[0];
  return {
    paid: tx?.status === 'successful',
    amount: tx?.amount ?? 0,
    reference,
  };
}

export function parseWebhook(body, headers, settings) {
  // Flutterwave uses a static hash header (verif-hash), not HMAC
  const signature = headers['verif-hash'];
  if (!signature || signature !== settings.paymentWebhookSecret) return null;
  if (body.event !== 'charge.completed') return null;
  if (body.data?.status !== 'successful') return null;
  return {
    reference: body.data.tx_ref,
    paid: true,
    amount: body.data.amount,
  };
}
