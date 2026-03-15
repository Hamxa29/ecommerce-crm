import { prisma } from '../../config/database.js';
import { generateOrderNumber } from '../../utils/orderNumber.js';
import { sendNewOrderNotification, sendOrderReceipt } from '../../utils/emailNotification.js';

export async function listForms() {
  return prisma.form.findMany({
    where: { status: true },
    orderBy: { createdAt: 'desc' },
    include: { products: { include: { product: { select: { id: true, name: true } } } } },
  });
}

export async function getForm(id) {
  return prisma.form.findUniqueOrThrow({
    where: { id },
    include: { products: { include: { product: true }, orderBy: { displayOrder: 'asc' } } },
  });
}

export async function createForm(data) {
  const { products: productItems, ...formData } = data;
  return prisma.form.create({
    data: {
      ...formData,
      products: productItems?.length
        ? { create: productItems.map((p, i) => ({ productId: p.productId, isUpsell: p.isUpsell ?? false, displayOrder: i })) }
        : undefined,
    },
    include: { products: { include: { product: true } } },
  });
}

export async function updateForm(id, data) {
  const { products: productItems, ...formData } = data;

  if (productItems !== undefined) {
    await prisma.formProduct.deleteMany({ where: { formId: id } });
    if (productItems.length) {
      await prisma.formProduct.createMany({
        data: productItems.map((p, i) => ({ formId: id, productId: p.productId, isUpsell: p.isUpsell ?? false, displayOrder: i })),
      });
    }
  }

  return prisma.form.update({
    where: { id },
    data: formData,
    include: { products: { include: { product: true } } },
  });
}

export async function deleteForm(id) {
  await prisma.form.update({ where: { id }, data: { status: false } });
  return { ok: true };
}

export async function getEmbedCode(id) {
  const form = await prisma.form.findUniqueOrThrow({ where: { id } });
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const formUrl = `${baseUrl}/form/${form.slug}`;
  return {
    slug: form.slug,
    directUrl: formUrl,
    iframe: `<iframe src="${formUrl}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;"></iframe>`,
    script: `<script src="${baseUrl}/embed.js" data-form="${form.slug}" async></script>`,
  };
}

// ── Public endpoints ─────────────────────────────────────────────────────────

export async function getPublicForm(slug) {
  return prisma.form.findUniqueOrThrow({
    where: { slug, status: true },
    include: { products: { include: { product: true }, orderBy: { displayOrder: 'asc' } } },
  });
}

export async function recordHit(slug) {
  const form = await prisma.form.findUnique({ where: { slug } });
  if (!form) return { ok: false };
  await prisma.form.update({ where: { slug }, data: { hits: { increment: 1 } } });
  return { ok: true };
}

export async function submitForm(slug, body) {
  const form = await prisma.form.findUniqueOrThrow({
    where: { slug, status: true },
    include: { products: { include: { product: { select: { id: true, paymentMethod: true } } }, orderBy: { displayOrder: 'asc' } } },
  });

  const orderNumber = await generateOrderNumber();
  const items = body.items ?? [];
  const totalAmount = items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);

  // Resolve effective payment method: form override > first product > COD
  const formPM = form.paymentMethod; // null | "COD" | "PBD" | "BOTH"
  const firstProductPM = form.products?.[0]?.product?.paymentMethod ?? 'COD';
  const effectivePM = formPM ?? firstProductPM; // "COD" | "PBD" | "BOTH"
  // BOTH → store as PBD (customer chooses on payment page which includes a COD option)
  const orderPaymentMethod = effectivePM === 'BOTH' ? 'PBD' : effectivePM;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerPhone2: body.customerPhone2,
      customerEmail: body.customerEmail,
      address: body.address,
      state: body.state,
      city: body.city,
      country: body.country ?? 'Nigeria',
      ipAddress: body.ipAddress,
      source: 'form',
      formId: form.id,
      totalAmount,
      paymentMethod: orderPaymentMethod,
      notes: body.notes,
      items: {
        create: items.map(i => ({
          productId: i.productId,
          variation: i.variation,
          pricingTier: i.pricingTier,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.unitPrice * i.quantity,
        })),
      },
    },
  });

  await prisma.form.update({ where: { id: form.id }, data: { conversions: { increment: 1 } } });

  // If there's a messaged abandoned cart for this phone+form, the customer came back via
  // the recovery link → mark it recovered
  if (body.customerPhone) {
    await prisma.abandonedCart.updateMany({
      where: { customerPhone: body.customerPhone, formId: form.id, recoveryStatus: 'messaged' },
      data: { recoveryStatus: 'recovered' },
    });
  }

  // Send email notification (non-blocking)
  const orderWithItems = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: { include: { product: { select: { name: true } } } } },
  });
  sendNewOrderNotification(orderWithItems).catch(e => console.error('[Forms] Notification email error:', e.message));
  sendOrderReceipt(orderWithItems).catch(e => console.error('[Forms] Receipt email error:', e.message));

  return order;
}

export async function recordAbandonment(slug, body) {
  const form = await prisma.form.findUnique({ where: { slug } });
  const phone = body.customerPhone ?? '';

  // Check for an existing pending cart from this phone on this form (within last 2 hours)
  // to prevent duplicate sends when the form fires the abandonment event multiple times
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const existing = await prisma.abandonedCart.findFirst({
    where: {
      customerPhone: phone,
      formId: form?.id ?? null,
      recoveryStatus: 'pending',
      messageSentAt: null,
      createdAt: { gte: twoHoursAgo },
    },
  });

  if (existing) {
    // Update with latest product data instead of creating a duplicate
    return prisma.abandonedCart.update({
      where: { id: existing.id },
      data: {
        customerName: body.customerName ?? existing.customerName,
        customerEmail: body.customerEmail ?? existing.customerEmail,
        productData: body.productData ?? existing.productData,
      },
    });
  }

  const cart = await prisma.abandonedCart.create({
    data: {
      formId: form?.id,
      customerName: body.customerName ?? 'Unknown',
      customerPhone: phone,
      customerEmail: body.customerEmail,
      ipAddress: body.ipAddress,
      productData: body.productData ?? {},
    },
  });

  if (form) {
    await prisma.form.update({ where: { id: form.id }, data: { abandonments: { increment: 1 } } });
  }

  return cart;
}

// ── Abandoned carts ──────────────────────────────────────────────────────────

export async function listAbandonedCarts(query) {
  const where = {};
  if (query.status) where.recoveryStatus = query.status;
  return prisma.abandonedCart.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { form: { select: { id: true, name: true, slug: true } } },
    take: 200,
  });
}

export async function updateAbandonedCart(id, data) {
  return prisma.abandonedCart.update({ where: { id }, data });
}

export async function recoverCart(cartId) {
  return prisma.abandonedCart.update({
    where: { id: cartId },
    data: { recoveryStatus: 'recovered' },
  });
}
