import 'dotenv/config';
import app from './src/app.js';
import { prisma } from './src/config/database.js';
import { startAllJobs } from './src/jobs/scheduler.js';

const PORT = process.env.PORT || 3001;

async function main() {
  // Verify DB connection
  await prisma.$connect();
  console.log('[DB] Connected to PostgreSQL');

  // Safe schema migrations (idempotent column additions)
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS "orderNotificationEmails" TEXT;
    `);
  } catch (_) { /* column already exists or DB doesn't support IF NOT EXISTS */ }

  // Start background jobs
  startAllJobs();

  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

main().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
