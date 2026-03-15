import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import { formatDate } from '@/lib/utils';
import {
  Bot, Settings2, MessageSquare, Trash2, Loader2, Copy, Check,
  ChevronRight, Phone, AlertCircle, Send, ToggleLeft, ToggleRight,
  RefreshCw,
} from 'lucide-react';

// ── API helpers ───────────────────────────────────────────────────────────────
const api = {
  getSettings:   () => client.get('/settings').then(r => r.data),
  saveSettings:  (d) => client.put('/settings', d).then(r => r.data),
  listAccounts:  () => client.get('/whatsapp/accounts').then(r => r.data),
  conversations: (page) => client.get('/chatbot/conversations', { params: { page, limit: 20 } }).then(r => r.data),
  getConv:       (phone) => client.get(`/chatbot/conversations/${encodeURIComponent(phone)}`).then(r => r.data),
  clearConv:     (phone) => client.delete(`/chatbot/conversations/${encodeURIComponent(phone)}`).then(r => r.data),
  testBot:       (phone, message) => client.post('/chatbot/test', { phone, message }).then(r => r.data),
};

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}

// ── API Key field with masked display ─────────────────────────────────────────
function ApiKeyField({ provider, value, onChange, keySet }) {
  const [replacing, setReplacing] = useState(false);
  const placeholder = provider === 'openai' ? 'sk-...' : 'sk-ant-...';

  if (keySet && !replacing) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key
        </label>
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50">
          <span className="flex-1 font-mono text-sm text-gray-500 tracking-widest">
            {placeholder.split('').slice(0, placeholder.indexOf('.')).join('')}••••••••••••••••••••••••••
          </span>
          <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">Active</span>
          <button
            type="button"
            onClick={() => setReplacing(true)}
            className="text-xs text-primary font-medium hover:underline ml-1"
          >
            Replace
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Key is saved securely. Click Replace to update it.</p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key
        {keySet && <span className="text-gray-400 font-normal ml-1">(replacing existing key)</span>}
      </label>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={replacing}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary font-mono"
        />
        {replacing && (
          <button
            type="button"
            onClick={() => { setReplacing(false); onChange(''); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
      {!keySet && (
        <p className="text-xs text-amber-600 font-medium mt-1">No key saved yet — paste your key above and save.</p>
      )}
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────
function ChatbotSettings() {
  const qc = useQueryClient();

  const { data: settings, isLoading: sLoading } = useQuery({ queryKey: ['store-settings'], queryFn: api.getSettings });
  const { data: accounts = [] } = useQuery({ queryKey: ['wa-accounts'], queryFn: api.listAccounts });

  const [form, setForm] = useState(null);
  if (!form && settings) {
    setForm({
      chatbotEnabled:       settings.chatbotEnabled ?? false,
      chatbotAccountId:     settings.chatbotAccountId ?? '',
      chatbotFallbackPhone: settings.chatbotFallbackPhone ?? '',
      chatbotSystemPrompt:  settings.chatbotSystemPrompt ?? '',
      chatbotProvider:      settings.chatbotProvider ?? 'anthropic',
      chatbotApiKey:        '',  // never pre-filled for security
    });
  }

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data };
      if (!payload.chatbotApiKey) delete payload.chatbotApiKey; // don't overwrite with blank
      return api.saveSettings(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-settings'] });
      setForm(f => ({ ...f, chatbotApiKey: '' })); // clear key field after save
    },
  });

  if (sLoading || !form) return <div className="h-40 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-gray-400" /></div>;

  const backendOrigin = window.location.origin.replace('5173', '3001').replace('3000', '3001');
  const webhookUrl = `${backendOrigin}/api/whatsapp/webhook/incoming`;

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">AI Chatbot</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Automatically respond to incoming WhatsApp messages using AI
            </p>
          </div>
          <button
            onClick={() => set('chatbotEnabled', !form.chatbotEnabled)}
            className="text-primary"
          >
            {form.chatbotEnabled
              ? <ToggleRight size={32} />
              : <ToggleLeft size={32} className="text-gray-300" />
            }
          </button>
        </div>
      </div>

      {/* Config fields */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h3 className="font-semibold text-gray-900">Configuration</h3>

        {/* AI Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            AI Provider
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'anthropic', label: 'Anthropic (Claude)', hint: 'claude-sonnet-4-6' },
              { value: 'openai',    label: 'OpenAI (ChatGPT)',   hint: 'gpt-4o-mini' },
            ].map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => set('chatbotProvider', p.value)}
                className={`border rounded-xl px-4 py-3 text-left transition ${
                  form.chatbotProvider === p.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{p.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">Default: {p.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <ApiKeyField
          provider={form.chatbotProvider}
          value={form.chatbotApiKey}
          onChange={v => set('chatbotApiKey', v)}
          keySet={settings?.chatbotApiKeySet}
        />

        {/* Account selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            WhatsApp Account (receives & replies to chats)
          </label>
          <select
            value={form.chatbotAccountId}
            onChange={e => set('chatbotAccountId', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          >
            <option value="">— Select account —</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.displayName} ({a.instanceName}) — {a.status}
              </option>
            ))}
          </select>
        </div>

        {/* Fallback phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Fallback Staff Phone
          </label>
          <input
            type="text"
            value={form.chatbotFallbackPhone}
            onChange={e => set('chatbotFallbackPhone', e.target.value)}
            placeholder="e.g. 08012345678"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-gray-400 mt-1">
            When the bot cannot answer a query, it notifies this number via WhatsApp.
          </p>
        </div>

        {/* Custom instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Custom Instructions <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={4}
            value={form.chatbotSystemPrompt}
            onChange={e => set('chatbotSystemPrompt', e.target.value)}
            placeholder={"Examples:\n• Always greet customers in Yoruba first\n• Never offer discounts\n• Our delivery takes 2-3 business days"}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            These instructions are added to the bot's system prompt. The bot already knows your full product catalog.
          </p>
        </div>

        <button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-60"
        >
          {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          Save Settings
        </button>
        {saveMutation.isSuccess && <p className="text-sm text-green-600">Saved!</p>}
      </div>

      {/* Webhook setup */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Evolution API Webhook Setup</h3>
        <p className="text-sm text-gray-500 mb-4">
          Configure Evolution API to send incoming messages to the CRM. Do this once per account.
        </p>

        <div className="space-y-3 text-sm">
          <Step n={1} text="Go to your Evolution API dashboard" />
          <Step n={2} text="Navigate to Instances → select your business account" />
          <Step n={3} text="Under Webhooks, set the URL below and enable MESSAGES_UPSERT event" />
        </div>

        <div className="mt-4 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
          <code className="text-xs text-gray-700 flex-1 break-all">{webhookUrl}</code>
          <CopyButton text={webhookUrl} />
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          <span>If your backend is deployed, use the production URL instead of localhost.</span>
        </div>
      </div>

      {/* Test bot */}
      <TestBotPanel />
    </div>
  );
}

function Step({ n, text }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-5 h-5 bg-primary/10 text-primary rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
      <span className="text-gray-600">{text}</span>
    </div>
  );
}

function TestBotPanel() {
  const [phone, setPhone]     = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const run = async () => {
    if (!phone || !message) return;
    setLoading(true); setError(''); setReply('');
    try {
      const r = await api.testBot(phone, message);
      setReply(r.reply ?? '(no reply)');
    } catch (e) {
      setError(e.response?.data?.error ?? 'Test failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Test the Bot</h3>
      <p className="text-sm text-gray-500 mb-4">
        Send a test message to see how the bot responds. Does not send via WhatsApp.
      </p>
      <div className="space-y-3">
        <input
          type="text" value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="Test phone (e.g. 2348012345678)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <input
          type="text" value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Test message (e.g. What products do you have?)"
          onKeyDown={e => e.key === 'Enter' && run()}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <button
          onClick={run} disabled={loading || !phone || !message}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Run Test
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {reply && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap">
            <p className="text-xs text-blue-500 font-medium mb-1.5">Bot reply:</p>
            {reply}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Conversations panel ───────────────────────────────────────────────────────
function ConversationsPanel() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['chatbot-conversations', page],
    queryFn: () => api.conversations(page),
  });

  const { data: conv, isLoading: convLoading } = useQuery({
    queryKey: ['chatbot-conv', selected],
    queryFn: () => api.getConv(selected),
    enabled: !!selected,
  });

  const clearMutation = useMutation({
    mutationFn: (phone) => api.clearConv(phone),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chatbot-conversations'] });
      qc.invalidateQueries({ queryKey: ['chatbot-conv', selected] });
    },
  });

  const conversations = data?.items ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
      {/* Left — list */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Conversations</h3>
          <p className="text-xs text-gray-400 mt-0.5">{data?.total ?? 0} customers</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <MessageSquare size={32} className="text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No conversations yet.</p>
            <p className="text-xs text-gray-300 mt-1">They'll appear here once customers message your WhatsApp.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 overflow-y-auto max-h-[600px]">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c.phone)}
                className={`w-full text-left px-5 py-3.5 hover:bg-gray-50 transition flex items-start gap-3 ${selected === c.phone ? 'bg-primary/5' : ''}`}
              >
                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                  {(c.pushName ?? c.phone).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.pushName ?? c.phone}</p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{formatDate(c.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{c.lastPreview || '—'}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">{c.messageCount} messages</p>
                </div>
                <ChevronRight size={14} className="text-gray-300 mt-1 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-40">Prev</button>
            <span>{page} / {data.pages}</span>
            <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {/* Right — conversation detail */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
        {!selected ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20 text-center px-6">
            <Bot size={36} className="text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Select a conversation to view the chat history</p>
          </div>
        ) : convLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                  {(conv?.pushName ?? conv?.phone ?? '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{conv?.pushName ?? conv?.phone}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{conv?.phone}</p>
                </div>
              </div>
              <button
                onClick={() => clearMutation.mutate(selected)}
                disabled={clearMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition disabled:opacity-50"
              >
                {clearMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Clear memory
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
              {(Array.isArray(conv?.messages) ? conv.messages : []).length === 0 ? (
                <p className="text-center text-xs text-gray-300 py-8">Memory cleared — no messages.</p>
              ) : (
                (Array.isArray(conv?.messages) ? conv.messages : []).map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                        : 'bg-primary text-white rounded-tr-none'
                    }`}>
                      {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WaChatbot() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Bot size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Chatbot</h1>
          <p className="text-sm text-gray-500">Automatically respond to customers on WhatsApp using AI</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[{ id: 'settings', icon: Settings2, label: 'Settings' }, { id: 'conversations', icon: MessageSquare, label: 'Conversations' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 text-sm pb-3 px-3 -mb-px font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-primary font-semibold'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'settings'       && <ChatbotSettings />}
      {activeTab === 'conversations'  && <ConversationsPanel />}
    </div>
  );
}
