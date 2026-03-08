import client from './client';

export const formsApi = {
  list:              ()         => client.get('/forms').then(r => r.data),
  get:               (id)       => client.get(`/forms/${id}`).then(r => r.data),
  create:            (data)     => client.post('/forms', data).then(r => r.data),
  update:            (id, data) => client.put(`/forms/${id}`, data).then(r => r.data),
  remove:            (id)       => client.delete(`/forms/${id}`).then(r => r.data),
  getEmbed:          (id)       => client.get(`/forms/${id}/embed`).then(r => r.data),
  listAbandoned:     (params)   => client.get('/forms/abandoned-carts', { params }).then(r => r.data),
  updateAbandoned:   (id, data) => client.put(`/forms/abandoned-carts/${id}`, data).then(r => r.data),
};
