# AI Social - Monorepo 指南（2025）

面向开发与部署的最新说明，覆盖本地运行、环境变量、API 列表与上线流程。

## 目录结构
- 前端：`apps/web`（Next.js 14）
- 后端：`apps/worker-api`（Cloudflare Workers + Hono + D1 + Upstash Redis + R2）

## 先决条件
- Node.js 18+（建议 20+）
- npm 9+
- Cloudflare 账号（Workers、D1、R2 权限）
- Upstash Redis 实例
- 可选：Clerk（用户鉴权）

## 快速开始（本地）
```bash
# 安装依赖（在仓库根目录）
npm install

# 启动后端（Cloudflare Workers，本地端口默认 8787）
npm run api:dev

# 启动前端（Next.js，默认 3000）
npm run dev
```

前端默认通过 `process.env.NEXT_PUBLIC_API_BASE_URL` 指向后端；未设置时回退到 `http://127.0.0.1:8787`。

## 环境变量

### 前端（`apps/web/.env.local`）
```env
# 站点基础地址（用于 SEO、URL 拼接）
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# API 基础地址（Cloudflare Worker 或本地 wrangler dev）
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8787

# 可选：Clerk 浏览器端 PUBLISHABLE KEY（存在则启用 `ClientProviders`）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx

# 可选：Clerk 自定义 JWT 模板名（用于获取 session token）
NEXT_PUBLIC_CLERK_JWT_TEMPLATE=jwt-template

# 开发期的后端鉴权 Token 回退（无 Clerk 时）
NEXT_PUBLIC_DEV_JWT=dev-token
```

前端代码中相关位置：
- `apps/web/app/layout.tsx` 读取 `NEXT_PUBLIC_SITE_URL`、`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `apps/web/lib/api/client.ts` 读取 `NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_DEV_JWT`、`NEXT_PUBLIC_CLERK_JWT_TEMPLATE`

### 后端（`apps/worker-api/.dev.vars` 本地；生产请用 Secrets）
```env
# 开发模式：为本地与公共 GET 放宽校验（仅开发环境）
DEV_MODE=1

# 允许的前端域（CORS）
ALLOWED_ORIGIN=http://localhost:3000

# Clerk（任选其一：Issuer/JWKS 或 Secret Key）
CLERK_ISSUER=https://<your>.clerk.accounts.dev
CLERK_JWKS_URL=https://<your>.clerk.accounts.dev/.well-known/jwks.json
# 或
CLERK_SECRET_KEY=sk_test_xxx

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://<id>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>

# R2 公网访问（可选）
R2_PUBLIC_UPLOAD_BASE=https://...
R2_PUBLIC_AFTER_BASE=https://...
```

wrangler 绑定与 D1 配置见 `apps/worker-api/wrangler.toml`。

## 数据库（D1）迁移
```bash
cd apps/worker-api

# 关联 wrangler.toml 中的 D1 数据库后执行（首次/变更时）
wrangler d1 migrations apply test-d1

# 验证
wrangler d1 execute test-d1 --command "SELECT name FROM sqlite_master WHERE type='table'"
```

## 本地开发命令
根目录脚本（来自 `package.json`）：
- `npm run dev`：启动前端（`apps/web`）
- `npm run build`：构建前端
- `npm run start`：生产模式启动前端
- `npm run api:dev`：启动 Worker 本地开发（`apps/worker-api`）
- `npm run api:deploy`：部署 Worker（wrangler deploy）

## API 一览

### 健康与工具
- `GET /api/health`：健康检查
- `GET /api/redis/ping`：Redis 连接测试

### Feed 与用户内容
- `GET /api/feed`：获取推荐流（支持 `limit`）
- `GET /api/users/:id/profile`：用户资料
- `GET /api/users/:id/artworks`：用户作品列表（本人含草稿）
- `GET /api/users/:id/favorites`：用户收藏列表
- `GET /api/users/:id/likes`：用户点赞列表
- `GET /api/users/me`、`POST /api/users/me/privacy`：当前用户信息与隐私设置

### 作品与互动
- `GET /api/artworks/:id`：作品详情
- `POST /api/artworks/upload`：上传作品（R2）
- `POST /api/artworks/:id/like` / `DELETE /api/artworks/:id/like`
- `POST /api/artworks/:id/favorite` / `DELETE /api/artworks/:id/favorite`
- `POST /api/artworks/:id/publish` / `POST /api/artworks/:id/unpublish`
- `GET /api/artworks/:id/state`、`POST /api/artworks/batch/state`
- `GET /api/artworks/:id/hot-data`、`POST /api/artworks/batch/hot-data`

### 热度（Hotness）
- `GET /api/hotness/trending`（支持 `category`, `limit`, `offset`）
- `GET /api/hotness/trending/:timeWindow`（`1h|6h|24h|7d|30d`）
- `GET /api/hotness/:id`（含详情与分解）
- `GET /api/hotness/rank`、`POST /api/hotness/refresh`
- `POST /api/hotness/sync/:id`、`POST /api/hotness/sync-batch`

统一响应：大多数接口返回 `{ success, data }`，过渡期仍兼容裸 `data`。

## 部署

### 后端（Cloudflare Workers）
```bash
cd apps/worker-api

# 设置生产 Secrets（Cloudflare Dashboard 或 CLI）
wrangler secret put CLERK_SECRET_KEY
wrangler secret put UPSTASH_REDIS_REST_TOKEN

# 如使用 Issuer/JWKS：
wrangler secret put CLERK_ISSUER
wrangler secret put CLERK_JWKS_URL

# 部署
npm run api:deploy
```

`wrangler.toml` 中已启用 `compatibility_flags = ["nodejs_compat"]`，并配置了 D1、R2 绑定与可选路由。

### 前端（Next.js）
```bash
cd apps/web
npm run build

# 选项 A：Vercel（推荐 Next.js 原生）
vercel --prod

# 选项 B：Cloudflare Pages（需按官方指引接入 Next-on-Pages）
# 本仓库未内置 CI；如需 Pages，请在项目设置中：
# - 构建命令：npm --workspace apps/web run build
# - 输出目录：.next（或按 next-on-pages 要求配置）
```

提示：当前仓库未包含 GitHub Actions 工作流文件，若需 CI/CD 请自行添加。

## 故障排查
- 4xx/5xx：确认 `NEXT_PUBLIC_API_BASE_URL` 指向正确的 Worker；查看 `wrangler tail` 日志
- 鉴权失败：本地可将 `DEV_MODE=1`；生产务必关闭，并配置 Clerk（Issuer/JWKS 或 Secret Key）
- CORS：确认 Worker 返回的 `Access-Control-Allow-Origin` 包含前端域（参考 `ALLOWED_ORIGIN`）
- R2 上传失败：检查绑定名与权限；确认 `R2_PUBLIC_UPLOAD_BASE` 正确
- D1 连接：核对 `wrangler.toml` 的 `database_id` 并完成 migrations

## 常用脚本（workspace 根目录）
```bash
npm run dev          # 前端开发
npm run build        # 前端构建
npm run start        # 前端生产启动
npm run api:dev      # 后端本地（wrangler dev）
npm run api:deploy   # 后端部署（wrangler deploy）
```

## 备注
- 页面运行时：部分页面在 Node.js 运行时下服务端拉取数据以兼容鉴权与构建限制
- 未来计划：缩略图生成 cron、监控与告警、缓存策略细化等（以代码为准）


