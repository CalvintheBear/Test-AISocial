# AI Social - 开发运行说明（基础骨架）

## 目录
- 前端：`apps/web`（Next.js 14）
- 后端：`apps/worker-api`（Cloudflare Workers + Hono）

## 环境变量

前端 `apps/web/.env.local`：
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK=1
```

Workers `wrangler.toml` 通过 `wrangler secret` 注入敏感变量：
```
wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

同时在 `wrangler.toml` 设置：
```
[vars]
UPSTASH_REDIS_REST_URL="https://<your-upstash-endpoint>.upstash.io"
```

## 本地运行

```bash
# 前端
npm run dev

# Workers（首次先装依赖）
npm --workspace apps/worker-api i
npm run api:dev
```

## 最小接口

- 健康检查：`GET /api/health`
- Redis Ping：`GET /api/redis/ping`


