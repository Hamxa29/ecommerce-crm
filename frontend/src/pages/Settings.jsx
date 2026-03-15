import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usersApi } from '@/api/users.api';
import { NIGERIA_STATES } from '@/lib/constants';
import client from '@/api/client';
import { User, Lock, Server, Store, Bell, CheckCircle, History, ChevronDown, X, Search, Send, Zap } from 'lucide-react';

function SettingsStateDropdown({ value, onChange, placeholder = 'Select state' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = NIGERIA_STATES.filter(s => s.toLowerCase().includes(search.toLowerCase()));
  const select = (state) => { onChange(state); setOpen(false); setSearch(''); };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 border rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30">
        <span className={`flex-1 text-left ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {value || placeholder}
        </span>
        {value
          ? <X size={13} className="text-gray-400 hover:text-gray-600 shrink-0" onClick={e => { e.stopPropagation(); select(''); }} />
          : <ChevronDown size={13} className="text-gray-400 shrink-0" />
        }
      </button>
      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search state..."
                className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(s => (
              <button key={s} type="button" onClick={() => select(s)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${value === s ? 'text-primary font-medium bg-primary/5' : 'text-gray-700'}`}>
                {s}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-gray-400 px-3 py-3">No states found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const settingsApi = {
  get:    ()     => client.get('/settings').then(r => r.data),
  update: (data) => {
    // Strip virtual/read-only fields — never written to DB
    const { chatbotAnthropicKeySet, chatbotOpenaiKeySet, ...clean } = data;
    return client.put('/settings', clean).then(r => r.data);
  },
};

// ── Store Settings Section ────────────────────────────────────────────────────
function StoreSettingsSection() {
  const qc = useQueryClient();
  const { data: stored, isLoading } = useQuery({ queryKey: ['store-settings'], queryFn: settingsApi.get });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Init form from fetched data
  const values = form ?? stored ?? {};
  const set = (key, val) => setForm(prev => ({ ...(prev ?? stored ?? {}), [key]: val }));

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-settings'] }); setSaved(true); setForm(null); setError(''); setTimeout(() => setSaved(false), 2500); },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed to save'),
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Email <span className="font-normal text-gray-400 text-xs">(used as sending address)</span></label>
          <input value={values.email ?? ''} onChange={e => set('email', e.target.value)} type="email"
            placeholder="you@gmail.com"
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
          <SettingsStateDropdown value={values.officeState ?? ''} onChange={v => set('officeState', v)} placeholder="Select state" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse State</label>
          <SettingsStateDropdown value={values.warehouseState ?? ''} onChange={v => set('warehouseState', v)} placeholder="Same as office" />
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

      {error && <p className="text-sm text-red-500">{error}</p>}
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
  const qc = useQueryClient();
  const { data: stored, isLoading } = useQuery({ queryKey: ['store-settings'], queryFn: settingsApi.get });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const values = form ?? stored ?? {};
  const set = (key, val) => setForm(prev => ({ ...(prev ?? stored ?? {}), [key]: val }));

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-settings'] }); setSaved(true); setForm(null); setError(''); setTimeout(() => setSaved(false), 2500); },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed to save'),
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

      {/* Order notification emails */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">
          New Order Notification Emails
        </label>
        <input
          value={values.orderNotificationEmails ?? ''}
          onChange={e => set('orderNotificationEmails', e.target.value)}
          placeholder="you@gmail.com, colleague@gmail.com"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-gray-400 mt-1">
          Enter one or more emails (comma-separated). You'll receive an email for every new order placed via your forms.
          Requires SMTP settings in your server environment (SMTP_HOST, SMTP_USER, SMTP_PASS).
        </p>
        <TestEmailButton />
      </div>

      <div className="border-t pt-4 space-y-4">
        {toggleItem('preventDuplicateOrders')({
          label: 'Prevent duplicate orders within 24 hours',
          desc: 'Block submissions from the same phone number more than once per day',
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

      <div className="border-t pt-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-1">Staff Daily Digest</p>
          <p className="text-xs text-gray-500 mb-3">Automatically send each staff member their scheduled orders for the day every morning on WhatsApp.</p>
        </div>
        {toggleItem('agentDigestEnabled')({
          label: 'Enable morning schedule digest for staff',
          desc: 'Staff receive their scheduled orders list each morning on WhatsApp',
        })}
        {values.agentDigestEnabled && (
          <div className="grid grid-cols-2 gap-4 pl-1">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Send at hour (24h, Lagos time)</label>
              <select value={values.agentDigestHour ?? 6} onChange={e => set('agentDigestHour', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2,'0')}:00</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Delay between messages</label>
              <select value={values.agentDigestDelayMin ?? 2} onChange={e => set('agentDigestDelayMin', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value={1}>1 minute</option>
                <option value={2}>2 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={0}>No delay</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
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

// ── Auto-Delete Stale Orders ──────────────────────────────────────────────────
function PendingOrderSection() {
  const qc = useQueryClient();
  const { data: stored, isLoading } = useQuery({ queryKey: ['store-settings'], queryFn: settingsApi.get });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const values = form ?? stored ?? {};
  const set = (key, val) => setForm(prev => ({ ...(prev ?? stored ?? {}), [key]: val }));

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-settings'] });
      setSaved(true); setForm(null); setError('');
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed to save'),
  });

  if (isLoading) return null;

  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-red-50 text-red-500 rounded-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Auto-Delete Stale Pending Orders</h3>
          <p className="text-xs text-gray-500 mt-0.5">Move orders to DELETED automatically after they've been pending too long</p>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-red-50/40 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Enable auto-delete</p>
            <p className="text-xs text-gray-500 mt-0.5">Orders pending beyond the threshold will be moved to DELETED each hour</p>
          </div>
          <label className="relative flex-shrink-0">
            <input type="checkbox" checked={!!values.pendingAutoDeleteEnabled} onChange={e => set('pendingAutoDeleteEnabled', e.target.checked)} className="sr-only peer" />
            <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-red-500 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </label>
        </div>
        {values.pendingAutoDeleteEnabled && (
          <div className="flex items-center gap-3">
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-700 mb-1">Delete after (days)</label>
              <input type="number" min="7" max="365"
                value={values.pendingAutoDeleteDays ?? 30}
                onChange={e => set('pendingAutoDeleteDays', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <p className="text-xs text-red-600 mt-4">Orders pending for more than {values.pendingAutoDeleteDays ?? 30} days will be auto-deleted hourly.</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => mutation.mutate(form ?? {})} disabled={mutation.isPending || !form}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle size={14} /> Saved</span>}
      </div>
    </div>
  );
}

// ── Integrations Section ──────────────────────────────────────────────────────
function IntegrationsSection() {
  const qc = useQueryClient();
  const { data: stored, isLoading } = useQuery({ queryKey: ['store-settings'], queryFn: settingsApi.get });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const { data: waAccounts = [] } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => client.get('/whatsapp/accounts').then(r => r.data),
  });

  const values = form ?? stored ?? {};
  const set = (key, val) => setForm(prev => ({ ...(prev ?? stored ?? {}), [key]: val }));

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-settings'] });
      setSaved(true); setForm(null); setError('');
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed to save'),
  });

  if (isLoading) return null;

  const PAYMENT_PROVIDERS = [
    { value: '',            label: 'None (COD only)' },
    { value: 'paystack',    label: 'Paystack' },
    { value: 'opay',        label: 'OPay' },
    { value: 'flutterwave', label: 'Flutterwave' },
    { value: 'mock',        label: 'Mock (for testing)' },
  ];

  const LOGISTICS_PROVIDERS = [
    { value: '',             label: 'None' },
    { value: 'giglogistics', label: 'GIG Logistics' },
    { value: 'godisgoood',   label: 'God is Good Motors' },
    { value: 'dhl',          label: 'DHL' },
  ];

  const webhookUrl = values.paymentProvider
    ? `${window.location.origin}/api/payments/webhook/${values.paymentProvider}`
    : null;

  return (
    <div className="bg-white border rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Zap size={16} /></div>
        <div>
          <h3 className="font-semibold text-gray-900">Integrations</h3>
          <p className="text-xs text-gray-500 mt-0.5">Payment providers, bank transfer, and logistics</p>
        </div>
      </div>

      {/* PBD Toggle */}
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Enable Pay Before Delivery (PBD)</p>
            <p className="text-xs text-gray-500 mt-0.5">Customers can pay online before their order is shipped. Requires a payment provider below.</p>
          </div>
          <label className="relative flex-shrink-0">
            <input type="checkbox" checked={!!values.pbdEnabled} onChange={e => set('pbdEnabled', e.target.checked)} className="sr-only peer" />
            <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </label>
        </div>
      </div>

      {/* Payment Provider */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-800">Payment Provider</p>
        <select
          value={values.paymentProvider ?? ''}
          onChange={e => set('paymentProvider', e.target.value || null)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {PAYMENT_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {values.paymentProvider && (
          <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Secret Key <span className="text-gray-400 font-normal">(server-side only — never exposed to browser)</span></label>
              <div className="relative">
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  value={form?.paymentProviderKey ?? ''}
                  onChange={e => set('paymentProviderKey', e.target.value)}
                  placeholder="Leave blank to keep existing key"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono pr-16 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                />
                <button type="button" onClick={() => setShowSecretKey(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                  {showSecretKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Public Key</label>
              <input
                value={values.paymentPublicKey ?? ''}
                onChange={e => set('paymentPublicKey', e.target.value)}
                placeholder="pk_live_... or pk_test_..."
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Webhook Signing Secret</label>
              <div className="relative">
                <input
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={form?.paymentWebhookSecret ?? ''}
                  onChange={e => set('paymentWebhookSecret', e.target.value)}
                  placeholder="Leave blank to keep existing secret"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono pr-16 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                />
                <button type="button" onClick={() => setShowWebhookSecret(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                  {showWebhookSecret ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {webhookUrl && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-medium mb-1">Configure this webhook URL in your {values.paymentProvider} dashboard:</p>
                <p className="text-xs font-mono text-blue-800 break-all">{webhookUrl}</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp Account for Payment Confirmations</label>
              <select
                value={values.paymentLinkAccountId ?? ''}
                onChange={e => set('paymentLinkAccountId', e.target.value || null)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              >
                <option value="">Use first connected account</option>
                {waAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.displayName} {a.status !== 'CONNECTED' ? '(disconnected)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bank Transfer Details */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Bank Transfer Details</p>
          <p className="text-xs text-gray-500 mt-0.5">Shown on the payment page when customers choose "Bank Transfer"</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
            <input value={values.bankName ?? ''} onChange={e => set('bankName', e.target.value)}
              placeholder="e.g. Zenith Bank"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
            <input value={values.bankAccountNumber ?? ''} onChange={e => set('bankAccountNumber', e.target.value)}
              placeholder="0123456789"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Account Name</label>
            <input value={values.bankAccountName ?? ''} onChange={e => set('bankAccountName', e.target.value)}
              placeholder="e.g. John Doe / My Store Ltd"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      {/* Logistics Provider (stub) */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Logistics Provider</p>
        <select disabled value={values.logisticsProvider ?? ''}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed">
          {LOGISTICS_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <p className="text-xs text-gray-400">Logistics integrations are coming soon — no provider is active yet.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => mutation.mutate(form ?? {})} disabled={mutation.isPending || !form}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : 'Save Integrations'}
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

// ── Audit Log Section ─────────────────────────────────────────────────────────
function AuditLogSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => client.get('/settings/audit-logs').then(r => r.data),
  });

  const logs = data ?? [];

  return (
    <div className="bg-white border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><History size={16} /></div>
        <h3 className="font-semibold text-gray-900">Audit Log</h3>
        <span className="ml-auto text-xs text-gray-400">Last 100 actions</span>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No audit logs yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-gray-500 uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Action</th>
                <th className="text-left py-2 pr-4">Entity</th>
                <th className="text-left py-2 pr-4">User</th>
                <th className="text-left py-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono text-gray-700">{log.action}</td>
                  <td className="py-2 pr-4 text-gray-500">{log.entityType} <span className="text-gray-400">{log.entityId?.slice(-6)}</span></td>
                  <td className="py-2 pr-4 text-gray-600">{log.user?.name ?? '—'}</td>
                  <td className="py-2 text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Test Email Button ─────────────────────────────────────────────────────────
function TestEmailButton() {
  const [to, setTo] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!to.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await client.post('/settings/test-email', { to: to.trim() });
      setResult({ ok: true, message: data.message, configured: data.configured });
    } catch (err) {
      const d = err.response?.data ?? {};
      setResult({ ok: false, message: d.error ?? 'Request failed', configured: d.configured });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
          <Send size={12} /> Test email configuration
        </button>
      ) : (
        <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2">
          <p className="text-xs font-medium text-blue-800">Send a test email to verify SMTP is working</p>
          <div className="flex gap-2">
            <input
              autoFocus
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="send test to this email..."
              className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              onKeyDown={e => e.key === 'Enter' && run()}
            />
            <button type="button" onClick={run} disabled={loading || !to.trim()}
              className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1">
              {loading ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block" /> Sending…</> : 'Send Test'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setResult(null); }}
              className="text-gray-400 hover:text-gray-600 px-1"><X size={14} /></button>
          </div>
          {result && (
            <div className={`text-xs rounded p-2 ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <p className="font-medium">{result.ok ? '✅ ' : '❌ '}{result.message}</p>
              {result.configured && (
                <div className="mt-1.5 space-y-0.5 font-mono">
                  {Object.entries(result.configured).map(([k, v]) => (
                    <p key={k}>{k}: <span className={v ? 'text-green-700' : 'text-red-600 font-bold'}>{v ?? '— NOT SET'}</span></p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your store and account preferences</p>
      </div>
      {isAdmin && <StoreSettingsSection />}
      {isAdmin && <OrderSettingsSection />}
      {isAdmin && <PendingOrderSection />}
      {isAdmin && <IntegrationsSection />}
      <ProfileSection />
      <PasswordSection />
      <SystemInfoSection />
      {isAdmin && <AuditLogSection />}
    </div>
  );
}
