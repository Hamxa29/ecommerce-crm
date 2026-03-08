import client from './client';

export const ordersApi = {
  list:            (params) => client.get('/orders', { params }).then(r => r.data),
  stats:           ()       => client.get('/orders/stats').then(r => r.data),
  deliveriesToday: ()       => client.get('/orders/deliveries-today').then(r => r.data),
  followupsToday:  ()       => client.get('/orders/followups-today').then(r => r.data),
  get:             (id)     => client.get(`/orders/${id}`).then(r => r.data),
  create:          (data)   => client.post('/orders', data).then(r => r.data),
  update:          (id, d)  => client.put(`/orders/${id}`, d).then(r => r.data),
  changeStatus:    (id, status, note, scheduledDate) => client.put(`/orders/${id}/status`, { status, note, scheduledDate }).then(r => r.data),
  bulk:            (orderIds, action, payload) => client.post('/orders/bulk', { orderIds, action, payload }).then(r => r.data),
};
