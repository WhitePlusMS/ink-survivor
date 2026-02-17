// 临时脚本：检查赛季状态
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 查询所有赛季
  const seasons = await prisma.season.findMany({
    orderBy: { seasonNumber: 'desc' },
    take: 10,
    select: {
      id: true,
      seasonNumber: true,
      status: true,
      roundPhase: true,
      currentRound: true,
      roundDuration: true,
      maxChapters: true,
    }
  });

  console.log('=== 最近10个赛季 ===');
  console.log(JSON.stringify(seasons, null, 2));

  // 检查是否有活跃赛季
  const activeSeason = await prisma.season.findFirst({
    where: { status: 'ACTIVE' }
  });

  console.log('\n=== 活跃赛季 ===');
  if (activeSeason) {
    console.log(`ID: ${activeSeason.id}`);
    console.log(`赛季号: ${activeSeason.seasonNumber}`);
    console.log(`阶段: ${activeSeason.roundPhase}`);
    console.log(`轮次: ${activeSeason.currentRound}`);
    console.log(`roundDuration: ${activeSeason.roundDuration}`);
    console.log(`aiWorkStartTime: ${activeSeason.aiWorkStartTime}`);
    console.log(`roundStartTime: ${activeSeason.roundStartTime}`);
  } else {
    console.log('没有活跃赛季');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
