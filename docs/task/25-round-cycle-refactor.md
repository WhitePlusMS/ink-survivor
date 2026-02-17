# 赛季轮次流程重构方案（修订版）

## ⚠️ 实施前状态确认

**当前代码状态**：本方案是一个重构计划，描述的功能在现有代码中**尚未实现**。

### 现有代码 vs 文档描述对比

| 项目 | 现有代码 | 文档描述 |
|------|---------|---------|
| roundPhase 枚举 | `NONE/READING/OUTLINE/WRITING` | `NONE/AI_WORKING/HUMAN_READING` |
| 阶段数量 | 3个阶段 | 2个阶段 |
| roundDuration 字段 | **不存在** | 需要新增 |
| aiWorkStartTime 字段 | **不存在** | 需要新增 |
| duration 字段 | 存在 (reading/outline/writing) | 需要删除 |
| ROUND_CYCLE 任务 | **不存在** | 需要新增 |
| advanceToNextRound 方法 | **不存在** | 需要新增 |

---

## 用户需求确认

- **阶段推进机制**：任务驱动（ROUND_CYCLE 任务完成后自动切换阶段）
- **阶段数量**：两个阶段（AI_WORKING + HUMAN_READING，无 IDLE）
- **时间配置**：单一 roundDuration 字段
- **任务合并**：合并为 ROUND_CYCLE 任务
- **CATCH_UP 处理**：完成后调用 advanceToNextRound() 切换阶段
- **Reader Agents**：阶段名称改为 HUMAN_READING
- **duration 字段**：删除
- **aiWorkStartTime**：需要添加
- **最少人类阅读时间**：5分钟

## 背景

当前赛季流程使用三个固定阶段（OUTLINE → WRITING → READING），每个阶段独立计时。这种设计存在以下问题：

1. **时间利用率低**：AI 任务实际只需 2-5 分钟，但预留了 10 分钟
2. **人类阅读体验差**：阅读时间被切碎，不够连续
3. **流程不够紧凑**：阶段之间可能有空白

## 目标设计

将三个 AI 阶段合并为两个连续执行的阶段：`AI_WORKING` → `HUMAN_READING`（任务驱动，非时间驱动）。

```
┌─────────────────────────────────────────────────────────────────┐
│                        第 N 轮周期                                │
├─────────────────────────────────────────────────────────────────┤
│  AI_WORKING (任务驱动，无固定时间)  │  HUMAN_READING (剩余时间) │
│  ┌───────────────────┐  │  ┌─────────────────────────────────┐ │
│  │ 1. 生成/优化大纲   │  │  │ 人类用户阅读 + 互动             │ │
│  │ 2. 生成章节内容   │  │  │                                 │ │
│  │ 3. AI 读者评论    │  │  │ 倒计时 = roundDuration - AI耗时  │ │
│  └───────────────────┘  │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           ↓
                    第 N+1 轮周期
```

---

## 一、数据库 Schema 修改

### 1.1 Prisma Schema 修改

**文件**: `prisma/schema.prisma`

```prisma
model Season {
  // 轮次配置
  roundDuration    Int       @default(20)    // 每轮总时间（分钟）= AI生成时间 + 人类阅读时间
  maxChapters     Int       @default(10)     // 总轮数

  // 阶段简化为两个值（无 IDLE）
  roundPhase      String    @default("NONE") // NONE, AI_WORKING, HUMAN_READING

  // 删除旧的 duration 字段
}
```

### 1.2 字段说明

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `roundDuration` | Int | 20 | 每轮总时间（分钟）= AI生成 + 人类阅读 |
| `maxChapters` | Int | 10 | 总轮数（每轮一章） |
| `roundPhase` | String | "NONE" | 阶段：NONE / AI_WORKING / HUMAN_READING |
| `aiWorkStartTime` | DateTime | null | AI 工作开始时间（用于计算人类阅读剩余时间） |

### 1.3 时间计算逻辑

```
人类阅读时间 = roundDuration - AI 实际工作时间

示例：
- 管理员配置 roundDuration = 20 分钟
- AI 实际工作 5 分钟完成
- 人类阅读时间 = 20 - 5 = 15 分钟
```

---

## 二、类型定义修改

### 2.1 赛季阶段类型

**文件**: `src/types/season.ts`

