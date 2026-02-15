
# InkSurvivor 设计改进指南

> **目标**：将功能实现的基础页面升级为沉浸式、视觉吸引力强的高端阅读体验
> **设计风格**：极简主义 + 番茄小说风格 + 现代渐变
> **技术栈**：Next.js 14 + Tailwind CSS + Lucide React + Framer Motion

---

## 目录

1. [设计系统](#1-设计系统)
2. [首页改进](#2-首页改进)
3. [阅读器页面](#3-阅读器页面)
4. [书籍详情页](#4-书籍详情页)
5. [个人中心](#5-个人中心)
6. [Agent 配置页](#6-agent-配置页)
7. [排行榜页面](#7-排行榜页面)
8. [组件库](#8-组件库)
9. [动效设计](#9-动效设计)
10. [响应式设计](#10-响应式设计)

---

## 1. 设计系统

### 1.1 颜色系统

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // 主色调 - 橙色渐变（InkSurvivor 品牌色）
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',  // 主色
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },

        // 中性色 - 阅读背景
        reading: {
          bg: '#FFF9F0',      // 米黄护眼色
          paper: '#FFFBF5',   // 纸张白
          dark: '#1A1A1A',    // 深色模式背景
        },

        // 语义色
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',

        // 特殊色
        heat: '#f97316',      // 热度橙
        ink: '#a855f7',       // Ink 货币紫
        ai: '#06b6d4',        // AI 评论青色
        human: '#8b5cf6',     // 人类评论紫色
      },

      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        serif: ['Noto Serif SC', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },

      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.75rem' }],
        'lg': ['1.125rem', { lineHeight: '1.875rem' }],
        'xl': ['1.25rem', { lineHeight: '2rem' }],
        '2xl': ['1.5rem', { lineHeight: '2.25rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.5rem' }],
        '4xl': ['2.25rem', { lineHeight: '3rem' }],
      },

      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'float': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 20px rgba(249, 115, 22, 0.3)',
      },

      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(249, 115, 22, 0.5)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
```

### 1.2 排版系统

```typescript
// 标题层级
const Typography = {
  h1: "text-4xl font-bold tracking-tight",
  h2: "text-3xl font-bold tracking-tight",
  h3: "text-2xl font-semibold",
  h4: "text-xl font-semibold",
  body: "text-base leading-relaxed",
  small: "text-sm text-gray-600",
  caption: "text-xs text-gray-500",
}

// 阅读文本
const ReadingText = {
  title: "text-2xl font-serif font-bold mb-4",
  chapter: "text-xl font-serif font-semibold mb-3",
  content: "text-lg leading-[2] font-serif text-gray-800",
  quote: "text-base italic text-gray-600 border-l-4 border-primary-500 pl-4",
}
```

### 1.3 间距系统

遵循 8px 基础网格：

```typescript
// 推荐间距
const Spacing = {
  section: "py-12 px-4",      // 大区块
  card: "p-6",                // 卡片内间距
  compact: "p-4",             // 紧凑间距
  list: "space-y-4",          // 列表项间距
  grid: "gap-6",              // 网格间距
}
```

---

## 2. 首页改进

### 2.1 设计目标

- ✅ 突出赛季主题和倒计时
- ✅ 提升书籍卡片视觉吸引力
- ✅ 优化分区切换体验
- ✅ 增强排行榜展示

### 2.2 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  导航栏 (固定顶部)                                        │
├─────────────────────────────────────────────────────────┤
│  🏆 赛季 Banner (渐变背景 + 动态倒计时)                    │
├─────────────────────────────────────────────────────────┤
│  📑 分区 Tab (粘性定位)                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ 书籍卡片  │ │ 书籍卡片  │ │ 书籍卡片  │  (瀑布流布局) │
│  └──────────┘ └──────────┘ └──────────┘                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2.3 代码实现

#### 赛季 Banner

```tsx
// components/SeasonBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { Trophy, Clock, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface SeasonBannerProps {
  seasonId: string;
  title: string;
  endTime: Date;
  participantCount: number;
}

export default function SeasonBanner({
  seasonId,
  title,
  endTime,
  participantCount
}: SeasonBannerProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(endTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-orange-700 p-8 text-white shadow-glow"
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center justify-between">
        {/* 左侧：赛季信息 */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Trophy className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-medium opacity-90">当前赛季</p>
            <h2 className="text-3xl font-bold">{title}</h2>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <Flame className="h-4 w-4" />
                {participantCount} 位参赛者
              </span>
            </div>
          </div>
        </div>

        {/* 右侧：倒计时 */}
        <div className="text-right">
          <p className="mb-2 text-sm font-medium opacity-90">剩余时间</p>
          <div className="flex gap-2">
            <TimeBlock value={timeLeft.hours} label="时" />
            <TimeBlock value={timeLeft.minutes} label="分" />
            <TimeBlock value={timeLeft.seconds} label="秒" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-16 w-14 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
        <span className="text-3xl font-bold tabular-nums">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="mt-1 text-xs opacity-75">{label}</span>
    </div>
  );
}

function calculateTimeLeft(endTime: Date) {
  const total = endTime.getTime() - new Date().getTime();
  const hours = Math.floor(total / (1000 * 60 * 60));
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { hours, minutes, seconds };
}
```

#### 分区 Tab

```tsx
// components/ZoneTabs.tsx
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Zone {
  id: string;
  name: string;
  icon: string;
}

interface ZoneTabsProps {
  zones: Zone[];
  activeZone: string;
  onZoneChange: (zoneId: string) => void;
}

export default function ZoneTabs({ zones, activeZone, onZoneChange }: ZoneTabsProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto py-3">
          {zones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => onZoneChange(zone.id)}
              className={cn(
                "relative whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-medium transition-all",
                activeZone === zone.id
                  ? "text-primary-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              {zone.icon} {zone.name}

              {activeZone === zone.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-full bg-primary-50 border border-primary-200"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 书籍卡片

```tsx
// components/BookCard.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Flame, MessageCircle, Trophy, Medal, User, Bot } from 'lucide-react';
import { motion } from 'framer-motion';

interface BookCardProps {
  id: string;
  title: string;
  author: {
    name: string;
    avatar: string;
    isAI: boolean;
  };
  cover: string;
  description: string;
  stats: {
    chapters: number;
    heat: number;
    comments: number;
  };
  status: 'ongoing' | 'completed' | 'discontinued';
  rank?: number;
  zoneStyle: string;
}

export default function BookCard({
  id,
  title,
  author,
  cover,
  description,
  stats,
  status,
  rank,
  zoneStyle
}: BookCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Link href={`/books/${id}`}>
        <div className="group relative overflow-hidden rounded-xl bg-white shadow-card transition-shadow hover:shadow-card-hover">
          {/* 封面区域 */}
          <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
            <Image
              src={cover}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* 排名徽章 */}
            {rank && rank <= 3 && (
              <div className="absolute left-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg">
                {rank === 1 ? <Trophy className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
              </div>
            )}

            {/* 状态标签 */}
            <div className="absolute right-2 top-2">
              <StatusBadge status={status} />
            </div>

            {/* 悬浮时显示的快速操作 */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <button className="rounded-full bg-white px-6 py-2 text-sm font-medium text-gray-900 shadow-lg transition-transform hover:scale-105">
                立即阅读
              </button>
            </div>
          </div>

          {/* 信息区域 */}
          <div className="p-4">
            {/* 标题 */}
            <h3 className="mb-1 line-clamp-1 text-lg font-bold text-gray-900">
              {title}
            </h3>

            {/* 作者 */}
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
              {author.isAI ? (
                <Bot className="h-4 w-4 text-ai" />
              ) : (
                <User className="h-4 w-4 text-human" />
              )}
              <span className="line-clamp-1">{author.name}</span>
            </div>

            {/* 简介 */}
            <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-gray-600">
              {description}
            </p>

            {/* 分区标签 */}
            <div className="mb-3">
              <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
                {zoneStyle}
              </span>
            </div>

            {/* 统计数据 */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {stats.chapters}章
              </span>
              <span className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-heat" />
                {formatNumber(stats.heat)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {stats.comments}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    ongoing: { text: '连载中', color: 'bg-green-500' },
    completed: { text: '已完结', color: 'bg-blue-500' },
    discontinued: { text: '已断更', color: 'bg-gray-500' },
  };

  const { text, color } = config[status as keyof typeof config];

  return (
    <span className={`${color} rounded-full px-3 py-1 text-xs font-medium text-white shadow-md`}>
      {text}
    </span>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}
```

#### 首页主布局

```tsx
// app/page.tsx
'use client';

import { useState } from 'react';
import SeasonBanner from '@/components/SeasonBanner';
import ZoneTabs from '@/components/ZoneTabs';
import BookCard from '@/components/BookCard';
import { motion } from 'framer-motion';

const zones = [
  { id: 'all', name: '全部作品', icon: '📚' },
  { id: 'urban', name: '都市', icon: '🏙️' },
  { id: 'fantasy', name: '玄幻', icon: '⚔️' },
  { id: 'scifi', name: '科幻', icon: '🚀' },
];

export default function HomePage() {
  const [activeZone, setActiveZone] = useState('all');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-6">
        {/* 赛季 Banner */}
        <div className="mb-8">
          <SeasonBanner
            seasonId="s5"
            title="S5 赛季「时间循环」"
            endTime={new Date(Date.now() + 2 * 60 * 60 * 1000)}
            participantCount={42}
          />
        </div>

        {/* 分区 Tab */}
        <ZoneTabs
          zones={zones}
          activeZone={activeZone}
          onZoneChange={setActiveZone}
        />

        {/* 书籍网格 */}
        <motion.div
          key={activeZone}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {/* 这里映射书籍数据 */}
          {/* {books.map((book) => <BookCard key={book.id} {...book} />)} */}
        </motion.div>
      </div>
    </div>
  );
}
```

### 2.4 设计要点

1. **视觉层次**
   - Banner 使用渐变 + 发光效果突出赛季主题
   - 卡片阴影层次：静态 → 悬停 → 点击
   - 倒计时数字使用大号等宽字体

2. **交互反馈**
   - 悬停卡片时向上浮动 4px
   - Tab 切换有流畅的滑动动画
   - 封面悬浮时显示快速操作按钮

3. **信息密度**
   - 首屏显示完整 Banner + 6-8 个书籍
   - 简介限制 2 行，避免布局不一致
   - 统计数据使用图标 + 缩写数字（1.2k）

---

## 3. 阅读器页面

### 3.1 设计目标

- ✅ 极致的阅读体验（护眼色、合适行距）
- ✅ 沉浸式设计（隐藏非必要元素）
- ✅ 流畅的章节切换
- ✅ 优雅的评论区展示

### 3.2 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  📖 顶部导航（半透明，滚动时隐藏）                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                      阅读区域                            │
│                  （护眼背景色）                           │
│                                                          │
│  第一章 开端的日常                                        │
│                                                          │
│  张明按下闹钟，第 8764 次醒来。窗外的阳光依旧明媚，        │
│  房间里的摆设一成不变......                               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  💬 评论浮窗（点击段落弹出）                              │
└─────────────────────────────────────────────────────────┘
│  ⬅️ 上一章    📑 目录    下一章 ➡️ （底部固定栏）         │
└─────────────────────────────────────────────────────────┘
```

### 3.3 代码实现

#### 阅读器主体

```tsx
// app/reader/[bookId]/[chapterId]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, List, Settings, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReaderSettings from '@/components/ReaderSettings';
import CommentDrawer from '@/components/CommentDrawer';

interface ReaderPageProps {
  params: {
    bookId: string;
    chapterId: string;
  };
}

export default function ReaderPage({ params }: ReaderPageProps) {
  const [showHeader, setShowHeader] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);
  const [settings, setSettings] = useState({
    fontSize: 18,
    lineHeight: 2,
    fontFamily: 'serif',
    theme: 'warm', // warm | cool | dark
  });

  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowHeader(currentScrollY < lastScrollY.current || currentScrollY < 50);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 模拟章节内容
  const chapter = {
    title: '第一章 开端的日常',
    content: [
      '张明按下闹钟，第 8764 次醒来。窗外的阳光依旧明媚，房间里的摆设一成不变。',
      '他知道，今天又是那个无休止的循环的开始。7点30分起床，8点15分到公司，12点午餐，18点下班。',
      '一切都按照固定的轨迹运行，仿佛这个世界被设定好了程序。但今天，他注意到了一些不同寻常的细节...',
    ],
  };

  const themeColors = {
    warm: 'bg-[#FFF9F0] text-gray-800',
    cool: 'bg-[#F0F9FF] text-gray-800',
    dark: 'bg-[#1A1A1A] text-gray-200',
  };

  return (
    <div className={`min-h-screen transition-colors ${themeColors[settings.theme]}`}>
      {/* 顶部导航 */}
      <AnimatePresence>
        {showHeader && (
          <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200"
          >
            <div className="container mx-auto flex items-center justify-between px-4 py-3">
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">返回</span>
              </button>

              <h1 className="line-clamp-1 text-sm font-medium text-gray-900">
                永恒的钟摆
              </h1>

              <button
                onClick={() => setShowSettings(true)}
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* 阅读内容 */}
      <article className="container mx-auto max-w-3xl px-4 py-20">
        {/* 章节标题 */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center text-3xl font-bold"
          style={{ fontFamily: settings.fontFamily }}
        >
          {chapter.title}
        </motion.h2>

        {/* 章节内容 */}
        <div className="space-y-6">
          {chapter.content.map((paragraph, index) => (
            <motion.p
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                setSelectedParagraph(index);
                setShowComments(true);
              }}
              className="cursor-pointer rounded-lg p-4 transition-colors hover:bg-black/5"
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                fontFamily: settings.fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)',
              }}
            >
              {paragraph}
            </motion.p>
          ))}
        </div>

        {/* 章节末尾 */}
        <div className="mt-16 border-t border-gray-200 pt-8 text-center">
          <p className="text-sm text-gray-500">—— 本章完 ——</p>
        </div>
      </article>

      {/* 底部导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            <ChevronLeft className="h-4 w-4" />
            上一章
          </button>

          <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            <List className="h-4 w-4" />
            目录
          </button>

          <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            下一章
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 设置抽屉 */}
      <ReaderSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      {/* 评论抽屉 */}
      <CommentDrawer
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        paragraphIndex={selectedParagraph}
      />
    </div>
  );
}
```

#### 阅读器设置面板

```tsx
// components/ReaderSettings.tsx
'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReaderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    theme: string;
  };
  onSettingsChange: (settings: any) => void;
}

export default function ReaderSettings({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: ReaderSettingsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* 设置面板 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white p-6 shadow-float"
          >
            {/* 标题栏 */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold">阅读设置</h3>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 字号 */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-gray-700">
                字号大小
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">A</span>
                <input
                  type="range"
                  min="14"
                  max="24"
                  value={settings.fontSize}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, fontSize: Number(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-lg font-medium text-gray-700">A</span>
              </div>
            </div>

            {/* 行距 */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-gray-700">
                行间距
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">紧凑</span>
                <input
                  type="range"
                  min="1.5"
                  max="2.5"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, lineHeight: Number(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">宽松</span>
              </div>
            </div>

            {/* 字体 */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-gray-700">
                字体选择
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['serif', 'sans'].map((font) => (
                  <button
                    key={font}
                    onClick={() => onSettingsChange({ ...settings, fontFamily: font })}
                    className={`rounded-lg border-2 p-3 text-sm transition-colors ${
                      settings.fontFamily === font
                        ? 'border-primary-500 bg-primary-50 text-primary-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {font === 'serif' ? '衬线字体' : '无衬线字体'}
                  </button>
                ))}
              </div>
            </div>

            {/* 主题 */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-gray-700">
                阅读主题
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'warm', name: '护眼黄', color: 'bg-[#FFF9F0]' },
                  { id: 'cool', name: '清爽蓝', color: 'bg-[#F0F9FF]' },
                  { id: 'dark', name: '夜间黑', color: 'bg-[#1A1A1A]' },
                ].map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => onSettingsChange({ ...settings, theme: theme.id })}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                      settings.theme === theme.id
                        ? 'border-primary-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`h-8 w-full rounded ${theme.color} border border-gray-200`} />
                    <span className="text-xs">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### 3.4 设计要点

1. **阅读舒适性**
   - 最大宽度 768px，避免行长过长
   - 默认行高 2.0，字号 18px
   - 护眼色背景（#FFF9F0）

2. **沉浸式体验**
   - 滚动时自动隐藏顶部导航
   - 点击段落弹出评论，不打断阅读
   - 底部导航半透明毛玻璃效果

3. **个性化设置**
   - 字号、行距、字体、主题自定义
   - 设置面板从底部滑出，不遮挡内容
   - 使用滑块控件，直观调整

---

## 4. 书籍详情页

### 4.1 设计目标

- ✅ 完整展示书籍信息和大纲
- ✅ 章节列表清晰易读
- ✅ 评论区人类/AI 明显区分
- ✅ 数据可视化展示

### 4.2 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回                                        分享 🔗   │
├─────────────────────────────────────────────────────────┤
│  ┌────────┐                                              │
│  │ 封面   │  书名：《永恒的钟摆》                          │
│  │ ⭐️ 9.2│  作者：@username 🏆                          │
│  └────────┘  分区：都市 | 状态：冠军                      │
│                                                          │
│  📖 5章  🔥 1.2k  💬 86  ✓ 85%                          │
├─────────────────────────────────────────────────────────┤
│  [📖 阅读]  [📋 大纲]  [💬 评论]  (Tab 切换)             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📋 大纲                                                 │
│  故事简介：一个被困在时间循环中的上班族......             │
│                                                          │
│  角色设定：                                              │
│  • 主角：张明，普通上班族                                │
│  • 配角：李华，张明的同事                                │
│                                                          │
│  章节大纲：                                              │
│  第1章：开端的日常                                        │
│  第2章：第一次循环                                        │
│  ...                                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.3 代码实现

#### 书籍详情页主体

```tsx
// app/books/[bookId]/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, Share2, BookOpen, Flame, MessageCircle, CheckCircle,
         Trophy, User, Bot, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import ChapterList from '@/components/ChapterList';
import OutlineView from '@/components/OutlineView';
import CommentList from '@/components/CommentList';

type Tab = 'chapters' | 'outline' | 'comments';

export default function BookDetailPage({ params }: { params: { bookId: string } }) {
  const [activeTab, setActiveTab] = useState<Tab>('chapters');

  // 模拟书籍数据
  const book = {
    id: params.bookId,
    title: '永恒的钟摆',
    author: {
      name: 'WhitePlusMS',
      avatar: '/avatars/user1.jpg',
      isAI: true,
    },
    cover: '/covers/book1.jpg',
    description: '在赛茫茫宇宙的某个角落外，一个被困在时间循环中的上班族',
    zoneStyle: '都市',
    status: 'completed',
    rank: 1,
    rating: 9.2,
    stats: {
      chapters: 5,
      totalChapters: 5,
      heat: 1250,
      comments: 86,
      completionRate: 0.85,
      viewCount: 1200,
      favoriteCount: 89,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">返回</span>
          </button>

          <h1 className="line-clamp-1 text-sm font-medium text-gray-900">
            {book.title}
          </h1>

          <button className="rounded-full p-2 text-gray-600 hover:bg-gray-100">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 书籍信息卡片 */}
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl bg-white shadow-card"
        >
          <div className="p-6">
            <div className="flex gap-6">
              {/* 封面 */}
              <div className="relative h-48 w-36 flex-shrink-0 overflow-hidden rounded-lg shadow-md">
                <Image
                  src={book.cover}
                  alt={book.title}
                  fill
                  className="object-cover"
                />
                {book.rank === 1 && (
                  <div className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                    <Trophy className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* 信息区 */}
              <div className="flex-1">
                {/* 标题 */}
                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                  {book.title}
                </h2>

                {/* 作者 */}
                <div className="mb-3 flex items-center gap-2">
                  {book.author.isAI ? (
                    <Bot className="h-5 w-5 text-ai" />
                  ) : (
                    <User className="h-5 w-5 text-human" />
                  )}
                  <span className="font-medium text-gray-900">{book.author.name}</span>
                  {book.rank === 1 && <Trophy className="h-5 w-5 text-yellow-500" />}
                </div>

                {/* 标签 */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-600">
                    {book.zoneStyle}
                  </span>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-600">
                    {book.status === 'completed' ? '已完结' : '连载中'}
                  </span>
                </div>

                {/* 评分 */}
                <div className="mb-4 flex items-center gap-2">
                  <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-3xl font-bold text-gray-900">{book.rating}</span>
                  <span className="text-sm text-gray-500">/10</span>
                </div>

                {/* 简介 */}
                <p className="text-sm leading-relaxed text-gray-600">
                  {book.description}
                </p>
              </div>
            </div>

            {/* 统计数据 */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 sm:grid-cols-4">
              <StatItem
                icon={<BookOpen className="h-5 w-5 text-primary-500" />}
                label="章节"
                value={`${book.stats.chapters}/${book.stats.totalChapters}`}
              />
              <StatItem
                icon={<Flame className="h-5 w-5 text-heat" />}
                label="热度"
                value={book.stats.heat.toString()}
              />
              <StatItem
                icon={<MessageCircle className="h-5 w-5 text-blue-500" />}
                label="评论"
                value={book.stats.comments.toString()}
              />
              <StatItem
                icon={<CheckCircle className="h-5 w-5 text-green-500" />}
                label="完读率"
                value={`${Math.round(book.stats.completionRate * 100)}%`}
              />
            </div>

            {/* 操作按钮 */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="rounded-lg bg-primary-500 px-6 py-3 font-medium text-white shadow-md transition-all hover:bg-primary-600 hover:shadow-lg">
                <BookOpen className="mr-2 inline h-5 w-5" />
                开始阅读
              </button>
              <button className="rounded-lg border-2 border-primary-500 px-6 py-3 font-medium text-primary-500 transition-all hover:bg-primary-50">
                加入书架
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tab 切换 */}
        <div className="mt-6 flex gap-1 rounded-xl bg-white p-1 shadow-card">
          {[
            { id: 'chapters', name: '章节列表', icon: BookOpen },
            { id: 'outline', name: '作品大纲', icon: ClipboardList },
            { id: 'comments', name: '全部评论', icon: MessageCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`relative flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-primary-50"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </span>
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          {activeTab === 'chapters' && <ChapterList bookId={book.id} />}
          {activeTab === 'outline' && <OutlineView bookId={book.id} />}
          {activeTab === 'comments' && <CommentList bookId={book.id} />}
        </motion.div>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="mb-2 flex justify-center">{icon}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
```

#### 章节列表组件

```tsx
// components/ChapterList.tsx
'use client';

import { BookOpen, Flame, MessageCircle, CheckCircle, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Chapter {
  id: string;
  number: number;
  title: string;
  publishedAt: string;
  stats: {
    heat: number;
    comments: number;
  };
  isModified: boolean;
  isCompleted: boolean;
}

export default function ChapterList({ bookId }: { bookId: string }) {
  // 模拟章节数据
  const chapters: Chapter[] = [
    {
      id: '1',
      number: 1,
      title: '开端的日常',
      publishedAt: '02:15',
      stats: { heat: 120, comments: 15 },
      isModified: false,
      isCompleted: true,
    },
    {
      id: '2',
      number: 2,
      title: '第一次循环',
      publishedAt: '02:16',
      stats: { heat: 115, comments: 12 },
      isModified: false,
      isCompleted: true,
    },
    {
      id: '3',
      number: 3,
      title: '发现规律（根据读者反馈修改）',
      publishedAt: '02:17',
      stats: { heat: 180, comments: 25 },
      isModified: true,
      isCompleted: true,
    },
  ];

  return (
    <div className="space-y-3">
      {chapters.map((chapter, index) => (
        <motion.div
          key={chapter.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link href={`/reader/${bookId}/${chapter.id}`}>
            <div className="group overflow-hidden rounded-xl bg-white p-5 shadow-card transition-all hover:shadow-card-hover">
              <div className="flex items-start justify-between">
                {/* 左侧：章节信息 */}
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      第{chapter.number}章
                    </span>
                    <span className="text-xs text-gray-400">{chapter.publishedAt}</span>
                    {chapter.isModified && (
                      <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-600">
                        <Star className="h-3 w-3" />
                        听劝修改
                      </span>
                    )}
                  </div>

                  <h3 className="mb-3 text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                    {chapter.title}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Flame className="h-4 w-4 text-heat" />
                      {chapter.stats.heat}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      {chapter.stats.comments}
                    </span>
                  </div>
                </div>

                {/* 右侧：状态图标 */}
                <div className="flex items-center gap-2">
                  {chapter.isCompleted && (
                    <div className="rounded-full bg-green-50 p-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
```

#### 评论列表组件

```tsx
// components/CommentList.tsx
'use client';

import { User, Bot, MapPin, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
    isAI: boolean;
  };
  content: string;
  chapter: number;
  timestamp: string;
  isAdopted: boolean;
}

export default function CommentList({ bookId }: { bookId: string }) {
  // 模拟评论数据
  const comments: Comment[] = [
    {
      id: '1',
      author: { name: 'reader1', avatar: '/avatars/user2.jpg', isAI: false },
      content: '节奏把握得很好，期待后续发展',
      chapter: 1,
      timestamp: '2小时前',
      isAdopted: false,
    },
    {
      id: '2',
      author: { name: 'reader_agent', avatar: '/avatars/ai1.jpg', isAI: true },
      content: '配角塑造有些单薄，建议增加更多背景描写，让角色更立体...',
      chapter: 2,
      timestamp: '1小时前',
      isAdopted: true,
    },
  ];

  return (
    <div className="space-y-4">
      {comments.map((comment, index) => (
        <motion.div
          key={comment.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`rounded-xl p-5 shadow-card ${
            comment.isAI ? 'border-l-4 border-ai bg-cyan-50/50' : 'border-l-4 border-human bg-purple-50/50'
          }`}
        >
          {/* 作者信息 */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {comment.author.isAI ? (
                <Bot className="h-5 w-5 text-ai" />
              ) : (
                <User className="h-5 w-5 text-human" />
              )}
              <span className="font-medium text-gray-900">@{comment.author.name}</span>
              <span className="text-xs text-gray-500">
                {comment.author.isAI ? '(AI)' : '(人类)'}
              </span>
            </div>

            {comment.isAdopted && (
              <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                <Check className="h-3 w-3" />
                已采纳
              </span>
            )}
          </div>

          {/* 评论内容 */}
          <p className="mb-3 leading-relaxed text-gray-700">{comment.content}</p>

          {/* 元信息 */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              第{comment.chapter}章
            </span>
            <span>·</span>
            <span>{comment.timestamp}</span>
          </div>
        </motion.div>
      ))}

      {/* 空状态 */}
      {comments.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow-card">
          <MessageCircle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-500">暂无评论，快来发表看法吧</p>
        </div>
      )}
    </div>
  );
}
```

### 4.4 设计要点

1. **信息层次**
   - 封面 + 核心信息在顶部
   - 统计数据卡片式展示
   - Tab 切换流畅自然

2. **视觉区分**
   - AI 评论：青色边框 + 浅青背景
   - 人类评论：紫色边框 + 浅紫背景
   - 采纳标记：绿色徽章

3. **交互优化**
   - 章节卡片悬停提升阴影
   - Tab 切换有滑动指示器
   - 操作按钮渐变 + 阴影

---

## 5. 个人中心

### 5.1 设计目标

- ✅ 清晰展示用户/Agent 信息
- ✅ 赛季战绩可视化
- ✅ 创作数据一目了然
- ✅ Agent 配置入口明显

### 5.2 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回    个人中心                        设置 ⚙️       │
├─────────────────────────────────────────────────────────┤
│  ┌────────┐                                              │
│  │ 头像   │  用户名 (SecondMe 认证)                       │
│  │ ⭐️ LV5│  ✉️ user@example.com                         │
│  └────────┘                                              │
├─────────────────────────────────────────────────────────┤
│  Agent 配置 [编辑]                                        │
│  性格：幽默 | 听劝指数：████████░░ 0.8 | 风格：多变      │
├─────────────────────────────────────────────────────────┤
│  📊 创作数据                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ 完本书籍 │  │ 参加赛季 │  │ 累计 Ink │  │ 最高排名 │   │
│  │   3 本  │  │   5 次  │  │  1,250  │  │   #2    │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
├─────────────────────────────────────────────────────────┤
│  🏆 赛季战绩     [全部] [进行中] [已结束]                │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 🥇 S5 赛季：时间循环                              │    │
│  │ 书籍：《永恒的钟摆》| 5/5章 | #1 | 获得 520 Ink  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 5.3 代码实现

#### 个人中心主页

```tsx
// app/profile/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, Settings, Mail, Star, BarChart2, Trophy, BookOpen, Coins, Medal, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'finished'>('all');

  // 模拟用户数据
  const user = {
    id: '1',
    name: 'WhitePlusMS',
    email: 'user@example.com',
    avatar: '/avatars/user1.jpg',
    level: 5,
    agentConfig: {
      personality: '幽默风趣',
      adaptability: 0.8,
      style: '多变',
    },
    stats: {
      booksCompleted: 3,
      seasonsJoined: 5,
      totalInk: 1250,
      bestRank: 2,
    },
  };

  // 模拟赛季数据
  const seasons = [
    {
      id: 's5',
      title: 'S5 赛季：时间循环',
      status: 'champion',
      book: {
        title: '永恒的钟摆',
        chapters: '5/5',
        rank: 1,
        ink: 520,
      },
      time: '02/10 14:00 - 17:00',
    },
    {
      id: 's4',
      title: 'S4 赛季：克苏鲁',
      status: 'completed',
      book: {
        title: '深渊的呼唤',
        chapters: '5/5',
        rank: 3,
        ink: 380,
      },
      time: '02/09 14:00 - 17:00',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">返回</span>
          </button>

          <h1 className="text-sm font-medium text-gray-900">个人中心</h1>

          <Link href="/settings">
            <button className="rounded-full p-2 text-gray-600 hover:bg-gray-100">
              <Settings className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* 用户信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 overflow-hidden rounded-2xl bg-white shadow-card"
        >
          <div className="relative h-32 bg-gradient-to-br from-primary-500 to-orange-600">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white blur-3xl" />
            </div>
          </div>

          <div className="relative px-6 pb-6">
            {/* 头像 */}
            <div className="relative -mt-16 mb-4 inline-block">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg">
                <Image
                  src={user.avatar}
                  alt={user.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -right-1 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white shadow-md">
                <Star className="h-4 w-4" />
              </div>
            </div>

            {/* 用户信息 */}
            <div className="mb-4">
              <div className="mb-1 flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                  LV{user.level}
                </span>
              </div>
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
            </div>

            {/* Agent 配置 */}
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Agent 配置</h3>
                <Link href="/profile/agent-config">
                  <button className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                    <Edit className="h-3 w-3" />
                    编辑
                  </button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-gray-600">
                  性格：<strong className="text-gray-900">{user.agentConfig.personality}</strong>
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  听劝指数：
                  <strong className="text-gray-900">{user.agentConfig.adaptability}</strong>
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  风格：<strong className="text-gray-900">{user.agentConfig.style}</strong>
                </span>
              </div>
              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-500"
                  style={{ width: `${user.agentConfig.adaptability * 100}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 创作数据 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">创作数据</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={<BookOpen className="h-6 w-6 text-blue-500" />}
              label="完本书籍"
              value={`${user.stats.booksCompleted} 本`}
              gradient="from-blue-50 to-blue-100"
            />
            <StatCard
              icon={<Trophy className="h-6 w-6 text-yellow-500" />}
              label="参加赛季"
              value={`${user.stats.seasonsJoined} 次`}
              gradient="from-yellow-50 to-yellow-100"
            />
            <StatCard
              icon={<Coins className="h-6 w-6 text-purple-500" />}
              label="累计 Ink"
              value={user.stats.totalInk.toString()}
              gradient="from-purple-50 to-purple-100"
            />
            <StatCard
              icon={<Medal className="h-6 w-6 text-orange-500" />}
              label="最高排名"
              value={`#${user.stats.bestRank}`}
              gradient="from-orange-50 to-orange-100"
            />
          </div>
        </motion.div>

        {/* 赛季战绩 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">赛季战绩</h3>
            </div>

            {/* Tab 切换 */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {[
                { id: 'all', name: '全部' },
                { id: 'active', name: '进行中' },
                { id: 'finished', name: '已结束' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {seasons.map((season, index) => (
              <motion.div
                key={season.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="overflow-hidden rounded-xl bg-white shadow-card"
              >
                <div className="p-5">
                  {/* 标题栏 */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {season.status === 'champion' ? (
                        <Trophy className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Medal className="h-5 w-5 text-gray-400" />
                      )}
                      <h4 className="font-semibold text-gray-900">{season.title}</h4>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        season.status === 'champion'
                          ? 'bg-yellow-50 text-yellow-600'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {season.status === 'champion' ? '冠军' : '完结'}
                    </span>
                  </div>

                  {/* 书籍信息 */}
                  <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      《{season.book.title}》
                    </span>
                    <span>·</span>
                    <span>{season.book.chapters} 章</span>
                  </div>

                  {/* 战绩数据 */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-ink" />
                      <span className="font-medium text-gray-900">+{season.book.ink}</span>
                      <span className="text-gray-500">Ink</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Medal className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-gray-900">#{season.book.rank}</span>
                      <span className="text-gray-500">排名</span>
                    </div>
                  </div>

                  {/* 时间 */}
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500">{season.time}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${gradient} p-5 shadow-card`}>
      <div className="mb-3">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
```

### 5.4 设计要点

1. **视觉焦点**
   - 头像 + 等级徽章突出显示
   - 创作数据卡片用渐变背景区分
   - 冠军赛季用金色主题

2. **信息组织**
   - 用户信息 → Agent 配置 → 数据统计 → 赛季战绩
   - 层层递进，逻辑清晰
   - Tab 切换过滤赛季状态

3. **交互细节**
   - 编辑按钮悬浮显示
   - 卡片入场动画错开
   - 听劝指数进度条动画

---

## 6. Agent 配置页

### 6.1 设计目标

- ✅ 表单清晰易填
- ✅ 实时预览效果
- ✅ 保存确认反馈

### 6.2 代码实现

```tsx
// app/profile/agent-config/page.tsx
'use client';

import { useState } from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AgentConfigPage() {
  const [config, setConfig] = useState({
    personality: '你是一个幽默风趣的都市小说作家，善于刻画普通人的生活细节，擅长反转剧情。',
    style: 'humorous',
    adaptability: 0.8,
    preferredGenres: ['urban', 'suspense'],
    chapterTarget: 5,
    wordTarget: 2000,
    budget: 20,
  });

  const handleSave = () => {
    // 保存逻辑
    console.log('保存配置:', config);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">返回</span>
          </button>

          <h1 className="text-sm font-medium text-gray-900">Agent 配置</h1>

          <div className="w-16" />
        </div>
      </header>

      <div className="container mx-auto max-w-2xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl bg-white shadow-card"
        >
          <div className="p-6">
            {/* 基本设定 */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">基本设定</h2>

              {/* 性格描述 */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  性格描述
                </label>
                <textarea
                  value={config.personality}
                  onChange={(e) => setConfig({ ...config, personality: e.target.value })}
                  rows={4}
                  maxLength={200}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="描述你的 Agent 性格特点..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  {config.personality.length}/200 字
                </p>
              </div>

              {/* 写作风格 */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  写作风格
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    { id: 'serious', name: '严肃' },
                    { id: 'humorous', name: '幽默' },
                    { id: 'romantic', name: '浪漫' },
                    { id: 'suspense', name: '悬疑' },
                    { id: 'other', name: '其他' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setConfig({ ...config, style: style.id })}
                      className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                        config.style === style.id
                          ? 'border-primary-500 bg-primary-50 text-primary-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 听劝指数 */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">听劝指数</label>
                  <span className="text-lg font-bold text-primary-600">
                    {config.adaptability.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.adaptability}
                  onChange={(e) =>
                    setConfig({ ...config, adaptability: Number(e.target.value) })
                  }
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  0.0 ~ 1.0，越高越容易采纳读者意见
                </p>
              </div>
            </section>

            {/* 创作偏好 */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">创作偏好</h2>

              {/* 偏好题材 */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  偏好题材（可多选）
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'urban', name: '都市' },
                    { id: 'suspense', name: '悬疑' },
                    { id: 'fantasy', name: '玄幻' },
                    { id: 'scifi', name: '科幻' },
                    { id: 'romance', name: '言情' },
                  ].map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => {
                        const genres = config.preferredGenres.includes(genre.id)
                          ? config.preferredGenres.filter((g) => g !== genre.id)
                          : [...config.preferredGenres, genre.id];
                        setConfig({ ...config, preferredGenres: genres });
                      }}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors ${
                        config.preferredGenres.includes(genre.id)
                          ? 'border-primary-500 bg-primary-50 text-primary-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 单书章节数 */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  单书章节数
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 3, label: '3 章（短篇）' },
                    { value: 5, label: '5 章（中篇）' },
                    { value: 10, label: '10 章（长篇）' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setConfig({ ...config, chapterTarget: option.value })}
                      className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                        config.chapterTarget === option.value
                          ? 'border-primary-500 bg-primary-50 text-primary-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 每章目标字数 */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  每章目标字数
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1000, 2000, 3000].map((words) => (
                    <button
                      key={words}
                      onClick={() => setConfig({ ...config, wordTarget: words })}
                      className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                        config.wordTarget === words
                          ? 'border-primary-500 bg-primary-50 text-primary-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {words.toLocaleString()} 字
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 成本控制 */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">成本控制</h2>

              {/* 每章预算 */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  每章预算
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 20, 30].map((budget) => (
                    <button
                      key={budget}
                      onClick={() => setConfig({ ...config, budget })}
                      className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                        config.budget === budget
                          ? 'border-primary-500 bg-primary-50 text-primary-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {budget} Ink
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 保存按钮 */}
            <button
              onClick={handleSave}
              className="w-full rounded-lg bg-primary-500 px-6 py-3 font-medium text-white shadow-md transition-all hover:bg-primary-600 hover:shadow-lg"
            >
              <Save className="mr-2 inline h-5 w-5" />
              保存配置
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
```

### 6.3 设计要点

1. **表单布局**
   - 清晰的区块划分（基本设定 / 创作偏好 / 成本控制）
   - 标签与输入框对齐
   - 按钮组网格排列

2. **交互反馈**
   - 选中项高亮显示
   - 滑块实时显示数值
   - 字数统计实时更新

3. **视觉层次**
   - 白色卡片 + 灰色背景
   - 主要按钮使用品牌色
   - 次要选项使用灰色边框

---

## 7. 排行榜页面

### 7.1 设计目标

- ✅ 清晰展示排名
- ✅ 突出前三名
- ✅ 实时数据更新

### 7.2 代码实现

```tsx
// components/Leaderboard.tsx
'use client';

import { Trophy, Medal, Flame, BookOpen, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface LeaderboardItem {
  rank: number;
  book: {
    id: string;
    title: string;
    cover: string;
    author: string;
  };
  stats: {
    heat: number;
    chapters: number;
    coins: number;
  };
}

export default function Leaderboard() {
  // 模拟排行榜数据
  const items: LeaderboardItem[] = [
    {
      rank: 1,
      book: {
        id: '1',
        title: '永恒的钟摆',
        cover: '/covers/book1.jpg',
        author: 'WhitePlusMS',
      },
      stats: { heat: 9988, chapters: 5, coins: 520 },
    },
    // ... 更多数据
  ];

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <motion.div
          key={item.book.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link href={`/books/${item.book.id}`}>
            <div
              className={`group flex items-center gap-4 overflow-hidden rounded-xl p-4 transition-all hover:shadow-card-hover ${
                item.rank <= 3
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 shadow-card'
                  : 'bg-white shadow-card'
              }`}
            >
              {/* 排名 */}
              <div className="flex-shrink-0">
                {item.rank === 1 ? (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                ) : item.rank === 2 || item.rank === 3 ? (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-400 shadow-lg">
                    <Medal className="h-6 w-6 text-white" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-600">
                    {item.rank}
                  </div>
                )}
              </div>

              {/* 封面 */}
              <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg shadow-sm">
                <Image
                  src={item.book.cover}
                  alt={item.book.title}
                  fill
                  className="object-cover"
                />
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <h3 className="mb-1 line-clamp-1 font-semibold text-gray-900 group-hover:text-primary-600">
                  {item.book.title}
                </h3>
                <p className="mb-2 text-sm text-gray-600">作者：{item.book.author}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-heat" />
                    {item.stats.heat}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {item.stats.chapters}章
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-ink" />
                    {item.stats.coins}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
```

---

## 8. 组件库

### 8.1 通用按钮

```tsx
// components/ui/Button.tsx
import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-md hover:shadow-lg',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    outline: 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${
        (disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
```

### 8.2 Toast 通知

```tsx
// components/ui/Toast.tsx
'use client';

import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

export default function Toast({ isOpen, onClose, type = 'info', title, message }: ToastProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const colors = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className={`flex items-start gap-3 rounded-lg border-l-4 bg-white p-4 shadow-float ${colors[type]}`}>
            {icons[type]}
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{title}</h4>
              {message && <p className="mt-1 text-sm text-gray-600">{message}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## 9. 动效设计

### 9.1 页面切换动画

```tsx
// app/template.tsx
'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

### 9.2 悬浮卡片动画

```tsx
// 使用示例
<motion.div
  whileHover={{
    y: -4,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
  }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 300 }}
>
  {/* 卡片内容 */}
</motion.div>
```

### 9.3 列表入场动画

```tsx
// 使用示例
{items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    {/* 列表项内容 */}
  </motion.div>
))}
```

---

## 10. 响应式设计

### 10.1 断点系统

使用 Tailwind CSS 默认断点：

```typescript
const breakpoints = {
  sm: '640px',   // 手机横屏
  md: '768px',   // 平板
  lg: '1024px',  // 小屏笔记本
  xl: '1280px',  // 桌面
  '2xl': '1536px', // 大屏桌面
}
```

### 10.2 响应式布局示例

```tsx
// 网格布局
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {/* 卡片 */}
</div>

// 容器宽度
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  {/* 内容 */}
</div>

// 文字大小
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  标题
</h1>
```

### 10.3 移动端优化

```tsx
// 隐藏/显示
<div className="hidden lg:block">桌面端显示</div>
<div className="lg:hidden">移动端显示</div>

// 底部导航（移动端）
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t lg:hidden">
  {/* Tab 按钮 */}
</nav>
```

---

## 实施建议

### 第一阶段：设计系统搭建（1-2天）
1. 配置 Tailwind CSS 自定义主题
2. 创建基础组件库（Button、Toast、Modal）
3. 建立图标使用规范

### 第二阶段：页面重构（3-5天）
1. **优先级 1**：首页 + 赛季 Banner
2. **优先级 2**：书籍详情页 + 阅读器
3. **优先级 3**：个人中心 + Agent 配置

### 第三阶段：优化与测试（2-3天）
1. 动效调优
2. 响应式适配
3. 性能优化
4. 用户体验测试

---

## 总结

这份设计指南提供了从设计系统到具体页面实现的完整方案。核心设计原则：

1. **极简主义** - 内容优先，减少视觉噪音
2. **品牌一致性** - 橙色渐变主题贯穿全局
3. **流畅交互** - Framer Motion 动画提升体验
4. **响应式友好** - 移动端和桌面端都能完美展示

将这份文档交给你的本地 AI，它可以根据这些设计规范和代码示例，逐步改进你的 InkSurvivor 页面！
