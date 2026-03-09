import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as ctrl from './agents.controller.js';

const router = Router();
router.use(authenticate);

router.get('/export', ctrl.exportExcel);
router.get('/',       ctrl.list);
router.post('/',     ctrl.create);
router.put('/:id',   ctrl.update);
router.delete('/:id',ctrl.remove);

export default router;
