import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as ctrl from './forms.controller.js';

const router = Router();

// ── Public routes (no auth) ───────────────────────────────────────────────────
router.get('/public/:slug',          ctrl.publicGet);
router.post('/public/:slug/hit',     ctrl.publicHit);
router.post('/public/:slug/submit',  ctrl.publicSubmit);
router.post('/public/:slug/abandon', ctrl.publicAbandon);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use(authenticate);

router.get('/abandoned-carts',          ctrl.listAbandoned);
router.put('/abandoned-carts/:id',      ctrl.updateAbandoned);

router.get('/',          ctrl.list);
router.post('/',         ctrl.create);
router.get('/:id',       ctrl.getOne);
router.put('/:id',       ctrl.update);
router.delete('/:id',    ctrl.remove);
router.get('/:id/embed', ctrl.getEmbed);

export default router;
