import type { Context, Next } from 'hono'
import { verifyToken } from '@clerk/backend'
import { D1Service } from '../services/d1'

function getCookie(name: string, cookieHeader?: string | null): string | undefined {
  if (!cookieHeader) return undefined
  const parts = cookieHeader.split(/;\s*/)
  for (const part of parts) {
    const [k, ...rest] = part.split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}

export async function authMiddleware(c: Context, next: Next) {
  if (c.env?.DEV_MODE === '1') {
    (c as any).set('userId', 'dev-user')
    return next()
  }

  const url = new URL(c.req.url)
  const isGet = c.req.method === 'GET'
  const pathname = url.pathname
  const isPublicGet = isGet && (
    pathname === '/api/feed' ||
    pathname.startsWith('/api/artworks/') ||
    /\/api\/users\/.+\/(artworks|favorites)$/.test(pathname)
  )
  if (isPublicGet) {
    return next()
  }

  // JWT or Clerk session cookie
  let token: string | undefined
  const auth = c.req.header('authorization')
  if (auth?.startsWith('Bearer ')) token = auth.slice('Bearer '.length)
  if (!token) {
    const cookie = c.req.header('cookie')
    const sessionCookie = getCookie('__session', cookie)
    if (sessionCookie) token = sessionCookie
  }
  if (!token) {
    return c.json({ code: 'AUTH_REQUIRED', message: 'Authorization or Clerk session required' }, 401)
  }

  try {
    const payload = await verifyToken(token, { secretKey: c.env.CLERK_SECRET_KEY } as any)
    const userId = (payload as any)?.sub as string
    ;(c as any).set('userId', userId)
    try {
      const d1 = D1Service.fromEnv(c.env)
      await d1.upsertUser({ id: userId, name: null, email: null, profilePic: null })
    } catch {}
    return next()
  } catch (error) {
    return c.json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' }, 401)
  }
}


