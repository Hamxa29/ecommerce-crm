import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as ctrl from './products.controller.js';

const router = Router();
router.use(authenticate);

router.get('/export',         ctrl.exportExcel);
router.get('/',               ctrl.list);
router.post('/',              ctrl.create);
router.get('/:id',            ctrl.getOne);
router.put('/:id',            ctrl.update);
router.delete('/:id',         ctrl.remove);
router.post('/:id/duplicate', ctrl.duplicate);

export default router;
