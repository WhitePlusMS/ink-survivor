# 任务 03：通用 UI 组件库

## 任务目标
创建项目通用的基础 UI 组件，提供一致的视觉风格

## 依赖关系
- 任务 01（项目初始化）完成后

## 交付物清单

### 3.1 布局组件
- [ ] `Container` - 响应式容器
- [ ] `Card` - 卡片组件
- [ ] `Flex` - 弹性布局组件
- [ ] `Grid` - 网格布局组件

### 3.2 基础交互组件
- [ ] `Button` - 按钮组件（多种变体）
- [ ] `Input` - 输入框组件
- [ ] `Textarea` - 文本域组件
- [ ] `Select` - 选择器组件
- [ ] `Badge` - 标签组件

### 3.3 展示组件
- [ ] `Avatar` - 头像组件
- [ ] `Progress` - 进度条组件
- [ ] `Skeleton` - 骨架屏组件
- [ ] `Divider` - 分割线组件

### 3.4 导航组件
- [ ] `Tabs` - 标签页组件
- [ ] `DropdownMenu` - 下拉菜单

### 3.5 状态组件
- [ ] `Spinner` - 加载状态
- [ ] `Toast` - 提示消息
- [ ] `Alert` - 警告提示

### 3.6 图标组件
- [ ] 创建 Lucide React 图标的统一导出
- [ ] 图标映射常量

## 涉及文件清单
| 文件路径                              | 操作 |
| ------------------------------------- | ---- |
| `src/components/ui/container.tsx`     | 新建 |
| `src/components/ui/card.tsx`          | 新建 |
| `src/components/ui/button.tsx`        | 新建 |
| `src/components/ui/input.tsx`         | 新建 |
| `src/components/ui/textarea.tsx`      | 新建 |
| `src/components/ui/select.tsx`        | 新建 |
| `src/components/ui/badge.tsx`         | 新建 |
| `src/components/ui/avatar.tsx`        | 新建 |
| `src/components/ui/progress.tsx`      | 新建 |
| `src/components/ui/skeleton.tsx`      | 新建 |
| `src/components/ui/tabs.tsx`          | 新建 |
| `src/components/ui/dropdown-menu.tsx` | 新建 |
| `src/components/ui/spinner.tsx`       | 新建 |
| `src/components/ui/toast.tsx`         | 新建 |
| `src/components/icons/index.ts`       | 新建 |
| `src/components/ui/index.ts`          | 新建 |

## 组件设计规范

### 设计原则
- 遵循 PRD 中的番茄小说风格
- 使用 Tailwind CSS 进行样式管理
- 支持 `className` 自定义样式透传
- 使用 `clsx` + `tailwind-merge` 管理类名

### 图标使用规范（参考 PRD）
```typescript
// 图标常量定义
export const ICONS = {
  SETTINGS: 'settings',
  STAR: 'star',
  MAIL: 'mail',
  TROPHY: 'trophy',
  MEDAL: 'medal',
  BOOK_OPEN: 'book-open',
  COINS: 'coins',
  FLAME: 'flame',
  MESSAGE_CIRCLE: 'message-circle',
  USER: 'user',
  BOT: 'bot',
  PEN_TOOL: 'pen-tool',
  CLIPBOARD_LIST: 'clipboard-list',
  HOME: 'home',
  BOOKMARK: 'bookmark',
  SAVE: 'save',
  CHECK: 'check',
  CHECK_CIRCLE: 'check-circle',
  SHARE_2: 'share-2',
  CIRCLE: 'circle',
  BOOKS: 'books',
  X: 'x',
  BAR_CHART_2: 'bar-chart-2',
  MAP_PIN: 'map-pin',
  EAR: 'ear',
  PERCENT: 'percent',
  FILE_TEXT: 'file-text',
} as const;
```

### 组件代码示例

```tsx
// src/components/ui/button.tsx
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
      secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200',
      ghost: 'hover:bg-secondary-100',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

## 验证标准
- [ ] 所有组件通过 TypeScript 类型检查
- [ ] 组件可在 Storybook 或直接预览中查看
- [ ] 与 Tailwind 主题色配置一致

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 创建通用 UI 组件库`。