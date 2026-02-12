// 临时脚本：检查数据库中的赛季状态
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const seasons = await prisma.season.findMany({
    orderBy: { seasonNumber: 'desc' },
    select: {
      id: true,
      seasonNumber: true,
      status: true,
      themeKeyword: true,
      startTime: true,
      endTime: true,
    },
  });

  console.log('数据库中的赛季:');
  console.log(JSON.stringify(seasons, null, 2));

  // 检查 ACTIVE 状态的赛季
  const activeSeason = await prisma.season.findFirst({
    where: { status: 'ACTIVE' },
  });
  console.log('\n当前进行中的赛季 (ACTIVE):');
  console.log(JSON.stringify(activeSeason, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
