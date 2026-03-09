import client from './client';

export const categoriesApi = {
  list:      (params) => client.get('/product-categories', { params }).then(r => r.data),
  create:    (data)   => client.post('/product-categories', data).then(r => r.data),
  update:    (id, d)  => client.put(`/product-categories/${id}`, d).then(r => r.data),
  remove:    (id)     => client.delete(`/product-categories/${id}`).then(r => r.data),
  duplicate: (id)     => client.post(`/product-categories/${id}/duplicate`).then(r => r.data),
};

export const productsApi = {
  list:      (params) => client.get('/products', { params }).then(r => r.data),
  get:       (id)     => client.get(`/products/${id}`).then(r => r.data),
  create:    (data)   => client.post('/products', data).then(r => r.data),
  update:    (id, d)  => client.put(`/products/${id}`, d).then(r => r.data),
  remove:    (id)     => client.delete(`/products/${id}`).then(r => r.data),
  duplicate: (id)     => client.post(`/products/${id}/duplicate`).then(r => r.data),
  export:    (params) => client.get('/products/export', { params, responseType: 'blob' }).then(r => r.data),
};
