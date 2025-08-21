// 运行时 Token 方案（Edge 兼容）：优先使用环境变量 DEV_JWT；
// 如需接入 Clerk，请在 Node.js 运行时下通过独立服务器动作读取并下发到前端或设置 Cookie，再由此处读取。
let tokenProvider: (() => Promise<string | undefined>) | null = null
export async function initClerkTokenProvider(): Promise<void> {
  // 为保障 Edge 构建通过，当前不从 @clerk/nextjs 动态导入。

  if (tokenProvider) return
  tokenProvider = async () => undefined
}

// 简单的短期 Token 缓存，降低每次请求都触发 Clerk 拉取的开销
let cachedAuthToken: string | undefined
let cachedAuthTokenExpireAt = 0
function getCachedToken(): string | undefined {
  if (!cachedAuthToken) return undefined
  if (Date.now() >= cachedAuthTokenExpireAt) return undefined
  return cachedAuthToken
}
function setCachedToken(token: string | undefined, ttlMs = 60_000) {
  if (!token) return
  cachedAuthToken = token
  cachedAuthTokenExpireAt = Date.now() + Math.max(5_000, ttlMs)
}

// 未登录时的统一登录触发（节流避免重复弹窗）
let lastAuthPromptAt = 0
function promptSignInModal(): void {
  if (typeof window === 'undefined') return
  const now = Date.now()
  if (now - lastAuthPromptAt < 3000) return
  lastAuthPromptAt = now
  try {
    const clerk = (window as any)?.Clerk
    if (clerk?.openSignIn) {
      clerk.openSignIn({
        afterSignInUrl: window.location.href,
        afterSignUpUrl: window.location.href,
      })
      return
    }
  } catch {}
  try {
    const redirect = '/login?redirect_url=' + encodeURIComponent(window.location.href)
    window.location.href = redirect
  } catch {}
}

export async function authFetch<T = any>(input: RequestInfo, init: RequestInit = {}) {
  let token: string | undefined

  // 为 GET 请求启用“快速路径”：在短超时内尝试拿 token，拿不到则先无 token 请求，必要时再重试
  const method = (init.method || 'GET').toUpperCase()
  const isGet = method === 'GET'

  async function getClerkTokenWithTimeout(timeoutMs = 300): Promise<string | undefined> {
    const cached = getCachedToken()
    if (cached) return cached
    if (typeof window === 'undefined') return undefined
    const maybeClerk = (window as any)?.Clerk
    if (!maybeClerk) return undefined

    const timeout = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), timeoutMs))
    try {
      const loadPromise = (async () => {
        try {
          if (!maybeClerk.loaded) {
            await maybeClerk.load?.()
          }
        } catch {}
        const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE
        try {
          if (template) {
            return (
              (await maybeClerk?.session?.getToken?.({ template, skipCache: true })) ||
              (await maybeClerk?.session?.getToken?.({ template }))
            )
          }
          return (
            (await maybeClerk?.session?.getToken?.({ skipCache: true })) ||
            (await maybeClerk?.session?.getToken?.())
          )
        } catch {
          return undefined
        }
      })()
      const t = await Promise.race([loadPromise as Promise<string | undefined>, timeout])
      if (t) setCachedToken(t)
      return t
    } catch (e) {
      console.warn('Failed to get Clerk token quickly:', e)
      return undefined
    }
  }

  async function getClerkTokenNoTimeout(): Promise<string | undefined> {
    const cached = getCachedToken()
    if (cached) return cached
    if (typeof window === 'undefined') return undefined
    try {
      const clerk = (window as any).Clerk
      if (!clerk) return undefined
      if (!clerk.loaded) {
        await clerk.load?.()
      }
      const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE
      if (template) {
        const t = (await clerk?.session?.getToken?.({ template, skipCache: true })) ||
          (await clerk?.session?.getToken?.({ template }))
        if (t) setCachedToken(t)
        return t
      }
      const t = (await clerk?.session?.getToken?.({ skipCache: true })) ||
        (await clerk?.session?.getToken?.())
      if (t) setCachedToken(t)
      return t
    } catch (error) {
      console.warn('Failed to get Clerk token:', error)
      return undefined
    }
  }

  // 先尝试快速拿 token（仅客户端）
  token = getCachedToken() || await getClerkTokenWithTimeout(200)

  // 可选回退到 DEV_JWT（需显式开启）
  if (!token) {
    await initClerkTokenProvider()
    const maybeToken = await tokenProvider?.()
    const devJwt = process.env.NEXT_PUBLIC_DEV_JWT
    const useDevJwt = process.env.NEXT_PUBLIC_USE_DEV_JWT === '1'
    const normalized = (maybeToken || '').trim()
    const isLikelyValid = normalized && normalized !== 'undefined' && normalized !== 'null'
    token = isLikelyValid ? normalized : (useDevJwt ? devJwt : undefined)
    if (token) setCachedToken(token)
  }

  // 对写请求或强鉴权的 GET，若仍未拿到 token，则等待一次无超时获取，避免首个 401 噪声
  const API_BASE_TMP = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8787'
  const urlStr = typeof input === 'string' ? input : (input as any)?.toString?.() || ''
  const path = (() => {
    try {
      const u = new URL(typeof input === 'string' ? input : (input as any), API_BASE_TMP)
      return u.pathname
    } catch { return '' }
  })()

  const forceAuthGet = isGet && (
    /\/api\/users\/(me|[^/]+\/(likes|favorites|artworks))$/.test(path) ||
    /\/api\/checkin\/status$/.test(path) ||
    /\/api\/credits\/me$/.test(path)
  )
  if (!token && typeof window !== 'undefined' && (!isGet || forceAuthGet)) {
    token = await getClerkTokenNoTimeout()
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8787'
  const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  let url: RequestInfo
  if (typeof input === 'string') {
    if (input.startsWith('/api/')) {
      url = new URL(input, API_BASE).toString()
    } else {
      url = input
    }
  } else {
    url = input
  }

  const isFormData = typeof FormData !== 'undefined' && (init as any)?.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  
  try {
    let res = await fetch(url, { ...init, headers, cache: 'no-store', credentials: 'include' })

    // 若遇到 401（任意方法），再尝试获取一次 token 并重试一次
    if (res.status === 401) {
      const haveAuthHeader = !!(headers as any).Authorization
      if (!haveAuthHeader) {
        const retryToken = await getClerkTokenNoTimeout()
        if (retryToken) {
          const retryHeaders = {
            ...(headers || {}),
            Authorization: `Bearer ${retryToken}`,
          }
          res = await fetch(url, { ...init, headers: retryHeaders, cache: 'no-store', credentials: 'include' })
        }
      }
    }

    if (!res.ok) {
      let err: any
      try { 
        err = await res.json() 
      } catch { 
        err = { message: res.statusText } 
      }

      if (res.status === 401) {
        console.warn('Authentication failed:', err)
        // 统一未登录处理：只对“写操作或强鉴权 GET”自动触发登录
        if (!isGet || forceAuthGet) {
          promptSignInModal()
        }
      }

      throw err
    }
    const data = await res.json()
    return data?.data !== undefined ? data.data : data
  } catch (error) {
    console.error('API request failed:', { url, error })
    throw error
  }
}

// Server-safe mock flag
// Deprecated mocks removed in production


