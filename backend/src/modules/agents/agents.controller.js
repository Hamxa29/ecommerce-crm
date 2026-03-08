import { prisma } from '../../config/database.js';

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
