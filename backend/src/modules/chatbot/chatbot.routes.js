import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as ctrl from './chatbot.controller.js';

const router = Router();

// ── Admin routes (authenticated) ──────────────────────────────────────────────
router.use(authenticate);

router.get('/conversations',          ctrl.listConversations);
router.get('/conversations/:phone',   ctrl.getConversation);
router.delete('/conversations/:phone', ctrl.clearConversation);
router.post('/test',                  ctrl.testBot);

export default router;
