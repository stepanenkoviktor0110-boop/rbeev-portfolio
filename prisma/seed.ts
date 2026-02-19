import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  for (const name of ['Свадьбы', 'Портреты', 'Пейзажи']) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

main().finally(async () => prisma.$disconnect());
