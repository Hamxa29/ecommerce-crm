import * as svc from './orders.service.js';
import multer from 'multer';
import ExcelJS from 'exceljs';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

export const importMiddleware = upload.single('file');

export async function importOrders(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const rows = [];
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // skip header
      const vals = row.values; // 1-indexed

      const customerName  = String(vals[1] ?? '').trim();
      const customerPhone = String(vals[2] ?? '').trim();
      const address       = String(vals[3] ?? '').trim();
      const state         = String(vals[4] ?? '').trim();
      const city          = String(vals[5] ?? '').trim();
      const totalAmount   = parseFloat(vals[6]) || 0;
      const deliveryFee   = parseFloat(vals[7]) || 0;
      const notes         = String(vals[8] ?? '').trim();

      if (!customerName || !customerPhone || !state) return;

      rows.push({ customerName, customerPhone, address, state, city, totalAmount, deliveryFee, notes, source: 'import' });
    });

    const created = [];
    for (const row of rows) {
      try {
        const order = await svc.createOrder(row, req.user.id);
        created.push(order.orderNumber);
      } catch (_) { /* skip invalid rows */ }
    }

    res.json({ imported: created.length, skipped: rows.length - created.length });
  } catch (err) { next(err); }
}
