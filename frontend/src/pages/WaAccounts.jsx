import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import {
  Wifi, WifiOff, QrCode, RefreshCw, Plus, Trash2,
  Loader2, X, Phone, CheckCircle, AlertCircle, Clock, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const api = {
  list:     () => client.get('/whatsapp/accounts').then(r => r.data),
  create:   (d) => client.post('/whatsapp/accounts', d).then(r => r.data),
  getQR:    (id) => client.get(`/whatsapp/accounts/${id}/qr`).then(r => r.data),
  getState: (id) => client.get(`/whatsapp/accounts/${id}/state`).then(r => r.data),
  delete:   (id) => client.delete(`/whatsapp/accounts/${id}`).then(r => r.data),
};

function StatusBadge({ status }) {
  const map = {
    CONNECTED:    'bg-green-100 text-green-700',
    DISCONNECTED: 'bg-gray-100 text-gray-500',
    CONNECTING:   'bg-yellow-100 text-yellow-700',
    EXPIRED:      'bg-red-100 text-red-600',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', map[status] ?? map.DISCONNECTED)}>
      {status === 'CONNECTED' ? <Wifi size={10} /> : <WifiOff size={10} />}
      {status}
    </span>
  );
}

// ── Shared QR display used by both modals ─────────────────────────────────────
function QRDisplay({ accountId, onConnected }) {
  const qc = useQueryClient();
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['wa-qr', accountId],
    queryFn: () => api.getQR(accountId),
    refetchOnWindowFocus: false,
    retry: 0, // don't retry on 404
  });

  const qrBase64 = data?.qrcode?.base64 || data?.base64 || data?.qrcode;

  // Countdown → auto-refresh
  useEffect(() => {
    if (!qrBase64) return;
    setCountdown(30);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(countdownRef.current); refetch(); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [qrBase64]);

  // Poll state every 3s
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      while (!stopped) {
        await new Promise(r => setTimeout(r, 3000));
        if (stopped) break;
        try {
          const { status } = await api.getState(accountId);
          if (status === 'CONNECTED') {
            stopped = true;
            qc.invalidateQueries(['wa-accounts']);
            onConnected();
            break;
          }
        } catch { /* ignore */ }
      }
    };
    poll();
    return () => { stopped = true; };
  }, [accountId]);

  if (isLoading || isFetching) {
    return (
      <div className="w-52 h-52 bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-2">
        <Loader2 size={28} className="animate-spin text-gray-400" />
        <p className="text-xs text-gray-400">Loading QR code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-52 bg-red-50 rounded-xl flex flex-col items-center justify-center gap-2 p-6 text-center">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-xs text-red-600 font-semibold">Could not load QR</p>
        <p className="text-xs text-red-400">{error.response?.data?.error ?? error.message}</p>
        <button onClick={() => refetch()} className="mt-2 text-xs text-primary underline">Try again</button>
      </div>
    );
  }

  if (!qrBase64) return null;

  return (
    <>
      <div className="relative">
        <img
          src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
          alt="WhatsApp QR Code"
          className="w-52 h-52 border-2 border-gray-200 rounded-xl"
        />
        <div className={cn(
          'absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
          countdown <= 5 ? 'bg-red-500 text-white' : 'bg-black/60 text-white'
        )}>
          <Clock size={10} />{countdown}s
        </div>
      </div>
      <button
        onClick={() => { setCountdown(30); refetch(); }}
        disabled={isFetching}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
      >
        <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
        Refresh QR
      </button>
      <p className="text-xs text-gray-400">Checking connection every 3 seconds...</p>
    </>
  );
}

