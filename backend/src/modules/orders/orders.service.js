import { prisma } from '../../config/database.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { writeAuditLog } from '../../utils/auditLog.js';
import { generateOrderNumber } from '../../utils/orderNumber.js';

export async function listOrders(query) {
  const { skip, take, page, limit } = parsePagination(query);
  const where = buildOrderWhere(query);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        agent: { select: { id: true, name: true } },
        assignedStaff: { select: { id: true, name: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return paginatedResponse(orders, total, page, limit);
}

function buildOrderWhere(query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.state) where.state = { contains: query.state, mode: 'insensitive' };
  if (query.agentId) where.agentId = query.agentId;
  if (query.staffId) where.assignedStaffId = query.staffId;
  if (query.source) where.source = query.source;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.search) {
    where.OR = [
      { customerName: { contains: query.search, mode: 'insensitive' } },
      { customerPhone: { contains: query.search } },
      { orderNumber: { contains: query.search, mode: 'insensitive' } },
      { comment: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const end = new Date(query.dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  return where;
}

export async function getOrder(id) {
  return prisma.order.findUniqueOrThrow({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      agent: true,
      assignedStaff: { select: { id: true, name: true, email: true, role: true } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      whatsappLogs: { orderBy: { sentAt: 'desc' }, take: 20 },
    },
  });
}

export async function createOrder(data, actorId) {
  const orderNumber = await generateOrderNumber();
  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerPhone2: data.customerPhone2 ?? null,
      customerEmail: data.customerEmail ?? null,
      address: data.address,
      state: data.state,
      city: data.city ?? null,
      country: data.country ?? 'Nigeria',
      ipAddress: data.ipAddress ?? null,
      status: data.status ?? 'PENDING',
      paymentStatus: data.paymentStatus ?? 'UNPAID',
      source: data.source ?? 'manual',
      formId: data.formId ?? null,
      tags: data.tags ?? [],
      totalAmount: data.totalAmount,
      deliveryFee: data.deliveryFee ?? 0,
      commitmentFee: data.commitmentFee ?? null,
      notes: data.notes ?? null,
      comment: data.comment ?? null,
      scheduledDate: data.scheduledDate ?? null,
      deliveryDate: data.deliveryDate ?? null,
      followUpDate: data.followUpDate ?? null,
      agentId: data.agentId ?? null,
      assignedStaffId: data.assignedStaffId ?? null,
      items: data.items?.length ? {
        create: data.items.map(item => ({
          productId: item.productId,
          variation: item.variation ?? null,
          pricingTier: item.pricingTier ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        })),
      } : undefined,
      statusHistory: {
        create: { toStatus: data.status ?? 'PENDING', changedById: actorId },
      },
    },
    include: {
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  });

  if (actorId) {
    await writeAuditLog({ userId: actorId, action: 'order.create', entityType: 'Order', entityId: order.id, details: { orderNumber } });
  }
  return order;
}

export async function updateOrder(id, data, actorId) {
  const order = await prisma.order.update({
    where: { id },
    data,
    include: { items: { include: { product: { select: { id: true, name: true } } } } },
  });
  if (actorId) {
    await writeAuditLog({ userId: actorId, action: 'order.update', entityType: 'Order', entityId: id });
  }
  return order;
}

export async function changeOrderStatus(id, newStatus, actorId, note, scheduledDate) {
  const current = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      agent: true,
      assignedStaff: { select: { id: true, name: true } },
    },
  });

  const updateData = {
    status: newStatus,
    statusHistory: {
      create: { fromStatus: current.status, toStatus: newStatus, changedById: actorId, note: note ?? null },
    },
  };
  if (newStatus === 'SCHEDULED' && scheduledDate) {
    updateData.scheduledDate = new Date(scheduledDate);
  }

  const order = await prisma.order.update({
    where: { id },
    data: updateData,
    include: {
      items: { include: { product: { include: { category: true } } } },
      agent: true,
    },
  });

  if (actorId) {
    await writeAuditLog({ userId: actorId, action: 'order.status_change', entityType: 'Order', entityId: id, details: { from: current.status, to: newStatus } });
  }

  // Trigger WhatsApp automation asynchronously
  import('../../jobs/automationJob.js').then(({ triggerAutomation }) => {
    triggerAutomation(order, newStatus).catch(console.error);
  });

  return order;
}

