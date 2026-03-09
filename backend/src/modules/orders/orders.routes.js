import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as ctrl from './orders.controller.js';

const router = Router();
router.use(authenticate);

router.get('/stats',            ctrl.getStats);
router.get('/export',           ctrl.exportExcel);
router.get('/deliveries-today', ctrl.getDeliveries);
router.get('/followups-today',  ctrl.getFollowups);
router.get('/',                 ctrl.list);
router.post('/',               ctrl.create);
router.get('/:id',             ctrl.getOne);
router.put('/:id',             ctrl.update);
router.put('/:id/status',      ctrl.changeStatus);
router.post('/bulk',           ctrl.bulk);

export default router;
