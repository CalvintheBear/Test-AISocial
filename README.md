# AI Social - 开发运行说明（生产化验证版）

## 下一步落地短清单（Roadmap - Next）
- [ ] 接入 Clerk（前后端联通）：前端获取 JWT 注入 `authFetch`；后端使用 `@clerk/backend` 校验并关闭生产 DEV_MODE
- [ ] 缩略图生成链路：Cron 任务 + Image Resizing，生成写入 R2_AFTER，并回填 D1 `thumb_url`，刷新缓存
- [ ] 统一响应格式与错误码：采用 `{ success, data, code }`，并在中间件中统一错误体、结构化日志
- [ ] 缓存策略调优：Feed 与用户列表 TTL 策略细化、按 Key 失效与批量清理，完善一致性检查脚本
- [ ] 监控与告警：请求耗时、错误率、R2/Redis/D1 可用性与配额；关键操作审计日志
- [ ] 前端体验优化：骨架屏/占位图、错误边界、移动端适配、i18n（可选）

## 目录
- 前端：`apps/web`（Next.js 14 + Clerk）
- 后端：`apps/worker-api`（Cloudflare Workers + Hono + D1 + Upstash Redis + R2）

## 快速开始

### 1. 环境准备

#### 前端环境
复制环境变量示例并配置：
```bash
cp apps/web/.env.local.example apps/web/.env.local
# 编辑 apps/web/.env.local 填入实际值
```

#### 后端环境
复制开发环境变量：
```bash
cp apps/worker-api/.dev.vars.example apps/worker-api/.dev.vars
# 编辑 apps/worker-api/.dev.vars 填入实际值
```

#### 数据库迁移
```bash
# 创建D1数据库（首次）
cd apps/worker-api
wrangler d1 migrations apply test-d1

# 验证表结构
wrangler d1 execute test-d1 --command "SELECT * FROM sqlite_master WHERE type='table'"
```

### 2. 本地开发

#### 启动后端（Cloudflare Workers）
```bash
# 安装Worker依赖（首次）
npm --workspace apps/worker-api install

# 启动开发服务器
npm run api:dev
# 或：npm --workspace apps/worker-api run dev
```

#### 启动前端（Next.js）
```bash
# 启动前端开发服务器
npm run dev
# 或：npm --workspace apps/web run dev
```

### 3. 生产部署

#### Cloudflare Workers部署
```bash
cd apps/worker-api

# 设置生产环境密钥
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put CLERK_SECRET_KEY

# 部署到Cloudflare
npm run api:deploy
```

#### Next.js部署到Vercel/Cloudflare Pages
```bash
# 构建应用
npm run build

# Vercel部署
vercel --prod

# 或Cloudflare Pages部署
wrangler pages deploy apps/web/.next/static --project-name=ai-social-web
```

### CI/CD（GitHub Actions）

已新增工作流：`.github/workflows/deploy.yml`，自动构建并部署。

- 必需仓库 Secrets：
  - `CLOUDFLARE_API_TOKEN`（含 Workers Scripts:Edit 与 Pages:Edit 权限）
  - `CLOUDFLARE_ACCOUNT_ID`
  - `GITHUB_TOKEN`（默认内置）。若出现 403 `Resource not accessible by integration`，需在 workflow 顶部声明：

```
permissions:
  contents: read
  deployments: write
```

- 流程：
  - 构建 `apps/web` → 运行 `@cloudflare/next-on-pages` 预构建 → 使用 `cloudflare/pages-action@v1` 部署到 Pages
  - 使用 `cloudflare/wrangler-action@v3` 在 `apps/worker-api` 中执行 `wrangler deploy`

### Cloudflare Pages（前端）与 Workers（后端）联动部署指南

> 已将以下页面改为动态渲染并使用 Node.js 运行时，适配 Cloudflare 平台：`/feed`、`/artwork/[id]/[slug]`、`/user/[username]`。

#### 1) 前端（Cloudflare Pages）环境变量（apps/web）

在 Cloudflare Pages 项目的 Settings → Environment Variables 中配置：

```
NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.com
NEXT_PUBLIC_API_BASE_URL=https://your-worker-subdomain.workers.dev
# 可选：开发/预发时用于后端鉴权的临时 Token（若未集成 Clerk 时）
NEXT_PUBLIC_DEV_JWT=dev-token
# 可选：使用前端静态 mock 数据（本地调试或 API 未就绪时）
NEXT_PUBLIC_USE_MOCK=0
```

注意：
- 这些变量在 `apps/web/lib/api/client.ts` 中用于将 `API.feed` 等相对路径拼接为完整后端地址；`/mocks/` 则使用 `NEXT_PUBLIC_SITE_URL`.
- `app/layout.tsx` 中的 `metadataBase` 也使用 `NEXT_PUBLIC_SITE_URL`，建议配置为你的正式域名。

#### 2) 后端（Cloudflare Workers）部署与变量（apps/worker-api）

在 `apps/worker-api` 目录下：

```bash
# 本地开发
npm --workspace apps/worker-api run dev

# 部署
npm --workspace apps/worker-api run deploy
```

必须配置的 Secrets/Vars（可在 Cloudflare Dashboard → Workers → your worker → Settings 中设置）：

```
CLERK_SECRET_KEY=sk_live_...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
# 如需 R2，按需配置以下变量
R2_PUBLIC_UPLOAD_BASE=...
R2_PUBLIC_AFTER_BASE=...
```

