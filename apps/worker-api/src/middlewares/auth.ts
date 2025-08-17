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

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const [, payload] = token.split('.')
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
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
    let payload: any
    if ((c.env as any).CLERK_ISSUER && (c.env as any).CLERK_JWKS_URL) {
      payload = await verifyToken(token, {
        // @ts-ignore
        issuer: (c.env as any).CLERK_ISSUER,
        // @ts-ignore
        jwksUrl: (c.env as any).CLERK_JWKS_URL,
      } as any)
    } else if ((c.env as any).CLERK_SECRET_KEY) {
      payload = await verifyToken(token, { secretKey: (c.env as any).CLERK_SECRET_KEY } as any)
    }
    const userId = (payload as any)?.sub as string
    if (!userId) throw new Error('NO_SUB')
    ;(c as any).set('userId', userId)
    // Extract custom claims from Clerk template if present
    const claims = {
      name: (payload as any)?.name ?? null,
      email: (payload as any)?.email ?? null,
      picture: (payload as any)?.picture ?? (payload as any)?.image_url ?? null,
      username: (payload as any)?.username ?? null,
      email_verified: (payload as any)?.email_verified ?? null,
      updated_at: (payload as any)?.updated_at ?? null,
    }
    ;(c as any).set('claims', claims)
    try {
      const d1 = D1Service.fromEnv(c.env)
      await d1.upsertUser({ id: userId, name: claims.name, email: claims.email, profilePic: claims.picture })
    } catch {}
    return next()
  } catch (_) {
    // Fallback: non-crypto validation（仅为当前联调使用）
    const payload = decodeJwtPayload(token)
    const iss = payload?.iss
    const sub = payload?.sub
    const exp = Number(payload?.exp || 0) * 1000
    const now = Date.now()
    if (sub && iss && exp > now && (!((c.env as any).CLERK_ISSUER) || iss === (c.env as any).CLERK_ISSUER)) {
      ;(c as any).set('userId', sub as string)
      const claims = {
        name: (payload as any)?.name ?? null,
        email: (payload as any)?.email ?? null,
        picture: (payload as any)?.picture ?? (payload as any)?.image_url ?? null,
        username: (payload as any)?.username ?? null,
        email_verified: (payload as any)?.email_verified ?? null,
        updated_at: (payload as any)?.updated_at ?? null,
      }
      ;(c as any).set('claims', claims)
      try {
        const d1 = D1Service.fromEnv(c.env)
        await d1.upsertUser({ id: sub as string, name: claims.name, email: claims.email, profilePic: claims.picture })
      } catch {}
      return next()
    }
    return c.json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' }, 401)
  }
}


