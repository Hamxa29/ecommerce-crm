import { prisma } from '../../config/database.js';
import { sendExcel } from '../../utils/excelExport.js';

export async function list(req, res, next) {
  try {
    const agents = await prisma.agent.findMany({ orderBy: { name: 'asc' } });
    res.json(agents);
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const agent = await prisma.agent.create({ data: req.body });
    res.status(201).json(agent);
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const agent = await prisma.agent.update({ where: { id: req.params.id }, data: req.body });
    res.json(agent);
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await prisma.agent.update({ where: { id: req.params.id }, data: { status: false } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function exportExcel(req, res, next) {
  try {
    const agents = await prisma.agent.findMany({
      where: { status: true },
      orderBy: { name: 'asc' },
    });

    const rows = agents.map(a => ({
      name:        a.name,
      companyName: a.companyName ?? '',
      country:     a.country,
      states:      (a.states ?? []).join(', '),
      phone:       a.phone ?? '',
      phone2:      a.phone2 ?? '',
      address:     a.address ?? '',
      notes:       a.notes ?? '',
      createdAt:   new Date(a.createdAt).toLocaleString(),
    }));

    await sendExcel(res, {
      filename: `agents-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Agents',
      columns: [
        { header: 'Name',        key: 'name',        width: 22 },
        { header: 'Company',     key: 'companyName', width: 22 },
        { header: 'Country',     key: 'country',     width: 14 },
        { header: 'States',      key: 'states',      width: 30 },
        { header: 'Phone',       key: 'phone',       width: 16 },
        { header: 'Phone 2',     key: 'phone2',      width: 16 },
        { header: 'Address',     key: 'address',     width: 30 },
        { header: 'Notes',       key: 'notes',       width: 25 },
        { header: 'Created At',  key: 'createdAt',   width: 20 },
      ],
      rows,
    });
  } catch (e) { next(e); }
}
