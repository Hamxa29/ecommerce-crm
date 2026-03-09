import * as svc from './forms.service.js';

export async function list(req, res, next) {
  try { res.json(await svc.listForms()); } catch (e) { next(e); }
}

export async function getOne(req, res, next) {
  try { res.json(await svc.getForm(req.params.id)); } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try { res.status(201).json(await svc.createForm(req.body)); } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try { res.json(await svc.updateForm(req.params.id, req.body)); } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try { res.json(await svc.deleteForm(req.params.id)); } catch (e) { next(e); }
}

export async function getEmbed(req, res, next) {
  try { res.json(await svc.getEmbedCode(req.params.id)); } catch (e) { next(e); }
}

// ── Public ────────────────────────────────────────────────────────────────────

export async function publicGet(req, res, next) {
  try { res.json(await svc.getPublicForm(req.params.slug)); } catch (e) { next(e); }
}

export async function publicHit(req, res, next) {
  try { res.json(await svc.recordHit(req.params.slug)); } catch (e) { next(e); }
}

export async function publicSubmit(req, res, next) {
  try {
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    res.status(201).json(await svc.submitForm(req.params.slug, { ...req.body, ipAddress }));
  } catch (e) { next(e); }
}

export async function publicAbandon(req, res, next) {
  try {
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    res.status(201).json(await svc.recordAbandonment(req.params.slug, { ...req.body, ipAddress }));
  } catch (e) { next(e); }
}

export async function publicRecover(req, res, next) {
  try { res.json(await svc.recoverCart(req.params.cartId)); } catch (e) { next(e); }
}

// ── Abandoned carts (authenticated) ──────────────────────────────────────────

export async function listAbandoned(req, res, next) {
  try { res.json(await svc.listAbandonedCarts(req.query)); } catch (e) { next(e); }
}

export async function updateAbandoned(req, res, next) {
  try { res.json(await svc.updateAbandonedCart(req.params.id, req.body)); } catch (e) { next(e); }
}
