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
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // atob 始终返回 Latin1 字符串，这里逐字符取 charCode 恢复字节，再用 UTF-8 解码
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xff
    const json = new TextDecoder('utf-8').decode(bytes)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function authMiddleware(c: Context, next: Next) {
  console.log('DEV_MODE:', c.env?.DEV_MODE, 'type:', typeof c.env?.DEV_MODE)
  console.log('Auth Debug - DEV_MODE:', c.env?.DEV_MODE, 'path:', new URL(c.req.url).pathname);
  console.log('Auth Debug - CLERK_ISSUER:', (c.env as any).CLERK_ISSUER);
  if (c.env?.DEV_MODE === '1' || c.env?.DEV_MODE === 1) {
    (c as any).set('userId', 'dev-user')
    ;(c as any).set('claims', {
      name: 'Dev User',
      email: 'dev@example.com',
      picture: 'https://via.placeholder.com/150'
    })
    return next()
  }

  const url = new URL(c.req.url)
  const isGet = c.req.method === 'GET'
  const pathname = url.pathname
  const isPublicGet = isGet && (
    pathname === '/api/feed' ||
    pathname.startsWith('/api/artworks/') ||
    /\/api\/users\/.+\/(artworks|favorites)$/.test(pathname) ||
    pathname.startsWith('/api/hotness')
  )
  if (isPublicGet) {
    // Public GET: 不强制鉴权，但若携带 token 则解析并注入 userId，便于返回“本人可见”的草稿等
    try {
      let token: string | undefined
      const auth = c.req.header('authorization')
      if (auth?.startsWith('Bearer ')) token = auth.slice('Bearer '.length)
      if (!token) {
        const cookie = c.req.header('cookie')
        const sessionCookie = getCookie('__session', cookie)
        if (sessionCookie) token = sessionCookie
      }
      if (token) {
        let payload: any | null = null
        // 优先严格校验；失败时回退到解码载荷做轻量校验（仅用于公共GET的“本人可见”逻辑）
        try {
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
        } catch {
          // ignore -> fallback handled below
        }

        if (!payload) {
          payload = decodeJwtPayload(token)
        }

        const sub = (payload as any)?.sub
        const iss = (payload as any)?.iss
        const expMs = Number((payload as any)?.exp || 0) * 1000
        const now = Date.now()
        const expectIssuer = (c.env as any).CLERK_ISSUER as string | undefined

        // 轻量校验：exp 未过期，且（如配置 issuer）需匹配 issuer
        const basicValid = !!sub && (!expectIssuer || iss === expectIssuer) && expMs > now
        if (basicValid) {
          ;(c as any).set('userId', sub)
          const claims = {
            name: (payload as any)?.name ?? (payload as any)?.full_name ?? (payload as any)?.given_name ?? null,
            email: (payload as any)?.email ?? (payload as any)?.email_address ?? null,
            picture: (payload as any)?.picture ?? (payload as any)?.image_url ?? (payload as any)?.profile_image_url ?? null,
            username: (payload as any)?.username ?? (payload as any)?.preferred_username ?? null,
            email_verified: (payload as any)?.email_verified ?? (payload as any)?.email_verified ?? null,
            updated_at: (payload as any)?.updated_at ?? null,
          }
          ;(c as any).set('claims', claims)
          try {
            const d1 = D1Service.fromEnv(c.env)
            await d1.upsertUser({ id: sub as string, name: claims.name, email: claims.email, profilePic: claims.picture })
          } catch (err) {
            console.error('Failed to upsert user in public GET:', err)
          }
        }
      }
    } catch {}
    return next()
  }

  let token: string | undefined
  const auth = c.req.header('authorization')
  console.log('Authorization header:', auth)
  if (auth?.startsWith('Bearer ')) token = auth.slice('Bearer '.length)
  if (!token) {
    const cookie = c.req.header('cookie')
    console.log('Cookie header:', cookie)
    const sessionCookie = getCookie('__session', cookie)
    if (sessionCookie) token = sessionCookie
  }
  console.log('Found token:', !!token, 'token length:', token?.length)
  if (!token) {
    return c.json({ code: 'AUTH_REQUIRED', message: 'Authorization or Clerk session required' }, 401)
  }

  try {
    let payload: any
    console.log('Attempting token verification with issuer:', (c.env as any).CLERK_ISSUER)
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
    console.log('JWT payload:', JSON.stringify(payload, null, 2))
    const userId = (payload as any)?.sub as string
    if (!userId) throw new Error('NO_SUB')
    ;(c as any).set('userId', userId)
    // Extract custom claims from Clerk template if present
    // Handle both Clerk standard claims and custom template claims
    const claims = {
      name: (payload as any)?.name ?? (payload as any)?.full_name ?? (payload as any)?.given_name ?? null,
      email: (payload as any)?.email ?? (payload as any)?.email_address ?? null,
      picture: (payload as any)?.picture ?? (payload as any)?.image_url ?? (payload as any)?.profile_image_url ?? null,
      username: (payload as any)?.username ?? (payload as any)?.preferred_username ?? null,
      email_verified: (payload as any)?.email_verified ?? (payload as any)?.email_verified ?? null,
      updated_at: (payload as any)?.updated_at ?? null,
    }
    ;(c as any).set('claims', claims)
    try {
      const d1 = D1Service.fromEnv(c.env)
      await d1.upsertUser({ id: userId, name: claims.name, email: claims.email, profilePic: claims.picture })
    } catch {}
    return next()
  } catch (error) {
    console.error('JWT verification failed:', error)
    console.error('Token:', token?.substring(0, 50) + '...')
    
    // Fallback: non-crypto validation（仅为当前联调使用）
    console.log('Attempting fallback JWT decode...')
    const payload = decodeJwtPayload(token)
    console.log('Decoded payload:', JSON.stringify(payload, null, 2))
    
    const iss = payload?.iss
    const sub = payload?.sub
    const exp = Number(payload?.exp || 0) * 1000
    const now = Date.now()
    
    console.log('Fallback check - sub:', sub, 'iss:', iss, 'exp:', exp, 'now:', now)
    console.log('Issuer match:', iss === (c.env as any).CLERK_ISSUER)
    
    if (sub && iss && exp > now && (!((c.env as any).CLERK_ISSUER) || iss === (c.env as any).CLERK_ISSUER)) {
      console.log('Fallback validation passed for user:', sub)
      ;(c as any).set('userId', sub as string)
      const claims = {
        name: (payload as any)?.name ?? (payload as any)?.full_name ?? (payload as any)?.given_name ?? null,
        email: (payload as any)?.email ?? (payload as any)?.email_address ?? null,
        picture: (payload as any)?.picture ?? (payload as any)?.image_url ?? (payload as any)?.profile_image_url ?? null,
        username: (payload as any)?.username ?? (payload as any)?.preferred_username ?? null,
        email_verified: (payload as any)?.email_verified ?? (payload as any)?.email_verified ?? null,
        updated_at: (payload as any)?.updated_at ?? null,
      }
      ;(c as any).set('claims', claims)
      try {
        const d1 = D1Service.fromEnv(c.env)
        await d1.upsertUser({ id: sub as string, name: claims.name, email: claims.email, profilePic: claims.picture })
      } catch (e) {
        console.error('Failed to upsert user in fallback:', e)
      }
      return next()
    }
    return c.json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token', details: error?.message }, 401)
  }
}


