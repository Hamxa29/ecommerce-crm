import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getSettings, updateSettings } from './settings.service.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try { res.json(await getSettings()); } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try { res.json(await updateSettings(req.body)); } catch (e) { next(e); }
});

export default router;
