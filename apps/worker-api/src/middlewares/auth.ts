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

async function verifyHs256Jwt(token: string, key: string): Promise<Record<string, any> | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.')
    if (!headerB64 || !payloadB64 || !signatureB64) return null
    // Parse header to ensure alg is HS256
    const headerJson = atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'))
    const header = JSON.parse(headerJson)
    if (header?.alg !== 'HS256') return null

    const enc = new TextEncoder()
    const keyData = enc.encode(key)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const data = enc.encode(`${headerB64}.${payloadB64}`)
    const signature = signatureB64.replace(/-/g, '+').replace(/_/g, '/')
    // Base64 decode signature to ArrayBuffer
    const bin = atob(signature)
    const sigBytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) sigBytes[i] = bin.charCodeAt(i) & 0xff

    const ok = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, data)
    if (!ok) return null

    // UTF-8 decode JWT payload
    const payloadBase64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const payloadBinary = atob(payloadBase64)
    const payloadBytes = new Uint8Array(payloadBinary.length)
    for (let i = 0; i < payloadBinary.length; i++) payloadBytes[i] = payloadBinary.charCodeAt(i) & 0xff
    const payloadJson = new TextDecoder('utf-8').decode(payloadBytes)
    const payload = JSON.parse(payloadJson)
    const now = Date.now() / 1000
    if (typeof payload?.exp === 'number' && payload.exp < now) return null
    if (typeof payload?.nbf === 'number' && payload.nbf > now) return null
    return payload
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
    const jwtKey = (c.env as any).CLERK_JWT_KEY
    const secretKey = (c.env as any).CLERK_SECRET_KEY
    const issuer = (c.env as any).CLERK_ISSUER
    const jwksUrl = (c.env as any).CLERK_JWKS_URL
    console.log('Attempting token verification. issuer:', issuer, 'jwks:', jwksUrl, 'hasJwtKey:', !!jwtKey, 'hasSecret:', !!secretKey)

    // 1) HS256 自定义模板：优先尝试官方校验，其次手动 HMAC 校验
    if (jwtKey) {
      try {
        payload = await verifyToken(token, { jwtKey } as any)
      } catch (e) {
        console.warn('verifyToken with jwtKey failed, trying manual HS256 verify...', e)
      }
      if (!payload) {
        const manual = await verifyHs256Jwt(token, jwtKey)
        if (manual) payload = manual
      }
    }

    // 2) Clerk Secret（某些模式也可校验）
    if (!payload && secretKey) {
      try {
        payload = await verifyToken(token, { secretKey } as any)
      } catch (e) {
        console.warn('verifyToken with secretKey failed, fallback to JWKS...', e)
      }
    }

    // 3) RS256：Issuer + JWKS
    if (!payload && issuer && jwksUrl) {
      try {
        payload = await verifyToken(token, { issuer, jwksUrl } as any)
      } catch (e) {
        console.warn('verifyToken with issuer+jwks failed, will try iss-derived JWKS...', e)
      }
    }

    // 最后一层兜底：从 token 载荷中获取 iss，动态拼接 JWKS URL 验证
    if (!payload) {
      const decoded = decodeJwtPayload(token)
      const iss = (decoded as any)?.iss as string | undefined
      if (iss) {
        const normalizedIss = iss.endsWith('/') ? iss.slice(0, -1) : iss
        const dynamicJwks = `${normalizedIss}/.well-known/jwks.json`
        try {
          payload = await verifyToken(token, { issuer: normalizedIss, jwksUrl: dynamicJwks } as any)
        } catch (e) {
          console.error('verifyToken with dynamic iss+jwks failed:', e)
        }
      }
    }
    
    if (!payload) {
      throw new Error('Token verification failed - no payload returned')
    }
    
    console.log('JWT payload verified successfully')
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
    
    // 仅在 DEV_MODE 下允许 fallback 解码（仅用于开发调试）
    if (c.env?.DEV_MODE === '1' || c.env?.DEV_MODE === 1) {
      console.log('DEV_MODE: Attempting fallback JWT decode...')
      const payload = decodeJwtPayload(token)
      if (payload?.sub && payload?.exp && Number(payload.exp) * 1000 > Date.now()) {
        console.log('DEV_MODE: Fallback validation passed for user:', payload.sub)
        ;(c as any).set('userId', payload.sub as string)
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
          await d1.upsertUser({ id: payload.sub as string, name: claims.name, email: claims.email, profilePic: claims.picture })
        } catch (e) {
          console.error('Failed to upsert user in DEV_MODE fallback:', e)
        }
        return next()
      }
    }
    
    return c.json({ 
      code: 'INVALID_TOKEN', 
      message: 'Invalid or expired token',
      details: error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unknown error' 
    }, 401)
  }
}


