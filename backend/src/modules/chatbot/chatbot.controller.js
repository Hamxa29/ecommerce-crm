import * as svc from './chatbot.service.js';
import { getSettings } from '../settings/settings.service.js';
import { prisma } from '../../config/database.js';

// ── Evolution API incoming webhook ────────────────────────────────────────────
export async function receiveChatbotWebhook(req, res) {
  // Always respond 200 immediately — Evolution API expects a fast ack
  res.status(200).json({ ok: true });

  try {
    const body = req.body;

    // Only handle message upsert events
    const event = body.event ?? body.type;
    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') return;

    const data    = body.data ?? body;
    const key     = data.key ?? {};
    const msgId   = key.id;

    // Skip messages sent by the bot itself
    if (key.fromMe === true) return;

    // Skip group messages
    const remoteJid = key.remoteJid ?? '';
    if (remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) return;

    // Extract phone — strip @s.whatsapp.net or @c.us suffix
    const phone = remoteJid.replace(/@.*$/, '').replace(/\D/g, '');
    if (!phone) return;

    // Extract text content (supports plain text and quoted replies)
    const msg  = data.message ?? {};
    const text = msg.conversation
      ?? msg.extendedTextMessage?.text
      ?? msg.imageMessage?.caption
      ?? msg.videoMessage?.caption
      ?? '';
    if (!text.trim()) return; // skip media-only messages with no text/caption

    const pushName     = data.pushName ?? null;
    const instanceName = body.instance ?? body.instanceName ?? null;

    // Check chatbot is enabled and this account is the configured chatbot account
    const settings = await getSettings();
    if (!settings.chatbotEnabled) return;

    if (settings.chatbotAccountId) {
      // Verify this webhook is for the configured chatbot account
      const account = await prisma.whatsappAccount.findUnique({
        where: { id: settings.chatbotAccountId },
        select: { instanceName: true },
      });
      if (account && instanceName && account.instanceName !== instanceName) return;
    }

    // Process asynchronously (already responded 200)
    svc.processMessage(phone, pushName, text.trim(), instanceName, msgId).catch(e =>
      console.error('[Chatbot Webhook] processMessage failed:', e.message)
    );
  } catch (e) {
    console.error('[Chatbot Webhook] parse error:', e.message);
  }
}

// ── Admin: test the bot from the CRM ─────────────────────────────────────────
export async function testBot(req, res, next) {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });
    // Run without sending via Evolution API (no instanceName) — just get the response
    const reply = await svc.processMessage(phone, 'Test', message, null, `test-${Date.now()}`);
    res.json({ reply });
  } catch (e) { next(e); }
}

// ── Admin: list conversations ─────────────────────────────────────────────────
export async function listConversations(req, res, next) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    res.json(await svc.listConversations({ page, limit }));
  } catch (e) { next(e); }
}

export async function getConversation(req, res, next) {
  try {
    const conv = await svc.getConversationMessages(req.params.phone);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    res.json(conv);
  } catch (e) { next(e); }
}

export async function clearConversation(req, res, next) {
  try {
    await svc.clearConversation(req.params.phone);
    res.json({ ok: true });
  } catch (e) { next(e); }
}