```typescript
/**
 * 赛季轮次阶段类型（简化版 - 两个阶段）
 *
 * 流程：
 * - NONE: 赛季开始前/等待
 * - AI_WORKING: 大纲生成 → 章节生成 → AI评论（连续执行，任务驱动）
 * - HUMAN_READING: 人类阅读期（剩余时间 = roundDuration - AI实际耗时）
 */
export type RoundPhase = 'NONE' | 'AI_WORKING' | 'HUMAN_READING';

/**
 * 赛季配置（管理员配置）
 */
export interface SeasonConfig {
  roundDuration: number;    // 每轮总时间（分钟）
  maxChapters: number;      // 总轮数
}
```

---

## 三、服务层修改

### 3.1 赛季自动推进服务

**文件**: `src/services/season-auto-advance.service.ts`

#### 修改点：

1. **阶段切换逻辑简化**
   - 移除 `OUTLINE`, `WRITING`, `READING` 三个独立阶段
   - 改为 `NONE` → `AI_WORKING` → `HUMAN_READING` → `AI_WORKING`（下一轮）

2. **AI_WORKING 阶段：任务驱动，不是时间驱动**
   - AI_WORKING 阶段没有固定时间限制
   - 当 ROUND_CYCLE 任务（大纲→章节→AI评论）执行完毕后，自动触发阶段切换
   - 任务执行 3 分钟或 10 分钟都可以，不受限制

3. **HUMAN_READING 阶段：剩余时间倒计时**
   - 倒计时时间 = roundDuration - AI实际工作时间
   - 示例：roundDuration=20 分钟，AI工作5分钟，则人类阅读 = 20 - 5 = 15 分钟
   - 需要在进入 AI_WORKING 阶段时记录 `aiWorkStartTime`

4. **AI_WORKING 阶段超时计算**
   - AI_WORKING 阶段有最大时间限制：roundDuration - 5分钟（最少人类阅读时间）
   - 示例：roundDuration=20 分钟，AI_WORKING 最大 = 15 分钟
   - 如果 AI 工作超过最大时间，自动切换到 HUMAN_READING（强制结束）
   ```typescript
   // 阶段时长计算
   function getPhaseDurationMs(season: Season, phase: RoundPhase): number {
     const roundDurationMs = (season.roundDuration || 20) * 60 * 1000;
     const minReadingTimeMs = 5 * 60 * 1000; // 最少人类阅读时间 5 分钟

     // AI_WORKING 阶段：最大时间 = roundDuration - 最少人类阅读时间
     if (phase === 'AI_WORKING') {
       return Math.max(roundDurationMs - minReadingTimeMs, 5 * 60 * 1000); // 最少 5 分钟
     }

     // HUMAN_READING 阶段：使用剩余时间 = roundDuration - AI实际耗时
     if (phase === 'HUMAN_READING') {
       // 注意：roundStartTime 记录的是阶段开始时间，不是 AI 工作结束时间
       // AI 工作结束时间应该在 ROUND_CYCLE 任务完成时记录到数据库
       // 这里使用 season.roundStartTime 作为参考，实际计算在 advanceToNextRound 中处理
       const aiWorkStartTime = season.aiWorkStartTime;

       if (aiWorkStartTime && season.roundStartTime) {
         // roundStartTime 此时应该是 AI_WORKING 阶段的开始时间
         const aiWorkMs = new Date(season.roundStartTime).getTime() - new Date(aiWorkStartTime).getTime();
         const readingMs = roundDurationMs - aiWorkMs;
         return Math.max(readingMs, minReadingTimeMs); // 确保最少 5 分钟
       }

       // 如果没有记录 AI 工作时间，默认使用 roundDuration - 5分钟
       return roundDurationMs - minReadingTimeMs;
     }

     return roundDurationMs;
   }
   ```

   **数据库字段**：需要在 Season 模型中添加 `aiWorkStartTime` 字段记录 AI 工作开始时间。

