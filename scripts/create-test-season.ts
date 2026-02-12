// 临时脚本：创建测试赛季
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建测试赛季
  const now = new Date();
  const endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30天后

  const season = await prisma.season.create({
    data: {
      seasonNumber: 1,
      status: 'ACTIVE',
      themeKeyword: '赛博朋克',
      constraints: JSON.stringify(['不能出现真实地名', '主角必须有成长弧线']),
      zoneStyles: JSON.stringify(['都市', '玄幻', '科幻']),
      startTime: now,
      endTime: endTime,
      signupDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7天后截止报名
      duration: 30,
      maxChapters: 7,
      minChapters: 3,
      rewards: JSON.stringify({ 1: 1000, 2: 500, 3: 200 }),
      participantCount: 128,
    },
  });

  console.log('创建成功:', season.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
