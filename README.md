# AI社交平台 - 完整开发与部署指南（2025版）

一个现代化的AI生成艺术作品社交平台，采用Next.js + Cloudflare Workers架构，支持实时AI图像生成、社交互动、智能推荐等功能。

## 🎯 项目特色

- **AI图像生成**：集成KIE AI API，支持实时生成和webhook回调
- **社交互动**：点赞、收藏、分享等完整社交功能
- **智能推荐**：基于多维度的热度算法，实时更新推荐内容
- **高性能**：边缘计算 + 多层缓存，全球快速访问
- **现代化架构**：Serverless + 边缘数据库 + CDN

## 🏗️ 系统架构

### 技术栈

| 层级 | 技术选择 | 用途说明 |
|---|---|---|
| **前端** | Next.js 14 + TypeScript + Tailwind CSS | 现代化React全栈框架 |
| **后端** | Cloudflare Workers + Hono框架 | 边缘无服务器计算 |
| **数据库** | D1 SQLite (主) + Upstash Redis (缓存) | 边缘数据库 + 高速缓存 |
| **存储** | Cloudflare R2 | 图像和文件存储 |
| **AI服务** | KIE AI API | 图像生成和处理 |
| **认证** | Clerk | 用户身份认证和权限管理 |

### 架构图

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│   前端 (Next.js)     │────│ Cloudflare Workers  │────│   D1 数据库      │
│   3000端口           │    │   8787端口          │    │   SQLite        │
└─────────────────────┘    └─────────────────────┘    └─────────────────┘
         │                           │                           │
         │                  ┌─────────────────────┐              │
         │                  │   Upstash Redis     │              │
         │                  │   缓存层            │              │
         │                  └─────────────────────┘              │
         │                           │                           │
    Cloudflare R2             KIE AI API                    定时任务
   (图像存储)               (AI生成)                  (热度计算)
```

## 🚀 快速开始

### 环境准备

**必需条件：**
- Node.js 18+ (推荐20+)
- npm 9+
- Cloudflare账号 (含Workers、D1、R2权限)
- Upstash Redis实例

**可选条件：**
- Clerk账号 (用户认证)
- KIE AI API密钥 (AI图像生成)

### 1. 项目初始化

```bash
# 克隆项目
git clone <your-repo-url>
cd ai-social

# 安装依赖
npm install

# 复制环境变量模板
cp apps/web/.env.local.example apps/web/.env.local
cp apps/worker-api/.dev.vars.example apps/worker-api/.dev.vars
```

### 2. 数据库配置

```bash
# 进入后端目录
cd apps/worker-api

# 应用数据库迁移
wrangler d1 migrations apply test-d1

# 验证数据库表
wrangler d1 execute test-d1 --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### 3. 配置环境变量

#### 前端配置 (apps/web/.env.local)

```bash
# 基础配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8787

# Clerk认证 (可选)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_CLERK_JWT_TEMPLATE=jwt-template

# 开发模式
NEXT_PUBLIC_DEV_JWT=dev-token
```

#### 后端配置 (apps/worker-api/.dev.vars)

```bash
# 开发模式开关
DEV_MODE=1
ALLOWED_ORIGIN=http://localhost:3000

# Clerk认证配置 (二选一)
CLERK_ISSUER=https://your-domain.clerk.accounts.dev
CLERK_JWKS_URL=https://your-domain.clerk.accounts.dev/.well-known/jwks.json
# 或者
CLERK_SECRET_KEY=sk_test_xxx

# Redis配置
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# R2存储配置
R2_PUBLIC_UPLOAD_BASE=https://your-bucket.r2.dev
R2_PUBLIC_AFTER_BASE=https://your-bucket.r2.dev
```

### 4. 启动开发服务

```bash
# 终端1：启动后端
npm run api:dev
# 访问: http://localhost:8787

# 终端2：启动前端
npm run dev
# 访问: http://localhost:3000
```

## 📡 API接口文档

### 系统接口
- `GET /api/health` - 健康检查
- `GET /api/redis/ping` - Redis连接测试