5. **ROUND_CYCLE 任务完成后自动切换阶段**
   - 在 task-worker.service.ts 的 ROUND_CYCLE 任务执行完毕后
   - 自动更新赛季阶段为 HUMAN_READING
   ```typescript
   // ROUND_CYCLE 任务执行完毕后自动切换
   ROUND_CYCLE: async (payload) => {
     const { seasonId, round } = payload;

     // 1. 执行大纲→章节→AI评论
     // ... (执行逻辑)

     // 2. 任务执行完毕后，自动切换到人类阅读阶段
     // 注意：aiWorkStartTime 已经在进入 AI_WORKING 阶段时被设置
     await prisma.season.update({
       where: { id: seasonId },
       data: {
         roundPhase: 'HUMAN_READING',
         roundStartTime: new Date(), // 记录阅读开始时间（即 AI 工作结束时间）
       },
     });
   }
   ```

   **阶段任务触发时设置 aiWorkStartTime**：
   ```typescript
   private async triggerPhaseTask(seasonId: string, round: number, phase: RoundPhase): Promise<void> {
     if (phase === 'AI_WORKING') {
       // 进入 AI_WORKING 阶段时，记录开始时间
       await prisma.season.update({
         where: { id: seasonId },
         data: {
           aiWorkStartTime: new Date(), // 记录 AI 工作开始时间
         },
       });

       // 创建轮次完整流程任务（大纲→章节→评论）
       await taskQueueService.create({
         taskType: 'ROUND_CYCLE',
         payload: { seasonId, round },
         priority: 10,
       });
     }
     // HUMAN_READING 阶段不需要触发任务，等待人类阅读
   }
   ```

3. **阶段任务触发**
   ```typescript
   private async triggerPhaseTask(seasonId: string, round: number, phase: RoundPhase): Promise<void> {
     if (phase === 'AI_WORKING') {
       // 创建轮次完整流程任务（大纲→章节→评论）
       await taskQueueService.create({
         taskType: 'ROUND_CYCLE',
         payload: { seasonId, round },
         priority: 10,
       });
     }
     // HUMAN_READING 阶段不需要触发任务，等待人类阅读
   }
   ```

### 3.2 任务 Worker 服务

**文件**: `src/services/task-worker.service.ts`

#### 新增 ROUND_CYCLE 任务处理器：

```typescript
const taskHandlers = {
  /**
   * 轮次完整流程：大纲 → 章节 → AI评论
   * 连续执行，中间不等待
   */
  ROUND_CYCLE: async (payload) => {
    const { seasonId, round } = payload;

    console.log(`[TaskWorker] 开始轮次 ${round} 完整流程`);

    // 查询当前赛季的所有书籍
    const books = await prisma.book.findMany({
      where: { seasonId, status: 'ACTIVE' },
      select: { id: true },
    });

    // 1. 大纲生成（第1轮生成整本，后续轮优化单章）
    if (round === 1) {
      await outlineGenerationService.generateOutlinesForSeason(seasonId);
    } else {
      // 后续轮次：先生成下一章大纲（可能根据评论修改）
      for (const book of books) {
        await outlineGenerationService.generateNextChapterOutline(book.id);
      }
    }

    // 2. 章节生成（并发处理所有书籍）
    await chapterWritingService.writeChaptersForSeason(seasonId, round);

    // 3. AI 评论
    // 注意：chapterWritingService.writeChapter 内部已通过 setTimeout 调用 readerAgentService
    // 无需额外处理，章节发布后会自动触发

    // 4. 落后检测
    const allBooks = await prisma.book.findMany({
      where: { seasonId, status: 'ACTIVE' },
      include: { _count: { select: { chapters: true } } },
    });
    const behindBooks = allBooks.filter(book => book._count.chapters < round);

    if (behindBooks.length > 0) {
      // 有落后：创建 CATCH_UP 任务
      await taskQueueService.create({
        taskType: 'CATCH_UP',
        payload: { seasonId, round, bookIds: behindBooks.map(b => b.id) }
      });
    } else {
      // 无落后：直接进入 HUMAN_READING
      const { seasonAutoAdvanceService } = await import('./season-auto-advance.service');
      await seasonAutoAdvanceService.advanceToNextRound(seasonId, round);
    }

    console.log(`[TaskWorker] 轮次 ${round} AI 工作完成`);
  },

  // 追赶模式：完成后需要调用 advanceToNextRound
  CATCH_UP: async (payload) => {
    const { seasonId, round } = payload;

    // 执行追赶逻辑
    await chapterWritingService.catchUpBooks(seasonId, round);

    // 追赶完成后切换阶段
    const { seasonAutoAdvanceService } = await import('./season-auto-advance.service');
    await seasonAutoAdvanceService.advanceToNextRound(seasonId, round);
  },
};
```

---

## 四、管理员创建赛季 API

### 4.1 请求体设计

**文件**: `src/app/api/admin/season-queue/route.ts` 或新建

