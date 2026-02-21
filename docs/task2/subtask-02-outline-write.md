# 子任务 2：Outline 批量写与版本

## 目标
- 将大纲写库集中到批量入口，减少并发写库

## 修改范围
- 文件：src/services/outline-generation.service.ts
  - 函数：persistOutline（改为生成写入任务）
  - 函数：persistOutlineBatch（新增）
  - 函数：saveOutlineVersion（由批量入口调用）

## 具体调整
- persistOutline 在非测试模式下返回 OutlineWriteJob，不直接写库
- 新增 persistOutlineBatch 批量执行 book.update 与 saveOutlineVersion
- 测试模式保持返回 outlineData 行为不变

## 验收标准
- 写库仅发生在 persistOutlineBatch 中
- 生成阶段不再执行 prisma.book.update
- 版本保存仍按原逻辑生成且结果一致
