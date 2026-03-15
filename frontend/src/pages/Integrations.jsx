import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, RefreshCw, Webhook, Key, Zap, Globe, Sheet, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
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

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheetName = data.sheetName || 'Orders';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = ['Order #','Customer','Phone','Phone 2','State','City','Address',
        'Products','Amount','Delivery Fee','Status','Payment Method','Payment Status',
        'Delivery Agent','Staff','Source','Notes','Comment','Date'];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
    if (data.action === 'append') {
      sheet.appendRow(data.row);
    } else if (data.action === 'update') {
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]) === String(data.orderNumber)) {
          sheet.getRange(i + 1, 1, 1, data.row.length).setValues([data.row]);
          return ContentService.createTextOutput('updated');
        }
      }
      sheet.appendRow(data.row);
    }
    return ContentService.createTextOutput('ok');
  } catch(err) {
    return ContentService.createTextOutput('error: ' + err.message);
  }
}`;

function GoogleSheetsPanel({ settings, onSave }) {
  const [enabled, setEnabled] = useState(settings?.googleSheetsEnabled ?? false);
  const [url, setUrl] = useState(settings?.googleSheetsWebhookUrl ?? '');
  const [sheetName, setSheetName] = useState(settings?.googleSheetsSheetName ?? 'Orders');
  const [showScript, setShowScript] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ googleSheetsEnabled: enabled, googleSheetsWebhookUrl: url, googleSheetsSheetName: sheetName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const test = async () => {
    if (!url) return;
    setTesting(true);
    setTestResult(null);
    try {
      await client.post('/settings/test-google-sheets', { url, sheetName });
      setTestResult('success');
    } catch {
      setTestResult('error');
    } finally { setTesting(false); }
  };

  return (
    <Panel>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
          <span className="text-lg">📊</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Google Sheets Sync</h3>
          <p className="text-sm text-gray-500">Automatically push every order and status update to your spreadsheet</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input type="checkbox" className="sr-only peer" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            <div className="w-9 h-5 bg-gray-200 peer-checked:bg-primary rounded-full transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Apps Script Webhook URL</label>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button onClick={test} disabled={!url || testing}
              className="px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap">
              {testing ? <Loader2 size={13} className="animate-spin" /> : null}
              Test
            </button>
          </div>
          {testResult === 'success' && <p className="text-xs text-green-600 mt-1">✓ Connected successfully</p>}
          {testResult === 'error' && <p className="text-xs text-red-500 mt-1">✗ Could not reach that URL — check the script is deployed as a web app</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sheet / Tab Name</label>
          <input
            value={sheetName}
            onChange={e => setSheetName(e.target.value)}
            placeholder="Orders"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-gray-400 mt-1">The tab inside your spreadsheet where orders will be written. Defaults to "Orders".</p>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="mt-5 border-t pt-4">
        <button onClick={() => setShowScript(s => !s)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary w-full">
          {showScript ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          How to set up Google Sheets (step-by-step)
        </button>
        {showScript && (
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <ol className="space-y-2 list-decimal list-inside text-xs leading-relaxed">
              <li>Open your Google Sheet (or create a new one)</li>
              <li>Click <strong>Extensions → Apps Script</strong></li>
              <li>Delete the default code, paste the script below</li>
              <li>Click <strong>Deploy → New deployment</strong></li>
              <li>Type: <strong>Web app</strong> · Execute as: <strong>Me</strong> · Who has access: <strong>Anyone</strong></li>
              <li>Click <strong>Deploy</strong>, copy the URL and paste it above</li>
              <li>That's it — every new order and status change will sync automatically</li>
            </ol>
            <div className="relative bg-gray-50 rounded-xl border">
              <div className="flex items-center justify-between px-4 py-2.5 border-b">
                <span className="text-xs font-mono font-medium text-gray-500">Google Apps Script</span>
                <button onClick={() => { navigator.clipboard.writeText(APPS_SCRIPT_CODE); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy code'}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-gray-700 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">{APPS_SCRIPT_CODE}</pre>
            </div>
          </div>
        )}
      </div>
    </Panel>
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

  const saveSettings = (data) => client.put('/settings', data).then(() => qc.invalidateQueries({ queryKey: ['settings'] }));

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

      {/* Google Sheets */}
      <GoogleSheetsPanel settings={settings} onSave={saveSettings} />

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
