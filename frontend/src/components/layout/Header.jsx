import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Bell } from 'lucide-react';

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/orders': 'Orders',
  '/deliveries-today': "Today's Deliveries",
  '/followups-today': "Today's Follow-ups",
  '/abandoned-carts': 'Abandoned Carts',
  '/products': 'Products',
  '/product-categories': 'Product Categories',
  '/users': 'Users & Staff',
  '/agents': 'Agents',
  '/forms': 'Order Forms',
  '/whatsapp/accounts': 'WhatsApp Accounts',
  '/whatsapp/templates': 'WhatsApp Templates',
  '/whatsapp/broadcast': 'WhatsApp Broadcast',
  '/whatsapp/automation': 'WhatsApp Automation',
  '/settings': 'Settings',
};

export default function Header() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);

  const title = ROUTE_TITLES[pathname]
    ?? (pathname.startsWith('/orders/') ? 'Order Details' : 'CRM');

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <span className="text-sm text-gray-700 hidden sm:block">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
