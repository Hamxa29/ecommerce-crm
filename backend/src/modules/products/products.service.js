import { prisma } from '../../config/database.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

export async function listProducts(query) {
  const { skip, take, page, limit } = parsePagination(query);
  const where = {};
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.status !== undefined) where.status = query.status === 'true';
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
  return prisma.product.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true } } },
  });
}

export async function deleteProduct(id) {
  return prisma.product.update({ where: { id }, data: { status: false } });
}

export async function duplicateProduct(id) {
  const src = await prisma.product.findUniqueOrThrow({ where: { id } });
  const { id: _id, createdAt, updatedAt, ...fields } = src;
  return prisma.product.create({ data: { ...fields, name: `${fields.name} (Copy)` } });
}
