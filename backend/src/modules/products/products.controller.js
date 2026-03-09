import { prisma } from '../../config/database.js';
import { sendExcel } from '../../utils/excelExport.js';
import * as svc from './products.service.js';

export const list      = (req, res, next) => svc.listProducts(req.query).then(r => res.json(r)).catch(next);
export const getOne    = (req, res, next) => svc.getProduct(req.params.id).then(r => res.json(r)).catch(next);
export const create    = (req, res, next) => svc.createProduct(req.body).then(r => res.status(201).json(r)).catch(next);
export const update    = (req, res, next) => svc.updateProduct(req.params.id, req.body).then(r => res.json(r)).catch(next);
export const remove    = (req, res, next) => svc.deleteProduct(req.params.id).then(() => res.json({ ok: true })).catch(next);
export const duplicate = (req, res, next) => svc.duplicateProduct(req.params.id).then(r => res.status(201).json(r)).catch(next);

export async function exportExcel(req, res, next) {
  try {
    const where = { status: true };
    if (req.query.categoryId) where.categoryId = req.query.categoryId;

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { name: true } } },
    });

    const rows = products.map(p => ({
      name:      p.name,
      category:  p.category?.name ?? '',
      country:   p.country ?? '',
      costPrice: Number(p.costPrice),
      stock:     p.stock,
      status:    p.status ? 'Active' : 'Inactive',
      createdAt: new Date(p.createdAt).toLocaleString(),
    }));

    await sendExcel(res, {
      filename: `products-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Products',
      columns: [
        { header: 'Name',         key: 'name',      width: 30 },
        { header: 'Category',     key: 'category',  width: 22 },
        { header: 'Country',      key: 'country',   width: 14 },
        { header: 'Cost Price (₦)', key: 'costPrice', width: 16 },
        { header: 'Stock',        key: 'stock',     width: 10 },
        { header: 'Status',       key: 'status',    width: 12 },
        { header: 'Created At',   key: 'createdAt', width: 20 },
      ],
      rows,
    });
  } catch (err) { next(err); }
}
