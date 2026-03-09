import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import {
  Wifi, WifiOff, QrCode, RefreshCw, Plus, Trash2,
  Loader2, X, Phone, CheckCircle, AlertCircle, Clock,
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

function QRModal({ accountId, instanceName, onClose, onConnected }) {
  const qc = useQueryClient();
  const [countdown, setCountdown] = useState(30);
  const [connected, setConnected] = useState(false);
  const countdownRef = useRef(null);
  const pollRef = useRef(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['wa-qr', accountId],
    queryFn: () => api.getQR(accountId),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const qrBase64 = data?.qrcode?.base64 || data?.base64 || data?.qrcode;
  const isAlreadyConnected = !qrBase64 && data && !error;

  // Countdown timer — resets when QR is refreshed
  useEffect(() => {
    if (!qrBase64) return;
    setCountdown(30);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          refetch(); // auto-refresh QR when expired
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [qrBase64]);

  // Poll connection state every 3s while QR is visible
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const { status } = await api.getState(accountId);
        if (status === 'CONNECTED') {
          clearInterval(pollRef.current);
          setConnected(true);
          qc.invalidateQueries(['wa-accounts']);
          setTimeout(onConnected, 2000); // close after showing success
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [accountId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Connect WhatsApp</h3>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{instanceName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        {/* Step instructions */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How to scan</p>
          <ol className="space-y-1.5 text-xs text-gray-600">
            <li className="flex items-start gap-2"><span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>Open WhatsApp on your phone</li>
            <li className="flex items-start gap-2"><span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>Tap <strong>⋮ Menu</strong> → <strong>Linked Devices</strong></li>
            <li className="flex items-start gap-2"><span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>Tap <strong>Link a Device</strong> → point camera at QR below</li>
          </ol>
        </div>

        {/* QR area */}
        <div className="px-5 py-4 flex flex-col items-center gap-3">
          {connected ? (
            <div className="w-52 h-52 flex flex-col items-center justify-center gap-3">
              <CheckCircle size={56} className="text-green-500" />
              <p className="font-semibold text-green-700">Connected!</p>
              <p className="text-xs text-gray-400 text-center">WhatsApp is now linked. This window will close.</p>
            </div>
          ) : isLoading || isFetching ? (
            <div className="w-52 h-52 bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-2">
              <Loader2 size={28} className="animate-spin text-gray-400" />
              <p className="text-xs text-gray-400">Loading QR code...</p>
            </div>
          ) : error ? (
            <div className="w-52 h-52 bg-red-50 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center">
              <AlertCircle size={28} className="text-red-400" />
              <p className="text-xs text-red-500 font-medium">Could not load QR</p>
              <p className="text-xs text-red-400">{error.response?.data?.error ?? error.message}</p>
            </div>
          ) : isAlreadyConnected ? (
            <div className="w-52 h-52 bg-green-50 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center">
              <CheckCircle size={36} className="text-green-500" />
              <p className="text-sm font-semibold text-green-700">Already Connected</p>
              <p className="text-xs text-gray-500">This WhatsApp number is already linked. Use the refresh button on the card to update status.</p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                alt="WhatsApp QR Code"
                className="w-52 h-52 border-2 border-gray-200 rounded-xl"
              />
              {/* Countdown badge */}
              <div className={cn(
                'absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
                countdown <= 5 ? 'bg-red-500 text-white' : 'bg-black/60 text-white'
              )}>
                <Clock size={10} />
                {countdown}s
              </div>
            </div>
          )}

          {!connected && !isAlreadyConnected && (
            <button
              onClick={() => { setCountdown(30); refetch(); }}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
              Refresh QR manually
            </button>
          )}

          {/* Auto-poll notice */}
          {!connected && (
            <p className="text-xs text-gray-400 text-center">
              Checking connection automatically every 3 seconds...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddAccountModal({ onClose, onAccountCreated }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ instanceName: '', displayName: '' });
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: api.create,
    onSuccess: (account) => {
      qc.invalidateQueries(['wa-accounts']);
      onAccountCreated(account); // immediately open QR for this account
    },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed to create account'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold">Add WhatsApp Account</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* How it works */}
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">How this works:</p>
            <p>Enter your Evolution API instance name. After adding, you'll get a QR code to scan with your WhatsApp app.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Instance Name *</label>
            <input
              value={form.instanceName}
              onChange={e => setForm(f => ({ ...f, instanceName: e.target.value }))}
              placeholder="e.g. Versacommerce"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Must match the instance name in your Evolution API panel</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Display Name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="e.g. Business WhatsApp"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs rounded-lg p-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !form.instanceName.trim()}
              className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <><Loader2 size={13} className="animate-spin" /> Adding...</> : 'Add & Get QR Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WaAccounts() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [qrAccount, setQrAccount] = useState(null); // { id, instanceName }

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['wa-accounts'],
    queryFn: api.list,
    refetchInterval: 30000,
  });

  const refreshMutation = useMutation({
    mutationFn: api.getState,
    onSuccess: () => qc.invalidateQueries(['wa-accounts']),
  });

  const deleteMutation = useMutation({
    mutationFn: api.delete,
    onSuccess: () => qc.invalidateQueries(['wa-accounts']),
  });

  const handleAccountCreated = (account) => {
    setShowAdd(false);
    setQrAccount({ id: account.id, instanceName: account.instanceName });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">WhatsApp Accounts</h2>
          <p className="text-sm text-gray-500">Connect via Evolution API instance</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus size={15} /> Add Account
        </button>
      </div>

      {/* How to connect guide (shown always) */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-800 mb-2">Quick setup guide</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { step: '1', text: 'Click "Add Account" and enter your Evolution API instance name (e.g. Versacommerce)' },
            { step: '2', text: 'A QR code will appear. Open WhatsApp → Menu → Linked Devices → Link a Device' },
            { step: '3', text: 'Point your camera at the QR. The status will update to CONNECTED automatically' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-2">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{step}</span>
              <p className="text-xs text-blue-700">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accounts list */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Phone size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No accounts added yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Add your Evolution API instance to start sending WhatsApp messages</p>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            Add First Account
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(acc => (
            <div key={acc.id} className={cn(
              'bg-white rounded-xl border p-5 space-y-3 transition',
              acc.status === 'CONNECTED' && 'border-green-200 shadow-sm shadow-green-50'
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{acc.displayName || acc.instanceName}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{acc.instanceName}</p>
                  {acc.phoneNumber && (
                    <p className="text-xs text-gray-500 mt-1">📱 {acc.phoneNumber}</p>
                  )}
                </div>
                <StatusBadge status={acc.status} />
              </div>

              {acc.status !== 'CONNECTED' && (
                <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
                  Click <strong>Scan QR</strong> to connect this account
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setQrAccount({ id: acc.id, instanceName: acc.instanceName })}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 border rounded-lg py-2 text-xs font-medium transition',
                    acc.status === 'CONNECTED'
                      ? 'text-gray-500 hover:bg-gray-50'
                      : 'bg-primary text-white border-primary hover:bg-primary/90'
                  )}
                >
                  <QrCode size={13} />
                  {acc.status === 'CONNECTED' ? 'QR / Re-link' : 'Scan QR'}
                </button>
                <button
                  onClick={() => refreshMutation.mutate(acc.id)}
                  disabled={refreshMutation.isPending}
                  title="Refresh connection status"
                  className="flex items-center justify-center border rounded-lg py-2 px-3 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <RefreshCw size={13} className={refreshMutation.isPending ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${acc.displayName || acc.instanceName}"?`)) deleteMutation.mutate(acc.id); }}
                  title="Delete account"
                  className="flex items-center justify-center border rounded-lg py-2 px-3 text-xs text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddAccountModal
          onClose={() => setShowAdd(false)}
          onAccountCreated={handleAccountCreated}
        />
      )}
      {qrAccount && (
        <QRModal
          accountId={qrAccount.id}
          instanceName={qrAccount.instanceName}
          onClose={() => setQrAccount(null)}
          onConnected={() => setQrAccount(null)}
        />
      )}
    </div>
  );
}
