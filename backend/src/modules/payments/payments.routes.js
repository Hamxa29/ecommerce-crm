import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as ctrl from './payments.controller.js';

const router = Router();

// ── Public routes (no auth) ───────────────────────────────────────────────────
// These MUST be registered before router.use(authenticate)

// Payment page fetches order info
router.get('/order/:orderNumber', ctrl.getOrderInfo);

// Gateway webhook — called by payment provider server
router.post('/webhook/:provider', ctrl.receiveWebhook);

// Customer clicked "Complete on WhatsApp" on payment page
router.post('/whatsapp-redirect/:orderId', ctrl.whatsappRedirect);

// ── Authenticated staff routes ────────────────────────────────────────────────
router.use(authenticate);

// Staff manually sends payment link
router.post('/send-link/:orderId', ctrl.sendPaymentLink);

// Staff manually verifies a payment reference
router.get('/verify/:reference', ctrl.verifyPaymentManual);

export default router;
