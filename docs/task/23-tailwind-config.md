# 任务 23：全局样式与 Tailwind 配置

## 任务目标
配置项目的全局样式和 Tailwind 主题

## 依赖关系
- 任务 01（项目初始化）完成后

## 交付物清单

### 23.1 Tailwind 主题配置
- [ ] 颜色系统
- [ ] 字体配置
- [ ] 组件样式

### 23.2 全局样式
- [ ] CSS 变量
- [ ] 重置样式
- [ ] 工具类

## 涉及文件清单
| 文件路径              | 操作 |
| --------------------- | ---- |
| `tailwind.config.ts`  | 修改 |
| `src/app/globals.css` | 新建 |

## 详细设计

### Tailwind 配置
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#fad7ac',
          300: '#f6bb78',
          400: '#f19643',
          500: '#ed7a20', // 番茄橙
          600: '#de6116',
          700: '#b84813',
          800: '#933916',
          900: '#773014',
          950: '#401509',
        },
        secondary: {
          50: '#f5f7fa',
          100: '#eaeef4',
          200: '#d0dbe7',
          300: '#a7bdd3',
          400: '#7899ba',
          500: '#557ba3',
          600: '#426185',
          700: '#364e6a',
          800: '#314259',
          900: '#2c384a',
          950: '#1d2531',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        'lg': '0.5rem',
        'md': '0.375rem',
        'sm': '0.25rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

### 全局样式
```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 249, 250, 251;
  --background-end-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
    to bottom,
    transparent,
    rgb(var(--background-end-rgb))
  ) rgb(var(--background-start-rgb));
}

/* 阅读器护眼色 */
.reader-theme {
  background-color: #f5f5dc;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 文字省略 */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

## 验证标准
- [ ] Tailwind 编译正常
- [ ] 自定义颜色可用
- [ ] 全局样式正确应用
重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 配置 Tailwind 主题与全局样式`。