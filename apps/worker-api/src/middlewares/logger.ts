import type { Context, Next } from 'hono'

export async function loggerMiddleware(c: Context, next: Next) {
  const start = Date.now()
  const { method, url } = c.req
  
  console.log(`[${new Date().toISOString()}] ${method} ${url}`)
  
  await next()
  
  const duration = Date.now() - start
  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${c.res.status} (${duration}ms)`)
}