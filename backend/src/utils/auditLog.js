import { prisma } from '../config/database.js';

export async function writeAuditLog({ userId, action, entityType, entityId, details = {}, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId, details, ipAddress },
    });
  } catch (err) {
    // Audit log failure should never crash the main operation
    console.error('[AuditLog] Failed to write:', err.message);
  }
}
