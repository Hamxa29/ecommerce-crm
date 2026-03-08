import { prisma } from '../config/database.js';

/**
 * Generates next sequential order number: ORD-2026-00001
 */
export async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;

  const last = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  const lastNum = last ? parseInt(last.orderNumber.split('-').pop(), 10) : 0;
  return `${prefix}${String(lastNum + 1).padStart(5, '0')}`;
}
