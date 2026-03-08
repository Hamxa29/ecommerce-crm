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
  return prisma.storeSettings.upsert({
    where: { id: SINGLETON_ID },
    update: data,
    create: { id: SINGLETON_ID, ...data },
  });
}
