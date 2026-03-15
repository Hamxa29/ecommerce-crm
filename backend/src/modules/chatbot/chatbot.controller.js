import * as svc from './chatbot.service.js';
import { getSettings } from '../settings/settings.service.js';
import { prisma } from '../../config/database.js';
import { processGroupMessage as deliveryMonitorGroup } from '../delivery-monitor/deliveryMonitor.service.js';
import { processGroupMessage as followUpGroup } from '../follow-up/followUp.service.js';

// ── Check if a human/staff replied in Chatwoot since a given timestamp ────────
async function hasStaffRepliedInChatwoot(phone, sinceMs) {
  const url   = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_TOKEN;
  const acct  = process.env.CHATWOOT_ACCOUNT_ID;
  if (!url || !token || !acct) return false;

  try {
    // Search for contact by phone number
    const searchRes = await fetch(
      `${url}/api/v1/accounts/${acct}/contacts/search?q=${encodeURIComponent(phone)}&include_contacts=true`,
      { headers: { api_access_token: token } }
    );
    if (!searchRes.ok) return false;
    const searchData = await searchRes.json();
    const contacts = searchData.payload?.contacts ?? searchData.payload ?? [];
    if (!contacts.length) return false;

    // Get conversations for this contact
    const convRes = await fetch(
      `${url}/api/v1/accounts/${acct}/contacts/${contacts[0].id}/conversations`,
      { headers: { api_access_token: token } }
    );
    if (!convRes.ok) return false;
    const convData = await convRes.json();
    const conversations = convData.payload?.conversations ?? convData.payload ?? [];
    if (!conversations.length) return false;

    const latestConv = conversations[0];

    // Stop bot if conversation has been assigned to a human agent
    if (latestConv.meta?.assignee?.id) return true;

    // Also stop bot if any outgoing (agent) message was sent after this message arrived
    // message_type 1 = outgoing, created_at is Unix timestamp in seconds
    const messages = latestConv.messages ?? [];
    return messages.some(m => m.message_type === 1 && m.created_at * 1000 > sinceMs);
  } catch (e) {
    console.error('[Chatbot] Chatwoot staff check failed:', e.message);
    return false; // if check fails, let bot reply rather than stay silent forever
  }
}

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

    const remoteJid = key.remoteJid ?? '';

    // Skip broadcast
    if (remoteJid.includes('@broadcast')) return;

    // Route group messages to the appropriate handler
    if (remoteJid.includes('@g.us')) {
      const instance = body.instance ?? body.instanceName ?? null;
      const deliveryInstance = process.env.DELIVERY_MONITOR_INSTANCE;
      if (deliveryInstance && instance === deliveryInstance) {
        deliveryMonitorGroup(body).catch(e => console.error('[Webhook] deliveryMonitorGroup error:', e.message));
      } else {
        followUpGroup(body).catch(e => console.error('[Webhook] followUpGroup error:', e.message));
      }
      return;
    }

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
      const account = await prisma.whatsappAccount.findUnique({
        where: { id: settings.chatbotAccountId },
        select: { instanceName: true },
      });
      if (account && instanceName && account.instanceName !== instanceName) return;
    }

    // ── Staff-first delay ────────────────────────────────────────────────────
    // Wait N seconds to give staff a chance to reply from Chatwoot first.
    // If staff has already replied by then, the bot stays silent.
    const delaySecs = parseInt(process.env.CHATBOT_STAFF_DELAY_SECONDS ?? '90');
    const messageReceivedAt = Date.now();

    setTimeout(async () => {
      try {
        const staffReplied = await hasStaffRepliedInChatwoot(phone, messageReceivedAt);
        if (staffReplied) {
          console.log(`[Chatbot] Staff already replied to ${phone} — bot staying silent`);
          return;
        }
        await svc.processMessage(phone, pushName, text.trim(), instanceName, msgId);
      } catch (e) {
        console.error('[Chatbot Webhook] Delayed processMessage failed:', e.message);
      }
    }, delaySecs * 1000);

  } catch (e) {
    console.error('[Chatbot Webhook] parse error:', e.message);
  }
}

// ── Admin: test the bot from the CRM (no delay, no Chatwoot check) ────────────
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
