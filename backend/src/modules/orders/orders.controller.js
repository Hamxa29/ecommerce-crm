import * as svc from './orders.service.js';

export const list           = (req, res, next) => svc.listOrders(req.query).then(r => res.json(r)).catch(next);
export const getOne         = (req, res, next) => svc.getOrder(req.params.id).then(r => res.json(r)).catch(next);
export const getStats       = (req, res, next) => svc.getStats().then(r => res.json(r)).catch(next);
export const getDeliveries  = (req, res, next) => svc.getDeliveriesToday().then(r => res.json(r)).catch(next);
export const getFollowups   = (req, res, next) => svc.getFollowupsToday().then(r => res.json(r)).catch(next);
export const exportExcel    = (req, res, next) => svc.exportOrdersToExcel(req.query, res).catch(next);

export async function create(req, res, next) {
  try {
    res.status(201).json(await svc.createOrder(req.body, req.user.id));
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    res.json(await svc.updateOrder(req.params.id, req.body, req.user.id));
  } catch (err) { next(err); }
}

export async function changeStatus(req, res, next) {
  try {
    const { status, note, scheduledDate } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    res.json(await svc.changeOrderStatus(req.params.id, status, req.user.id, note, scheduledDate));
  } catch (err) { next(err); }
}

export async function bulk(req, res, next) {
  try {
    const { orderIds, action, payload } = req.body;
    if (!orderIds?.length || !action) return res.status(400).json({ error: 'orderIds and action required' });
    res.json(await svc.bulkAction(orderIds, action, payload ?? {}, req.user.id));
  } catch (err) { next(err); }
}
