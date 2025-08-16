import { Hono } from 'hono'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => {
  return c.json({ ok: true, env: 'workers', time: Date.now() })
})

// Minimal Redis ping via Upstash REST
app.get('/api/redis/ping', async (c) => {
  const url = c.env.UPSTASH_REDIS_REST_URL
  const token = c.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return c.json({ ok: false, error: 'Redis not configured' }, 500)
  const res = await fetch(`${url}/ping`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const text = await res.text()
  return c.json({ ok: res.ok, result: text })
})

export default app


