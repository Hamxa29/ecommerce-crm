import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import { CheckCircle } from 'lucide-react';
import { ORDER_STATUSES } from '@/lib/constants';
import { STARTER_TEMPLATES } from './WaTemplates';
import { Plus, Pencil, Trash2, Loader2, X, Zap, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Save } from 'lucide-react';

const api = {
  list:           () => client.get('/whatsapp/automation').then(r => r.data),
  listAccounts:   () => client.get('/whatsapp/accounts').then(r => r.data),
  listTemplates:  (accountId) => client.get('/whatsapp/templates', { params: { accountId } }).then(r => r.data),
  create:         (d) => client.post('/whatsapp/automation', d).then(r => r.data),
  update:         (id, d) => client.put(`/whatsapp/automation/${id}`, d).then(r => r.data),
  delete:         (id) => client.delete(`/whatsapp/automation/${id}`).then(r => r.data),
  saveTemplate:   (d) => client.post('/whatsapp/templates', d).then(r => r.data),
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
  const [showStarters, setShowStarters] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['wa-templates', form.accountId],
    queryFn: () => api.listTemplates(form.accountId),
    enabled: !!form.accountId,
  });

  const mutation = useMutation({
    mutationFn: rule ? (d) => api.update(rule.id, d) : api.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wa-automation'] }); onClose(); },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed'),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (d) => api.saveTemplate(d),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['wa-templates'] });
      setForm(f => ({ ...f, templateId: saved.id, customMessage: '' }));
      setShowSaveAs(false);
      setSaveAsName('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed to save template'),
  });

  const useStarter = (starter) => {
    setForm(f => ({ ...f, templateId: '', customMessage: starter.content }));
    setShowStarters(false);
  };

  const handleSaveAsTemplate = () => {
    if (!saveAsName.trim()) return;
    saveTemplateMutation.mutate({
      accountId: form.accountId,
      name: saveAsName.trim(),
      messageType: 'custom',
      content: form.customMessage,
    });
  };

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
            <label className="block text-xs font-medium text-gray-700 mb-1">Saved Template (or write custom below)</label>
            <select value={form.templateId} onChange={e => setForm(f => ({...f, templateId: e.target.value}))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— No template (use custom message) —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Starter Templates picker */}
          <div className="border border-blue-200 rounded-lg overflow-hidden">
            <button type="button" onClick={() => setShowStarters(s => !s)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-50 text-left">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-blue-500" />
                <span className="text-xs font-semibold text-blue-700">Use a Starter Template</span>
              </div>
              {showStarters ? <ChevronUp size={13} className="text-blue-400" /> : <ChevronDown size={13} className="text-blue-400" />}
            </button>
            {showStarters && (
              <div className="divide-y max-h-52 overflow-y-auto">
                {STARTER_TEMPLATES.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-medium text-gray-800 truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-400 line-clamp-1 font-mono mt-0.5">{s.content.slice(0, 60)}…</p>
                    </div>
                    <button type="button" onClick={() => useStarter(s)}
                      className="text-xs bg-primary text-white px-2.5 py-1 rounded-lg hover:bg-primary/90 shrink-0">
                      Use
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!form.templateId && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Custom Message</label>
              <textarea value={form.customMessage} onChange={e => setForm(f => ({...f, customMessage: e.target.value}))} rows={5}
                placeholder="Hi {{customername}}! Your order {{ordernumber}} has been confirmed..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono" />
              <div className="mt-1.5">
                <p className="text-[10px] text-gray-400 mb-1">Click to insert variable:</p>
                <div className="flex flex-wrap gap-1">
                  {['{{customername}}','{{ordernumber}}','{{productname}}','{{productprice}}','{{customerphone}}','{{individual_state}}','{{formlink}}'].map(v => (
                    <button key={v} type="button"
                      onClick={() => setForm(f => ({...f, customMessage: f.customMessage + v}))}
                      className="text-[10px] bg-gray-100 hover:bg-primary/10 hover:text-primary border border-gray-200 rounded px-1.5 py-0.5 font-mono transition">
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save as template */}
              {form.customMessage.trim() && (
                <div className="mt-3">
                  {saveSuccess && (
                    <p className="text-xs text-green-600 font-medium mb-1.5">✓ Saved as template and selected</p>
                  )}
                  {!showSaveAs ? (
                    <button type="button" onClick={() => setShowSaveAs(true)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <Save size={12} /> Save as template for reuse
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={saveAsName}
                        onChange={e => setSaveAsName(e.target.value)}
                        placeholder="Template name..."
                        className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveAsTemplate(); if (e.key === 'Escape') setShowSaveAs(false); }}
                      />
                      <button type="button" onClick={handleSaveAsTemplate}
                        disabled={!saveAsName.trim() || saveTemplateMutation.isPending}
                        className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1">
                        {saveTemplateMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                        Save
                      </button>
                      <button type="button" onClick={() => setShowSaveAs(false)} className="text-gray-400 hover:text-gray-600 px-1">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
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
            <span className="text-sm text-gray-700">
              Active <span className="text-gray-400 font-normal text-xs">— uncheck to pause (stops sending without deleting the rule)</span>
            </span>
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-automation'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => api.update(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-automation'] }),
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
            <div key={rule.id} className={`bg-white rounded-xl border p-5 ${!rule.enabled ? 'opacity-60 border-dashed' : ''}`}>
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
                    Sent: {rule.sentCount ?? 0} ·{' '}
                    <span className={rule.enabled ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>
                      {rule.enabled ? 'Active' : 'Paused'}
                    </span>
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

      <PendingReminderSection />
    </div>
  );
}

// ── Pending Order Reminder ────────────────────────────────────────────────────
function PendingReminderSection() {
  const qc = useQueryClient();
  const { data: stored, isLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn: () => client.get('/settings').then(r => r.data),
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['wa-accounts'],
    queryFn: () => client.get('/whatsapp/accounts').then(r => r.data),
  });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const values = form ?? stored ?? {};
  const set = (key, val) => setForm(prev => ({ ...(prev ?? stored ?? {}), [key]: val }));

  const mutation = useMutation({
    mutationFn: (data) => client.put('/settings', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-settings'] });
      setSaved(true);
      setForm(null);
      setError('');
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed to save'),
  });

  if (isLoading) return null;

  const connectedAccounts = accounts.filter(a => a.status === 'CONNECTED');
  const VARS = ['{{customername}}', '{{customerphone}}', '{{ordernumber}}', '{{productname}}', '{{brandname}}', '{{brandphone}}'];

  return (
    <div className="bg-white border rounded-xl p-6 space-y-4 mt-2">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Pending Order Reminder</h3>
          <p className="text-xs text-gray-500 mt-0.5">Send a WhatsApp message to customers whose order has been pending too long</p>
        </div>
        <label className="relative ml-auto flex-shrink-0">
          <input type="checkbox" checked={!!values.pendingReminderEnabled} onChange={e => set('pendingReminderEnabled', e.target.checked)} className="sr-only peer" />
          <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors" />
          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
        </label>
      </div>

      {values.pendingReminderEnabled && (
        <div className="space-y-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Send after (days pending)</label>
              <input type="number" min="1" max="30"
                value={values.pendingReminderDays ?? 3}
                onChange={e => set('pendingReminderDays', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp account</label>
              <select value={values.pendingReminderAccountId ?? ''} onChange={e => set('pendingReminderAccountId', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select account</option>
                {connectedAccounts.map(a => <option key={a.id} value={a.id}>{a.displayName ?? a.instanceName}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
            <textarea value={values.pendingReminderMessage ?? ''} onChange={e => set('pendingReminderMessage', e.target.value)}
              rows={4}
              placeholder={`Hi {{customername}}! 👋 We noticed your order *#{{ordernumber}}* is still pending.\n\nIs there anything we can help with? 😊`}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-xs" />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {VARS.map(v => (
                <button key={v} type="button"
                  onClick={() => set('pendingReminderMessage', (values.pendingReminderMessage ?? '') + v)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono">{v}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => mutation.mutate(form ?? {})} disabled={mutation.isPending || !form}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : 'Save Reminder Settings'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle size={14} /> Saved</span>}
      </div>
    </div>
  );
}
