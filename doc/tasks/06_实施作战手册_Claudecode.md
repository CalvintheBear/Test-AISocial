# 06｜实施作战手册（面向 ClaudeCode）

> 目标：将 Roadmap「下一步落地短清单」逐项落地。文档提供点对点操作步骤、命令脚本与可直接粘贴的示例代码片段。按章节顺序执行即可，建议逐项提交 PR，便于回滚与回归。

---

## 目录
- [A. 接入 Clerk（前后端联通）](#a-接入-clerk前后端联通)
- [B. 缩略图生成链路（Cron + Resizing + 回填 thumb_url + 刷新缓存）](#b-缩略图生成链路cron--resizing--回填-thumb_url--刷新缓存)
- [C. 统一响应与错误码（含结构化日志）](#c-统一响应与错误码含结构化日志)
- [D. 缓存策略调优（TTL/按键失效/一致性脚本）](#d-缓存策略调优ttl按键失效一致性脚本)
- [E. 监控与告警（耗时、错误率、服务可用性）](#e-监控与告警耗时错误率服务可用性)
- [F. 前端体验优化（骨架屏/错误边界/移动适配/i18n）](#f-前端体验优化骨架屏错误边界移动适配i18n)

---

## A. 接入 Clerk（前后端联通）

### 目标
- 前端通过 `@clerk/nextjs` 获取 JWT，并由 `authFetch` 自动注入 `Authorization: Bearer <token>`。
- 后端 `authMiddleware` 使用 `@clerk/backend` 校验 JWT。生产环境关闭 `DEV_MODE`。

### 步骤
1) 安装依赖（前端）：
```bash
npm --workspace apps/web i @clerk/nextjs
```

2) 前端注入 Provider（示例）
在 `apps/web/app/layout.tsx`（如不存在则对应顶层布局）加入：
```tsx
// apps/web/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="zh-CN">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

3) 前端获取 Token（authFetch 已兼容）
`apps/web/lib/api/client.ts` 已尝试动态 `require('@clerk/nextjs')` 并使用 `auth().getToken()`；确保设置：
```env
# apps/web/.env.local
NEXT_PUBLIC_USE_MOCK=0
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8787
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

4) 后端校验 Clerk JWT（已具备）
`apps/worker-api/src/middlewares/auth.ts` 关键片段（无需改动或按需增强）
```ts
import { verifyToken } from '@clerk/backend'

export async function authMiddleware(c: Context, next: Next) {
  if (c.env?.DEV_MODE === '1') { (c as any).set('userId', 'dev-user'); return next() }
  const auth = c.req.header('authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ code: 'AUTH_REQUIRED', message: 'Authorization header required' }, 401)
  const token = auth.slice('Bearer '.length)
  try {
    const payload = await verifyToken(token, { secretKey: c.env.CLERK_SECRET_KEY } as any)
    ;(c as any).set('userId', payload.sub)
    return next()
  } catch {
    return c.json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' }, 401)
  }
}
```

5) 配置 Secrets（生产）：
```bash
cd apps/worker-api
wrangler secret put CLERK_SECRET_KEY
```

6) 验证（关闭 DEV_MODE）：
```powershell
$base = "http://127.0.0.1:8787"
try { irm "$base/api/feed" } catch { $_.Exception.Response.StatusCode }   # 预期 401
# 携带有效 Clerk JWT 后应 200
```

---

## B. 缩略图生成链路（Cron + Resizing + 回填 thumb_url + 刷新缓存）

### 目标
- 通过 Cron 定期扫描最近发布的作品或待处理队列，从 R2_UPLOAD 读取原图，生成缩略图写入 R2_AFTER，更新 D1 的 `thumb_url`，并失效相关缓存。

### 步骤
1) 启用 Cron（`wrangler.toml` 已有占位）：
```toml
[triggers]
crons = ["*/15 * * * *"]
```

