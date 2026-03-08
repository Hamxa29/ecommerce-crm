import * as svc from './categories.service.js';

export const list      = (req, res, next) => svc.listCategories(req.query).then(r => res.json(r)).catch(next);
export const create    = (req, res, next) => svc.createCategory(req.body).then(r => res.status(201).json(r)).catch(next);
export const update    = (req, res, next) => svc.updateCategory(req.params.id, req.body).then(r => res.json(r)).catch(next);
export const remove    = (req, res, next) => svc.deleteCategory(req.params.id).then(() => res.json({ ok: true })).catch(next);
export const duplicate = (req, res, next) => svc.duplicateCategory(req.params.id).then(r => res.status(201).json(r)).catch(next);
