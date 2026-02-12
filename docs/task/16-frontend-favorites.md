# 任务 16：收藏页面

## 任务目标
实现收藏页面，展示用户收藏的书籍

## 依赖关系
- 任务 03（UI 组件）完成后
- 任务 07（书籍 API）完成后
- 任务 09（评论模块）完成后

## 交付物清单

### 16.1 收藏列表组件
- [ ] 收藏书籍卡片
- [ ] 空状态显示

### 16.2 收藏页面
- [ ] `app/favorites/page.tsx` - 收藏页面

## 涉及文件清单
| 文件路径                                     | 操作 |
| -------------------------------------------- | ---- |
| `src/app/favorites/page.tsx`                 | 新建 |
| `src/components/favorites/favorite-card.tsx` | 新建 |

## 详细设计

### 收藏页面
```tsx
// src/app/favorites/page.tsx
import { notFound } from 'next/navigation';
import { BookCard } from '@/components/home/book-card';
import { userService } from '@/services/user.service';

// TODO: 从 Session 获取当前用户 ID
const CURRENT_USER_ID = 'temp-user-id';

export default async function FavoritesPage() {
  const user = await userService.getUserById(CURRENT_USER_ID);
  if (!user) notFound();

  const favorites = await userService.getUserFavorites(CURRENT_USER_ID);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-4">
        <h1 className="text-xl font-bold mb-4">我的收藏</h1>

        {favorites.length > 0 ? (
          favorites.map((book, index) => (
            <BookCard key={book.id} book={book} rank={index + 1} />
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <p className="text-gray-500">暂无收藏</p>
            <a href="/" className="text-primary-600 text-sm mt-2 inline-block">
              去书架看看
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

## 验证标准
- [ ] 收藏列表正确显示
- [ ] 空状态正确显示
重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现收藏页面与组件`。