2) 新增调度入口：
```ts
// apps/worker-api/src/scheduled.ts
import { D1Service } from './services/d1'
import { R2Service } from './services/r2'
import { RedisService } from './services/redis'

export interface Env extends Record<string, unknown> {}

export default {
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    const d1 = D1Service.fromEnv(env)
    const r2 = R2Service.fromEnv(env)
    const redis = RedisService.fromEnv(env)

    // 1. 取最近发布的若干作品（可扩展为 feed_queue）
    const recent = await d1.listFeed(50)

    for (const art of recent) {
      const key = art.url.split('/').slice(-1)[0] // 简化示例：从 URL 取 key
      // 2. 获取原图（若后续改为私有读，可通过签名或 Workers 代理读取）
      const original = await r2.getObject('upload', key)
      if (!original) continue

      // 3. 使用 Image Resizing 生成缩略图（示例：宽 512）
      const arrayBuf = await original.arrayBuffer()
      const resized = await fetch('https://imaging.worker', {
        method: 'POST',
        body: arrayBuf,
        // 说明：若使用 Cloudflare Image Resizing，可通过 fetch + cf.image 选项（需路由到静态资源）。
        // 这里提供占位实现，实际项目可改为调用专用服务或在同 Worker 内部转发。
      })
      const resizedBuf = await resized.arrayBuffer()

      // 4. 写入 R2_AFTER，并获取公网 URL
      const { key: thumbKey, url: thumbUrl } = await r2.putObject('after', key, resizedBuf, 'image/webp')

      // 5. 回填 D1 并失效缓存
      await d1.updateThumbUrl(art.id, thumbUrl)
      await redis.invalidateArtworkCache(art.id)
    }
  }
}
```

3) 在 `apps/worker-api/src/index.ts` 导出 `scheduled`（模块化 Worker 支持多导出）：
```ts
// apps/worker-api/src/index.ts（片段）
import scheduler from './scheduled'
export const scheduled = scheduler.scheduled
```

4) D1 服务新增回填方法：
```ts
// apps/worker-api/src/services/d1.ts（追加）
export class D1Service {
  // ...existing code...
  async updateThumbUrl(artworkId: string, thumbUrl: string): Promise<void> {
    const stmt = this.db.prepare(`UPDATE artworks SET thumb_url = ? WHERE id = ?`)
    await stmt.bind(thumbUrl, artworkId).run()
  }
}
```

5) 验证要点：
- `/api/artworks/upload` 返回的 `thumbUrl` 初始与原图一致；Cron 后应变成 R2_AFTER 公网地址。
- Feed/用户列表与详情返回的 `thumbUrl` 与 `D1Service` 读取一致。

---

## C. 统一响应与错误码（含结构化日志）

### 目标
- 所有 API 返回 `{ success, data?, code?, message? }` 格式；错误通过中间件统一捕获与格式化；日志为结构化 JSON。

### 步骤
1) 响应工具（已有雏形，可强化类型）：
```ts
// apps/worker-api/src/utils/response.ts
export type ApiOk<T> = { success: true; data: T }
export type ApiFail = { success: false; code: string; message: string }
export const ok = <T>(data: T): ApiOk<T> => ({ success: true, data })
export const fail = (code: string, message: string): ApiFail => ({ success: false, code, message })
```

2) 错误中间件升级为 envelope：
```ts
// apps/worker-api/src/middlewares/error.ts（核心片段）
import { fail } from '../utils/response'
export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next()
    if (c.res.status === 404) return c.json(fail('NOT_FOUND', 'Endpoint not found'), 404)
  } catch (err: any) {
    const code = err?.code || 'INTERNAL_ERROR'
    const message = err?.message || 'Internal server error'
    const status = err?.status || 500
    console.error(JSON.stringify({ level: 'error', code, message, url: c.req.url, method: c.req.method, ts: Date.now() }))
    return c.json(fail(code, message), status)
  }
}
```

3) 路由返回统一包裹（示例：点赞/取消点赞）：
```ts
// apps/worker-api/src/routers/artworks.ts（片段）
import { ok } from '../utils/response'

router.post('/:id/like', async (c) => {
  // ... existing like logic ...
  return c.json(ok({ likeCount, isLiked: true }))
})

router.delete('/:id/like', async (c) => {
  // ... existing unlike logic ...
  return c.json(ok({ likeCount, isLiked: false }))
})
```

4) 前端兼容处理（示例）：
```ts
// apps/web/lib/api/client.ts（调用处）
const data = await res.json()
return data?.success ? data.data : data // 兼容直返与 envelope 过渡期
```

