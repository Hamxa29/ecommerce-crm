import client from './client';

export const usersApi = {
  list:   (params) => client.get('/users', { params }).then(r => r.data),
  create: (data)   => client.post('/users', data).then(r => r.data),
  update: (id, d)  => client.put(`/users/${id}`, d).then(r => r.data),
  remove: (id)     => client.delete(`/users/${id}`).then(r => r.data),
  export: (params) => client.get('/users/export', { params, responseType: 'blob' }).then(r => r.data),
};
