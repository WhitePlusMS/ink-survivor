/**
 * 测试功能：初始化 S0 测试赛季环境
 * POST /api/admin/test/init-s0
 *
 * 1. 如果 S0 赛季不存在：创建 10 个 Agent + S0 赛季
 * 2. 如果 S0 赛季已存在：清空赛季书籍，重置 10 小时倒计时
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/utils/admin';

// 10 个风格迥异的 Agent 配置
const TEST_AGENTS = [
  { secondMeId: 'agent-001', nickname: '文艺青年_A01', personality: '感性、擅长情感描写', preferZone: 'urban', adaptability: 0.9, riskTolerance: 'low' },
  { secondMeId: 'agent-002', nickname: '硬核科幻_B02', personality: '理性、注重逻辑', preferZone: 'scifi', adaptability: 0.5, riskTolerance: 'high' },
  { secondMeId: 'agent-003', nickname: '玄幻大师_C03', personality: '想象力丰富、宏大叙事', preferZone: 'fantasy', adaptability: 0.6, riskTolerance: 'medium' },
  { secondMeId: 'agent-004', nickname: '悬疑推理_D04', personality: '逻辑严密、擅长埋坑', preferZone: 'urban', adaptability: 0.7, riskTolerance: 'low' },
  { secondMeId: 'agent-005', nickname: '幽默段子_E05', personality: '乐观幽默、喜欢吐槽', preferZone: 'urban', adaptability: 0.8, riskTolerance: 'medium' },
  { secondMeId: 'agent-006', nickname: '黑暗写手_F06', personality: '阴暗、擅长反转', preferZone: 'scifi', adaptability: 0.4, riskTolerance: 'high' },
  { secondMeId: 'agent-007', nickname: '治愈系_G07', personality: '温暖、治愈', preferZone: 'urban', adaptability: 0.95, riskTolerance: 'low' },
  { secondMeId: 'agent-008', nickname: '动作达人_H08', personality: '热血、动作描写强', preferZone: 'fantasy', adaptability: 0.5, riskTolerance: 'high' },
  { secondMeId: 'agent-009', nickname: '历史考据_I09', personality: '严谨、考据癖', preferZone: 'fantasy', adaptability: 0.7, riskTolerance: 'medium' },
  { secondMeId: 'agent-010', nickname: '萌新写手_J10', personality: '好奇、学习欲强', preferZone: 'urban', adaptability: 0.99, riskTolerance: 'medium' },
];

export async function POST() {
  try {
    // 1. 验证管理员权限
    const authResult = await requireAdmin();
    if (!authResult.success) {
      const response = authResult.message.includes('登录')
        ? createUnauthorizedResponse('请先登录管理员账号')
        : createForbiddenResponse();
      return NextResponse.json(response, { status: authResult.message.includes('登录') ? 401 : 403 });
    }

    console.log('[TestInitS0] 处理 S0 测试赛季...');

    // 1. 检查 S0 赛季是否存在
    const existingS0 = await prisma.season.findFirst({
      where: { seasonNumber: 0 },
    });

    // 2. 检查是否有 Agent（仅用于检查，不执行删除操作）
    await prisma.user.findMany({
      where: { secondMeId: { startsWith: 'agent-' } },
    });

    const isReset = !!existingS0;
    let season;

    if (existingS0) {
      // === 重置模式：清空书籍，重置倒计时 ===
      console.log('[TestInitS0] S0 赛季已存在，执行重置...');

      // 获取所有相关书籍
      const books = await prisma.book.findMany({
        where: { seasonId: existingS0.id },
      });

      // 删除所有关联数据（按依赖顺序）
      for (const book of books) {
        const bookId = book.id;

        // 先获取所有 chapter ID，因为其他表通过 chapterId 引用
        const chapters = await prisma.chapter.findMany({
          where: { bookId },
          select: { id: true },
        });
        const chapterIds = chapters.map(c => c.id);

        // 1. 删除点赞记录（通过 chapterId 引用）
        await prisma.like.deleteMany({
          where: { chapterId: { in: chapterIds } },
        });

        // 2. 删除阅读记录（通过 chapterId 引用）
        await prisma.reading.deleteMany({
          where: { chapterId: { in: chapterIds } },
        });

        // 3. 删除章节评论（通过 chapterId 引用）
        await prisma.comment.deleteMany({
          where: { chapterId: { in: chapterIds } },
        });

        // 4. 删除书籍评论（通过 bookId 引用）
        await prisma.comment.deleteMany({ where: { bookId } });

        // 5. 删除章节
        await prisma.chapter.deleteMany({ where: { bookId } });

        // 6. 删除大纲 (已合并到 Book，但保留删除逻辑以兼容旧数据)
        // await prisma.outline.deleteMany({ where: { bookId } });
        // 注意：Outline 字段已合并到 Book 表，无需单独删除
      }

      // 删除所有书籍
      await prisma.book.deleteMany({ where: { seasonId: existingS0.id } });

      // 重置倒计时为 10 小时
      const now = new Date();
      const signupDeadline = new Date(now.getTime() + 10 * 60 * 1000);
      const endTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);

      season = await prisma.season.update({
        where: { id: existingS0.id },
        data: {
          startTime: now,
          endTime,
          signupDeadline,
          status: 'ACTIVE',
          participantCount: 0,
          currentRound: 1,  // 轮次从 1 开始
          roundPhase: 'NONE',
          roundStartTime: null,
        },
      });

      console.log('[TestInitS0] S0 赛季已重置');
    } else {
      // === 初始化模式：创建 Agent 和赛季 ===
      console.log('[TestInitS0] 创建新的 S0 赛季...');

      // 创建/更新 Agent
      const agentIds: string[] = [];
      for (const agentData of TEST_AGENTS) {
        const existing = await prisma.user.findUnique({
          where: { secondMeId: agentData.secondMeId },
        });

        const agentConfig = JSON.stringify({
          personality: agentData.personality,
          writingStyle: '根据性格自动生成',
          preferZone: agentData.preferZone,
          adaptability: agentData.adaptability,
          riskTolerance: agentData.riskTolerance,
        });

        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { agentConfig },
          });
          agentIds.push(existing.id);
          console.log(`[TestInitS0] 更新 Agent: ${agentData.nickname}`);
        } else {
          const agent = await prisma.user.create({
            data: {
              secondMeId: agentData.secondMeId,
              nickname: agentData.nickname,
              agentConfig,
            },
          });
          agentIds.push(agent.id);
          console.log(`[TestInitS0] 创建 Agent: ${agentData.nickname}`);
        }
      }

      // 创建 S0 赛季
      const now = new Date();
      const signupDeadline = new Date(now.getTime() + 10 * 60 * 1000);
      const endTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);

      season = await prisma.season.create({
        data: {
          seasonNumber: 0,
          themeKeyword: '赛博朋克',
          constraints: JSON.stringify(['不能出现真实地名', '主角必须有成长弧线']),
          zoneStyles: JSON.stringify(['urban', 'fantasy', 'scifi']),
          startTime: now,
          endTime,
          signupDeadline,
          duration: '600',
          maxChapters: 7,
          minChapters: 3,
          rewards: JSON.stringify({ first: 1000, second: 500, third: 200, completionPerChapter: 50 }),
          status: 'ACTIVE',
          participantCount: 0,
        },
      });

      console.log('[TestInitS0] S0 赛季创建完成');
    }

    return NextResponse.json({
      code: 0,
      data: {
        seasonId: season.id,
        seasonNumber: season.seasonNumber,
        isReset,
        message: isReset
          ? 'S0 赛季已重置，可以重新开始测试'
          : 'S0 测试赛季初始化完成！10 个 Agent 已就绪',
      },
      message: isReset
        ? 'S0 赛季已重置'
        : 'S0 测试赛季初始化完成！10 个 Agent 已就绪',
    });
  } catch (error) {
    console.error('[TestInitS0] 错误:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '操作失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
