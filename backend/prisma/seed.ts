// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SYSTEM_TAGS = ['bbk', 'uro', 'embrasser', 'public', 'trio', 'muscu', 'actif', 'passif'];

async function main() {
  console.log('🌱 Seed Matedex...');

  // Créer un utilisateur système pour héberger les tags système
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@matedex.internal' },
    update: {},
    create: {
      email: 'system@matedex.internal',
      displayName: 'Système',
      passwordHash: await bcrypt.hash(Math.random().toString(36), 12),
    },
  });

  // Créer les tags système
  for (const tagName of SYSTEM_TAGS) {
    await prisma.tag.upsert({
      where: { name_userId: { name: tagName, userId: systemUser.id } },
      update: {},
      create: {
        name: tagName,
        userId: systemUser.id,
        isSystem: true,
      },
    });
  }

  console.log(`✅ ${SYSTEM_TAGS.length} tags système créés.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());