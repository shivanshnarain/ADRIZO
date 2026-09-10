import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('No ADMIN_EMAIL or ADMIN_PASSWORD set in .env');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: 'ADMIN',
        passwordHash,
        name: 'Administrator',
      },
    });
    console.log(`Admin user ${adminEmail} updated successfully with role ADMIN.`);
  } else {
    await prisma.user.create({
      data: {
        name: 'Administrator',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`Admin user ${adminEmail} created successfully with role ADMIN.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
