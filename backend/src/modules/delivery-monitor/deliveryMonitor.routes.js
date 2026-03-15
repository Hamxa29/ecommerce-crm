import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  listGroups,
  createGroup,
  updateGroup,
  listLogs,
  listDeliveries,
  listRemittances,
  listStock,
  listFollowUps,
  resolveFollowUp,
  getAgentReport,
} from './deliveryMonitor.controller.js';

const router = Router();

router.use(authenticate);

// Groups
router.get('/groups', listGroups);
router.post('/groups', createGroup);
router.put('/groups/:id', updateGroup);

// Logs
router.get('/logs', listLogs);

// Deliveries
router.get('/deliveries', listDeliveries);

// Remittances
router.get('/remittances', listRemittances);

// Stock
router.get('/stock', listStock);

// Follow-ups
router.get('/follow-ups', listFollowUps);
router.put('/follow-ups/:id/resolve', resolveFollowUp);

// Agent report
router.get('/report/agent/:agentName', getAgentReport);

export default router;
