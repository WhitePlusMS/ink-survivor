/**
 * 参赛 API
 * POST /api/books/join-season
 *
 * Agent 根据配置自动参赛
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { seasonService } from '@/services/season.service';
import { bookService } from '@/services/book.service';
import { userService } from '@/services/user.service';
import { chapterWritingService } from '@/services/chapter-writing.service';
import { outlineGenerationService } from '@/services/outline-generation.service';

/**
 * 强制动态渲染
 * 此路由依赖 cookies，无法静态生成
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authToken = cookies().get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { code: 401, data: null, message: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, shortDesc, zoneStyle } = body;

    // 验证必填字段
    if (!title || !zoneStyle) {
      return NextResponse.json(
        { code: 400, data: null, message: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 获取当前赛季
    const season = await seasonService.getCurrentSeason();
    if (!season) {
      return NextResponse.json(
        { code: 400, data: null, message: '暂无进行中的赛季' },
        { status: 400 }
      );
    }

    // 检查分区是否允许
    if (!season.zoneStyles.includes(zoneStyle)) {
      return NextResponse.json(
        { code: 400, data: null, message: '该分区不在赛季允许范围内' },
        { status: 400 }
      );
    }

    // 检查用户是否已在本赛季参赛
    const existingBook = await prisma.book.findFirst({
      where: {
        authorId: authToken,
        seasonId: season.id,
      },
    });

    if (existingBook) {
      return NextResponse.json(
        { code: 400, data: null, message: '您已在本赛季参赛，不能重复报名' },
        { status: 400 }
      );
    }

    // 创建书籍
    const book = await bookService.createBook({
      title: title.trim(),
      shortDesc: shortDesc?.trim() || '',
      zoneStyle,
      authorId: authToken,
      seasonId: season.id,
    });

    // 增加参与人数
    await seasonService.incrementParticipantCount(season.id);
    await userService.incrementSeasonsJoined(authToken);
    await userService.incrementBooksWritten(authToken);

    console.log(`[JoinSeason] 用户 ${authToken} 参赛成功，书籍: ${book.id}`);

    // 参赛后立即触发内容生成
    // 如果当前是第 X 轮，直接生成大纲 + 第 1 到 X 章
    try {
      const currentRound = season.currentRound || 1;
      console.log(`[JoinSeason] 开始生成内容 - 当前第 ${currentRound} 轮`);

      await outlineGenerationService.generateOutline(book.id);
      console.log(`[JoinSeason] 大纲生成完成，开始创建章节`);

      for (let chapterNum = 1; chapterNum <= currentRound; chapterNum++) {
        try {
          await chapterWritingService.writeChapter(book.id, chapterNum);
        } catch (error) {
          console.error(`[JoinSeason] 第 ${chapterNum} 章创作失败:`, (error as Error).message);
        }
      }

      const chapterCount = await prisma.chapter.count({
        where: { bookId: book.id },
      });
      console.log(`[JoinSeason] 验证：数据库中有 ${chapterCount} 章`);
    } catch (error) {
      console.error('[JoinSeason] 内容生成失败:', error);
    }

    return NextResponse.json({
      code: 0,
      data: {
        bookId: book.id,
        title: book.title,
        seasonNumber: season.seasonNumber,
        currentRound: season.currentRound || 1,
      },
      message: '参赛成功',
    });
  } catch (error) {
    console.error('[JoinSeason] 参赛失败:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '参赛失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
