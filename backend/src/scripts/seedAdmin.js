import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';

async function seed() {
  const email = process.env.ADMIN_EMAIL || 'admin@crm.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const name = process.env.ADMIN_NAME || 'Super Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: { name, email, passwordHash, role: 'ADMIN', status: true },
  });

  console.log('─'.repeat(50));
  console.log('Admin user created successfully!');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  ID:       ${admin.id}`);
  console.log('─'.repeat(50));
  console.log('IMPORTANT: Change the password after first login!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
