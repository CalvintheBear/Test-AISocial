# 任务-03（高优先级）- 响应格式与错误码统一

## 提示词（先读）
- 你的任务：将所有接口的响应约定统一为“直返数据”或“{ success, data }”二选一，并规范错误码与错误体。
- 严格要求：
  - 与前端约定一致（当前前端更偏向直返数据），本任务推荐统一为“直返数据 + 标准错误 { code, message }”。
  - 不改变现有字段名与类型；仅调整包装与错误格式。
  - 修改后必须通过类型检查与端到端回归。

## 执行步骤
1) 统一策略
- 数据接口（feed、users/:id/artworks、artworks/:id、users/:id/favorites）：直返数据。
- 操作接口（like/favorite/publish）：改为直返数据或保留 `{ success, data }` 二选一。若保留，请在文档与前端注明。
- 错误体：统一 `{ code, message }`，由 `errorMiddleware` 产生；校验错误返回 400。

2) 代码改动点
- `apps/worker-api/src/utils/response.ts`：若不再需要 `ok/fail`，可清理；或仅内部使用但不对外暴露包装。
- `apps/worker-api/src/routers/*.ts`：按策略调整 `return c.json(...)`。确保前端调用处不受影响。

3) 示例
```ts
// 数据直返
return c.json(items)
// 错误
return c.json({ code: 'NOT_FOUND', message: 'Artwork not found' }, 404)
```

## 验收清单
- 所有 GET 接口直返数据；错误统一 `{ code, message }`。
- 操作接口按约定一致（全直返或全包装），与文档/前端一致。
- 类型检查与端到端回归通过。
