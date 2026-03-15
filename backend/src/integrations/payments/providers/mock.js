/**
 * Mock payment provider for testing without real gateway credentials.
 * Usage:
 *   1. Set paymentProvider = 'mock' in StoreSettings (via Prisma Studio or Settings page)
 *   2. Create a PBD order → redirect to /pay/:orderNumber
 *   3. Click "Pay with Card" → gets mock URL
 *   4. Simulate webhook: POST /api/payments/webhook/mock with header x-mock-secret: test
 *      Body: { "reference": "MOCK-ORD001" }
 */

export async function createPaymentLink(order, _settings) {
  const reference = `MOCK-${order.orderNumber}`;
  const url = `${process.env.APP_URL || 'http://localhost:5173'}/pay/${order.orderNumber}?mock=1&ref=${reference}`;
  return { url, reference };
}

export async function verifyPayment(reference, _settings) {
  return { paid: true, amount: 0, reference };
}

export function parseWebhook(body, headers, _settings) {
  if (headers['x-mock-secret'] !== 'test') return null;
  return {
    reference: body.reference,
    paid: true,
    amount: body.amount ?? 0,
  };
}
