import { z } from 'zod';
import * as svc from './users.service.js';

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN','STAFF','SUPERVISOR','PARTNER','CUSTOMER_SUPPORT','ACCOUNTANT']).optional(),
  status: z.boolean().optional(),
  permissions: z.record(z.boolean()).optional(),
  salary: z.number().nullable().optional(),
  bonus: z.number().nullable().optional(),
  commission: z.number().nullable().optional(),
});

const updateSchema = createSchema.partial().omit({ password: true }).extend({
  password: z.string().min(6).optional(),
});

export const list   = (req, res, next) => svc.listUsers(req.query).then(r => res.json(r)).catch(next);
export const getOne = (req, res, next) => svc.listUsers({ ...req.query, id: req.params.id }).then(r => res.json(r)).catch(next);

export async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    res.status(201).json(await svc.createUser(data, req.user.id));
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const data = updateSchema.parse(req.body);
    res.json(await svc.updateUser(req.params.id, data, req.user.id));
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await svc.deleteUser(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}
