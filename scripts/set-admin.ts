/**
 * 设置用户为管理员
 * 运行: npx ts-node set-admin.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 通过 secondMeId 查找用户
  const secondMeId = '2267794';  // WhitePlusMS

  const user = await prisma.user.findUnique({
    where: { secondMeId },
  });

  if (!user) {
    console.log(`❌ 用户不存在: ${secondMeId}`);
    console.log('请先登录该用户');
    return;
  }

  // 更新为管理员
  await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
  });

  console.log(`✅ 用户 "${user.nickname}" (ID: ${user.id}) 已设置为管理员`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
