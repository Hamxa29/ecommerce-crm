import { startCartAbandonmentJob } from './cartAbandonmentJob.js';

export function startAllJobs() {
  startCartAbandonmentJob();
  console.log('[Scheduler] All background jobs started');
}
