import type { Context, Next } from 'hono'
import { fail } from '../utils/response'

export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next()
    
    // Handle 404
    if (c.res.status === 404) {
      return c.json(fail('NOT_FOUND', 'Endpoint not found'), 404)
    }
  } catch (err: any) {
    const code = err?.code || 'INTERNAL_ERROR'
    const message = err?.message || 'Internal server error'
    const status = err?.status || 500
    
    // Structured logging
    console.error(JSON.stringify({
      level: 'error',
      code,
      message,
      url: c.req.url,
      method: c.req.method,
      ts: Date.now()
    }))
    
    return c.json(fail(code, message), status)
  }
}