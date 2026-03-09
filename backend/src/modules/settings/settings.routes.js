import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { getSettings, updateSettings } from './settings.service.js';
import { prisma } from '../../config/database.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try { res.json(await getSettings()); } catch (e) { next(e); }
});

router.put('/', requireRole('ADMIN'), async (req, res, next) => {
  try { res.json(await updateSettings(req.body)); } catch (e) { next(e); }
});

router.get('/audit-logs', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    });
    res.json(logs);
  } catch (e) { next(e); }
});

export default router;
