import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import { Wifi, WifiOff, QrCode, RefreshCw, Plus, Trash2, Loader2, X, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const api = {
  list:    () => client.get('/whatsapp/accounts').then(r => r.data),
  create:  (d) => client.post('/whatsapp/accounts', d).then(r => r.data),
  getQR:   (id) => client.get(`/whatsapp/accounts/${id}/qr`).then(r => r.data),
  getState:(id) => client.get(`/whatsapp/accounts/${id}/state`).then(r => r.data),
  delete:  (id) => client.delete(`/whatsapp/accounts/${id}`).then(r => r.data),
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

function QRModal({ accountId, onClose }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['wa-qr', accountId],
    queryFn: () => api.getQR(accountId),
    refetchInterval: 20000,
  });
  const qrBase64 = data?.qrcode?.base64 || data?.base64 || data?.qrcode;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-semibold">Scan QR Code</h3>
            <p className="text-xs text-gray-500 mt-0.5">WhatsApp → Linked Devices → Link a Device</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          {isLoading ? (
            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm">{error.response?.data?.error ?? error.message}</p>
          ) : qrBase64 ? (
            <img src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
              alt="QR Code" className="w-52 h-52 border rounded-lg" />
          ) : (
            <div className="text-center text-sm text-gray-500 p-4">
              <p>Already connected or QR not available.</p>
              <pre className="text-xs mt-2 bg-gray-50 p-2 rounded max-h-40 overflow-auto text-left">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
          <button onClick={() => refetch()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <RefreshCw size={13} /> Refresh QR
          </button>
        </div>
      </div>
    </div>
  );
}

function AddAccountModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ instanceName: '', displayName: '' });
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: api.create,
    onSuccess: () => { qc.invalidateQueries(['wa-accounts']); onClose(); },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed to create'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold">Add WhatsApp Account</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Instance Name *</label>
            <input value={form.instanceName} onChange={e => setForm(f => ({...f, instanceName: e.target.value}))}
              placeholder="e.g. Versacommerce"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <p className="text-xs text-gray-400 mt-1">Enter a new name to create, or an existing Evolution API instance name to connect it</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
            <input value={form.displayName} onChange={e => setForm(f => ({...f, displayName: e.target.value}))}
              placeholder="e.g. Business WA"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.instanceName}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Add Account
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
  const [qrAccountId, setQrAccountId] = useState(null);
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
          <p className="text-sm text-gray-500">Manage Evolution API instances</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={15} /> Add Account
        </button>
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Phone size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No WhatsApp accounts connected</p>
          <p className="text-sm text-gray-400 mt-1">Add an Evolution API instance to start sending messages</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-4 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            Add First Account
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{acc.displayName || acc.instanceName}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{acc.instanceName}</p>
                  {acc.phoneNumber && <p className="text-xs text-gray-500 mt-0.5">{acc.phoneNumber}</p>}
                </div>
                <StatusBadge status={acc.status} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setQrAccountId(acc.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 border rounded-lg py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                  <QrCode size={13} /> QR Code
                </button>
                <button onClick={() => refreshMutation.mutate(acc.id)} disabled={refreshMutation.isPending}
                  className="flex items-center justify-center border rounded-lg py-1.5 px-3 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  <RefreshCw size={13} className={refreshMutation.isPending ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => { if(confirm(`Delete ${acc.displayName || acc.instanceName}?`)) deleteMutation.mutate(acc.id); }}
                  className="flex items-center justify-center border rounded-lg py-1.5 px-3 text-xs text-red-500 hover:bg-red-50">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} />}
      {qrAccountId && <QRModal accountId={qrAccountId} onClose={() => setQrAccountId(null)} />}
    </div>
  );
}
