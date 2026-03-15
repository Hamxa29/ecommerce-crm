import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — refresh token or logout
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        const store = useAuthStore.getState();
        store.setAuth(data.token, data.refreshToken, data.user ?? store.user);
        original.headers.Authorization = `Bearer ${data.token}`;
        return client(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default client;
