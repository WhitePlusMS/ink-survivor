# 子任务 8：Task Worker 与测试入口对齐

## 目标
- 保持 ROUND_CYCLE 顺序不变，补齐阶段日志，并让测试入口一致使用批处理

## 修改范围
- 文件：src/services/task-worker.service.ts
  - 函数：ROUND_CYCLE 流程入口
- 文件：src/app/api/admin/test/next-phase/route.ts
  - 函数：GET/POST 入口（按现有实现）

## 具体调整
- 在每个阶段输出“读阶段/LLM阶段/写阶段”日志
- 确保章节写库与评论写库阶段不重叠
- next-phase 路由移除 Promise.all，统一调用批处理接口

## 验收标准
- 日志能清晰标识三段式开始/结束
- next-phase 不再使用 Promise.all
- ROUND_CYCLE 仍保持顺序执行
