import { Hono } from 'hono'
import type { Env } from './types'
import { authMiddleware } from './middlewares/auth'
import { errorMiddleware } from './middlewares/error'
import { loggerMiddleware } from './middlewares/logger'
import { corsMiddleware } from './middlewares/cors'
import artworks from './routers/artworks'
import users from './routers/users'
import feed from './routers/feed'
import works from './routers/works'
import admin from './routers/admin'
import hotness from './routers/hotness'
import { debugRouter } from './routers/debug'
import kieCallback from './routers/kie-callback'
import paymentsWebhook from './routers/payments-webhook'
import payments from './routers/payments'
import credits from './routers/credits'
import checkin from './routers/checkin'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true, env: 'workers', time: Date.now() }))

app.get('/api/redis/ping', async (c) => {
  const url = c.env.UPSTASH_REDIS_REST_URL
  const token = c.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return c.json({ ok: false, error: 'Redis not configured' }, 500)
  const res = await fetch(`${url}/ping`, { headers: { Authorization: `Bearer ${token}` } })
  const text = await res.text()
  return c.json({ ok: true, result: text })
})

// 错误与日志中间件（顺序：错误捕获在最外层）
app.use('*', errorMiddleware)
app.use('*', loggerMiddleware)
app.use('*', corsMiddleware)

// KIE 回调路由不需要认证，放在认证中间件之前
app.route('/api/kie', kieCallback)
// 支付 Webhook 公共路由（无需认证）
app.route('/api/payments/webhook', paymentsWebhook)
// 管理员路由（使用简单 token 验证，无需 Clerk 认证）
app.route('/api/admin', admin)

// 将 auth 放在业务路由前，并为健康检查保留匿名访问
app.use('/api/*', authMiddleware)
app.route('/api/artworks', artworks)
app.route('/api/works', works)
app.route('/api/users', users)
app.route('/api/feed', feed)
app.route('/api/hotness', hotness)
app.route('/api/debug', debugRouter)
// 支付与积分（需认证）
app.route('/api/payments', payments)
app.route('/api/credits', credits)
app.route('/api/checkin', checkin)

export default app

// Export scheduled handler for cron jobs
import scheduler from './scheduled'
export const scheduled = scheduler.scheduled


