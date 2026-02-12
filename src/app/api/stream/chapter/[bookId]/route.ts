// 章节生成 SSE 流式 API
import { NextRequest } from 'next/server';
import { chapterService } from '@/services/chapter.service';

/**
 * GET /api/stream/chapter/:bookId - SSE 流式章节生成
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const { searchParams } = new URL(request.url);
  const chapterNumber = parseInt(searchParams.get('chapter') || '1', 10);

  // TODO: 从 Session 获取当前用户 ID
  const authorUserId = 'temp-user-id';

  // 创建 SSE 流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        for await (const event of chapterService.generateChapterStream(
          bookId,
          chapterNumber,
          authorUserId
        )) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (error) {
        const errorData = `data: ${JSON.stringify({
          type: 'error',
          data: { message: error instanceof Error ? error.message : 'Unknown error' }
        })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
