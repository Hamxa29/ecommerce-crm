import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,

      setAuth: (token, refreshToken, user) => set({ token, refreshToken, user }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ token: null, refreshToken: null, user: null }),

      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === 'ADMIN',
      hasPermission: (perm) => {
        const user = get().user;
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        return !!user.permissions?.[perm];
      },
    }),
    {
      name: 'crm-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
