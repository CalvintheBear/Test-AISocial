# 任务-02（高优先级）- R2 公网 URL/签名接入与缩略图链路

## 提示词（先读）
- 你的任务：为 R2 接入可配置的公网访问（或签名 URL），并打通上传→缩略图生成→列表展示 `thumbUrl` 的闭环。
- 严格要求：
  - 新增/使用 `R2_PUBLIC_UPLOAD_BASE`、`R2_PUBLIC_AFTER_BASE`，或实现签名 URL 方法（择一）。
  - `/upload` 返回应包含 `originalUrl/thumbUrl`，前端列表/详情正确渲染。
  - 保持类型安全与现有风格；通过类型检查与回归。

## 执行步骤
1) 公网访问策略
- 方案 A（快速）：配置自定义域，使用 `R2_PUBLIC_*` 拼接 URL。
- 方案 B（安全）：实现 `getSignedUrl(bucket, key, ttl)`，返回限时读链接；需 Workers 私有签名逻辑。

2) 代码改动
- `apps/worker-api/src/services/r2.ts`
  - 已支持 `R2_PUBLIC_UPLOAD_BASE`/`R2_PUBLIC_AFTER_BASE`；如选 B，新增 `getSignedUrl` 并在 `putObject/getPublicUrl` 中接入。
- `apps/worker-api/src/routers/artworks.ts`
  - `/upload`：写入 D1 后，`originalUrl` 用 upload 域，`thumbUrl` 可先与原图一致；后续由 Cron 生成后更新。
- `wrangler.toml`
  - 注明需要的 `vars`（生产：通过 secrets/env 注入）。

3) 缩略图链路（占位实现）
- Cron 任务扫描最近 `published` 或一个待处理队列，生成缩略图写入 `after` 桶；更新 D1 的 `url_thumb`（若要持久化）。

## 示例代码片段
- 读取公网 URL：
```ts
const r2 = R2Service.fromEnv(c.env)
const { key, url } = await r2.putObject('upload', fileName, await file.arrayBuffer(), contentType)
const publicOriginal = await r2.getPublicUrl('upload', key)
```
-（可选）签名 URL：
```ts
// 伪代码
await r2.getSignedUrl('after', key, 3600)
```

## 验收清单
- `/upload` 返回 `originalUrl` 正确；`thumbUrl` 与前端展示一致。
- 若配置公网域：`R2_PUBLIC_*` 生效；若签名 URL：在无权限对象上也可在 TTL 内读取。
- 类型检查与端到端回归通过。
