import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import { TEMPLATE_VARIABLES } from '@/lib/constants';
import { Plus, Pencil, Trash2, Loader2, X, Copy } from 'lucide-react';

const api = {
  list:    (accountId) => client.get('/whatsapp/templates', { params: accountId ? { accountId } : {} }).then(r => r.data),
  listAccounts: () => client.get('/whatsapp/accounts').then(r => r.data),
  create:  (d) => client.post('/whatsapp/templates', d).then(r => r.data),
  update:  (id, d) => client.put(`/whatsapp/templates/${id}`, d).then(r => r.data),
  delete:  (id) => client.delete(`/whatsapp/templates/${id}`).then(r => r.data),
};

const MESSAGE_TYPES = [
  { value: 'new_order', label: 'New Order' },
  { value: 'confirmed', label: 'Order Confirmed' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'cart_abandonment', label: 'Cart Abandonment' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'custom', label: 'Custom' },
];

function TemplateModal({ template, accounts, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    accountId: template?.accountId ?? (accounts[0]?.id ?? ''),
    name: template?.name ?? '',
    messageType: template?.messageType ?? 'custom',
    content: template?.content ?? '',
    mediaUrl: template?.mediaUrl ?? '',
    mediaType: template?.mediaType ?? 'image',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: template ? (d) => api.update(template.id, d) : api.create,
    onSuccess: () => { qc.invalidateQueries(['wa-templates']); onClose(); },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed'),
  });

  const insertVar = (key) => {
    setForm(f => ({ ...f, content: f.content + key }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h3 className="font-semibold">{template ? 'Edit Template' : 'New Template'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account *</label>
              <select value={form.accountId} onChange={e => setForm(f => ({...f, accountId: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.displayName || a.instanceName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={form.messageType} onChange={e => setForm(f => ({...f, messageType: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {MESSAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Template Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="e.g. New Order Confirmation"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">Message *</label>
              <span className="text-xs text-gray-400">{form.content.length} chars</span>
            </div>
            <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))}
              rows={5} placeholder="Type your message..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            <div className="flex flex-wrap gap-1 mt-2">
              {TEMPLATE_VARIABLES.map(v => (
                <button key={v.key} onClick={() => insertVar(v.key)}
                  className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100 font-mono">
                  {v.key}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Media URL (optional)</label>
              <input value={form.mediaUrl} onChange={e => setForm(f => ({...f, mediaUrl: e.target.value}))}
                placeholder="https://..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Media Type</label>
              <select value={form.mediaType} onChange={e => setForm(f => ({...f, mediaType: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name || !form.content || !form.accountId}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              {template ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WaTemplates() {
  const qc = useQueryClient();
  const [editTemplate, setEditTemplate] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: templates = [], isLoading } = useQuery({ queryKey: ['wa-templates'], queryFn: () => api.list() });
  const { data: accounts = [] } = useQuery({ queryKey: ['wa-accounts'], queryFn: api.listAccounts });

  const deleteMutation = useMutation({
    mutationFn: api.delete,
    onSuccess: () => qc.invalidateQueries(['wa-templates']),
  });

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.displayName || a.instanceName]));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">WhatsApp Templates</h2>
          <p className="text-sm text-gray-500">{templates.length} templates</p>
        </div>
        <button onClick={() => setShowAdd(true)} disabled={accounts.length === 0}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          <Plus size={15} /> New Template
        </button>
      </div>

      {accounts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
          Add a WhatsApp account first before creating templates.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Copy size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No templates yet</p>
          <p className="text-sm text-gray-400 mt-1">Create message templates with variable placeholders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{t.messageType}</span>
                    <span className="text-xs text-gray-400">{accountMap[t.accountId] ?? t.accountId}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1.5 line-clamp-2 whitespace-pre-line">{t.content}</p>
                  {t.mediaUrl && (
                    <p className="text-xs text-gray-400 mt-1">📎 {t.mediaType} attached</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setEditTemplate(t)}
                    className="p-1.5 border rounded-lg text-gray-500 hover:bg-gray-50"><Pencil size={14} /></button>
                  <button onClick={() => { if(confirm('Delete this template?')) deleteMutation.mutate(t.id); }}
                    className="p-1.5 border rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editTemplate) && (
        <TemplateModal
          template={editTemplate}
          accounts={accounts}
          onClose={() => { setShowAdd(false); setEditTemplate(null); }}
        />
      )}
    </div>
  );
}
