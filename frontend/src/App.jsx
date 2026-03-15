import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import { useAuthStore } from './stores/authStore';
import client from './api/client';

function RoleRoute({ roles, children }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Users from './pages/Users';
import Products from './pages/Products';
import Forms from './pages/Forms';
import Agents from './pages/Agents';
import TodaySchedule from './pages/TodaySchedule';
import AbandonedCarts from './pages/AbandonedCarts';
import WaAccounts from './pages/WaAccounts';
import WaTemplates from './pages/WaTemplates';
import WaBroadcast from './pages/WaBroadcast';
import WaAutomation from './pages/WaAutomation';
import Settings from './pages/Settings';
import PublicOrderForm from './pages/PublicOrderForm';
import PublicPaymentPage from './pages/PublicPaymentPage';
import WaChatbot from './pages/WaChatbot';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function PermissionSync() {
  const { token, setUser } = useAuthStore();
  useEffect(() => {
    if (!token) return;
    const sync = () => {
      client.get('/auth/me').then(res => setUser(res.data)).catch(() => {});
    };
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, [token, setUser]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PermissionSync />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/form/:slug" element={<PublicOrderForm />} />
          <Route path="/pay/:orderNumber" element={<PublicPaymentPage />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/users" element={<RoleRoute roles={['ADMIN','SUPERVISOR']}><Users /></RoleRoute>} />
            <Route path="/product-categories" element={<Navigate to="/products" replace />} />
            <Route path="/products" element={<Products />} />
            <Route path="/forms" element={<Forms />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/today" element={<TodaySchedule />} />
            {/* Keep old routes as redirects */}
            <Route path="/deliveries-today" element={<Navigate to="/today" replace />} />
            <Route path="/followups-today" element={<Navigate to="/today" replace />} />
            <Route path="/abandoned-carts" element={<RoleRoute roles={['ADMIN','SUPERVISOR']}><AbandonedCarts /></RoleRoute>} />
            <Route path="/whatsapp/accounts" element={<RoleRoute roles={['ADMIN','SUPERVISOR']}><WaAccounts /></RoleRoute>} />
            <Route path="/whatsapp/templates" element={<WaTemplates />} />
            <Route path="/whatsapp/broadcast" element={<RoleRoute roles={['ADMIN','SUPERVISOR','STAFF']}><WaBroadcast /></RoleRoute>} />
            <Route path="/whatsapp/automation" element={<RoleRoute roles={['ADMIN','SUPERVISOR']}><WaAutomation /></RoleRoute>} />
            <Route path="/whatsapp/chatbot"    element={<RoleRoute roles={['ADMIN','SUPERVISOR']}><WaChatbot /></RoleRoute>} />
            <Route path="/settings" element={<RoleRoute roles={['ADMIN']}><Settings /></RoleRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
