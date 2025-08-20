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

## 快速开始

### 本地开发
```bash
# 安装依赖（在仓库根目录）
npm install

# 启动后端（Cloudflare Workers，本地端口默认 8787）
npm run api:dev

# 启动前端（Next.js，默认 3000）
npm run dev
```

### 生产部署（快速版）
```bash
# 1. 设置密钥（一次性）
wrangler secret put KIE_API_KEY --name ai-social-api
wrangler secret put UPSTASH_REDIS_REST_URL --name ai-social-api
wrangler secret put UPSTASH_REDIS_REST_TOKEN --name ai-social-api
wrangler secret put CLERK_SECRET_KEY --name ai-social-api
wrangler secret put ADMIN_TOKEN --name ai-social-api

# 2. 部署后端
wrangler deploy --name ai-social-api

# 3. 配置前端环境变量并部署到Cloudflare Pages
```

**详细部署指南请查看下方 [部署](#部署) 章节**

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

#### 1. 设置敏感环境变量（必需）
```bash
cd apps/worker-api

# 设置 KIE API 密钥
wrangler secret put KIE_API_KEY --name ai-social-api
# 系统会提示输入，输入你的KIE API密钥后按回车

# 设置 Redis 连接信息
wrangler secret put UPSTASH_REDIS_REST_URL --name ai-social-api
# 输入你的Upstash Redis REST URL

wrangler secret put UPSTASH_REDIS_REST_TOKEN --name ai-social-api
# 输入你的Upstash Redis REST Token

# 设置 Clerk 密钥
wrangler secret put CLERK_SECRET_KEY --name ai-social-api
# 输入你的Clerk Secret Key

# 设置管理员令牌
wrangler secret put ADMIN_TOKEN --name ai-social-api
# 输入你生成的管理员令牌（自定义生成）
```

#### 2. 生成管理员令牌
```bash
# 使用PowerShell生成（示例）
$token = "admin_2024_ai_social_" + (-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object {[char]$_}))
echo $token
# 输出示例：admin_2024_ai_social_Kj8mN2pQ9xR5vY7
```

#### 3. 应用数据库迁移
```bash
# 应用KIE相关数据库迁移
wrangler d1 execute test-d1 --file=./migrations/003_add_kie_fields.sql --remote
```

#### 4. 部署Worker
```bash
# 部署到生产环境
wrangler deploy --name ai-social-api

# 验证部署状态
wrangler deployments list
```

#### 5. 验证配置
```bash
# 查看所有已设置的密钥
wrangler secret list --name ai-social-api

# 应该看到5个密钥：
# - ADMIN_TOKEN
# - CLERK_SECRET_KEY
# - KIE_API_KEY
# - UPSTASH_REDIS_REST_TOKEN
# - UPSTASH_REDIS_REST_URL
```

### 前端（Cloudflare Pages）

#### 1. 环境变量配置
在Cloudflare Pages的项目设置中添加以下环境变量：

**纯文本变量：**
```env
CLERK_ISSUER=https://clerk.cuttingasmr.org
CLERK_JWKS_URL=https://clerk.cuttingasmr.org/.well-known/jwks.json
CLERK_JWT_KEY=19940214
NEXT_PUBLIC_API_BASE_URL=https://cuttingasmr.org/api
NEXT_PUBLIC_CLERK_JWT_TEMPLATE=jwt-template
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
NEXT_PUBLIC_DEV_JWT=dev-token
NEXT_PUBLIC_SITE_URL=https://cuttingasmr.org
NEXT_PUBLIC_USE_MOCK=0
NODE_VERSION=18
R2_PUBLIC_AFTER_BASE=https://pub-c6cdf19c1dc84237813b1f66cf8afeff.r2.dev
R2_PUBLIC_UPLOAD_BASE=https://pub-59ae9a96b6614a9db89af40b2970d3ab.r2.dev
```

**密钥变量：**
```env
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
UPSTASH_REDIS_REST_URL=your_redis_url_here
```

#### 2. 构建和部署
```bash
cd apps/web

# 构建前端
npm run build

# 部署到Cloudflare Pages
# 在Cloudflare Dashboard中配置：
# - 构建命令：npm run build
# - 输出目录：.next
# - Node.js版本：18
```

### 完整部署流程

#### 第一次部署
```bash
# 1. 设置所有密钥
wrangler secret put KIE_API_KEY --name ai-social-api
wrangler secret put UPSTASH_REDIS_REST_URL --name ai-social-api
wrangler secret put UPSTASH_REDIS_REST_TOKEN --name ai-social-api
wrangler secret put CLERK_SECRET_KEY --name ai-social-api
wrangler secret put ADMIN_TOKEN --name ai-social-api

# 2. 应用数据库迁移
wrangler d1 execute test-d1 --file=./migrations/003_add_kie_fields.sql --remote

# 3. 部署Worker
wrangler deploy --name ai-social-api

# 4. 配置前端环境变量并部署
```

#### 后续部署
```bash
# 直接部署即可，密钥会自动保持
wrangler deploy --name ai-social-api
```

### 配置说明

`wrangler.toml` 中已启用 `compatibility_flags = ["nodejs_compat"]`，并配置了：
- D1数据库绑定
- R2存储桶绑定  
- 定时任务（每15分钟执行）
- 路由配置（指向自定义域名）
- KIE API基础配置
- 日志监控

### 前端（Next.js）

#### Cloudflare Pages 部署（推荐）
```bash
cd apps/web
npm run build

# 在Cloudflare Dashboard中配置：
# - 构建命令：npm run build
# - 输出目录：.next
# - Node.js版本：18
# - 环境变量：按上述配置添加
```

#### Vercel 部署（备选）
```bash
cd apps/web
npm run build
vercel --prod
```

#### 环境变量配置检查清单
确保以下环境变量已正确配置：

**必需的环境变量：**
- [x] `NEXT_PUBLIC_API_BASE_URL` - 指向你的Worker API
- [x] `NEXT_PUBLIC_SITE_URL` - 你的网站域名
- [x] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk公钥
- [x] `UPSTASH_REDIS_REST_URL` - Redis连接URL
- [x] `UPSTASH_REDIS_REST_TOKEN` - Redis访问令牌

**可选的环境变量：**
- [ ] `NEXT_PUBLIC_USE_MOCK` - 是否使用模拟数据
- [ ] `NEXT_PUBLIC_DEV_JWT` - 开发环境JWT令牌

提示：当前仓库未包含 GitHub Actions 工作流文件，若需 CI/CD 请自行添加。

## 故障排查

### 常见问题
- **4xx/5xx错误**：确认 `NEXT_PUBLIC_API_BASE_URL` 指向正确的 Worker；查看 `wrangler tail` 日志
- **鉴权失败**：本地可将 `DEV_MODE=1`；生产务必关闭，并配置 Clerk（Issuer/JWKS 或 Secret Key）
- **CORS错误**：确认 Worker 返回的 `Access-Control-Allow-Origin` 包含前端域（参考 `ALLOWED_ORIGIN`）
- **R2上传失败**：检查绑定名与权限；确认 `R2_PUBLIC_UPLOAD_BASE` 正确
- **D1连接失败**：核对 `wrangler.toml` 的 `database_id` 并完成 migrations

### AI图像生成问题
- **KIE API调用失败**：检查 `KIE_API_KEY` 是否正确设置，确认API密钥有效
- **生成超时**：检查网络连接，确认回调URL是否公网可访问
- **数据库字段缺失**：确认已执行 `003_add_kie_fields.sql` 迁移
- **Redis连接失败**：检查 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`

### 部署问题
- **密钥丢失**：使用 `wrangler secret list --name ai-social-api` 检查密钥状态
- **Worker部署失败**：确认 `account_id` 正确，检查权限设置
- **环境变量未生效**：确认使用 `--name ai-social-api` 参数设置密钥
- **数据库迁移失败**：检查D1数据库ID和权限，确认网络连接正常

### 调试命令
```bash
# 查看Worker日志
wrangler tail --name ai-social-api

# 检查密钥状态
wrangler secret list --name ai-social-api

# 验证数据库连接
wrangler d1 execute test-d1 --command "SELECT 1" --remote

# 测试Redis连接
curl https://your-domain.com/api/redis/ping
```

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


