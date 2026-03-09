export async function getQRDirect(req, res, next) {
  try {
    res.json(await svc.getQRByName(req.params.instanceName));
  } catch (e) { next(e); }
}

import * as svc from './whatsapp.service.js';

// ── Accounts ─────────────────────────────────────────────────────────────────

export async function listAccounts(req, res, next) {
  try {
    res.json(await svc.listAccounts());
  } catch (e) { next(e); }
}

export async function createAccount(req, res, next) {
  try {
    const { instanceName, displayName } = req.body;
    if (!instanceName) return res.status(400).json({ error: 'instanceName is required' });
    res.status(201).json(await svc.createAccount(instanceName, displayName ?? instanceName));
  } catch (e) { next(e); }
}

export async function getQR(req, res, next) {
  try {
    res.json(await svc.getAccountQR(req.params.id));
  } catch (e) { next(e); }
}

export async function getState(req, res, next) {
  try {
    res.json(await svc.refreshAccountState(req.params.id));
  } catch (e) { next(e); }
}

export async function deleteAccount(req, res, next) {
  try {
    await svc.deleteAccount(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function listTemplates(req, res, next) {
  try {
    res.json(await svc.listTemplates(req.query.accountId));
  } catch (e) { next(e); }
}

export async function createTemplate(req, res, next) {
  try {
    res.status(201).json(await svc.createTemplate(req.body));
  } catch (e) { next(e); }
}

export async function updateTemplate(req, res, next) {
  try {
    res.json(await svc.updateTemplate(req.params.id, req.body));
  } catch (e) { next(e); }
}

export async function deleteTemplate(req, res, next) {
  try {
    await svc.deleteTemplate(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// ── Automation ───────────────────────────────────────────────────────────────

export async function listAutomation(req, res, next) {
  try {
    res.json(await svc.listAutomation());
  } catch (e) { next(e); }
}

export async function createAutomation(req, res, next) {
  try {
    res.status(201).json(await svc.createAutomation(req.body));
  } catch (e) { next(e); }
}

export async function updateAutomation(req, res, next) {
  try {
    res.json(await svc.updateAutomation(req.params.id, req.body));
  } catch (e) { next(e); }
}

export async function deleteAutomation(req, res, next) {
  try {
    await svc.deleteAutomation(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// ── Send / Broadcast ─────────────────────────────────────────────────────────

export async function sendMessage(req, res, next) {
  try {
    const { accountId, phone, message, mediaUrl, mediaType } = req.body;
    if (!accountId || !phone || !message) {
      return res.status(400).json({ error: 'accountId, phone, message are required' });
    }
    res.json(await svc.sendSingleMessage({ accountId, phone, message, mediaUrl, mediaType }));
  } catch (e) { next(e); }
}

export async function broadcast(req, res, next) {
  try {
    const { accountId, orderIds, templateId, customMessage, mediaUrl } = req.body;
    if (!accountId || (!orderIds?.length)) {
      return res.status(400).json({ error: 'accountId and orderIds are required' });
    }
    res.json(await svc.sendBroadcast({ accountId, orderIds, templateId, customMessage, mediaUrl }));
  } catch (e) { next(e); }
}

export async function getLogs(req, res, next) {
  try {
    const { accountId, page = 1, limit = 50 } = req.query;
    res.json(await svc.getLogs({ accountId, page: Number(page), limit: Number(limit) }));
  } catch (e) { next(e); }
}