### 用户接口
- `GET /api/users/:id/profile` - 用户资料
- `GET /api/users/:id/artworks` - 用户作品列表
- `GET /api/users/:id/favorites` - 用户收藏
- `GET /api/users/me` - 当前用户信息

### 作品接口
- `GET /api/feed` - 推荐流 (支持分页)
- `GET /api/artworks/:id` - 作品详情
- `POST /api/artworks/upload` - 上传作品
- `POST /api/artworks/:id/like` - 点赞/取消点赞
- `POST /api/artworks/:id/favorite` - 收藏/取消收藏
- `POST /api/artworks/:id/publish` - 发布作品

### AI生成接口
- `POST /api/artworks/generate` - 生成AI图像
- `GET /api/artworks/task-status/:id` - 查询生成状态
- `POST /api/kie/kie-callback` - KIE回调接口

### 热度接口
- `GET /api/hotness/trending` - 热门作品
- `GET /api/hotness/trending/:timeWindow` - 时间段热门 (1h/6h/24h/7d/30d)
- `GET /api/hotness/rank` - 排名查询

## 🚢 生产部署

### 部署前准备

**必需清单：**
- [ ] Cloudflare账号及完整权限
- [ ] Upstash Redis实例
- [ ] Clerk账号 (如使用认证)
- [ ] KIE AI API密钥
- [ ] 自定义域名 (推荐)

### 步骤1: 配置后端密钥

```bash
cd apps/worker-api

# 设置所有必需的密钥
wrangler secret put KIE_API_KEY --name ai-social-api
wrangler secret put UPSTASH_REDIS_REST_URL --name ai-social-api
wrangler secret put UPSTASH_REDIS_REST_TOKEN --name ai-social-api
wrangler secret put CLERK_SECRET_KEY --name ai-social-api
wrangler secret put ADMIN_TOKEN --name ai-social-api

# 验证密钥设置
wrangler secret list --name ai-social-api
```

### 步骤2: 数据库迁移

```bash
# 应用生产数据库迁移
wrangler d1 execute test-d1 --file=./migrations/003_add_kie_fields.sql --remote

# 验证数据库
wrangler d1 execute test-d1 --command "SELECT COUNT(*) as total FROM artworks" --remote
```

### 步骤3: 部署后端

```bash
# 部署到Cloudflare Workers
wrangler deploy --name ai-social-api

# 验证部署
wrangler deployments list
```

### 步骤4: 前端部署配置

#### Cloudflare Pages部署 (推荐)

**环境变量配置：**
```bash
# 必需变量
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com/api
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# 可选变量
R2_PUBLIC_UPLOAD_BASE=https://your-bucket.r2.dev
R2_PUBLIC_AFTER_BASE=https://your-bucket.r2.dev
NODE_VERSION=18
```

**部署步骤：**
```bash
cd apps/web
npm run build

# 在Cloudflare Dashboard配置：
# - 构建命令: npm run build
# - 输出目录: .next
# - Node.js版本: 18
```

#### Vercel部署 (备选)

```bash
cd apps/web
npm run build
vercel --prod
```

### 部署验证清单

部署完成后，请验证以下功能：

