import type { Context, Next } from 'hono'

export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next()
    
    // Handle 404
    if (c.res.status === 404) {
      return c.json({ code: 'NOT_FOUND', message: 'Endpoint not found' }, 404)
    }
  } catch (err: any) {
    const code = err?.code || 'INTERNAL_ERROR'
    const message = err?.message || 'Internal server error'
    const status = err?.status || 500
    
    console.error('API Error:', {
      code,
      message,
      status,
      url: c.req.url,
      method: c.req.method,
      timestamp: new Date().toISOString()
    })
    
    return c.json({ code, message }, status)
  }
}