---

## D. 缓存策略调优（TTL/按键失效/一致性脚本）

### 目标
- 为 Feed 与用户列表缓存引入分层 TTL；完善按键失效；提供一致性检查/修复脚本（已存在雏形）。

### 步骤
1) 统一 Key 策略与 TTL 常量：
```ts
// apps/worker-api/src/services/redis.ts（片段）
const TTL = {
  feed: 600,
  userArtworks: 600,
  userFavorites: 600,
}
// setFeed / setUserArtworks / setUserFavorites 使用对应 TTL
```

2) 失效策略扩展（发布、点赞、收藏触发）：
```ts
await redis.invalidateFeed()
await redis.invalidateUserArtworks(userId)
await redis.invalidateUserFavorites(userId)
```

3) 一致性检查与修复（已提供脚本，可补充命令别名）：
```json
// apps/worker-api/package.json（scripts 片段）
{
  "scripts": {
    "consistency-check": "node src/scripts/consistency-check.js",
    "consistency-check:fix": "node src/scripts/consistency-check.js --fix"
  }
}
```

---

## E. 监控与告警（耗时、错误率、服务可用性）

### 目标
- 以最小改动接入结构化日志，结合 Cloudflare Logs/Analytics 查看；后续可接入 Sentry/Logtail。

### 步骤
1) 结构化日志方法：
```ts
// apps/worker-api/src/middlewares/logger.ts（片段）
export async function loggerMiddleware(c: Context, next: Next) {
  const start = Date.now()
  const { method, url } = c.req
  await next()
  const duration = Date.now() - start
  console.log(JSON.stringify({ level: 'info', method, url, status: c.res.status, duration, ts: Date.now() }))
}
```

2) 最小化告警建议：
- 对 `/api/health` 与 `/api/redis/ping` 建立外部心跳监测。
- 统计 5xx 比例与 P95/P99 耗时（后续接入 APM）。

---

## F. 前端体验优化（骨架屏/错误边界/移动适配/i18n）

### 目标
- 在不影响主要链路的前提下，加入用户感知明显的体验优化。

### 步骤与示例
1) 骨架屏：
```tsx
// apps/web/components/ui/skeleton.tsx 已存在，可在页面使用：
export function FeedSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-64 rounded-lg bg-[var(--color-bg-muted)] animate-pulse" />
      ))}
    </div>
  )
}
```

2) 错误边界（客户端）：
```tsx
// apps/web/app/error.tsx（示例）
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <h2>出错了</h2>
      <pre className="text-sm opacity-70">{error.message}</pre>
      <button onClick={() => reset()} className="mt-4">重试</button>
    </div>
  )
}
```

3) 移动端自适应：统一断点与图片占位（略，参照 Tailwind 响应式栅格）。

---

## 提交与验收

### 提交流程
- 每个主题（A-F）独立 PR：包含代码变更、文档更新、测试脚本或说明。
- 严格通过类型检查与基础回归脚本（PowerShell/手动 curl）。

### 基础验收脚本（示例）
```powershell
# 无 Authorization → 401（在关闭 DEV_MODE 的环境验证）
try { irm "http://127.0.0.1:8787/api/feed" } catch { $_.Exception.Response.StatusCode }

# 带 JWT → 200（使用 Clerk JWT）
$Headers = @{ Authorization = "Bearer <your_jwt>" }
irm "http://127.0.0.1:8787/api/feed" -Headers $Headers | ConvertTo-Json -Depth 6

# 上传
Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/artworks/upload" -Headers $Headers -Method Post -InFile "./test.jpg" -ContentType "multipart/form-data"
```

---

## 附：常见问题（FAQ）
- 本地无 Upstash：确保 `DEV_MODE=1`，Redis 自动内存回退；生产/预发禁止启用 DEV。
- R2 公网 URL：在 `wrangler.toml` 或 Secrets 中配置 `R2_PUBLIC_*`；若需私有读，改为签名 URL 或 Workers 代理读取。
- 缩略图策略：首版简单生成单尺寸（如 512px 宽），后续可扩展多尺寸与自适应格式（WebP/AVIF）。


