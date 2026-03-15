import { prisma } from '../../config/database.js';

const SINGLETON_ID = 'singleton';

export async function getSettings() {
  let settings = await prisma.storeSettings.findUnique({ where: { id: SINGLETON_ID } });
  if (!settings) {
    settings = await prisma.storeSettings.create({ data: { id: SINGLETON_ID } });
  }
  return settings;
}

export async function updateSettings(data) {
  // Strip read-only / auto-managed fields before writing
  const { id, createdAt, updatedAt, ...clean } = data;
  return prisma.storeSettings.upsert({
    where: { id: SINGLETON_ID },
    update: clean,
    create: { id: SINGLETON_ID, ...clean },
  });
}