```typescript
// POST /api/admin/seasons/create

interface CreateSeasonRequest {
  seasonNumber: number;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  signupDeadline: Date;

  // 轮次配置（管理员配置）
  roundDuration: number;    // 每轮总时间（分钟），如 20
  maxChapters: number;     // 总轮数，如 10
}

/**
 * 配置示例：
 *
 * 标准配置（推荐）：
 * {
 *   "roundDuration": 20,   // 每轮 20 分钟
 *   "maxChapters": 10     // 10 轮，总计 200 分钟（约 3.3 小时）
 * }
 *
 * 较长时间配置：
 * {
 *   "roundDuration": 30,   // 每轮 30 分钟
 *   "maxChapters": 7      // 7 轮，总计 210 分钟（约 3.5 小时）
 * }
 */
```

### 4.2 默认值处理

```typescript
// 创建赛季时的默认值
const createSeasonData = {
  // ... 其他字段
  roundDuration: body.roundDuration || 20,     // 默认 20 分钟
  maxChapters: body.maxChapters || 10,         // 默认 10 轮
};
```

---

## 五、修改文件清单（完整版）

### 5.1 核心文件（必须修改）

| 序号 | 文件路径 | 修改内容 |
|------|----------|----------|
| 1 | `prisma/schema.prisma` | 新增 `roundDuration` 和 `aiWorkStartTime` 字段，修改 `roundPhase` 枚举为 NONE/AI_WORKING/HUMAN_READING |
| 2 | `src/types/season.ts` | 更新 `RoundPhase` 类型为 `'NONE' \| 'AI_WORKING' \| 'HUMAN_READING'` |
| 3 | `src/services/season-auto-advance.service.ts` | 简化为两个阶段切换逻辑，添加 `advanceToNextRound()` 方法，PHASE_ORDER 改为 `['AI_WORKING', 'HUMAN_READING']` |
| 4 | `src/services/task-worker.service.ts` | 新增 `ROUND_CYCLE` 任务处理器，在任务完成和 CATCH_UP 完成后调用 `advanceToNextRound()` |
| 5 | `src/services/season-queue.service.ts` | 更新 `CreateSeasonDto` 接口，使用 `roundDuration` 替代 `duration` 对象 |
| 6 | `src/app/api/admin/season-queue/route.ts` | 简化创建赛季 API，使用 `roundDuration` |
| 7 | `src/services/season.service.ts` | 更新 `SeasonResponse` 接口的阶段显示 |

### 5.2 定时器接口（复用现有）

| 序号 | 文件路径 | 修改内容 |
|------|----------|----------|
| 8 | `src/app/api/tasks/reader-agents/route.ts` | 修改阶段检查从 `READING` 改为 `HUMAN_READING` |
| 9 | `src/app/api/admin/test/next-phase/route.ts` | 更新阶段推进逻辑为 NONE → AI_WORKING → HUMAN_READING |

### 5.3 前端组件

| 序号 | 文件路径 | 修改内容 |
|------|----------|----------|
| 10 | `src/components/season/phase-progress-bar.tsx` | 更新阶段显示名称和进度计算逻辑 |
| 11 | `src/app/admin/admin-season-client.tsx` | 更新管理员表单，添加 roundDuration 配置项 |
| 12 | `src/components/home/home-content.tsx` | 更新 `getPhaseDisplayName` 函数 |
| 13 | `src/app/admin/page.tsx` | 更新 `getPhaseDisplayName` 函数 |

### 5.4 辅助文件（可选）

| 序号 | 文件路径 | 修改内容 |
|------|----------|----------|
| 13 | `scripts/create-test-season.ts` | 可选，更新测试脚本使用新配置 |
| 14 | `src/app/api/admin/test/init-s0/route.ts` | 可选，更新初始化 S0 脚本 |

---

## 六、各文件详细修改说明

### 6.1 prisma/schema.prisma

```prisma
model Season {
  // ... 现有字段 ...

  // 新增：轮次总时间（分钟）
  roundDuration    Int       @default(20)

  // AI 工作开始时间（用于计算人类阅读剩余时间）
  aiWorkStartTime  DateTime?

  // 阶段简化为两个值
  // NONE: 赛季开始前/等待
  // AI_WORKING: 大纲生成→章节生成→AI评论（连续执行）
  // HUMAN_READING: 人类阅读期
  roundPhase      String    @default("NONE")

  // 保留旧的 duration 字段用于向后兼容，但不再使用
  // duration       Json      @default("{\"reading\": 10, \"outline\": 5, \"writing\": 5}")

  // ... 其他字段 ...
}
```

### 6.2 src/types/season.ts

```typescript
// 修改前
export type RoundPhase = 'NONE' | 'READING' | 'OUTLINE' | 'WRITING';

// 修改后
export type RoundPhase = 'NONE' | 'AI_WORKING' | 'HUMAN_READING';
```

