import { prisma } from '../../config/database.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

export async function listCategories(query) {
  const { skip, take, page, limit } = parsePagination(query);
  const where = {};
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { brandName: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  const [categories, total] = await Promise.all([
    prisma.productCategory.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { products: true } } },
    }),
    prisma.productCategory.count({ where }),
  ]);
  return paginatedResponse(categories, total, page, limit);
}

export async function createCategory(data) {
  return prisma.productCategory.create({ data });
}

export async function updateCategory(id, data) {
  return prisma.productCategory.update({ where: { id }, data });
}

export async function deleteCategory(id) {
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) throw Object.assign(new Error('Cannot delete category with existing products'), { status: 400 });
  return prisma.productCategory.delete({ where: { id } });
}

export async function duplicateCategory(id) {
  const src = await prisma.productCategory.findUniqueOrThrow({ where: { id } });
  const { id: _id, createdAt, updatedAt, ...fields } = src;
  return prisma.productCategory.create({ data: { ...fields, name: `${fields.name} (Copy)` } });
}
