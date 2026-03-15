import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import {
  LayoutDashboard, Users, Package, FileText, Truck,
  CalendarCheck, ShoppingCart, MessageCircle,
  Phone, ScrollText, Radio, Zap, Settings, LogOut,
  ChevronLeft, ChevronRight, ClipboardList, Bot,
} from 'lucide-react';

// roles = always visible to these roles regardless of permissions
// perms = also visible if user has any of these permission keys set to true
const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/orders',         icon: ClipboardList, label: 'Orders',           perms: ['orders'] },
      { to: '/today',          icon: CalendarCheck, label: "Today's Schedule", perms: ['orders'] },
      { to: '/abandoned-carts',icon: ShoppingCart,  label: 'Abandoned Carts',  roles: ['ADMIN', 'SUPERVISOR'] },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { to: '/products', icon: Package, label: 'Catalogue', perms: ['products'] },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/users',  icon: Users, label: 'Users & Staff',    roles: ['ADMIN', 'SUPERVISOR'] },
      { to: '/agents', icon: Truck, label: 'Delivery Agents',  roles: ['ADMIN', 'SUPERVISOR', 'STAFF'], perms: ['agents'] },
    ],
  },
  {
    label: 'Forms',
    items: [
      { to: '/forms', icon: FileText, label: 'Order Forms', roles: ['ADMIN', 'SUPERVISOR', 'STAFF'], perms: ['orders'] },
    ],
  },
  {
    label: 'WhatsApp',
    items: [
      { to: '/whatsapp/accounts',  icon: Phone,      label: 'Account Setup', roles: ['ADMIN', 'SUPERVISOR'],               perms: ['whatsapp'] },
      { to: '/whatsapp/templates', icon: ScrollText, label: 'Templates',     roles: ['ADMIN', 'SUPERVISOR', 'STAFF'],      perms: ['whatsapp'] },
      { to: '/whatsapp/broadcast', icon: Radio,      label: 'Broadcast',     roles: ['ADMIN', 'SUPERVISOR', 'STAFF'],      perms: ['whatsapp'] },
      { to: '/whatsapp/automation',icon: Zap,        label: 'Automation',    roles: ['ADMIN', 'SUPERVISOR'],               perms: ['whatsapp'] },
      { to: '/whatsapp/chatbot',   icon: Bot,        label: 'AI Chatbot',    roles: ['ADMIN', 'SUPERVISOR'],               perms: ['whatsapp'] },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings', roles: ['ADMIN'] },
    ],
  },
];

export default function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <span className="text-sm font-bold text-white truncate">Venda</span>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(item => {
            if (!item.roles && !item.perms) return true;
            if (user?.role === 'ADMIN') return true; // ADMIN always sees everything
            const roleOk = item.roles?.includes(user?.role);
            const permOk = item.perms?.some(p => user?.permissions?.[p]);
            return roleOk || permOk;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                  {section.label}
                </p>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                        : 'text-sidebar-foreground/70'
                    )
                  }
                >
                  <item.icon size={16} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 shrink-0">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-sidebar-foreground/50 capitalize">{user.role?.toLowerCase()}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-1 py-1.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded transition-colors"
        >
          <LogOut size={15} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
