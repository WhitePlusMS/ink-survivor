# 更新说明 - 用户资料页面统计数据显示修复

## 修改日期
2026/2/16

## 问题描述
用户资料页面显示错误：
- 完本书籍：0（实际有 2 本书）
- 参加赛季：0（实际参加了 2 个赛季）
- 累计 Ink：0（实际有 100+）
- 最高排名：空（没有排名字段）
- 赛季战绩：不显示具体排名

## 根本原因
1. `User` 表的 `booksWritten`、`seasonsJoined`、`totalInk` 字段默认值为 0，且没有在书籍创建/完成时自动更新
2. `Book` 表没有 `rank` 字段存储赛季排名
3. 前端直接读取 User 表字段，而非动态计算

## 修改内容

### 1. 数据库 Schema 修改
**文件：** `prisma/schema.prisma`
- 在 `Book` 模型中添加 `rank Int?` 字段用于存储赛季排名
- 执行 `npx prisma db push` 同步数据库

### 2. 用户服务层修改
**文件：** `src/services/user.service.ts`
- 新增 `getUserStats()` 方法，动态计算用户统计数据：
  - 完本书籍：从 Book 表查询 `status = 'COMPLETED'` 的数量
  - 参加赛季：从 Book 表查询 `seasonId != null` 的去重数量
  - 累计 Ink：从 Book 表查询 `inkBalance` 总和
  - 最高排名：从 Book 表查询 `rank` 字段最小值
- 修改 `getSeasonParticipations()` 方法，返回 `rank` 字段

### 3. 前端页面修改
**文件：** `src/app/profile/page.tsx`
- 调用 `getUserStats()` 获取动态计算的统计数据
- 复用数据，减少 API 调用次数
- 使用动态统计替换 User 表字段

### 4. 赛季卡片组件修改
**文件：** `src/components/profile/season-card.tsx`
- 添加 `rank` 字段到接口定义
- 在卡片中显示排名信息（如：第 X 名）

## 数据验证
通过测试脚本验证：
- 完本书籍: 2 ✓
- 参加赛季: 2 ✓
- 累计 Ink: 100 ✓
- 最高排名: undefined（rank 字段为 null，需要手动设置）

## 待处理
1. **Prisma Client 生成失败** - 由于 Windows 文件锁问题，`npx prisma generate` 失败。需要手动执行：
   ```bash
   npx prisma generate
   ```
2. **rank 字段初始化** - 现有数据的 rank 字段为 null，需要在赛季结束时自动更新或手动设置

## 影响范围
- 用户资料页面（/profile）
- 赛季战绩展示
- 统计数据展示

## 注意事项
- 统计数据现在从 Book 表动态计算，每次页面加载都会查询
- 排名字段需要管理员或系统赛季结束时更新
