import client from './client';

export const paymentsApi = {
  getOrderInfo: (orderNumber) => client.get(`/payments/order/${orderNumber}`).then(r => r.data),
  sendLink:     (orderId)     => client.post(`/payments/send-link/${orderId}`).then(r => r.data),
  verify:       (reference)   => client.get(`/payments/verify/${reference}`).then(r => r.data),
};