### 6.3 src/services/season-auto-advance.service.ts

```typescript
// 修改阶段顺序（无 IDLE）
const PHASE_ORDER: RoundPhase[] = ['AI_WORKING', 'HUMAN_READING'];

// 修改阶段任务触发
private async triggerPhaseTask(seasonId: string, round: number, phase: RoundPhase): Promise<void> {
  if (phase === 'AI_WORKING') {
    // 进入 AI_WORKING 阶段时，记录开始时间
    await prisma.season.update({
      where: { id: seasonId },
      data: {
        aiWorkStartTime: new Date(),
      },
    });

    // 创建轮次完整流程任务（大纲→章节→评论）
    await taskQueueService.create({
      taskType: 'ROUND_CYCLE',
      payload: { seasonId, round },
      priority: 10,
    });
  }
  // HUMAN_READING 阶段不需要触发任务
}
```

### 6.4 src/components/season/phase-progress-bar.tsx

```typescript
// 修改阶段名称映射（两个阶段 + NONE）
const PHASE_NAMES: Record<RoundPhase, string> = {
  NONE: '等待开始',
  AI_WORKING: 'AI工作中',
  HUMAN_READING: '人类阅读期',
};

// 修改阶段顺序
const PHASE_ORDER: RoundPhase[] = ['AI_WORKING', 'HUMAN_READING'];

// 修改时间计算：使用 roundDuration
function calculateRemainingTime(
  roundStartTime: string | null,
  roundDuration: number,
  currentPhase: RoundPhase
): string {
  // AI_WORKING 阶段：给足够时间，但不强制
  // HUMAN_READING 阶段：使用剩余时间
}
```

### 6.5 src/app/admin/admin-season-client.tsx

```typescript
// 修改表单字段
interface SeasonConfigForm {
  // ... 原有字段 ...
  roundDuration: number;  // 新增：每轮总时间（分钟）
}

// 简化阶段配置（移除原来的 reading/outline/writing）
// 只保留 roundDuration 配置
```

---

## 七、流程时序图（更新版）

```
管理员创建赛季
      │
      ▼
┌─────────────────────────────────────┐
│ 赛季配置:                           │
│ - roundDuration = 20 分钟           │
│ - maxChapters = 10                  │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ 第 1 轮                                              │
├─────────────────────────────────────────────────────┤
│ AI_WORKING (任务驱动，实际耗时约4-6分钟)               │
│  ├── 生成整本书大纲 (2分钟)                          │
│  ├── 生成第1章正文 (2分钟)                           │
│  └── AI读者评论 (1分钟，并发3个Agent)                │
│ 完成后自动切换 →                                     │
├─────────────────────────────────────────────────────┤
│ HUMAN_READING (剩余约14-16分钟)                      │
│  └── 人类用户阅读 + 互动                            │
└─────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ 第 2 轮                                              │
├─────────────────────────────────────────────────────┤
│ AI_WORKING (任务驱动，实际耗时约4-6分钟)              │
│  ├── 根据第1章评论判断是否修改大纲 (1分钟)           │
│  ├── 生成第2章正文 (2分钟)                           │
│  └── AI读者评论 (1分钟，并发3个Agent)               │
│ 完成后自动切换 →                                     │
├─────────────────────────────────────────────────────┤
│ HUMAN_READING (剩余约14-16分钟)                     │
│  └── 人类用户阅读 + 互动                            │
└─────────────────────────────────────────────────────┘
      │
      ▼
    ... (继续到第10轮)
      │
      ▼
   赛季结束
```

---

## 八、管理员配置

管理员在创建赛季时只需配置两个参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `roundDuration` | number | 20 | 每轮总时间（分钟）= AI生成 + 人类阅读 |
| `maxChapters` | number | 10 | 总轮数（每轮一章） |

**示例**：

```json
{
  "roundDuration": 20,
  "maxChapters": 10
}
```

- 每轮总时间 = 20 分钟（AI工作 + 人类阅读）

---

## 九、实施顺序

### ⚠️ 实施前必读

本方案涉及数据库 Schema 修改和大量代码重构，**实施顺序至关重要**。请严格按照以下顺序执行。

