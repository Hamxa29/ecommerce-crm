import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usersApi } from '@/api/users.api';
import { NIGERIA_STATES } from '@/lib/constants';
import client from '@/api/client';
import { User, Lock, Server, Store, Bell, CheckCircle } from 'lucide-react';

const settingsApi = {
  get:    ()     => client.get('/settings').then(r => r.data),
  update: (data) => client.put('/settings', data).then(r => r.data),
};

// ── Store Settings Section ────────────────────────────────────────────────────
function StoreSettingsSection() {
  const { data: stored, isLoading } = useQuery({ queryKey: ['store-settings'], queryFn: settingsApi.get });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  // Init form from fetched data
  const values = form ?? stored ?? {};
  const set = (key, val) => setForm(prev => ({ ...(prev ?? stored ?? {}), [key]: val }));

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => { setSaved(true); setForm(null); setTimeout(() => setSaved(false), 2500); },
  });

  if (isLoading) return <div className="bg-white border rounded-xl p-6 text-sm text-gray-400">Loading...</div>;

  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Store size={16} /></div>
        <h3 className="font-semibold text-gray-900">Store Settings</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
          <input value={values.storeName ?? ''} onChange={e => set('storeName', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input value={values.email ?? ''} onChange={e => set('email', e.target.value)} type="email"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input value={values.phoneNumber ?? ''} onChange={e => set('phoneNumber', e.target.value)}
            placeholder="2347012345678"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
          <input value={values.whatsappNumber ?? ''} onChange={e => set('whatsappNumber', e.target.value)}
            placeholder="2347012345678 (no + or leading 0)"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Office State</label>
          <select value={values.officeState ?? ''} onChange={e => set('officeState', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Select state</option>
            {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse State</label>
          <select value={values.warehouseState ?? ''} onChange={e => set('warehouseState', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Same as office</option>
            {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Address</label>
          <input value={values.storeAddress ?? ''} onChange={e => set('storeAddress', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Footer Message</label>
          <input value={values.invoiceFooterMessage ?? ''} onChange={e => set('invoiceFooterMessage', e.target.value)}
            placeholder="e.g. Thank you for your order!"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => mutation.mutate(form ?? {})} disabled={mutation.isPending || !form}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : 'Save Store Settings'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle size={14} /> Saved</span>}
      </div>
    </div>
  );
}

// ── Form & Order Settings ─────────────────────────────────────────────────────
function OrderSettingsSection() {
  const { data: stored, isLoading } = useQuery({ queryKey: ['store-settings'], queryFn: settingsApi.get });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  const values = form ?? stored ?? {};
  const set = (key, val) => setForm(prev => ({ ...(prev ?? stored ?? {}), [key]: val }));

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => { setSaved(true); setForm(null); setTimeout(() => setSaved(false), 2500); },
  });

  if (isLoading) return null;

  const toggleItem = (key) => ({ label, desc }) => (
    <label key={key} className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5">
        <input type="checkbox" checked={!!values[key]} onChange={e => set(key, e.target.checked)} className="sr-only peer" />
        <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </label>
  );

  return (
    <div className="bg-white border rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Bell size={16} /></div>
        <h3 className="font-semibold text-gray-900">Order & Notification Settings</h3>
      </div>

      <div className="space-y-4">
        {toggleItem('preventDuplicateOrders')({
          label: 'Prevent duplicate orders within 24 hours',
          desc: 'Block submissions from the same phone number more than once per day',
        })}
        {toggleItem('notifyScheduledOrders')({
          label: 'Send me WhatsApp reminder for scheduled orders',
          desc: 'Get notified about orders scheduled for delivery today',
        })}
        {toggleItem('notifyLowStock')({
          label: 'Low stock notifications',
          desc: 'Get notified when a product stock falls below 5 units',
        })}
        {toggleItem('sendCustomerInvoiceWa')({
          label: 'Send customers order confirmation via WhatsApp',
          desc: 'Automatically send order details to customer after order is placed',
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => mutation.mutate(form ?? {})} disabled={mutation.isPending || !form}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle size={14} /> Saved</span>}
      </div>
    </div>
  );
}

// ── Profile Section ───────────────────────────────────────────────────────────
function ProfileSection() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => usersApi.update(user.id, data),
    onSuccess: (updated) => { setUser(updated); setSaved(true); setTimeout(() => setSaved(false), 2500); },
  });

  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={16} /></div>
        <h3 className="font-semibold text-gray-900">My Profile</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => mutation.mutate({ name, email })} disabled={mutation.isPending}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : 'Save Profile'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle size={14} /> Saved</span>}
      </div>
    </div>
  );
}

// ── Password Section ──────────────────────────────────────────────────────────
function PasswordSection() {
  const user = useAuthStore(s => s.user);
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => usersApi.update(user.id, data),
    onSuccess: () => { setCurrent(''); setNewPw(''); setConfirm(''); setSaved(true); setTimeout(() => setSaved(false), 2500); },
    onError: (e) => setError(e?.response?.data?.error ?? 'Failed to update password'),
  });

  const handleSave = () => {
    if (!current || !newPw) return setError('All fields are required');
    if (newPw.length < 8) return setError('Password must be at least 8 characters');
    if (newPw !== confirm) return setError('Passwords do not match');
    setError('');
    mutation.mutate({ currentPassword: current, password: newPw });
  };

  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Lock size={16} /></div>
        <h3 className="font-semibold text-gray-900">Change Password</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={mutation.isPending}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
          {mutation.isPending ? 'Updating...' : 'Update Password'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle size={14} /> Updated</span>}
      </div>
    </div>
  );
}

// ── System Info ───────────────────────────────────────────────────────────────
function SystemInfoSection() {
  const user = useAuthStore(s => s.user);
  const info = [
    { label: 'Role', value: user?.role },
    { label: 'User ID', value: user?.id },
    { label: 'Last Login', value: user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A' },
  ];
  return (
    <div className="bg-white border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><Server size={16} /></div>
        <h3 className="font-semibold text-gray-900">System Information</h3>
      </div>
      <div className="space-y-3">
        {info.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-800 font-mono text-xs bg-gray-50 px-2 py-0.5 rounded">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your store and account preferences</p>
      </div>
      <StoreSettingsSection />
      <OrderSettingsSection />
      <ProfileSection />
      <PasswordSection />
      <SystemInfoSection />
    </div>
  );
}
