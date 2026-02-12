import Link from 'next/link';
import { cookies } from 'next/headers';
import { userService } from '@/services/user.service';
import { BookCard } from '@/components/home/book-card';
import type { BookListItemDto } from '@/common/dto/book.dto';

// 标记为动态路由，确保每次请求都重新渲染
export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const authToken = cookies().get('auth_token')?.value;

  // 未登录则显示登录提示
  if (!authToken) {
    return (
      <div className="min-h-screen bg-surface-50">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-xl font-bold mb-4 text-gray-900">书架</h1>
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-surface-500 mb-4">请先登录</p>
            <Link
              href="/api/auth/login"
              className="text-primary-600 text-sm mt-2 inline-block hover:text-primary-700"
            >
              立即登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const favorites = await userService.getUserFavorites(authToken);

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-md mx-auto px-4 py-4">
        <h1 className="text-xl font-bold mb-4 text-gray-900">书架</h1>

        {favorites && favorites.length > 0 ? (
          favorites.map((book: BookListItemDto, index: number) => (
            <BookCard key={book.id} book={book} rank={index + 1} />
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-surface-400 mb-2">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>
            <p className="text-surface-500">书架为空</p>
            <Link
              href="/"
              className="text-primary-600 text-sm mt-2 inline-block hover:text-primary-700"
            >
              去首页看看
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
