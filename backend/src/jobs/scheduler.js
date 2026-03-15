import { startCartAbandonmentJob } from './cartAbandonmentJob.js';
import { startScheduledRemindersJob } from './scheduledRemindersJob.js';
import { startAgentDigestJob } from './agentDigestJob.js';
import { startPendingOrderJob } from './pendingOrderJob.js';

export function startAllJobs() {
  startCartAbandonmentJob();
  startScheduledRemindersJob();
  startAgentDigestJob();
  startPendingOrderJob();
  console.log('[Scheduler] All background jobs started');
}
