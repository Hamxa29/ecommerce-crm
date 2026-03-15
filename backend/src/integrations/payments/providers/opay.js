import crypto from 'crypto';
import axios from 'axios';

// Use sandbox for test keys, swap OPAY_ENV=production for live
const BASE_URL = process.env.OPAY_ENV === 'production'
  ? 'https://api.opayweb.com'
  : 'https://sandboxapi.opayweb.com';

export async function createPaymentLink(order, settings) {
  const reference = `CRM-${order.orderNumber}-${Date.now()}`;
  const amountKobo = Math.round(Number(order.totalAmount) * 100);

  const { data } = await axios.post(
    `${BASE_URL}/api/v3/native/cashierCreate`,
    {
      reference,
      mchId: settings.paymentPublicKey,
      totalAmount: { currency: 'NGN', total: amountKobo },
      expireAt: 30, // minutes
      userInfo: { userId: order.customerPhone, userPhone: order.customerPhone },
      productList: [{
        id: order.orderNumber,
        name: `Order ${order.orderNumber}`,
        unitPrice: { currency: 'NGN', total: amountKobo },
        quantity: 1,
      }],
      callbackUrl: `${process.env.APP_URL || 'http://localhost:5173'}/pay/${order.orderNumber}?status=success`,
    },
    {
      headers: {
        Authorization: `Bearer ${settings.paymentProviderKey}`,
        MerchantId: settings.paymentPublicKey,
      },
    }
  );
  return { url: data.data.cashierUrl, reference };
}

export async function verifyPayment(reference, settings) {
  const { data } = await axios.post(
    `${BASE_URL}/api/v3/native/cashierQuery`,
    { reference },
    {
      headers: {
        Authorization: `Bearer ${settings.paymentProviderKey}`,
        MerchantId: settings.paymentPublicKey,
      },
    }
  );
  return {
    paid: data.data?.status === 'SUCCESS',
    amount: data.data?.totalAmount?.total ? data.data.totalAmount.total / 100 : 0,
    reference,
  };
}

export function parseWebhook(body, headers, settings) {
  // OPay signs with HMAC-SHA512 of JSON body encoded as base64
  const sig = headers['sign'] ?? headers['x-sign'] ?? '';
  const expected = crypto
    .createHmac('sha512', settings.paymentWebhookSecret ?? '')
    .update(JSON.stringify(body))
    .digest('base64');
  if (sig !== expected) return null;
  if (body.data?.status !== 'SUCCESS') return null;
  return {
    reference: body.data.reference,
    paid: true,
    amount: body.data.totalAmount?.total ? body.data.totalAmount.total / 100 : 0,
  };
}
