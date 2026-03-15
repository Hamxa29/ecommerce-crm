import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { getSettings, updateSettings } from './settings.service.js';
import { prisma } from '../../config/database.js';
import { createTransporter, FROM_ADDRESS } from '../../config/mailer.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const settings = await getSettings();
    // Strip sensitive credentials — never expose to frontend
    const { paymentProviderKey, paymentWebhookSecret, logisticsApiKey, chatbotAnthropicKey, chatbotOpenaiKey, ...safe } = settings;
    res.json({ ...safe, chatbotAnthropicKeySet: !!chatbotAnthropicKey, chatbotOpenaiKeySet: !!chatbotOpenaiKey });
  } catch (e) { next(e); }
});

router.put('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = { ...req.body };
    // Strip virtual/computed fields — not real DB columns
    delete data.chatbotAnthropicKeySet;
    delete data.chatbotOpenaiKeySet;
    // Don't overwrite secret fields when frontend sends empty/null (key was never loaded into form)
    if (!data.paymentProviderKey)   delete data.paymentProviderKey;
    if (!data.paymentWebhookSecret) delete data.paymentWebhookSecret;
    if (!data.chatbotAnthropicKey)  delete data.chatbotAnthropicKey;
    if (!data.chatbotOpenaiKey)     delete data.chatbotOpenaiKey;
    res.json(await updateSettings(data));
  } catch (e) { next(e); }
});

router.post('/test-email', requireRole('ADMIN'), async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'to email required' });

  const settings = await prisma.storeSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null);
  const storeEmail = settings?.email || null;
  const fromEmail = storeEmail || FROM_ADDRESS;
  const storeName = settings?.storeName ?? 'CRM';

  // Check env vars
  const configured = {
    SMTP_HOST: process.env.SMTP_HOST || null,
    SMTP_PORT: process.env.SMTP_PORT || null,
    SMTP_USER: process.env.SMTP_USER || null,
    SMTP_PASS: process.env.SMTP_PASS ? '(set)' : null,
    'Store Email (FROM)': storeEmail || '— not set in Store Settings',
  };

  const transporter = createTransporter();
  if (!transporter) {
    return res.status(500).json({
      ok: false,
      error: 'SMTP not configured — set SMTP_HOST, SMTP_USER (or SMTP_FROM), and SMTP_PASS in your server .env',
      configured,
    });
  }

  try {
    await transporter.sendMail({
      from: `"${storeName}" <${fromEmail}>`,
      to,
      subject: '✅ CRM Email Test',
      html: `<p>If you received this, email is working correctly.</p><p>Sent at: ${new Date().toISOString()}</p>`,
    });
    res.json({ ok: true, message: `Test email sent to ${to}`, configured });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, configured });
  }
});

router.post('/test-google-sheets', requireRole('ADMIN'), async (req, res) => {
  const { url, sheetName } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'append',
        orderNumber: 'TEST-001',
        sheetName: sheetName || 'Orders',
        row: ['TEST-001','Test Customer','08000000000','','Lagos','','Test Address',
          'Test Product',5000,0,'PENDING','COD','UNPAID','','','manual','','',
          new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })],
      }),
      signal: AbortSignal.timeout(8000),
    });
    const text = await resp.text();
    res.json({ ok: true, response: text });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/audit-logs', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    });
    res.json(logs);
  } catch (e) { next(e); }
});

export default router;