export async function bulkAction(orderIds, action, payload, actorId) {
  const results = { success: 0, failed: 0 };

  for (const id of orderIds) {
    try {
      switch (action) {
        case 'status':
          await changeOrderStatus(id, payload.status, actorId, payload.note);
          break;
        case 'assign_agent':
          await prisma.order.update({ where: { id }, data: { agentId: payload.agentId } });
          break;
        case 'assign_staff':
          await prisma.order.update({ where: { id }, data: { assignedStaffId: payload.staffId } });
          break;
        case 'tag':
          await prisma.order.update({ where: { id }, data: { tags: { push: payload.tag } } });
          break;
        case 'comment':
          await prisma.order.update({ where: { id }, data: { comment: payload.comment } });
          break;
        case 'delete':
          await changeOrderStatus(id, 'DELETED', actorId);
          break;
        case 'ban':
          await changeOrderStatus(id, 'BANNED', actorId);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      results.success++;
    } catch {
      results.failed++;
    }
  }
  return results;
}

export async function getStats() {
  const now = new Date();

  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const [thisWeekOrders, lastWeekOrders, byStatus] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: startOfThisWeek }, status: { notIn: ['DELETED'] } },
      select: { status: true, totalAmount: true, deliveryFee: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: startOfLastWeek, lt: startOfThisWeek }, status: { notIn: ['DELETED'] } },
      select: { status: true, totalAmount: true },
    }),
    prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
  ]);

  const sumAmount = (orders) => orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const countStatus = (orders, status) => orders.filter(o => o.status === status).length;

  const thisWeekTotal = sumAmount(thisWeekOrders);
  const lastWeekTotal = sumAmount(lastWeekOrders);
  const pctChange = (a, b) => b === 0 ? 0 : Math.round(((a - b) / b) * 100);

  const statusMap = {};
  byStatus.forEach(r => { statusMap[r.status] = r._count.id; });

  return {
    thisWeek: {
      count: thisWeekOrders.length,
      totalAmount: thisWeekTotal,
      delivered: countStatus(thisWeekOrders, 'DELIVERED'),
      deliveredAmount: sumAmount(thisWeekOrders.filter(o => o.status === 'DELIVERED')),
      pending: countStatus(thisWeekOrders, 'PENDING'),
      awaiting: countStatus(thisWeekOrders, 'AWAITING'),
      scheduled: countStatus(thisWeekOrders, 'SCHEDULED'),
      cancelled: countStatus(thisWeekOrders, 'CANCELLED'),
    },
    lastWeek: {
      count: lastWeekOrders.length,
      totalAmount: lastWeekTotal,
    },
    weekOverWeek: {
      countChange: pctChange(thisWeekOrders.length, lastWeekOrders.length),
      amountChange: pctChange(thisWeekTotal, lastWeekTotal),
    },
    byStatus: statusMap,
  };
}

export async function getDeliveriesToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.order.findMany({
    where: {
      OR: [
        { deliveryDate: { gte: today, lt: tomorrow } },
        { status: 'SCHEDULED', scheduledDate: { gte: today, lt: tomorrow } },
      ],
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      agent: { select: { name: true } },
      assignedStaff: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getFollowupsToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.order.findMany({
    where: {
      OR: [
        { followUpDate: { gte: today, lt: tomorrow } },
        { status: { in: ['NOT_PICKING_CALLS', 'SWITCHED_OFF'] } },
      ],
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      agent: { select: { name: true } },
      assignedStaff: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}
