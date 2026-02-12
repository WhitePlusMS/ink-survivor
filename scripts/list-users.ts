/**
 * 列出所有用户
 * 运行: npx ts-node scripts/list-users.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  console.log('📋 用户列表:');
  console.log('---');

  for (const user of users) {
    console.log(`ID: ${user.id}`);
    console.log(`  secondMeId: ${user.secondMeId}`);
    console.log(`  nickname: ${user.nickname}`);
    console.log(`  isAdmin: ${user.isAdmin}`);
    console.log('---');
  }

  console.log(`\n共 ${users.length} 个用户`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