// ── Add new account modal ─────────────────────────────────────────────────────
function ConnectModal({ onClose }) {
  const qc = useQueryClient();
  // steps: 'name' | 'checking' | 'qr' | 'done'
  const [step, setStep] = useState('name');
  const [instanceName, setInstanceName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountId, setAccountId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const proceed = async () => {
    if (!instanceName.trim()) return;
    setSaving(true);
    setError('');
    try {
      // 1. Create (or get existing) account in DB
      const acc = await api.create({ instanceName: instanceName.trim(), displayName: displayName.trim() || instanceName.trim() });
      setAccountId(acc.id);
      qc.invalidateQueries(['wa-accounts']);

      // 2. Check if already connected — skip QR entirely
      setStep('checking');
      try {
        const { status } = await api.getState(acc.id);
        if (status === 'CONNECTED') {
          setStep('done');
          qc.invalidateQueries(['wa-accounts']);
          return;
        }
      } catch { /* state check failed — proceed to QR anyway */ }

      // 3. Not connected → show QR
      setStep('qr');
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Something went wrong');
      setStep('name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">

        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">
              {step === 'done' ? 'Connected!' : step === 'qr' ? 'Scan QR Code' : 'Add WhatsApp Account'}
            </h3>
            {(step === 'qr' || step === 'checking') && (
              <p className="text-xs text-gray-500 font-mono mt-0.5">{instanceName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        {/* ── Enter name ── */}
        {step === 'name' && (
          <div className="p-5 space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">How this works</p>
              <p>Enter your Evolution API instance name. If it's already connected, we'll detect that automatically.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Instance Name *</label>
              <input
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && instanceName.trim() && proceed()}
                placeholder="e.g. Versacommerce"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Must match your Evolution API panel exactly</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Display Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Business WhatsApp"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm hover:bg-gray-50">Cancel</button>
              <button
                onClick={proceed}
                disabled={saving || !instanceName.trim()}
                className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={13} className="animate-spin" />Checking...</> : <>Continue <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Checking state ── */}
        {step === 'checking' && (
          <div className="p-10 flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-primary" />
            <p className="text-sm text-gray-600">Checking connection status...</p>
          </div>
        )}

        {/* ── QR step ── */}
        {step === 'qr' && accountId && (
          <>
            <div className="px-5 pt-4 pb-2">
              <ol className="space-y-1.5 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  Open WhatsApp on your phone
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  Tap <strong>⋮ Menu</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  Point your camera at the QR code below
                </li>
              </ol>
            </div>
            <div className="px-5 py-4 flex flex-col items-center gap-3">
              <QRDisplay accountId={accountId} onConnected={() => setStep('done')} />
            </div>
          </>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle size={60} className="text-green-500" />
            <div>
              <p className="text-xl font-bold text-gray-900">WhatsApp Connected!</p>
              <p className="text-sm text-gray-500 mt-1">
                <strong>{instanceName}</strong> is linked and ready to send messages.
              </p>
            </div>
            <button onClick={onClose} className="mt-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Re-link existing account ──────────────────────────────────────────────────
function ReconnectModal({ account, onClose }) {
  const qc = useQueryClient();
  // steps: 'checking' | 'qr' | 'done'
  const [step, setStep] = useState('checking');

  // On mount: check if already connected
  useEffect(() => {
    (async () => {
      try {
        const { status } = await api.getState(account.id);
        if (status === 'CONNECTED') {
          qc.invalidateQueries(['wa-accounts']);
          setStep('done');
          return;
        }
      } catch { /* state check failed — try QR */ }
      setStep('qr');
    })();
  }, [account.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold">{step === 'done' ? 'Already Connected' : 'Scan QR Code'}</h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{account.instanceName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        {step === 'checking' && (
          <div className="p-10 flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-primary" />
            <p className="text-sm text-gray-600">Checking connection...</p>
          </div>
        )}

        {step === 'qr' && (
          <>
            <div className="px-5 pt-3 pb-1">
              <ol className="space-y-1 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  Open WhatsApp → <strong>⋮ Menu</strong> → <strong>Linked Devices</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  Tap <strong>Link a Device</strong> and scan below
                </li>
              </ol>
            </div>
            <div className="px-5 py-4 flex flex-col items-center gap-3">
              <QRDisplay
                accountId={account.id}
                onConnected={() => { setStep('done'); setTimeout(onClose, 2000); }}
              />
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle size={60} className="text-green-500" />
            <div>
              <p className="text-xl font-bold text-gray-900">Connected!</p>
              <p className="text-sm text-gray-500 mt-1">{account.displayName || account.instanceName} is active.</p>
            </div>
            <button onClick={onClose} className="mt-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WaAccounts() {
  const qc = useQueryClient();
  const [showConnect, setShowConnect] = useState(false);
  const [reconnectAccount, setReconnectAccount] = useState(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['wa-accounts'],
    queryFn: api.list,
    refetchInterval: 30000,
  });

  const [refreshingIds, setRefreshingIds] = useState(new Set());

  const refreshAccount = async (id) => {
    setRefreshingIds(prev => new Set(prev).add(id));
    try {
      await api.getState(id);
      qc.invalidateQueries(['wa-accounts']);
    } finally {
      setRefreshingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: api.delete,
    onSuccess: () => qc.invalidateQueries(['wa-accounts']),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">WhatsApp Accounts</h2>
          <p className="text-sm text-gray-500">Connect via Evolution API instance</p>
        </div>
        <button
          onClick={() => setShowConnect(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus size={15} /> Add Account
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-800 mb-2">Quick setup guide</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { step: '1', text: 'Click "Add Account" and enter your Evolution API instance name (e.g. Versacommerce)' },
            { step: '2', text: 'If not yet connected, a QR code appears — open WhatsApp → Linked Devices → Link a Device' },
            { step: '3', text: 'Scan the QR. If already connected in Evolution API, status updates automatically' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-2">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{step}</span>
              <p className="text-xs text-blue-700">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Phone size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No accounts added yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Add your Evolution API instance to start sending messages</p>
          <button onClick={() => setShowConnect(true)}
            className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            Add First Account
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(acc => (
            <div key={acc.id} className={cn(
              'bg-white rounded-xl border p-5 space-y-3 transition',
              acc.status === 'CONNECTED' && 'border-green-200 shadow-sm'
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{acc.displayName || acc.instanceName}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{acc.instanceName}</p>
                  {acc.phoneNumber && <p className="text-xs text-gray-500 mt-1">📱 {acc.phoneNumber}</p>}
                </div>
                <StatusBadge status={acc.status} />
              </div>

              {acc.status !== 'CONNECTED' && (
                <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
                  Click <strong>Scan QR</strong> to connect
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setReconnectAccount(acc)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 border rounded-lg py-2 text-xs font-medium transition',
                    acc.status === 'CONNECTED'
                      ? 'text-gray-500 hover:bg-gray-50'
                      : 'bg-primary text-white border-primary hover:bg-primary/90'
                  )}
                >
                  <QrCode size={13} />
                  {acc.status === 'CONNECTED' ? 'Re-link QR' : 'Scan QR'}
                </button>
                <button
                  onClick={() => refreshAccount(acc.id)}
                  disabled={refreshingIds.has(acc.id)}
                  title="Refresh status"
                  className="flex items-center justify-center border rounded-lg py-2 px-3 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <RefreshCw size={13} className={refreshingIds.has(acc.id) ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${acc.displayName || acc.instanceName}"?`)) deleteMutation.mutate(acc.id); }}
                  className="flex items-center justify-center border rounded-lg py-2 px-3 text-xs text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showConnect && <ConnectModal onClose={() => { setShowConnect(false); qc.invalidateQueries(['wa-accounts']); }} />}
      {reconnectAccount && <ReconnectModal account={reconnectAccount} onClose={() => { setReconnectAccount(null); qc.invalidateQueries(['wa-accounts']); }} />}
    </div>
  );
}
