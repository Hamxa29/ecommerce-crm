import { prisma } from '../config/database.js';

// Runs once daily — deletes chatbot conversations with no activity in 90+ days
export function startChatbotPruneJob() {
  const run = async () => {
    try {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const { count } = await prisma.chatbotConversation.deleteMany({
        where: { lastMessageAt: { lt: cutoff } },
      });
      if (count > 0) {
        console.log(`[ChatbotPrune] Deleted ${count} conversation(s) older than 90 days`);
      }
    } catch (err) {
      console.error('[ChatbotPrune] Error:', err.message);
    }
  };

  // Run once on startup, then every 24 hours
  run();
  setInterval(run, 24 * 60 * 60 * 1000);
  console.log('[ChatbotPrune] Job scheduled (daily, 90-day retention)');
}