1. **第一步（数据库）**：修改 Prisma schema（新增 roundDuration、aiWorkStartTime 字段，删除 duration 字段，修改 roundPhase 枚举）并运行 migration
2. **第二步（类型）**：更新 TypeScript 类型定义（修改 RoundPhase 类型为 `NONE | AI_WORKING | HUMAN_READING`）
3. **第三步（服务层核心）**：修改 `season-auto-advance.service.ts`
   - 修改 PHASE_ORDER 为 `['AI_WORKING', 'HUMAN_READING']`
   - 添加 `advanceToNextRound()` 公开方法
   - 修改 `triggerPhaseTask()` 方法：AI_WORKING 时记录 aiWorkStartTime 并创建 ROUND_CYCLE 任务
4. **第四步（任务Worker）**：修改 `task-worker.service.ts`
   - **删除** OUTLINE、NEXT_OUTLINE、WRITE_CHAPTER 任务处理器
   - **新增** ROUND_CYCLE 任务处理器（合并大纲→章节→AI评论）
   - 修改 CATCH_UP 任务处理器，添加 `await seasonAutoAdvanceService.advanceToNextRound()`
5. **第五步（创建赛季）**：更新 `season-queue.service.ts` 和创建赛季 API，使用 roundDuration 替代 duration
6. **第六步（数据格式化）**：更新 `season.service.ts` 的数据格式化
7. **第七步（手动推进）**：更新手动推进 API `next-phase/route.ts` 的阶段顺序
8. **第八步（Reader Agents）**：更新 `reader-agents/route.ts` 阶段检查从 `READING` 改为 `HUMAN_READING`
9. **第九步（前端）**：更新前端组件（phase-progress-bar.tsx, admin-season-client.tsx）
10. **第十步（测试）**：测试完整流程

---

## 十、接口复用详细设计

### 10.1 season-auto-advance 复用

```
职责：检测阶段超时，推进到下一阶段

**需要完全重写**，修改点：
- PHASE_ORDER: ['AI_WORKING', 'HUMAN_READING']
- AI_WORKING 阶段：最大超时时间 = roundDuration - 5分钟（最少人类阅读时间）
- HUMAN_READING 阶段：使用 roundDuration - AI工作时长 作为超时时间
- triggerPhaseTask(): AI_WORKING 时创建 ROUND_CYCLE 任务并记录 aiWorkStartTime，HUMAN_READING 时不创建任务
- **新增** advanceToNextRound() 公开方法
```

### 10.2 reader-agents 复用

```
职责：在人类阅读阶段调度 AI 读者

修改点：
- 第43行: roundPhase !== 'READING' → roundPhase !== 'HUMAN_READING'
```

### 10.3 ROUND_CYCLE 完成后阶段切换

**关键问题**：ROUND_CYCLE 任务完成后如何切换到 HUMAN_READING？

**解决方案**：在 ROUND_CYCLE 任务处理器中调用 `advanceToNextRound()` 方法

```typescript
// 在 season-auto-advance.service.ts 中添加公开方法
public async advanceToNextRound(seasonId: string, round: number): Promise<void> {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season || season.roundPhase !== 'AI_WORKING') return;

  // 计算阅读时长 = roundDuration - AI工作时长
  const roundDurationMs = (season.roundDuration || 20) * 60 * 1000;
  const aiWorkMs = season.aiWorkStartTime
    ? new Date().getTime() - new Date(season.aiWorkStartTime).getTime()
    : 0;
  const readingDurationMs = Math.max(roundDurationMs - aiWorkMs, 0);

  // 计算下一轮：AI_WORKING 结束后是人类阅读，人类阅读结束后才是下一轮
  // 这里先设置阶段为 HUMAN_READING，轮次保持不变
  // 轮次会在 HUMAN_READING 阶段超时后由 checkAndAdvance 自动增加

  await prisma.season.update({
    where: { id: seasonId },
    data: {
      roundPhase: 'HUMAN_READING',
      roundStartTime: new Date(), // 阅读开始时间（即 AI 工作结束时间）
      // 注意：currentRound 在 HUMAN_READING 阶段结束后才增加
    },
  });

  console.log(`[SeasonAutoAdvance] AI工作完成，进入人类阅读阶段（时长: ${readingDurationMs / 60000}分钟）`);
}
```

在 ROUND_CYCLE 任务处理器中调用：
```typescript
ROUND_CYCLE: async (payload) => {
  const { seasonId, round } = payload;

  // 1. 执行大纲→章节→AI评论
  // ...

  // 2. 完成后切换到 HUMAN_READING
  const { seasonAutoAdvanceService } = await import('./season-auto-advance.service');
  await seasonAutoAdvanceService.advanceToNextRound(seasonId, round);
},
```

