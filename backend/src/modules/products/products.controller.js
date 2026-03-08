import * as svc from './products.service.js';

export const list      = (req, res, next) => svc.listProducts(req.query).then(r => res.json(r)).catch(next);
export const getOne    = (req, res, next) => svc.getProduct(req.params.id).then(r => res.json(r)).catch(next);
export const create    = (req, res, next) => svc.createProduct(req.body).then(r => res.status(201).json(r)).catch(next);
export const update    = (req, res, next) => svc.updateProduct(req.params.id, req.body).then(r => res.json(r)).catch(next);
export const remove    = (req, res, next) => svc.deleteProduct(req.params.id).then(() => res.json({ ok: true })).catch(next);
export const duplicate = (req, res, next) => svc.duplicateProduct(req.params.id).then(r => res.status(201).json(r)).catch(next);
