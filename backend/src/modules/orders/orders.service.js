import { prisma } from '../../config/database.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { writeAuditLog } from '../../utils/auditLog.js';
import { generateOrderNumber } from '../../utils/orderNumber.js';
import { sendExcel } from '../../utils/excelExport.js';
import { sendNewOrderNotification, sendOrderStatusEmail } from '../../utils/emailNotification.js';
import { sendText } from '../../config/evolution.js';
import { normalizePhone } from '../../utils/phoneNormalizer.js';

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
  // Special virtual filter: unremitted COD delivered orders
  if (query.unremitted === 'true' || query.unremitted === true) {
    where.status = 'DELIVERED';
    where.paymentMethod = 'COD';
    where.paymentStatus = { not: 'REMITTED' };
  } else {
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  }
  if (query.state) where.state = { contains: query.state, mode: 'insensitive' };
  if (query.agentId) where.agentId = query.agentId;
  if (query.staffId) where.assignedStaffId = query.staffId;
  if (query.source) where.source = query.source;
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
      paymentMethod: data.paymentMethod ?? 'COD',
      source: data.source ?? 'manual',
      formId: data.formId ?? null,
      tags: data.tags ?? [],
      totalAmount: data.totalAmount,
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
  if (data.source !== 'import') {
    sendNewOrderNotification(order).catch(e => console.error('[Orders] Notification email error:', e.message));
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

// ── WhatsApp receipt helper ───────────────────────────────────────────────────
async function sendReceiptWhatsApp(order, settings) {
  try {
    const fmt = (n) => `NGN ${Number(n ?? 0).toLocaleString('en-NG')}`;

    const itemLines = (order.items ?? [])
      .map(i => `• ${i.product?.name ?? 'Item'} x${i.quantity} – ${fmt(i.subtotal)}`)
      .join('\n');

    const subtotal = Number(order.totalAmount ?? 0) - Number(order.deliveryFee ?? 0);
    const footer = settings.invoiceFooterMessage ? `\n${settings.invoiceFooterMessage}` : '';

    const msg = [
      `✅ DELIVERY RECEIPT`,
      `Order: #${order.orderNumber}`,
      `Customer: ${order.customerName}`,
      ``,
      `Items:`,
      itemLines || '• (no items)',
      ``,
      `Subtotal:     ${fmt(subtotal)}`,
      `Delivery Fee: ${fmt(order.deliveryFee)}`,
      `──────────────────`,
      `TOTAL PAID:   ${fmt(order.totalAmount)}`,
      ``,
      `Thank you for shopping with ${settings.storeName ?? 'us'}!${footer}`,
    ].join('\n');

    // Find WA account: paymentLinkAccountId first, then any connected account
    let account = null;
    if (settings.paymentLinkAccountId) {
      account = await prisma.whatsappAccount.findUnique({
        where: { id: settings.paymentLinkAccountId },
        select: { id: true, instanceName: true, status: true },
      });
      if (account?.status !== 'CONNECTED') account = null;
    }
    if (!account) {
      account = await prisma.whatsappAccount.findFirst({
        where: { status: 'CONNECTED' },
        select: { id: true, instanceName: true },
      });
    }
    if (!account) {
      console.log('[Receipt WA] No connected WhatsApp account found — skipping receipt send');
      return;
    }

    const phone = normalizePhone(order.customerPhone);
    await sendText(account.instanceName, phone, msg);

    await prisma.whatsappMessageLog.create({
      data: {
        accountId: account.id,
        orderId:   order.id,
        toPhone:   phone,
        message:   msg,
        status:    'sent',
      },
    });
    console.log(`[Receipt WA] Sent receipt to ${phone} for order ${order.orderNumber}`);
  } catch (err) {
    console.error('[Receipt WA] Failed:', err.message);
  }
}

export async function changeOrderStatus(id, newStatus, actorId, note, scheduledDate, reminderEnabled, reminderOffset) {
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
    updateData.reminderEnabled = reminderEnabled ?? false;
    updateData.reminderOffset = reminderOffset ?? 1440;
    updateData.reminderSentAt = null; // reset if rescheduled
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

  // Email customer on CONFIRMED or DELIVERED
  if (['CONFIRMED', 'DELIVERED'].includes(newStatus)) {
    sendOrderStatusEmail(order, newStatus).catch(e => console.error('[Orders] Status email error:', e.message));
  }

  // Auto-send WhatsApp receipt when delivered (if enabled in settings)
  if (newStatus === 'DELIVERED') {
    prisma.storeSettings.findUnique({ where: { id: 'singleton' } }).then(settings => {
      if (settings?.sendCustomerInvoiceWa) {
        sendReceiptWhatsApp(order, settings);
      }
    }).catch(console.error);
  }

  // Notify staff who scheduled + agent when status becomes SCHEDULED
  if (newStatus === 'SCHEDULED') {
    import('../../jobs/scheduleNotifyJob.js').then(({ notifyScheduled }) => {
      notifyScheduled(order, actorId).catch(console.error);
    });
  }

  return order;
}

export async function hardDeleteOrder(id, actorId) {
  // Null out WA log foreign keys first (no cascade defined)
  await prisma.whatsappMessageLog.updateMany({ where: { orderId: id }, data: { orderId: null } });
  // Delete the order — items + statusHistory cascade automatically
  await prisma.order.delete({ where: { id } });
  if (actorId) {
    await writeAuditLog({ userId: actorId, action: 'order.hard_delete', entityType: 'Order', entityId: id, details: {} });
  }
  return { ok: true };
}

export async function bulkAction(orderIds, action, payload, actorId) {
  const results = { success: 0, failed: 0 };

  for (const id of orderIds) {
    try {
      switch (action) {
        case 'status': {
          // Remove bump items the customer declined before changing status
          if (payload.rejectedItemIds?.length) {
            await prisma.orderItem.deleteMany({ where: { id: { in: payload.rejectedItemIds }, orderId: id } });
            // Recalculate total
            const remaining = await prisma.orderItem.findMany({ where: { orderId: id } });
            const currentOrder = await prisma.order.findUnique({ where: { id }, select: { deliveryFee: true } });
            const newSubtotal = remaining.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
            await prisma.order.update({ where: { id }, data: { totalAmount: newSubtotal + Number(currentOrder.deliveryFee ?? 0) } });
          }
          await changeOrderStatus(id, payload.status, actorId, payload.note, payload.scheduledDate, payload.reminderEnabled, payload.reminderOffset);
          const statusUpdateData = {};
          if (payload.agentId) statusUpdateData.agentId = payload.agentId;
          if (payload.status === 'DELIVERED' && payload.deliveryFee != null && payload.deliveryFee !== '') {
            statusUpdateData.deliveryFee = Number(payload.deliveryFee);
          }
          if (Object.keys(statusUpdateData).length) {
            await prisma.order.update({ where: { id }, data: statusUpdateData });
          }
          break;
        }
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
          await hardDeleteOrder(id, actorId);
          break;
        case 'ban':
          await changeOrderStatus(id, 'BANNED', actorId);
          break;
        case 'remit': {
          const remitData = { paymentStatus: 'REMITTED' };
          if (payload.deliveryFee != null) remitData.deliveryFee = Number(payload.deliveryFee);
          await prisma.order.update({ where: { id }, data: remitData });
          if (actorId) await writeAuditLog({ userId: actorId, action: 'order.remitted', entityType: 'Order', entityId: id, details: { deliveryFee: remitData.deliveryFee } });
          break;
        }
        case 'unremit':
          await prisma.order.update({ where: { id }, data: { paymentStatus: 'UNPAID' } });
          if (actorId) await writeAuditLog({ userId: actorId, action: 'order.unremitted', entityType: 'Order', entityId: id, details: {} });
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

const PERIOD_DAYS = { '7d': 7, '14d': 14, '30d': 30, '3m': 90, '6m': 180, '1y': 365, '2y': 730 };

export async function getStats(period = '7d') {
  const now = new Date();
  let periodStart, prevStart, periodEnd;

  if (period === 'today') {
    periodStart = new Date(now); periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(now); periodEnd.setHours(23, 59, 59, 999);
    prevStart = new Date(periodStart); prevStart.setDate(prevStart.getDate() - 1);
  } else if (period === 'yesterday') {
    periodStart = new Date(now); periodStart.setDate(now.getDate() - 1); periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart); periodEnd.setHours(23, 59, 59, 999);
    prevStart = new Date(periodStart); prevStart.setDate(prevStart.getDate() - 1);
  } else {
    const days = PERIOD_DAYS[period] ?? 7;
    periodStart = new Date(now); periodStart.setDate(now.getDate() - days); periodStart.setHours(0, 0, 0, 0);
    periodEnd = now;
    prevStart = new Date(periodStart); prevStart.setDate(prevStart.getDate() - days);
  }

  const periodWhere = { createdAt: { gte: periodStart, lte: periodEnd }, status: { notIn: ['DELETED'] } };

  const [currentOrders, prevOrders, topProductRows, abandonedByStatus] = await Promise.all([
    prisma.order.findMany({
      where: periodWhere,
      select: { status: true, totalAmount: true, paymentStatus: true, paymentMethod: true,
                state: true, customerName: true, customerPhone: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: prevStart, lt: periodStart }, status: { notIn: ['DELETED'] } },
      select: { status: true, totalAmount: true },
    }),
    // Top products by revenue for the period (via order items)
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: periodWhere },
      _sum: { subtotal: true },
      _count: { id: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 8,
    }),
    prisma.abandonedCart.groupBy({ by: ['recoveryStatus'], _count: { id: true } }),
  ]);

  // Fetch product names for top products
  const productIds = topProductRows.map(r => r.productId);
  const productNames = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const productNameMap = Object.fromEntries(productNames.map(p => [p.id, p.name]));

  const sumAmount = (orders) => orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const countStatus = (orders, status) => orders.filter(o => o.status === status).length;

  const currentTotal = sumAmount(currentOrders);
  const prevTotal = sumAmount(prevOrders);
  const pctChange = (a, b) => b === 0 ? 0 : Math.round(((a - b) / b) * 100);

  // Period-aware status breakdown
  const statusMap = {};
  currentOrders.forEach(o => { statusMap[o.status] = (statusMap[o.status] ?? 0) + 1; });

  const abandonedMap = {};
  abandonedByStatus.forEach(r => { abandonedMap[r.recoveryStatus] = r._count.id; });

  // Top states
  const stateMap = {};
  currentOrders.forEach(o => {
    if (o.state) stateMap[o.state] = (stateMap[o.state] ?? 0) + 1;
  });
  const topStates = Object.entries(stateMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([state, count]) => ({ state, count }));

  // Top customers by total spend
  const customerMap = {};
  currentOrders.forEach(o => {
    const key = o.customerPhone;
    if (!key) return;
    if (!customerMap[key]) customerMap[key] = { name: o.customerName, phone: o.customerPhone, count: 0, total: 0 };
    customerMap[key].count++;
    customerMap[key].total += Number(o.totalAmount);
  });
  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Top products
  const topProducts = topProductRows.map(r => ({
    productId: r.productId,
    name: productNameMap[r.productId] ?? 'Unknown',
    count: r._count.id,
    revenue: Number(r._sum.subtotal ?? 0),
  }));

  return {
    period,
    thisWeek: {
      count: currentOrders.length,
      totalAmount: currentTotal,
      delivered: countStatus(currentOrders, 'DELIVERED'),
      deliveredAmount: sumAmount(currentOrders.filter(o => o.status === 'DELIVERED')),
      pending: countStatus(currentOrders, 'PENDING'),
      awaiting: countStatus(currentOrders, 'AWAITING'),
      scheduled: countStatus(currentOrders, 'SCHEDULED'),
      cancelled: countStatus(currentOrders, 'CANCELLED'),
      cancelledAmount: sumAmount(
        currentOrders.filter(o => o.status === 'CANCELLED' || o.status === 'FAILED')
      ),
      deliveryRate: currentOrders.length === 0
        ? 0
        : Math.round((countStatus(currentOrders, 'DELIVERED') / currentOrders.length) * 100),
      paidOnlineAmount: sumAmount(
        currentOrders.filter(o => o.paymentStatus === 'PAID' && o.paymentMethod === 'PBD')
      ),
    },
    lastWeek: {
      count: prevOrders.length,
      totalAmount: prevTotal,
    },
    weekOverWeek: {
      countChange: pctChange(currentOrders.length, prevOrders.length),
      amountChange: pctChange(currentTotal, prevTotal),
    },
    byStatus: statusMap,
    topStates,
    topCustomers,
    topProducts,
    abandoned: {
      pending:   abandonedMap.pending   ?? 0,
      messaged:  abandonedMap.messaged  ?? 0,
      recovered: abandonedMap.recovered ?? 0,
      ignored:   abandonedMap.ignored   ?? 0,
      total: Object.values(abandonedMap).reduce((s, v) => s + v, 0),
    },
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

export async function exportOrdersToExcel(query, res) {
  const where = buildOrderWhere(query);
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { product: { select: { name: true } } } },
      agent: { select: { name: true } },
      assignedStaff: { select: { name: true } },
    },
    take: 10000,
  });

  const rows = orders.map(o => {
    const total = Number(o.totalAmount ?? 0);
    const fee   = Number(o.deliveryFee ?? 0);
    return {
      orderNumber:    o.orderNumber,
      customerName:   o.customerName,
      customerPhone:  o.customerPhone,
      customerPhone2: o.customerPhone2 ?? '',
      state:          o.state,
      city:           o.city ?? '',
      address:        o.address,
      status:         o.status,
      paymentStatus:  o.paymentStatus,
      products:       o.items.map(i => `${i.product.name}${i.variation ? ` (${i.variation})` : ''} x${i.quantity}`).join(', '),
      totalAmount:    total,
      deliveryFee:    fee,
      netRemitted:    o.paymentStatus === 'REMITTED' ? total - fee : '',
      source:         o.source,
      agent:          o.agent?.name ?? '',
      assignedStaff:  o.assignedStaff?.name ?? '',
      tags:           (o.tags ?? []).join(', '),
      notes:          o.notes ?? '',
      comment:        o.comment ?? '',
      scheduledDate:  o.scheduledDate ? new Date(o.scheduledDate).toLocaleString() : '',
      createdAt:      new Date(o.createdAt).toLocaleString(),
    };
  });

  await sendExcel(res, {
    filename: `orders-${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheetName: 'Orders',
    columns: [
      { header: 'Order #',       key: 'orderNumber',    width: 18 },
      { header: 'Customer',      key: 'customerName',   width: 22 },
      { header: 'Phone',         key: 'customerPhone',  width: 16 },
      { header: 'Phone 2',       key: 'customerPhone2', width: 16 },
      { header: 'State',         key: 'state',          width: 16 },
      { header: 'City',          key: 'city',           width: 14 },
      { header: 'Address',       key: 'address',        width: 30 },
      { header: 'Status',        key: 'status',         width: 18 },
      { header: 'Payment',       key: 'paymentStatus',  width: 12 },
      { header: 'Products',      key: 'products',       width: 40 },
      { header: 'Total (₦)',        key: 'totalAmount',  width: 14 },
      { header: 'Delivery Fee (₦)', key: 'deliveryFee',  width: 16 },
      { header: 'Net Remitted (₦)', key: 'netRemitted',  width: 16 },
      { header: 'Source',           key: 'source',       width: 12 },
      { header: 'Agent',         key: 'agent',          width: 18 },
      { header: 'Staff',         key: 'assignedStaff',  width: 18 },
      { header: 'Tags',          key: 'tags',           width: 20 },
      { header: 'Notes',         key: 'notes',          width: 25 },
      { header: 'Comment',       key: 'comment',        width: 25 },
      { header: 'Scheduled',     key: 'scheduledDate',  width: 20 },
      { header: 'Created At',    key: 'createdAt',      width: 20 },
    ],
    rows,
  });
}
