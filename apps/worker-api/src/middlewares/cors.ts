import type { Context, Next } from 'hono'

export async function corsMiddleware(c: Context, next: Next) {
  const requestOrigin = c.req.header('origin')
  const allowedEnv = (c.env.ALLOWED_ORIGIN as string | undefined) || '*'
  const allowedList = allowedEnv.split(',').map(s => s.trim()).filter(Boolean)
  const pickOrigin = () => {
    if (allowedEnv === '*') return '*'
    if (!requestOrigin) return allowedList[0] || '*'
    return allowedList.includes(requestOrigin) ? requestOrigin : allowedList[0] || '*'
  }

  // Handle preflight
  if (c.req.method === 'OPTIONS') {
    const origin = pickOrigin()
    return c.text('', 200, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': c.req.header('access-control-request-headers') || 'authorization,content-type',
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
    })
  }

  await next()

  // Set CORS headers on response
  c.res.headers.set('Access-Control-Allow-Origin', pickOrigin())
  c.res.headers.set('Access-Control-Allow-Credentials', 'true')
  c.res.headers.append('Vary', 'Origin')
}


