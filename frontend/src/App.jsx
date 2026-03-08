import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Users from './pages/Users';
import ProductCategories from './pages/ProductCategories';
import Products from './pages/Products';
import Forms from './pages/Forms';
import Agents from './pages/Agents';
import DeliveriesToday from './pages/DeliveriesToday';
import FollowupsToday from './pages/FollowupsToday';
import AbandonedCarts from './pages/AbandonedCarts';
import WaAccounts from './pages/WaAccounts';
import WaTemplates from './pages/WaTemplates';
import WaBroadcast from './pages/WaBroadcast';
import WaAutomation from './pages/WaAutomation';
import Settings from './pages/Settings';
import PublicOrderForm from './pages/PublicOrderForm';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/form/:slug" element={<PublicOrderForm />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/users" element={<Users />} />
            <Route path="/product-categories" element={<ProductCategories />} />
            <Route path="/products" element={<Products />} />
            <Route path="/forms" element={<Forms />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/deliveries-today" element={<DeliveriesToday />} />
            <Route path="/followups-today" element={<FollowupsToday />} />
            <Route path="/abandoned-carts" element={<AbandonedCarts />} />
            <Route path="/whatsapp/accounts" element={<WaAccounts />} />
            <Route path="/whatsapp/templates" element={<WaTemplates />} />
            <Route path="/whatsapp/broadcast" element={<WaBroadcast />} />
            <Route path="/whatsapp/automation" element={<WaAutomation />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
