import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import { ORDER_STATUSES } from '@/lib/constants';
import { Plus, Pencil, Trash2, Loader2, X, Zap, ToggleLeft, ToggleRight } from 'lucide-react';

const api = {
  list:        () => client.get('/whatsapp/automation').then(r => r.data),
  listAccounts:() => client.get('/whatsapp/accounts').then(r => r.data),
  listTemplates:(accountId) => client.get('/whatsapp/templates', { params: { accountId } }).then(r => r.data),
  create:      (d) => client.post('/whatsapp/automation', d).then(r => r.data),
  update:      (id, d) => client.put(`/whatsapp/automation/${id}`, d).then(r => r.data),
  delete:      (id) => client.delete(`/whatsapp/automation/${id}`).then(r => r.data),
};

function RuleModal({ rule, accounts, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    accountId: rule?.accountId ?? (accounts[0]?.id ?? ''),
    triggerStatus: rule?.triggerStatus ?? 'CONFIRMED',
    templateId: rule?.templateId ?? '',
    customMessage: rule?.customMessage ?? '',
    delayMinutes: rule?.delayMinutes ?? 0,
    enabled: rule?.enabled ?? true,
  });
  const [error, setError] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['wa-templates', form.accountId],
    queryFn: () => api.listTemplates(form.accountId),
    enabled: !!form.accountId,
  });

  const mutation = useMutation({
    mutationFn: rule ? (d) => api.update(rule.id, d) : api.create,
    onSuccess: () => { qc.invalidateQueries(['wa-automation']); onClose(); },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h3 className="font-semibold">{rule ? 'Edit Rule' : 'New Automation Rule'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp Account *</label>
            <select value={form.accountId} onChange={e => setForm(f => ({...f, accountId: e.target.value, templateId: ''}))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.displayName || a.instanceName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Trigger — When order status becomes *</label>
            <select value={form.triggerStatus} onChange={e => setForm(f => ({...f, triggerStatus: e.target.value}))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Template (or write custom below)</label>
            <select value={form.templateId} onChange={e => setForm(f => ({...f, templateId: e.target.value}))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— No template (use custom message) —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {!form.templateId && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Custom Message</label>
              <textarea value={form.customMessage} onChange={e => setForm(f => ({...f, customMessage: e.target.value}))} rows={3}
                placeholder="Use [customername], [ordernumber], etc."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Delay (minutes after trigger)</label>
            <input type="number" min="0" value={form.delayMinutes} onChange={e => setForm(f => ({...f, delayMinutes: Number(e.target.value)}))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <p className="text-xs text-gray-400 mt-0.5">0 = send immediately</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({...f, enabled: e.target.checked}))} />
            <span className="text-sm text-gray-700">Rule enabled</span>
          </label>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !form.accountId || (!form.templateId && !form.customMessage)}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              {rule ? 'Save Changes' : 'Create Rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WaAutomation() {
  const qc = useQueryClient();
  const [editRule, setEditRule] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: rules = [], isLoading } = useQuery({ queryKey: ['wa-automation'], queryFn: api.list });
  const { data: accounts = [] } = useQuery({ queryKey: ['wa-accounts'], queryFn: api.listAccounts });

  const deleteMutation = useMutation({
    mutationFn: api.delete,
    onSuccess: () => qc.invalidateQueries(['wa-automation']),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => api.update(id, { enabled }),
    onSuccess: () => qc.invalidateQueries(['wa-automation']),
  });

  const statusLabel = (v) => ORDER_STATUSES.find(s => s.value === v)?.label ?? v;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">WhatsApp Automation</h2>
          <p className="text-sm text-gray-500">Auto-send messages when order status changes</p>
        </div>
        <button onClick={() => setShowAdd(true)} disabled={accounts.length === 0}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          <Plus size={15} /> New Rule
        </button>
      </div>

      {accounts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
          Connect a WhatsApp account first to create automation rules.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Zap size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No automation rules</p>
          <p className="text-sm text-gray-400 mt-1">Create rules to send WhatsApp messages automatically</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className={`bg-white rounded-xl border p-5 ${!rule.enabled ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Zap size={14} className="text-yellow-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-800">When order becomes</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{statusLabel(rule.triggerStatus)}</span>
                    {rule.delayMinutes > 0 && (
                      <span className="text-xs text-gray-400">after {rule.delayMinutes} min</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Account: {rule.account?.displayName ?? rule.accountId} ·{' '}
                    {rule.templateId ? 'Template' : 'Custom message'} ·{' '}
                    Sent: {rule.sentCount ?? 0}
                  </p>
                  {!rule.templateId && rule.customMessage && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{rule.customMessage}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })}
                    className={`text-${rule.enabled ? 'green' : 'gray'}-500 hover:opacity-80`}>
                    {rule.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button onClick={() => setEditRule(rule)}
                    className="p-1.5 border rounded-lg text-gray-500 hover:bg-gray-50"><Pencil size={14} /></button>
                  <button onClick={() => { if(confirm('Delete this rule?')) deleteMutation.mutate(rule.id); }}
                    className="p-1.5 border rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editRule) && (
        <RuleModal
          rule={editRule}
          accounts={accounts}
          onClose={() => { setShowAdd(false); setEditRule(null); }}
        />
      )}
    </div>
  );
}
