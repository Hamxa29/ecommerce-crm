import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import * as ctrl from './users.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',       requireRole('ADMIN', 'SUPERVISOR'), ctrl.list);
router.post('/',      requireRole('ADMIN'), ctrl.create);
router.put('/:id',    requireRole('ADMIN'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

export default router;