- [ ] 前端正常访问 (https://your-domain.com)
- [ ] API接口响应正常 (/api/health)
- [ ] 用户注册/登录功能
- [ ] AI图像生成功能
- [ ] 文件上传功能
- [ ] 社交互动功能 (点赞、收藏)
- [ ] 热度算法正常工作
- [ ] Redis缓存正常 (/api/redis/ping)

## 🔧 常用命令

### 开发命令
```bash
# 前端开发
npm run dev

# 后端开发
npm run api:dev

# 构建项目
npm run build

# 部署后端
npm run api:deploy
```

### 调试命令
```bash
# 查看实时日志
wrangler tail --name ai-social-api

# 测试Redis连接
curl https://your-domain.com/api/redis/ping

# 验证数据库连接
wrangler d1 execute test-d1 --command "SELECT 1" --remote

# 刷新热度缓存
curl -X POST https://your-domain.com/api/hotness/refresh
```

### 数据维护
```bash
# 检查数据一致性
cd apps/worker-api && npm run consistency-check

# 重新计算所有热度（简化版）
curl -X POST https://your-domain.com/api/hotness/refresh

# 检查批量更新状态
curl https://your-domain.com/api/hotness/rank
```

## 🐛 故障排查

### 常见问题速查

| 问题症状 | 可能原因 | 解决方案 |
|---|---|---|
| 4xx/5xx错误 | API地址配置错误 | 检查NEXT_PUBLIC_API_BASE_URL |
| CORS错误 | 跨域配置问题 | 检查ALLOWED_ORIGIN环境变量 |
| 认证失败 | Clerk配置错误 | 验证CLERK_SECRET_KEY或issuer |
| 上传失败 | R2权限问题 | 检查R2绑定和权限设置 |
| 数据库错误 | 迁移未执行 | 运行wrangler d1 migrations apply |

### 详细排查步骤

**1. 后端服务检查**
```bash
# 检查Worker状态
wrangler deployments list

# 查看实时日志
wrangler tail --name ai-social-api

# 测试健康接口
curl https://your-domain.com/api/health
```

**2. 数据库检查**
```bash
# 验证D1连接
wrangler d1 execute test-d1 --command "SELECT 1" --remote

# 检查表结构
wrangler d1 execute test-d1 --command ".tables" --remote
```

**3. Redis检查**
```bash
# 测试Redis连接
curl https://your-domain.com/api/redis/ping

# 查看缓存键
wrangler tail | grep redis
```

**4. AI服务检查**
```bash
# 测试KIE API
# 查看是否有回调错误日志
wrangler tail | grep kie
```

### 性能调优

**1. 缓存优化**
- 调整Redis TTL设置
- 优化缓存失效策略
- 使用CDN加速静态资源

**2. 数据库优化**
- 添加适当的索引
- 优化查询语句
- 使用批量操作

**3. 前端优化**
- 启用Next.js的Image优化
- 使用SWR进行数据缓存
- 实现图片懒加载

## 📚 技术文档

### 数据库结构

**主要数据表：**
- `users` - 用户信息表
- `artworks` - 作品信息表
- `artworks_like` - 点赞关系表
- `artworks_favorite` - 收藏关系表
- `artworks_hot_history` - 热度历史表

### 热度算法（2025简化版）

**计算因子（已极简化）：**
- **点赞**：+1分
- **收藏**：+2分
- **取消点赞**：-1分
- **取消收藏**：-2分
- **时间衰减**：每日衰减20%，每小时衰减5%

**热度等级（简化）：**
- 🔥 热门 (>10分)
- 普通 (0-10分)
- 冷门 (<0分)

**算法特点：**
- 直接从数据库计算，避免Redis数据不一致
- 批量更新优化，每15分钟自动刷新
- 防刷机制，防止恶意刷热度

### 缓存策略

- **Feed缓存**：10分钟TTL
- **用户作品**：10分钟TTL
- **热度数据**：15分钟定时更新（非实时）
- **用户状态**：5分钟TTL
- **静态资源**：CDN长期缓存

## 📋 开发规范

### 代码规范
- 使用TypeScript严格模式
- 遵循ESLint配置
- 提交前运行类型检查

### 分支管理
- `main` - 生产分支
- `develop` - 开发分支
- `feature/*` - 功能分支

### 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试相关
chore: 构建/工具
```

## 📞 技术支持

**问题排查优先级：**
1. 查看本README文档
2. 检查环境变量配置
3. 查看`wrangler tail`实时日志
4. 验证各服务连接状态
5. 提交Issue到项目仓库

**获取帮助：**
- 📖 完整文档：参见项目Wiki
- 🐛 问题反馈：GitHub Issues
- 💬 技术讨论：GitHub Discussions

---

**最后更新：** 2025年1月
**维护者：** AI Social开发团队

**提示：** 本文档会随项目更新而更新，建议定期查看最新版本。