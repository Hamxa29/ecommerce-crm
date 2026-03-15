import { prisma } from '../../config/database.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

export async function listProducts(query) {
  const { skip, take, page, limit } = parsePagination(query);
  const where = {};
  if (query.categoryId) where.categoryId = query.categoryId;
  // Default to active products unless caller explicitly passes status=all or status=false
  if (query.status === 'all') { /* no filter */ }
  else if (query.status !== undefined) where.status = query.status === 'true';
  else where.status = true;
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.product.count({ where }),
  ]);
  return paginatedResponse(products, total, page, limit);
}

export async function getProduct(id) {
  return prisma.product.findUniqueOrThrow({
    where: { id },
    include: { category: true },
  });
}

export async function createProduct(data) {
  return prisma.product.create({
    data: {
      name: data.name,
      categoryId: data.categoryId,
      country: data.country ?? null,
      costPrice: data.costPrice,
      stock: data.stock ?? 0,
      status: data.status ?? true,
      variations: data.variations ?? [],
      pricingTiers: data.pricingTiers ?? [],
      stateDeliveryFees: data.stateDeliveryFees ?? {},
    },
    include: { category: { select: { id: true, name: true } } },
  });
}

export async function updateProduct(id, data) {
  const updateData = {};
  if (data.name           !== undefined) updateData.name           = data.name;
  if (data.categoryId     !== undefined) updateData.category       = { connect: { id: data.categoryId } };
  if (data.country        !== undefined) updateData.country        = data.country;
  if (data.costPrice      !== undefined) updateData.costPrice      = data.costPrice;
  if (data.stock          !== undefined) updateData.stock          = data.stock;
  if (data.status         !== undefined) updateData.status         = data.status;
  if (data.variations     !== undefined) updateData.variations     = data.variations;
  if (data.pricingTiers   !== undefined) updateData.pricingTiers   = data.pricingTiers;
  if (data.stateDeliveryFees !== undefined) updateData.stateDeliveryFees = data.stateDeliveryFees;
  if (data.paymentMethod  !== undefined) updateData.paymentMethod  = data.paymentMethod;

  return prisma.product.update({
    where: { id },
    data: updateData,
    include: { category: { select: { id: true, name: true } } },
  });
}

export async function deleteProduct(id) {
  // Try hard delete first; fall back to soft delete if orders reference this product
  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderItemCount > 0) {
    return prisma.product.update({ where: { id }, data: { status: false } });
  }
  return prisma.product.delete({ where: { id } });
}

export async function duplicateProduct(id) {
  const src = await prisma.product.findUniqueOrThrow({ where: { id } });
  const { id: _id, createdAt, updatedAt, ...fields } = src;
  return prisma.product.create({ data: { ...fields, name: `${fields.name} (Copy)` } });
}
