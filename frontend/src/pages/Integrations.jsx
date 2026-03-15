import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, RefreshCw, Webhook, Key, Zap, Globe } from 'lucide-react';
import client from '@/api/client';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}

function Panel({ children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

export default function Integrations() {
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => client.get('/settings').then(r => r.data),
  });

  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => client.get('/api-keys').then(r => r.data).catch(() => []),
  });

  const regenerateMutation = useMutation({
    mutationFn: (keyId) => client.post(`/api-keys/${keyId}/regenerate`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const storeUrl = window.location.origin;
  const webhookUrl = `${import.meta.env.VITE_API_URL ?? ''}/webhooks`;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Order Forms / Public API */}
      <Panel>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Globe size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Public Order Form URL</h3>
            <p className="text-sm text-gray-500">Share this base URL with customers or embed on your website</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm font-mono text-gray-700 truncate">{storeUrl}/form/</span>
          <CopyButton text={`${storeUrl}/form/`} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Append your form slug (found on the Order Forms page) to get a shareable link, e.g.{' '}
          <code className="bg-gray-100 px-1 rounded">/form/your-slug</code>
        </p>
      </Panel>

      {/* Webhook endpoint */}
      <Panel>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Webhook size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">WhatsApp Webhook</h3>
            <p className="text-sm text-gray-500">Configure this in your Evolution API instance</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Webhook URL</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm font-mono text-gray-700 truncate">{webhookUrl}/whatsapp</span>
              <CopyButton text={`${webhookUrl}/whatsapp`} />
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Evolution API Base URL</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm font-mono text-gray-700 truncate">
                {settings?.evolutionApiUrl ?? 'Not configured — set in Settings'}
              </span>
              {settings?.evolutionApiUrl && <CopyButton text={settings.evolutionApiUrl} />}
            </div>
          </div>
        </div>
      </Panel>

      {/* Payment integrations */}
      <Panel>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Payment Gateway</h3>
            <p className="text-sm text-gray-500">Paystack integration for online payment links</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Paystack Public Key</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm font-mono text-gray-700 truncate">
                {settings?.paystackPublicKey
                  ? `${settings.paystackPublicKey.slice(0, 12)}••••••••••••`
                  : 'Not configured — set in Settings'}
              </span>
              {settings?.paystackPublicKey && <CopyButton text={settings.paystackPublicKey} />}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Paystack Callback URL</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm font-mono text-gray-700 truncate">{storeUrl}/pay/</span>
              <CopyButton text={`${storeUrl}/pay/`} />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Configure your secret key and webhook secret in{' '}
          <a href="/settings" className="text-primary underline underline-offset-2">Settings</a>.
        </p>
      </Panel>

      {/* API Keys */}
      <Panel>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Key size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">API Keys</h3>
            <p className="text-sm text-gray-500">Use these to authenticate external requests to this CRM</p>
          </div>
        </div>

        {keysLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !apiKeys?.length ? (
          <div className="text-center py-8 text-gray-400">
            <Key size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No API keys configured yet.</p>
            <p className="text-xs mt-1">API key management coming soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map(key => (
              <div key={key.id} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700">{key.name}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">{key.prefix}••••••••</p>
                </div>
                <div className="flex items-center gap-1">
                  <CopyButton text={key.key} />
                  <button
                    onClick={() => regenerateMutation.mutate(key.id)}
                    disabled={regenerateMutation.isPending}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Regenerate"
                  >
                    <RefreshCw size={14} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