### 10.4 AI_WORKING 阶段流程（ROUND_CYCLE 任务）

AI_WORKING 阶段由 ROUND_CYCLE 任务执行，分为4个步骤：

```typescript
ROUND_CYCLE: async (payload) => {
  const { seasonId, round } = payload;

  // 查询当前赛季的所有书籍
  const books = await prisma.book.findMany({
    where: { seasonId, status: 'ACTIVE' },
    select: { id: true },
  });

  // ========== 步骤1: 是否修改大纲 ==========
  if (round === 1) {
    // 第1轮：生成整本书大纲
    await outlineGenerationService.generateOutlinesForSeason(seasonId);
  } else {
    // 后续轮次：根据上一轮评论判断是否修改大纲
    for (const book of books) {
      await outlineGenerationService.generateNextChapterOutline(book.id);
    }
  }

  // ========== 步骤2: 生成章节内容 ==========
  // 为所有书籍生成第 round 章
  await chapterWritingService.writeChaptersForSeason(seasonId, round);

  // ========== 步骤3: 调用评论 Agent ==========
  // 注意：chapterWritingService.writeChapter 内部已通过 setTimeout 调用 readerAgentService
  // 无需额外处理，章节发布后会自动触发

  // ========== 步骤4: 落后检测 ==========
  // 检测是否有书籍未完成本章（落后检测逻辑直接在这里实现）
  const allBooks = await prisma.book.findMany({
    where: { seasonId, status: 'ACTIVE' },
    include: { _count: { select: { chapters: true } } },
  });
  const behindBooks = allBooks.filter(book => book._count.chapters < round);

  if (behindBooks.length > 0) {
    // 有落后：创建 CATCH_UP 任务
    await taskQueueService.create({
      taskType: 'CATCH_UP',
      payload: { seasonId, round, bookIds: behindBooks.map(b => b.id) }
    });
    // 注意：CATCH_UP 任务处理器内部完成后需要调用 advanceToNextRound
    // 详见 "3.2 任务 Worker 服务" 中的 CATCH_UP 处理器说明
  } else {
    // 无落后：直接进入 HUMAN_READING
    await seasonAutoAdvanceService.advanceToNextRound(seasonId, round);
  }
}
```

#### 3.2.1 CATCH_UP 任务处理器（重要）

**CATCH_UP 任务完成后必须调用 advanceToNextRound**：

```typescript
CATCH_UP: async (payload) => {
  const { seasonId, round } = payload;

  // 执行追赶逻辑
  await chapterWritingService.catchUpBooks(seasonId, round);

  // ========== 追赶完成后切换阶段 ==========
  const { seasonAutoAdvanceService } = await import('./season-auto-advance.service');
  await seasonAutoAdvanceService.advanceToNextRound(seasonId, round);
},
```

### 完整流程时序

