import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import { useAuthStore } from './stores/authStore';
import client from './api/client';

// roles: strict role check (e.g. ADMIN only)
// perms: any of these permission keys grants access (ADMIN always passes)
function RoleRoute({ roles, perms, children }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return children;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (perms && !perms.some(p => user?.permissions?.[p])) return <Navigate to="/" replace />;
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
import PublicUpsellPage from './pages/PublicUpsellPage';
import WaChatbot from './pages/WaChatbot';
import Integrations from './pages/Integrations';

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
          <Route path="/upsell/:slug/:orderNumber" element={<PublicUpsellPage />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/users" element={<RoleRoute perms={['userManagement']}><Users /></RoleRoute>} />
            <Route path="/product-categories" element={<Navigate to="/products" replace />} />
            <Route path="/products" element={<RoleRoute perms={['products']}><Products /></RoleRoute>} />
            <Route path="/forms" element={<RoleRoute perms={['orderForms','orders']}><Forms /></RoleRoute>} />
            <Route path="/agents" element={<RoleRoute perms={['agents']}><Agents /></RoleRoute>} />
            <Route path="/today" element={<RoleRoute perms={['orders']}><TodaySchedule /></RoleRoute>} />
            {/* Keep old routes as redirects */}
            <Route path="/deliveries-today" element={<Navigate to="/today" replace />} />
            <Route path="/followups-today" element={<Navigate to="/today" replace />} />
            <Route path="/abandoned-carts" element={<RoleRoute perms={['abandonedCarts']}><AbandonedCarts /></RoleRoute>} />
            <Route path="/whatsapp/accounts" element={<RoleRoute perms={['whatsappAdmin']}><WaAccounts /></RoleRoute>} />
            <Route path="/whatsapp/templates" element={<RoleRoute perms={['whatsapp','whatsappAdmin']}><WaTemplates /></RoleRoute>} />
            <Route path="/whatsapp/broadcast" element={<RoleRoute perms={['whatsapp','whatsappAdmin']}><WaBroadcast /></RoleRoute>} />
            <Route path="/whatsapp/automation" element={<RoleRoute perms={['whatsappAdmin']}><WaAutomation /></RoleRoute>} />
            <Route path="/whatsapp/chatbot"    element={<RoleRoute perms={['whatsappAdmin']}><WaChatbot /></RoleRoute>} />
            <Route path="/integrations" element={<RoleRoute roles={['ADMIN']}><Integrations /></RoleRoute>} />
            <Route path="/settings" element={<RoleRoute roles={['ADMIN']}><Settings /></RoleRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
