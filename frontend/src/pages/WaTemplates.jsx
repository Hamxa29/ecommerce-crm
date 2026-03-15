import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import { TEMPLATE_VARIABLES } from '@/lib/constants';
import { Plus, Pencil, Trash2, Loader2, X, Copy, ChevronDown, ChevronUp, Zap } from 'lucide-react';

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

export const STARTER_TEMPLATES = [
  {
    name: 'Abandoned Cart Recovery',
    messageType: 'cart_abandonment',
    content: `Hello {{customername}}! 👋

We noticed you were checking out *{{productname}}* but didn't complete your order.

We'd love to help you get started! Here's the link to complete your order:
{{formlink}}

If you have any questions, feel free to reply. 😊

— {{brandname}}`,
  },
  {
    name: 'Order Confirmed',
    messageType: 'confirmed',
    content: `Hello {{customername}}! 🎉

Your order has been *confirmed*! Here are your details:

📦 *Order:* {{ordernumber}}
🛍️ *Product:* {{productname}}
💰 *Amount:* {{productprice}}

Our team will be in touch regarding delivery.

Thank you for choosing *{{brandname}}*! 🙏`,
  },
  {
    name: 'Not Picking Calls Follow-Up',
    messageType: 'follow_up',
    content: `Hello {{customername}},

We tried reaching you regarding your order *{{ordernumber}}* but couldn't get through.

Please reply to this message or give us a call at your earliest convenience.

📞 {{brandphone}}

— {{brandname}}`,
  },
  {
    name: 'Order Delivered',
    messageType: 'delivery',
    content: `Hello {{customername}}! ✅

Your order *{{ordernumber}}* has been successfully *delivered*! 🎉

We hope you love your purchase. For any feedback or concerns:
📞 {{brandphone}}

Thank you for shopping with *{{brandname}}*! 🙏`,
  },
  {
    name: 'Delivery Scheduled',
    messageType: 'delivery',
    content: `Hello {{customername}}! 🚚

Great news! Your order *{{ordernumber}}* has been *scheduled for delivery* to you in {{individual_state}}.

Our delivery agent will contact you on arrival.

For questions: 📞 {{brandphone}}

— {{brandname}}`,
  },
  {
    name: 'New Order Received',
    messageType: 'new_order',
    content: `Hello {{customername}}! 👋

Thank you for your order with *{{brandname}}*!

📦 *Order Details:*
• Order #: {{ordernumber}}
• Product: {{productname}}
• Amount: {{productprice}}

Our team will review and get back to you shortly.
📞 {{brandphone}}`,
  },
  {
    name: 'Commitment Fee Request',
    messageType: 'custom',
    content: `Hello {{customername}},

To confirm your order *{{ordernumber}}* and secure your delivery, a small commitment fee is required.

Please contact us to proceed:
📞 {{brandphone}}

— {{brandname}}`,
  },
  {
    name: 'Win Back / Re-engagement',
    messageType: 'custom',
    content: `Hello {{customername_state}}! 👋

We miss you! We noticed your order hasn't been completed yet.

We're still here and ready to help. Feel free to reach out:
📞 {{brandphone}}

Or complete your order here:
{{formlink}}

— {{brandname}}`,
  },
];

function TemplateModal({ template, accounts, prefill, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    accountId: template?.accountId ?? prefill?.accountId ?? (accounts[0]?.id ?? ''),
    name: template?.name ?? prefill?.name ?? '',
    messageType: template?.messageType ?? prefill?.messageType ?? 'custom',
    content: template?.content ?? prefill?.content ?? '',
    mediaUrl: template?.mediaUrl ?? '',
    mediaType: template?.mediaType ?? 'image',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: template ? (d) => api.update(template.id, d) : api.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wa-templates'] }); onClose(); },
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
              placeholder="e.g. Abandoned Cart Recovery"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">Message *</label>
              <span className="text-xs text-gray-400">{form.content.length} chars</span>
            </div>
            <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))}
              rows={6} placeholder="Type your message..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono" />
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
  const [prefill, setPrefill] = useState(null);
  const [showStarters, setShowStarters] = useState(false);

  const { data: templates = [], isLoading } = useQuery({ queryKey: ['wa-templates'], queryFn: () => api.list() });
  const { data: accounts = [] } = useQuery({ queryKey: ['wa-accounts'], queryFn: api.listAccounts });

  const deleteMutation = useMutation({
    mutationFn: api.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-templates'] }),
  });

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.displayName || a.instanceName]));
  const typeLabel = (v) => MESSAGE_TYPES.find(t => t.value === v)?.label ?? v;

  const useStarter = (starter) => {
    setPrefill(starter);
    setShowAdd(true);
    setShowStarters(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">WhatsApp Templates</h2>
          <p className="text-sm text-gray-500">{templates.length} templates</p>
        </div>
        <button onClick={() => { setPrefill(null); setShowAdd(true); }} disabled={accounts.length === 0}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          <Plus size={15} /> New Template
        </button>
      </div>

      {accounts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
          Add a WhatsApp account first before creating templates.
        </div>
      )}

      {/* Starter Templates */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowStarters(s => !s)}
          className="w-full flex items-center justify-between px-5 py-3 text-left">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Starter Templates</span>
            <span className="text-xs text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full">{STARTER_TEMPLATES.length} ready to use</span>
          </div>
          {showStarters ? <ChevronUp size={15} className="text-blue-500" /> : <ChevronDown size={15} className="text-blue-500" />}
        </button>
        {showStarters && (
          <div className="border-t border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white">
            {STARTER_TEMPLATES.map((s, i) => (
              <div key={i} className="border rounded-xl p-4 hover:border-primary/40 transition">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.name}</p>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-0.5 inline-block">{typeLabel(s.messageType)}</span>
                  </div>
                  <button onClick={() => accounts.length > 0 ? useStarter(s) : null}
                    disabled={accounts.length === 0}
                    className="text-xs bg-primary text-white px-2.5 py-1 rounded-lg hover:bg-primary/90 disabled:opacity-50 shrink-0">
                    Use
                  </button>
                </div>
                <p className="text-xs text-gray-500 line-clamp-3 whitespace-pre-line font-mono">{s.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Copy size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No templates yet</p>
          <p className="text-sm text-gray-400 mt-1">Use a starter above or create your own</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{typeLabel(t.messageType)}</span>
                    <span className="text-xs text-gray-400">{accountMap[t.accountId] ?? t.accountId}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1.5 line-clamp-2 whitespace-pre-line font-mono text-xs">{t.content}</p>
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
          prefill={showAdd && !editTemplate ? prefill : null}
          onClose={() => { setShowAdd(false); setEditTemplate(null); setPrefill(null); }}
        />
      )}
    </div>
  );
}
