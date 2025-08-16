# 任务-01（最高优先级）- 生产鉴权硬化与 DEV_MODE 下线

## 提示词（先读）
- 你的任务：将后端从开发态切换为可上线的鉴权策略，确保生产环境严格鉴权、DEV_MODE 仅在本地生效，并完成端到端验证。
- 严格要求：
  - 不允许在生产配置中出现 `DEV_MODE`。
  - 所有 `/api/*` 在无 JWT 时返回 401；有有效 JWT 时返回 200。
  - 只修改列出的文件；遵守现有代码风格；不得引入未使用依赖。
  - 修改后必须通过类型检查与端到端验证脚本。

## 执行步骤
1) 环境与 Secrets 配置
- Cloudflare（或 CI）注入：
  - `CLERK_SECRET_KEY=sk_test_UUiqpENbtdx9mH1kLmLHVwkpkdCfneSnDiIKgRoBcE`
  - `UPSTASH_REDIS_REST_URL="https://giving-antelope-48894.upstash.io"`
  - `UPSTASH_REDIS_REST_TOKEN="Ab7-AAIncDE3ODQxNDBiZDRiZDI0YzA4YWY4YjQxMmNkYTBiODBhNnAxNDg4OTQ"`
- 本地 `.dev.vars`：仅本地保留 `DEV_MODE="1"`，生产/预发一律不设置。

2) 配置与代码核查
- `apps/worker-api/wrangler.toml`：确认无 `DEV_MODE` 项（已移除）；D1/R2 绑定正确。
- `apps/worker-api/src/middlewares/auth.ts`：仅当 `c.env.DEV_MODE==='1'` 时注入 `dev-user`；其余走 Clerk 校验。
- `apps/worker-api/src/index.ts`：`app.use('/api/*', authMiddleware)` 在业务路由之前；`/api/health` 保留匿名。

3) 端到端验证（PowerShell）
```powershell
$base = "http://127.0.0.1:8787"
# 无 Authorization → 401（在关闭 DEV_MODE 的环境验证）
try { irm "$base/api/feed" } catch { $_.Exception.Response.StatusCode }
# 有 Authorization → 200（设置 DEV JWT 或真实 Clerk JWT）
$Headers = @{ Authorization = "Bearer <your_jwt>" }
irm "$base/api/feed" -Headers $Headers | ConvertTo-Json -Depth 6
```

4) 回滚与风险
- 若鉴权误配置导致 401：优先检查 `CLERK_SECRET_KEY` 与 JWT 来源；临时仅在本地启用 `DEV_MODE` 调试，严禁在预发/生产开启。

## 示例与要点
- `authMiddleware` 关键片段：
```ts
if (c.env?.DEV_MODE === '1') {
  (c as any).set('userId', 'dev-user');
  return next();
}
// 校验 Clerk JWT
const token = auth.slice('Bearer '.length);
const payload = await verifyToken(token, { secretKey: c.env.CLERK_SECRET_KEY } as any);
(c as any).set('userId', payload.sub);
```

- `.dev.vars` 示例（仅本地）：
```env
DEV_MODE="1"
CLERK_SECRET_KEY=sk_test_***
UPSTASH_REDIS_REST_URL=https://***.upstash.io
UPSTASH_REDIS_REST_TOKEN=***
```

## 验收清单
- 生产配置无 `DEV_MODE`；健康检查匿名可用，其它 `/api/*` 在无 JWT 时 401。
- 带 JWT 的请求 200 并返回数据。
- 类型检查通过；接口回归通过。
