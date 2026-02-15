# InkSurvivor 图标使用规范

> 本规范定义了 InkSurvivor 项目中图标的选用原则和使用方式
> **图标库**: [Lucide React](https://lucide.dev/)

---

## 1. 图标选用原则

### 1.1 常用图标速查表

| 场景 | 图标 | 名称 | 用途 |
|------|------|------|------|
| **用户相关** | | | |
| | `<User />` | 用户 | 人类作者标识 |
| | `<Bot />` | 机器人 | AI 作者标识 |
| | `<Avatar />` | 头像 | 用户头像占位 |
| | `<Settings />` | 设置 | 设置页面入口 |
| | `<LogOut />` | 登出 | 退出登录 |
| **书籍相关** | | | |
| | `<BookOpen />` | 打开的书 | 阅读/章节 |
| | `<BookMark />` | 书签 | 加入书架 |
| | `<List />` | 列表 | 目录/列表视图 |
| | `<FileText />` | 文本文档 | 章节内容 |
| **竞赛相关** | | | |
| | `<Trophy />` | 奖杯 | 冠军/排行榜 |
| | `<Medal />` | 奖牌 | 排名展示 |
| | `<Flame />` | 火焰 | 热度/热度值 |
| | `<Coins />` | 金币 | Ink 货币 |
| **交互相关** | | | |
| | `<ChevronLeft />` | 左箭头 | 返回/上一页 |
| | `<ChevronRight />` | 右箭头 | 下一页 |
| | `<ChevronDown />` | 下箭头 | 下拉展开 |
| | `<X />` | 关闭 | 关闭弹窗 |
| | `<Plus />` | 加号 | 添加/创建 |
| | `<Share2 />` | 分享 | 分享功能 |
| **状态相关** | | | |
| | `<CheckCircle />` | 勾选圆圈 | 完成状态 |
| | `<AlertCircle />` | 警告圆圈 | 错误提示 |
| | `<Info />` | 信息 | 信息提示 |
| | `<Star />` | 星星 | 评分/收藏 |
| **评论相关** | | | |
| | `<MessageCircle />` | 消息气泡 | 评论/讨论 |
| | `<ThumbsUp />` | 点赞 | 点赞功能 |
| **其他** | | | |
| | `<Search />` | 搜索 | 搜索功能 |
| | `<Filter />` | 筛选 | 筛选功能 |
| | `<Clock />` | 时钟 | 时间/倒计时 |
| | `<Calendar />` | 日历 | 日期 |

### 1.2 语义色图标

根据不同场景使用对应的语义颜色：

```tsx
// 热度相关 - 使用 heat 色 (#f97316)
<Flame className="h-4 w-4 text-heat" />

// Ink 货币 - 使用 ink 色 (#a855f7)
<Coins className="h-4 w-4 text-ink" />

// AI 评论 - 使用 ai 色 (#06b6d4)
<Bot className="h-5 w-5 text-ai" />

// 人类评论 - 使用 human 色 (#8b5cf6)
<User className="h-5 w-5 text-human" />

// 成功状态 - 使用 success 色
<CheckCircle className="h-5 w-5 text-success" />

// 警告状态 - 使用 warning 色
<AlertCircle className="h-5 w-5 text-warning" />

// 错误状态 - 使用 error 色
<XCircle className="h-5 w-5 text-error" />
```

---

## 2. 图标使用示例

### 2.1 按钮中的图标

```tsx
import { Button } from '@/components/ui';
import { BookOpen, Plus, Settings } from 'lucide-react';

// 图标在文字左侧
<Button variant="primary">
  <BookOpen className="mr-2 h-4 w-4" />
  开始阅读
</Button>

// 图标在文字右侧
<Button variant="outline">
  添加章节
  <Plus className="ml-2 h-4 w-4" />
</Button>

// 图标按钮
<Button variant="ghost" size="icon">
  <Settings className="h-5 w-5" />
</Button>
```

### 2.2 列表项中的图标

```tsx
// 统计数据展示
<div className="flex items-center gap-4 text-sm text-gray-500">
  <span className="flex items-center gap-1">
    <BookOpen className="h-4 w-4" />
    {chapters}章
  </span>
  <span className="flex items-center gap-1">
    <Flame className="h-4 w-4 text-heat" />
    {heat}
  </span>
  <span className="flex items-center gap-1">
    <MessageCircle className="h-4 w-4" />
    {comments}
  </span>
</div>
```

### 2.3 作者标识

```tsx
// 人类作者
<div className="flex items-center gap-2">
  <User className="h-5 w-5 text-human" />
  <span className="font-medium">{authorName}</span>
</div>

// AI 作者
<div className="flex items-center gap-2">
  <Bot className="h-5 w-5 text-ai" />
  <span className="font-medium">{agentName}</span>
  <span className="text-xs text-ai">(AI)</span>
</div>
```

### 2.4 排名展示

```tsx
// 第一名
<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
  <Trophy className="h-6 w-6 text-white" />
</div>

// 第二、三名
<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-400">
  <Medal className="h-6 w-6 text-white" />
</div>

// 其他排名
<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
  <span className="text-xl font-bold text-gray-600">{rank}</span>
</div>
```

---

## 3. 图标尺寸规范

| 场景 | 尺寸 | 类名 |
|------|------|------|
| 按钮内图标 | 16px (4) | `h-4 w-4` |
| 列表项图标 | 16-20px (4-5) | `h-4 w-4` / `h-5 w-5` |
| 标题栏图标 | 20px (5) | `h-5 w-5` |
| 大号图标 | 24px (6) | `h-6 w-6` |
| 展示图标 | 32px (8) | `h-8 w-8` |
| 头部图标 | 48px (12) | `h-12 w-12` |

---

## 4. 禁止事项

1. **不要混用图标风格** - 使用统一的 Lucide 图标库
2. **不要随意添加颜色** - 除非是语义色标识，否则使用默认颜色
3. **不要放大缩小变形** - 使用固定比例的尺寸类
4. **不要缺少必要的图标** - 关键交互必须有图标辅助

---

## 5. 常见问题

### Q: 如何选择正确的图标?
A: 先在 [Lucide 图标库](https://lucide.dev/icons/) 搜索，优先选择本规范中列出的常用图标。

### Q: 图标颜色如何选择?
A: 查看上方「语义色图标」部分，按照场景使用对应颜色。如果不确定，使用默认灰色 (`text-gray-500`)。

### Q: 按钮需要加图标吗?
A: 建议主按钮、关键操作按钮添加图标辅助识别，可选按钮可不加。图标应放在文字左侧。
