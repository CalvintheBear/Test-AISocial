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
    // 仅放行 artworks 与 favorites 的用户读接口，/api/users/me 必须鉴权
    /\/api\/users\/.+\/(artworks|favorites)$/.test(pathname)
  )
  if (isPublicGet) {
    return next()
  }

  // 读取 Authorization 或 Clerk __session Cookie
  let token: string | undefined
  const auth = c.req.header('authorization')
  if (auth?.startsWith('Bearer ')) {
    token = auth.slice('Bearer '.length)
  } else {
    const cookie = c.req.header('cookie')
    const sessionCookie = getCookie('__session', cookie)
    if (sessionCookie) token = sessionCookie
  }

  if (!token) {
    return c.json({ code: 'AUTH_REQUIRED', message: 'Authorization header or __session cookie required' }, 401)
  }

  try {
    // 校验 JWT
    const payload = await verifyToken(token, { secretKey: c.env.CLERK_SECRET_KEY } as any)
    const userId = (payload as any)?.sub as string
    ;(c as any).set('userId', userId)

    // 同步用户到 D1（Best-effort，不阻断请求）
    try {
      const d1 = D1Service.fromEnv(c.env)
      const claims = payload as unknown as Record<string, any>
      const name = claims?.name || claims?.full_name || claims?.username || null
      const email = Array.isArray(claims?.email) ? claims?.email?.[0] : (claims?.email || claims?.email_address)
      const profilePic = claims?.picture || claims?.avatar || null
      await d1.upsertUser({ id: userId, name, email, profilePic })
    } catch (_) {}

    return next()
  } catch (error) {
    return c.json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' }, 401)
  }
}


