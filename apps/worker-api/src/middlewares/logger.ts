import type { Context, Next } from 'hono'

export async function loggerMiddleware(c: Context, next: Next) {
  const start = Date.now()
  const startTime = new Date().toISOString()
  const { method, url } = c.req
  
  // Request log
  console.log(JSON.stringify({
    level: 'info',
    type: 'request',
    method,
    url,
    timestamp: startTime,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  }))
  
  await next()
  
  const duration = Date.now() - start
  
  // Response log with performance metrics
  console.log(JSON.stringify({
    level: 'info',
    type: 'response',
    method,
    url,
    status: c.res.status,
    duration: duration,
    durationMs: duration,
    timestamp: new Date().toISOString(),
    performance: {
      totalTime: duration,
      timestamp: Date.now()
    }
  }))
}