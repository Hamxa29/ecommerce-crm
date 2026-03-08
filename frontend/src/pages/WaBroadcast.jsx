import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import client from '@/api/client';
import { ORDER_STATUSES, NIGERIA_STATES } from '@/lib/constants';
import { formatNGN, formatDate } from '@/lib/utils';
import { Send, Search, Loader2, CheckSquare, Radio } from 'lucide-react';

const api = {
  listAccounts:  () => client.get('/whatsapp/accounts').then(r => r.data),
  listTemplates: (accountId) => client.get('/whatsapp/templates', { params: { accountId } }).then(r => r.data),
  listOrders:    (p) => client.get('/orders', { params: p }).then(r => r.data),
  broadcast:     (d) => client.post('/whatsapp/broadcast', d).then(r => r.data),
};

export default function WaBroadcast() {
  const [accountId, setAccountId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);

  const { data: accounts = [] } = useQuery({ queryKey: ['wa-accounts'], queryFn: api.listAccounts });
  const { data: templates = [] } = useQuery({
    queryKey: ['wa-templates', accountId],
    queryFn: () => api.listTemplates(accountId),
    enabled: !!accountId,
  });
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-broadcast', statusFilter, stateFilter, search],
    queryFn: () => api.listOrders({ status: statusFilter || undefined, state: stateFilter || undefined, search: search || undefined, limit: 100 }),
    enabled: !!accountId,
  });

  const orders = ordersData?.data ?? [];

  const broadcastMutation = useMutation({
    mutationFn: api.broadcast,
    onSuccess: (data) => { setResults(data); setSelectedIds([]); },
  });

  const toggleAll = () => setSelectedIds(
    selectedIds.length === orders.length ? [] : orders.map(o => o.id)
  );

  const handleSend = () => {
    if (!accountId || selectedIds.length === 0) return;
    if (!useCustom && !templateId) return;
    broadcastMutation.mutate({
      accountId,
      orderIds: selectedIds,
      templateId: useCustom ? undefined : templateId,
      customMessage: useCustom ? customMessage : undefined,
    });
  };

  const sentCount = results?.filter(r => r.success).length ?? 0;
  const failCount = results?.filter(r => !r.success).length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">WhatsApp Broadcast</h2>
        <p className="text-sm text-gray-500">Send personalized messages to selected orders</p>
      </div>

      {/* Step 1: Account + Template */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Step 1 — Choose Account & Message</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp Account *</label>
            <select value={accountId} onChange={e => { setAccountId(e.target.value); setTemplateId(''); }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Select account...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.displayName || a.instanceName} — {a.status}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Message Source</label>
            <div className="flex gap-2">
              <button onClick={() => setUseCustom(false)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border ${!useCustom ? 'bg-primary text-white border-primary' : 'text-gray-600 hover:bg-gray-50'}`}>
                Use Template
              </button>
              <button onClick={() => setUseCustom(true)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border ${useCustom ? 'bg-primary text-white border-primary' : 'text-gray-600 hover:bg-gray-50'}`}>
                Custom Message
              </button>
            </div>
          </div>
        </div>

        {!useCustom ? (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Template</label>
            <select value={templateId} onChange={e => setTemplateId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Select template...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.messageType})</option>)}
            </select>
            {templateId && (
              <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 p-2 rounded whitespace-pre-line">
                {templates.find(t => t.id === templateId)?.content}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Custom Message</label>
            <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} rows={4}
              placeholder="Type your message... Use [customername], [ordernumber], [productname] etc."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
        )}
      </div>

      {/* Step 2: Select Orders */}
      {accountId && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Step 2 — Select Recipients</h3>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">All Status</option>
              {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">All States</option>
              {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b px-4 py-2 flex items-center gap-3 text-xs text-gray-500">
              <input type="checkbox" checked={selectedIds.length === orders.length && orders.length > 0} onChange={toggleAll} />
              <span>{selectedIds.length > 0 ? `${selectedIds.length} selected` : `${orders.length} orders`}</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y">
              {ordersLoading ? (
                <div className="p-4 text-center text-sm text-gray-500">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No orders found</div>
              ) : orders.map(o => (
                <label key={o.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selectedIds.includes(o.id)}
                    onChange={() => setSelectedIds(prev => prev.includes(o.id) ? prev.filter(x => x !== o.id) : [...prev, o.id])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{o.customerName}</p>
                    <p className="text-xs text-gray-400">{o.customerPhone} · {o.state} · {o.status}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{formatNGN(o.totalAmount)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Send button */}
      {accountId && (
        <div className="flex items-center justify-between bg-white rounded-xl border p-4">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Ready to send to <span className="text-primary">{selectedIds.length}</span> recipients
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Messages will be sent with a delay between each</p>
          </div>
          <button onClick={handleSend}
            disabled={broadcastMutation.isPending || selectedIds.length === 0 || (!useCustom && !templateId) || (useCustom && !customMessage)}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {broadcastMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {broadcastMutation.isPending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Broadcast Results</h3>
          <div className="flex gap-4">
            <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{sentCount}</p>
              <p className="text-xs text-green-600 mt-0.5">Sent Successfully</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{failCount}</p>
              <p className="text-xs text-red-500 mt-0.5">Failed</p>
            </div>
          </div>
          {failCount > 0 && (
            <div className="mt-3 space-y-1">
              {results.filter(r => !r.success).map(r => (
                <p key={r.orderId} className="text-xs text-red-500">Order {r.orderId}: {r.error}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
