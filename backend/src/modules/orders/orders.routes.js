import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import * as ctrl from './orders.controller.js';

const router = Router();
router.use(authenticate);

const adminOrSupervisor = requireRole('ADMIN', 'SUPERVISOR');

router.get('/stats',            ctrl.getStats);
router.get('/export',           adminOrSupervisor, ctrl.exportExcel);
router.get('/deliveries-today', ctrl.getDeliveries);
router.get('/followups-today',  ctrl.getFollowups);
router.post('/bulk',            ctrl.bulk);
router.post('/import',          adminOrSupervisor, ctrl.importMiddleware, ctrl.importOrders);
router.get('/',                 ctrl.list);
router.post('/',                ctrl.create);
router.get('/:id',              ctrl.getOne);
router.put('/:id',              ctrl.update);
router.put('/:id/status',       ctrl.changeStatus);
router.delete('/:id',           adminOrSupervisor, ctrl.hardDelete);

export default router;
