import client from './client';

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }).then(r => r.data),
  logout: () => client.post('/auth/logout').then(r => r.data),
  me: () => client.get('/auth/me').then(r => r.data),
};
