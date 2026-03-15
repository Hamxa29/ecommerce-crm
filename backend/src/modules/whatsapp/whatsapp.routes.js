import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as ctrl from './whatsapp.controller.js';
import { receiveChatbotWebhook } from '../chatbot/chatbot.controller.js';

const router = Router();

// ── Public: Evolution API incoming message webhook (no auth) ──────────────────
router.post('/webhook/incoming', receiveChatbotWebhook);

router.use(authenticate);

// Direct QR by instance name (no DB lookup needed)
router.get('/qr-direct/:instanceName', ctrl.getQRDirect);

// Accounts
router.get('/accounts',               ctrl.listAccounts);
router.post('/accounts',              ctrl.createAccount);
router.get('/accounts/:id/qr',        ctrl.getQR);
router.get('/accounts/:id/state',     ctrl.getState);
router.delete('/accounts/:id',        ctrl.deleteAccount);

// Templates
router.get('/templates',              ctrl.listTemplates);
router.post('/templates',             ctrl.createTemplate);
router.put('/templates/:id',          ctrl.updateTemplate);
router.delete('/templates/:id',       ctrl.deleteTemplate);

// Automation rules
router.get('/automation',             ctrl.listAutomation);
router.post('/automation',            ctrl.createAutomation);
router.put('/automation/:id',         ctrl.updateAutomation);
router.delete('/automation/:id',      ctrl.deleteAutomation);

// Send / Broadcast
router.post('/send',                  ctrl.sendMessage);
router.post('/broadcast',             ctrl.broadcast);

// Logs
router.get('/logs',                   ctrl.getLogs);

export default router;
