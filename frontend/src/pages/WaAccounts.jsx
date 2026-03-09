import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import {
  Wifi, WifiOff, QrCode, RefreshCw, Plus, Trash2,
  Loader2, X, Phone, CheckCircle, AlertCircle, Clock, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const api = {
  list:        () => client.get('/whatsapp/accounts').then(r => r.data),
  create:      (d) => client.post('/whatsapp/accounts', d).then(r => r.data),
  getQRDirect: (n) => client.get(`/whatsapp/qr-direct/${encodeURIComponent(n)}`).then(r => r.data),
  getQR:       (id) => client.get(`/whatsapp/accounts/${id}/qr`).then(r => r.data),
  getState:    (id) => client.get(`/whatsapp/accounts/${id}/state`).then(r => r.data),
  delete:      (id) => client.delete(`/whatsapp/accounts/${id}`).then(r => r.data),
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

// ── Unified Connect Modal: enter name → QR → auto-save on connected ───────────
function ConnectModal({ onClose, presetInstanceName = '' }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(presetInstanceName ? 'qr' : 'name'); // 'name' | 'qr' | 'done'
  const [instanceName, setInstanceName] = useState(presetInstanceName);
  const [displayName, setDisplayName] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const countdownRef = useRef(null);
  const pollRef = useRef(null);

  // QR fetch — only runs in 'qr' step
  const { data: qrData, isLoading: qrLoading, error: qrError, refetch: refetchQR, isFetching: qrFetching } = useQuery({
    queryKey: ['wa-qr-direct', instanceName],
    queryFn: () => api.getQRDirect(instanceName),
    enabled: step === 'qr' && !!instanceName,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const qrBase64 = qrData?.qrcode?.base64 || qrData?.base64 || qrData?.qrcode;
  const isAlreadyConnected = step === 'qr' && !qrBase64 && qrData && !qrError;

  // Countdown timer
  useEffect(() => {
    if (step !== 'qr' || !qrBase64) return;
    setCountdown(30);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(countdownRef.current); refetchQR(); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [qrBase64, step]);

  // Poll for connection (find the account by instanceName)
  useEffect(() => {
    if (step !== 'qr') return;
    let stopped = false;

    const poll = async () => {
      while (!stopped) {
        await new Promise(r => setTimeout(r, 3000));
        if (stopped) break;
        try {
          // Check all accounts to find this one
          const accounts = await api.list();
          const acc = accounts.find(a => a.instanceName === instanceName);
          if (acc) {
            const { status } = await api.getState(acc.id);
            if (status === 'CONNECTED') {
              stopped = true;
              setConnected(true);
              qc.invalidateQueries(['wa-accounts']);
              setTimeout(() => { setStep('done'); }, 1500);
              break;
            }
          } else {
            // Account not in DB yet — just check Evolution API state directly via QR refresh
            // If QR data shows connected state we'll catch it on next refetch
          }
        } catch { /* ignore */ }
      }
    };

    poll();
    return () => { stopped = true; };
  }, [step, instanceName]);

  // Save to DB (create account) when proceeding to QR step
  const saveToDb = async () => {
    try {
      setSaving(true);
      await api.create({ instanceName, displayName: displayName || instanceName });
      qc.invalidateQueries(['wa-accounts']);
    } catch { /* already exists or error — ignore, QR still works */ }
    finally { setSaving(false); }
    setStep('qr');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">
              {step === 'name' ? 'Add WhatsApp Account' : step === 'done' ? 'Connected!' : 'Scan QR Code'}
            </h3>
            {step === 'qr' && <p className="text-xs text-gray-500 font-mono mt-0.5">{instanceName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        {/* ── Step 1: Enter instance name ── */}
        {step === 'name' && (
          <div className="p-5 space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">How this works</p>
              <p>Enter your Evolution API instance name, then scan the QR code with your WhatsApp.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Instance Name *</label>
              <input
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && instanceName.trim() && saveToDb()}
                placeholder="e.g. Versacommerce"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Must match the instance name in your Evolution API panel</p>
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

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={saveToDb}
                disabled={saving || !instanceName.trim()}
                className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={13} className="animate-spin" />Saving...</> : <>Get QR Code <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: QR Code ── */}
        {step === 'qr' && (
          <>
            {/* Instructions */}
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

            {/* QR Display */}
            <div className="px-5 py-4 flex flex-col items-center gap-3">
              {connected ? (
                <div className="w-52 h-52 flex flex-col items-center justify-center gap-3">
                  <CheckCircle size={56} className="text-green-500" />
                  <p className="font-semibold text-green-700 text-lg">Connected!</p>
                </div>
              ) : qrLoading || qrFetching ? (
                <div className="w-52 h-52 bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-2">
                  <Loader2 size={28} className="animate-spin text-gray-400" />
                  <p className="text-xs text-gray-400">Fetching QR code...</p>
                </div>
              ) : qrError ? (
                <div className="w-52 bg-red-50 rounded-xl flex flex-col items-center justify-center gap-2 p-6 text-center">
                  <AlertCircle size={28} className="text-red-400" />
                  <p className="text-xs text-red-600 font-semibold">Could not load QR</p>
                  <p className="text-xs text-red-400">{qrError.response?.data?.error ?? qrError.message}</p>
                  <p className="text-xs text-gray-400 mt-1">Make sure <strong>{instanceName}</strong> exists in your Evolution API panel</p>
                </div>
              ) : isAlreadyConnected ? (
                <div className="w-52 h-52 bg-green-50 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <CheckCircle size={36} className="text-green-500" />
                  <p className="text-sm font-semibold text-green-700">Already Connected</p>
                  <p className="text-xs text-gray-500">Click the refresh button on the card to update the status.</p>
                </div>
              ) : (
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
              )}

              {!connected && !isAlreadyConnected && (
                <button
                  onClick={() => { setCountdown(30); refetchQR(); }}
                  disabled={qrFetching}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
                >
                  <RefreshCw size={12} className={qrFetching ? 'animate-spin' : ''} />
                  Refresh QR
                </button>
              )}

              {!connected && (
                <p className="text-xs text-gray-400 text-center">Checking connection every 3 seconds...</p>
              )}
            </div>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle size={60} className="text-green-500" />
            <div>
              <p className="text-xl font-bold text-gray-900">WhatsApp Connected!</p>
              <p className="text-sm text-gray-500 mt-1">
                <strong>{instanceName}</strong> is now linked and ready to send messages.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── QR modal for existing accounts (re-link) ──────────────────────────────────
function ReconnectModal({ account, onClose }) {
  const qc = useQueryClient();
  const [countdown, setCountdown] = useState(30);
  const [connected, setConnected] = useState(false);
  const countdownRef = useRef(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['wa-qr', account.id],
    queryFn: () => api.getQR(account.id),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const qrBase64 = data?.qrcode?.base64 || data?.base64 || data?.qrcode;

  useEffect(() => {
    if (!qrBase64) return;
    setCountdown(30);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(countdownRef.current); refetch(); return 30; } return c - 1; });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [qrBase64]);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      while (!stopped) {
        await new Promise(r => setTimeout(r, 3000));
        if (stopped) break;
        try {
          const { status } = await api.getState(account.id);
          if (status === 'CONNECTED') {
            stopped = true;
            setConnected(true);
            qc.invalidateQueries(['wa-accounts']);
            setTimeout(onClose, 2000);
          }
        } catch { /* ignore */ }
      }
    };
    poll();
    return () => { stopped = true; };
  }, [account.id]);

  const isAlreadyConnected = !qrBase64 && data && !error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold">Scan QR Code</h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{account.instanceName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        <div className="px-5 pt-3 pb-1">
          <ol className="space-y-1 text-xs text-gray-600">
            <li className="flex items-start gap-2">
              <span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
              Open WhatsApp → <strong>⋮ Menu</strong> → <strong>Linked Devices</strong>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
              Tap <strong>Link a Device</strong> and point at QR below
            </li>
          </ol>
        </div>

        <div className="px-5 py-4 flex flex-col items-center gap-3">
          {connected ? (
            <div className="w-52 h-52 flex flex-col items-center justify-center gap-3">
              <CheckCircle size={52} className="text-green-500" />
              <p className="font-bold text-green-700">Connected!</p>
            </div>
          ) : isLoading || isFetching ? (
            <div className="w-52 h-52 bg-gray-100 rounded-xl flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="w-52 bg-red-50 rounded-xl p-6 text-center">
              <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
              <p className="text-xs text-red-500">{error.response?.data?.error ?? error.message}</p>
            </div>
          ) : isAlreadyConnected ? (
            <div className="w-52 h-52 bg-green-50 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center">
              <CheckCircle size={36} className="text-green-500" />
              <p className="text-sm font-semibold text-green-700">Already Connected</p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                alt="QR Code"
                className="w-52 h-52 border-2 border-gray-200 rounded-xl"
              />
              <div className={cn(
                'absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
                countdown <= 5 ? 'bg-red-500 text-white' : 'bg-black/60 text-white'
              )}>
                <Clock size={10} />{countdown}s
              </div>
            </div>
          )}
          {!connected && !isAlreadyConnected && (
            <button onClick={() => { setCountdown(30); refetch(); }} disabled={isFetching}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40">
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Refresh QR
            </button>
          )}
          {!connected && <p className="text-xs text-gray-400">Checking connection every 3 seconds...</p>}
        </div>
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

  const refreshMutation = useMutation({
    mutationFn: api.getState,
    onSuccess: () => qc.invalidateQueries(['wa-accounts']),
  });

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

      {/* Guide */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-800 mb-2">Quick setup guide</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { step: '1', text: 'Click "Add Account" and enter your Evolution API instance name (e.g. Versacommerce)' },
            { step: '2', text: 'A QR code will appear — open WhatsApp → Menu → Linked Devices → Link a Device' },
            { step: '3', text: 'Scan the QR with your camera. Status updates to CONNECTED automatically' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-2">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{step}</span>
              <p className="text-xs text-blue-700">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accounts */}
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
                  onClick={() => refreshMutation.mutate(acc.id)}
                  disabled={refreshMutation.isPending}
                  title="Refresh status"
                  className="flex items-center justify-center border rounded-lg py-2 px-3 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <RefreshCw size={13} className={refreshMutation.isPending ? 'animate-spin' : ''} />
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
      {reconnectAccount && <ReconnectModal account={reconnectAccount} onClose={() => setReconnectAccount(null)} />}
    </div>
  );
}
