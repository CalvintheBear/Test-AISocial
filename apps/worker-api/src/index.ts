import { Hono } from 'hono'
import type { Env } from './types'
import { authMiddleware } from './middlewares/auth'
import { errorMiddleware } from './middlewares/error'
import { loggerMiddleware } from './middlewares/logger'
import artworks from './routers/artworks'
import users from './routers/users'
import feed from './routers/feed'

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

// 将 auth 放在业务路由前，并为健康检查保留匿名访问
app.use('/api/*', authMiddleware)
app.route('/api/artworks', artworks)
app.route('/api/users', users)
app.route('/api/feed', feed)

export default app

// Export scheduled handler for cron jobs
import scheduler from './scheduled'
export const scheduled = scheduler.scheduled


