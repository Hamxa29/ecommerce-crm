import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { writeAuditLog } from '../../utils/auditLog.js';
import { sendExcel } from '../../utils/excelExport.js';

export async function listUsers(query) {
  const { skip, take, page, limit } = parsePagination(query);
  const where = {};
  if (query.role) where.role = query.role;
  if (query.status !== undefined) where.status = query.status === 'true';
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true, status: true,
        lastLoginAt: true, permissions: true, salary: true, bonus: true,
        commission: true, createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);
  return paginatedResponse(users, total, page, limit);
}

export async function createUser(data, actorId) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role ?? 'STAFF',
      status: data.status ?? true,
      permissions: data.permissions ?? {},
      salary: data.salary ?? null,
      bonus: data.bonus ?? null,
      commission: data.commission ?? null,
    },
    select: {
      id: true, name: true, email: true, role: true, status: true,
      permissions: true, createdAt: true,
    },
  });
  await writeAuditLog({ userId: actorId, action: 'user.create', entityType: 'User', entityId: user.id, details: { name: user.name, email: user.email } });
  return user;
}

export async function updateUser(id, data, actorId) {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.permissions !== undefined) updateData.permissions = data.permissions;
  if (data.salary !== undefined) updateData.salary = data.salary;
  if (data.bonus !== undefined) updateData.bonus = data.bonus;
  if (data.commission !== undefined) updateData.commission = data.commission;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, status: true, permissions: true },
  });
  await writeAuditLog({ userId: actorId, action: 'user.update', entityType: 'User', entityId: id, details: updateData });
  return user;
}

export async function deleteUser(id, actorId) {
  await prisma.user.update({ where: { id }, data: { status: false } });
  await writeAuditLog({ userId: actorId, action: 'user.deactivate', entityType: 'User', entityId: id });
}

export async function exportUsersToExcel(query, res) {
  const where = {};
  if (query.role) where.role = query.role;
  if (query.status !== undefined) where.status = query.status === 'true';

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      name: true, email: true, role: true, status: true,
      salary: true, bonus: true, commission: true,
      lastLoginAt: true, createdAt: true,
    },
  });

  const rows = users.map(u => ({
    name:       u.name,
    email:      u.email,
    role:       u.role,
    status:     u.status ? 'Active' : 'Inactive',
    salary:     u.salary != null ? Number(u.salary) : '',
    bonus:      u.bonus  != null ? Number(u.bonus)  : '',
    commission: u.commission != null ? `${Number(u.commission)}%` : '',
    lastLogin:  u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never',
    createdAt:  new Date(u.createdAt).toLocaleString(),
  }));

  await sendExcel(res, {
    filename: `staff-${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheetName: 'Staff',
    columns: [
      { header: 'Name',        key: 'name',       width: 22 },
      { header: 'Email',       key: 'email',       width: 28 },
      { header: 'Role',        key: 'role',        width: 18 },
      { header: 'Status',      key: 'status',      width: 12 },
      { header: 'Salary (₦)', key: 'salary',      width: 14 },
      { header: 'Bonus (₦)',  key: 'bonus',       width: 14 },
      { header: 'Commission',  key: 'commission',  width: 14 },
      { header: 'Last Login',  key: 'lastLogin',   width: 20 },
      { header: 'Created At',  key: 'createdAt',   width: 20 },
    ],
    rows,
  });
}