#### 3) CORS 与网络

- 若前端域与 Worker 子域不同，请在 Worker 侧确保响应头包含允许的 CORS 头（如 `Access-Control-Allow-Origin: https://your-frontend-domain.com`）。
- 推荐将前端与后端放在同一主域/子域下，以减少跨域复杂度。

#### 4) 运行时与页面策略

- 已为以下页面设置：
  - `apps/web/app/feed/page.tsx`: `dynamic = 'force-dynamic'`, `revalidate = 0`, `runtime = 'nodejs'`
  - `apps/web/app/artwork/[id]/[slug]/page.tsx`: 同上
  - `apps/web/app/user/[username]/page.tsx`: 同上
- 目的：避免在构建阶段预取 API，改为在运行时（Node.js）服务端拉取，兼容 Clerk 在 Node 环境对 `fs/path` 的依赖。

注意：如果后续切回 Edge 运行时，需要移除对 `@clerk/nextjs` 的直接依赖或使用专为 Edge 环境的 Clerk 变体，并确保任何 Node 内置模块（如 `fs`/`path`）不被引入到 Edge 构建。

#### 5) 常见问题排查（Cloudflare）

- 构建时报 `Invalid URL`：请确认未在构建期使用 `new URL('/api/...')`，并确保上述页面为动态渲染；前端通过 `authFetch(API.xxx)` 发起请求。
- Edge 运行时报 `fs/path` 模块找不到：将页面 `runtime` 设为 `nodejs`（已处理）。
- 请求 4xx/5xx：检查 `NEXT_PUBLIC_API_BASE_URL` 是否正确指向 Worker，检查 Worker 日志 `wrangler tail`。


## 环境配置

### 必需服务
1. **Cloudflare账户**：Workers、D1、R2服务
2. **Upstash Redis**：缓存和计数器
3. **Clerk**：用户鉴权服务

### 环境变量说明

#### 前端变量 (`apps/web/.env.local`)
```
NEXT_PUBLIC_SITE_URL=https://cuttingasmr.org
NEXT_PUBLIC_USE_MOCK=0           # 0=真实API，1=mock数据
NEXT_PUBLIC_DEV_JWT=dev-token    # 开发环境JWT（未接 Clerk 前）
NEXT_PUBLIC_API_BASE_URL=https://your-worker-subdomain.workers.dev
```

#### 后端变量 (`apps/worker-api/.dev.vars`)
```
# Clerk配置
CLERK_SECRET_KEY=sk_live_...
CLERK_ISSUER=https://<your>.clerk.accounts.dev
CLERK_JWKS_URL=https://<your>.clerk.accounts.dev/.well-known/jwks.json

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# R2 公网访问（可选）
R2_PUBLIC_UPLOAD_BASE=https://...
R2_PUBLIC_AFTER_BASE=https://...

# 允许的前端域（CORS）
ALLOWED_ORIGIN=https://cuttingasmr.org

# 开发模式
DEV_MODE=1
```

### 数据库结构
```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  profile_pic TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- 作品表（包含完整元数据字段）
CREATE TABLE artworks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  url TEXT NOT NULL,
  thumb_url TEXT,
  slug TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft','published')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  published_at INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  prompt TEXT,
  model TEXT,
  seed INTEGER
);

-- 点赞表
CREATE TABLE artworks_like (
  user_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artwork_id)
);

-- 收藏表
CREATE TABLE artworks_favorite (
  user_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artwork_id)
);
```

## API接口

### 认证接口
- `GET /api/health` - 健康检查
- `GET /api/redis/ping` - Redis连接测试

### 核心接口
- `GET /api/feed` - 获取推荐流
- `GET /api/users/:id/artworks` - 获取用户作品
- `GET /api/users/:id/favorites` - 获取用户收藏
- `GET /api/artworks/:id` - 获取作品详情
- `POST /api/artworks/upload` - 上传作品
- `POST /api/artworks/:id/like` - 点赞作品
- `DELETE /api/artworks/:id/like` - 取消点赞
- `POST /api/artworks/:id/favorite` - 收藏作品
- `DELETE /api/artworks/:id/favorite` - 取消收藏
- `POST /api/artworks/:id/publish` - 发布作品

## 开发测试

### 后端测试
```bash
# 健康检查
curl http://localhost:8787/api/health

# 获取推荐流
curl http://localhost:8787/api/feed

# 上传测试（需要JWT令牌）
curl -H "Authorization: Bearer your-jwt-token" \
     -F "file=@test.jpg" \
     -F "title=测试作品" \
     http://localhost:8787/api/artworks/upload
```

### 前端测试
```bash
# 启动开发服务器
npm run dev

# 访问测试页面
open http://localhost:3000/feed
open http://localhost:3000/user/demo-user
open http://localhost:3000/artwork/test-id/test-slug
```

## 故障排查

### 常见问题
1. **D1连接失败**：检查wrangler.toml中的database_id
2. **Redis连接失败**：验证UPSTASH_REDIS_REST_TOKEN
3. **Clerk认证失败**：检查CLERK_SECRET_KEY和issuer配置
4. **R2上传失败**：检查R2 bucket名称和权限

### 调试模式
- 设置`DEV_MODE=1`可跳过Clerk验证
- 设置`NEXT_PUBLIC_USE_MOCK=1`使用前端mock数据
- 查看Worker日志：`wrangler tail`

