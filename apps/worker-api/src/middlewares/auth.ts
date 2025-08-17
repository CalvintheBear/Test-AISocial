import type { Context, Next } from 'hono'
import { verifyToken } from '@clerk/backend'

export async function authMiddleware(c: Context, next: Next) {
  // DEV mode bypass - only when explicitly set to "1"
  if (c.env?.DEV_MODE === '1') {
    (c as any).set('userId', 'dev-user')
    return next()
  }

  // Public GET endpoints: allow anonymous access for read-only pages
  const url = new URL(c.req.url)
  const isGet = c.req.method === 'GET'
  const pathname = url.pathname
  const isPublicGet = isGet && (
    pathname === '/api/feed' ||
    pathname.startsWith('/api/artworks/') ||
    pathname.startsWith('/api/users/')
  )
  if (isPublicGet) {
    return next()
  }

  const auth = c.req.header('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ code: 'AUTH_REQUIRED', message: 'Authorization header required' }, 401)
  }

  const token = auth.slice('Bearer '.length)
  
  try {
    // 使用 Clerk 后端 SDK 校验；不同版本的 verifyToken 选项不同，仅保留兼容的 secretKey
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    } as any)
    ;(c as any).set('userId', payload.sub)
    return next()
  } catch (error) {
    return c.json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' }, 401)
  }
}


