import { useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

const ROUTE_TITLES = {
  '/': 'Dashboard Analytics',
  '/orders': 'Orders',
  '/deliveries-today': "Today's Deliveries",
  '/followups-today': "Today's Follow-ups",
  '/abandoned-carts': 'Abandoned Carts',
  '/products': 'Products',
  '/product-categories': 'Product Categories',
  '/users': 'Users & Staff',
  '/agents': 'Agents',
  '/forms': 'Order Forms',
  '/whatsapp/accounts': 'Account Setup',
  '/whatsapp/templates': 'WhatsApp Templates',
  '/whatsapp/broadcast': 'WhatsApp Broadcast',
  '/whatsapp/automation': 'WhatsApp Automation',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
};

export default function Header() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const { darkMode, toggleDarkMode } = useUiStore();

  const title = ROUTE_TITLES[pathname]
    ?? (pathname.startsWith('/orders/') ? 'Order Details' : 'CRM');

  return (
    <header className="h-[72px] bg-gray-50/50 dark:bg-gray-900 border-b border-transparent dark:border-gray-800 flex items-center justify-between px-8 shrink-0">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User badge */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 pr-1 hidden sm:block">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
