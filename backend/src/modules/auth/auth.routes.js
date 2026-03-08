import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import * as ctrl from './auth.controller.js';

const router = Router();

router.post('/login', authLimiter, ctrl.login);
router.post('/logout', authenticate, ctrl.logout);
router.post('/refresh', ctrl.refreshToken);
router.get('/me', authenticate, ctrl.getMe);

export default router;