```
┌─────────────────────────────────────────────────────────────┐
│ AI_WORKING 阶段（ROUND_CYCLE 任务执行）                    │
├─────────────────────────────────────────────────────────────┤
│ 步骤1: 是否修改大纲                                         │
│   - 第1轮：生成整本书大纲                                   │
│   - 后续轮：根据评论修改大纲                                 │
│                                                             │
│ 步骤2: 生成章节内容                                         │
│   - writeChaptersForSeason(seasonId, round)               │
│   - 为所有书籍生成第N章                                     │
│                                                             │
│ 步骤3: 调用评论 Agent                                      │
│   - 章节发布后自动触发（writeChapter 内部处理）           │
│                                                             │
│ 步骤4: 落后检测                                             │
│   - 检测是否有书籍未完成本章                                 │
│   ├─ 有落后 → CATCH_UP 任务 → 完成后调用 advanceToNextRound │
│   └─ 无落后 → 直接进入 HUMAN_READING                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ HUMAN_READING 阶段                                          │
│ - 倒计时 = roundDuration - AI工作时长（最少5分钟）        │
│ - 所有章节已发布（含追赶的）                                │
│ - AI 读者评论进行中                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 十一、实施风险与注意事项

### ⚠️ 关键风险

1. **数据库迁移风险**：删除 `duration` 字段会导致旧数据丢失，需提前备份
2. **任务类型变更**：删除 OUTLINE/NEXT_OUTLINE/WRITE_CHAPTER 任务类型，现有的任务队列中的任务会失效
3. **阶段状态不一致**：重构期间可能有赛季处于中间状态，需确保所有赛季已完成或重置

### 🔄 回滚方案

如果实施后出现问题，需要：
1. 恢复 Prisma schema（添加回 duration 字段，恢复 roundPhase 枚举）
2. 恢复 task-worker.service.ts 中的原任务处理器
3. 恢复 season-auto-advance.service.ts 中的阶段逻辑
4. 数据库需要回滚到迁移前的状态

### 📋 实施检查清单

- [ ] 备份数据库
- [ ] 确认没有正在进行的赛季（或等待赛季结束）
- [ ] 逐个文件按照"实施顺序"执行
- [ ] 每完成一步进行编译检查 `npm run build`
- [ ] 测试创建新赛季流程
- [ ] 测试阶段自动推进流程
- [ ] 测试手动推进 API

---

## 修订日志

### 2026-02-17 本次修改

#### 修改的文件

1. **src/services/season-queue.service.ts**
   - `SeasonItem` 接口：将 `duration` 对象改为 `roundDuration` 数字字段
   - `CreateSeasonDto` 接口：将 `duration` 对象改为 `roundDuration` 数字字段
   - `create` 方法：将 `duration` 字段替换为 `roundDuration`
   - `update` 方法：将 `duration` 字段替换为 `roundDuration`
   - `batchPublish` 方法：使用 `roundDuration` 计算赛季结束时间
   - `duplicateFromSeason` 方法：使用 `roundDuration` 替代 `duration` 对象
   - `formatItem` 方法：使用 `roundDuration` 替代 `duration`

2. **src/services/season.service.ts**
   - `SeasonResponse` 接口：
     - 将 `duration: Prisma.JsonValue` 改为 `roundDuration: number`
     - 移除 `phaseDurations` 字段
     - 添加 `aiWorkStartTime: Date | null` 字段
   - `createSeason` 方法：将 `duration` 字段替换为 `roundDuration`
   - `formatSeason` 方法：
     - 使用 `roundDuration` 替代 `duration`
     - 添加 `aiWorkStartTime` 字段返回

3. **额外修复的文件（为使项目编译通过）**
   - `src/app/api/admin/season-queue/route.ts`：将 duration 计算改为 roundDuration
   - `src/app/api/admin/season-queue/[id]/route.ts`：将 duration 更新改为 roundDuration
   - `src/app/api/admin/season-queue/[id]/optimize/route.ts`：将提示词中的 duration 改为 roundDuration
   - `src/app/api/admin/test/next-phase/route.ts`：
     - 修改 `getPhaseDescription` 函数使用 roundDuration
     - 修改阶段说明使用 roundDuration
   - `src/app/api/admin/test/init-s0/route.ts`：将 duration 改为 roundDuration
   - `src/app/api/admin/test/start-season/route.ts`：将 duration 改为 roundDuration
   - `scripts/create-test-season.ts`：将 duration 改为 roundDuration

#### 字段变更对照表

| 旧字段 | 新字段 | 类型变更 |
|--------|--------|----------|
| `duration: { reading: number; outline: number; writing: number }` | `roundDuration: number` | 对象 -> 数字（分钟）|
| 无 | `aiWorkStartTime: DateTime?` | 新增 |

#### 修改原因

根据赛季轮次重构方案，将原来的三阶段（READING/OUTLINE/WRITING）简化为两阶段（AI_WORKING/HUMAN_READING），duration 对象也需要简化为单一的 roundDuration 数字字段。

### 2024-xx-xx 第二轮审查修正

1. **修正 roundStartTime 误用问题**（第171行）
   - 原问题：`roundStartTime` 被错误地用作 `aiWorkEndTime`
   - 修正：添加注释说明 `roundStartTime` 记录的是阶段开始时间，实际 AI 工作结束时间在任务完成时获取

2. **移除不存在的 detectBehindBooks 函数**（第687行）
   - 原问题：调用了代码中不存在的 `detectBehindBooks()` 函数
   - 修正：直接在 ROUND_CYCLE 任务中实现落后检测逻辑

3. **补充书籍查询代码**（第680-681行）
   - 原问题：使用未定义的 `activeBooks` 变量
   - 修正：在使用前先查询书籍列表

4. **补充 ROUND_CYCLE 任务的完整实现**（第256-297行）
   - 原问题：任务处理器中缺少落后检测和阶段切换逻辑
   - 修正：添加完整的落后检测和条件分支（有落后创建 CATCH_UP，无落后调用 advanceToNextRound）

5. **明确 advanceToNextRound 方法的轮次逻辑**
   - 修正：添加注释说明轮次在 HUMAN_READING 阶段结束后才增加
