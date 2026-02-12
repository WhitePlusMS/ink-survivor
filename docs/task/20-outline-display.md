# 任务 20：大纲展示组件

## 任务目标
实现书籍详情页中的大纲展示组件

## 依赖关系
- 任务 03（UI 组件）完成后

## 交付物清单

### 20.1 大纲展示组件
- [ ] 故事简介
- [ ] 角色设定
- [ ] 章节大纲

## 涉及文件清单
| 文件路径                                    | 操作 |
| ------------------------------------------- | ---- |
| `src/components/book/outline-display.tsx`   | 新建 |
| `src/components/book/character-card.tsx`    | 新建 |
| `src/components/book/chapter-plan-item.tsx` | 新建 |

## 详细设计

### 大纲展示
```tsx
// src/components/book/outline-display.tsx
import { Star, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Character {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  description: string;
  motivation: string;
}

interface ChapterPlan {
  number: number;
  title: string;
  summary: string;
  key_events: string[];
}

interface OutlineData {
  originalIntent?: string;  // 从 Prisma 获取时使用
  characters?: Character[];
  chaptersPlan?: ChapterPlan[];
  // 或者从解析的 JSON
  summary?: string;
  characters_json?: Character[];
  chapters?: ChapterPlan[];
}

interface OutlineDisplayProps {
  outline: {
    originalIntent: string;
    characters: string;  // JSON string
    chaptersPlan: string; // JSON string
  };
}

export function OutlineDisplay({ outline }: OutlineDisplayProps) {
  // 解析 JSON
  const summary = outline.originalIntent;
  const characters: Character[] = JSON.parse(outline.characters || '[]');
  const chapters: ChapterPlan[] = JSON.parse(outline.chaptersPlan || '[]');

  // 获取角色图标
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'protagonist':
        return { icon: '👤', label: '主角' };
      case 'antagonist':
        return { icon: '👿', label: '反派' };
      default:
        return { icon: '🧑', label: '配角' };
    }
  };

  return (
    <div className="space-y-6">
      {/* 故事简介 */}
      {summary && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-2">故事简介</h4>
          <p className="text-sm text-gray-600">{summary}</p>
        </div>
      )}

      {/* 角色设定 */}
      {characters.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">角色设定</h4>
          <div className="space-y-3">
            {characters.map((char, index) => {
              const { icon, label } = getRoleIcon(char.role);
              return (
                <div key={index} className="bg-white border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{icon}</span>
                    <span className="font-medium">{char.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                      {label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{char.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 章节大纲 */}
      {chapters.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">章节大纲</h4>
          <div className="space-y-3">
            {chapters.map((chapter) => (
              <div
                key={chapter.number}
                className={cn(
                  'bg-white border rounded-lg p-3',
                  chapter.key_events?.some(e => e.includes('已采纳')) &&
                    'border-yellow-300 bg-yellow-50'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">第 {chapter.number} 章</span>
                  <span className="text-gray-600">{chapter.title}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {chapter.summary}
                </p>
                {chapter.key_events && chapter.key_events.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {chapter.key_events.map((event, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 bg-primary-50 text-primary-700 rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 验证标准
- [ ] 大纲信息正确解析
- [ ] 角色设定正确显示
- [ ] 章节大纲正确显示
重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现书籍详情页中的大纲展示组件`。