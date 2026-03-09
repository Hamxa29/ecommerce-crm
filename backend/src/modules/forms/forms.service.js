import { prisma } from '../../config/database.js';
import { generateOrderNumber } from '../../utils/orderNumber.js';

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
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
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
  const form = await prisma.form.findUniqueOrThrow({ where: { slug, status: true } });

  const orderNumber = await generateOrderNumber();
  const items = body.items ?? [];
  const totalAmount = items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);

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
      deliveryFee: body.deliveryFee ?? 0,
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
  return order;
}

export async function recordAbandonment(slug, body) {
  const form = await prisma.form.findUnique({ where: { slug } });

  const cart = await prisma.abandonedCart.create({
    data: {
      formId: form?.id,
      customerName: body.customerName ?? 'Unknown',
      customerPhone: body.customerPhone ?? '',
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
