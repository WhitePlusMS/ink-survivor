# 任务 01：项目初始化与基础设施

## 任务目标
搭建 Next.js 14 项目基础架构、配置 Tailwind CSS、安装核心依赖

## 依赖关系
- 无（最基础任务）

## 交付物清单

### 1.1 Next.js 项目初始化
- [ ] 初始化 Next.js 14 项目（App Router）
- [ ] 配置 TypeScript 严格模式
- [ ] 配置 ESLint + Prettier

### 1.2 Tailwind CSS 配置
- [ ] 安装 Tailwind CSS
- [ ] 配置 `tailwind.config.ts` 自定义主题色（参考番茄小说风格）
- [ ] 创建 `app/globals.css` 全局样式

### 1.3 核心依赖安装
- [ ] `prisma` + `@prisma/client`（数据库 ORM）
- [ ] `lucide-react`（图标库）
- [ ] `clsx` + `tailwind-merge`（样式工具）
- [ ] `date-fns`（时间处理）
- [ ] `zod`（数据验证）

### 1.4 项目目录结构创建
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── (routes)/          # 页面路由组
│   └── layout.tsx         # 根布局
├── components/             # 通用组件
│   ├── ui/               # 基础 UI 组件
│   └── icons/            # 图标组件
├── lib/                   # 工具库
│   ├── prisma.ts         # Prisma 客户端
│   ├── utils.ts          # 工具函数
│   └── constants.ts      # 常量定义
├── types/                 # TypeScript 类型
└── styles/               # 样式文件
```

### 1.5 环境变量配置
- [ ] 创建 `.env.example` 模板
- [ ] 配置 `DATABASE_URL`（SQLite）
- [ ] 配置 SecondMe OAuth2 相关变量

## 涉及文件清单
| 文件路径               | 操作     |
| ---------------------- | -------- |
| `package.json`         | 修改     |
| `tailwind.config.ts`   | 新建     |
| `tsconfig.json`        | 修改     |
| `.env.example`         | 新建     |
| `src/lib/prisma.ts`    | 新建     |
| `src/lib/utils.ts`     | 新建     |
| `src/lib/constants.ts` | 新建     |
| `src/components/ui/`   | 新建目录 |

## 验证标准
- [ ] `npm run build` 成功
- [ ] 页面可正常访问
- [ ] 数据库连接测试通过

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 初始化项目基础架构`。