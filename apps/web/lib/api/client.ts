// 运行时 Token 方案（Edge 兼容）：优先使用环境变量 DEV_JWT；
// 如需接入 Clerk，请在 Node.js 运行时下通过独立服务器动作读取并下发到前端或设置 Cookie，再由此处读取。
let tokenProvider: (() => Promise<string | undefined>) | null = null
export async function initClerkTokenProvider(): Promise<void> {
  // 为保障 Edge 构建通过，当前不从 @clerk/nextjs 动态导入。

  if (tokenProvider) return
  tokenProvider = async () => undefined
}

export async function authFetch<T = any>(input: RequestInfo, init: RequestInit = {}) {
  let token: string | undefined

  // 为 GET 请求启用“快速路径”：在短超时内尝试拿 token，拿不到则先无 token 请求，必要时再重试
  const method = (init.method || 'GET').toUpperCase()
  const isGet = method === 'GET'

  async function getClerkTokenWithTimeout(timeoutMs = 200): Promise<string | undefined> {
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
      return await Promise.race([loadPromise as Promise<string | undefined>, timeout])
    } catch (e) {
      console.warn('Failed to get Clerk token quickly:', e)
      return undefined
    }
  }

  async function getClerkTokenNoTimeout(): Promise<string | undefined> {
    if (typeof window === 'undefined') return undefined
    try {
      const clerk = (window as any).Clerk
      if (!clerk) return undefined
      if (!clerk.loaded) {
        await clerk.load?.()
      }
      const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE
      if (template) {
        return (await clerk?.session?.getToken?.({ template, skipCache: true })) ||
          (await clerk?.session?.getToken?.({ template }))
      }
      return (await clerk?.session?.getToken?.({ skipCache: true })) ||
        (await clerk?.session?.getToken?.())
    } catch (error) {
      console.warn('Failed to get Clerk token:', error)
      return undefined
    }
  }

  // 先尝试快速拿 token（仅客户端）
  token = await getClerkTokenWithTimeout(200)

  // 可选回退到 DEV_JWT（需显式开启）
  if (!token) {
    await initClerkTokenProvider()
    const maybeToken = await tokenProvider?.()
    const devJwt = process.env.NEXT_PUBLIC_DEV_JWT
    const useDevJwt = process.env.NEXT_PUBLIC_USE_DEV_JWT === '1'
    const normalized = (maybeToken || '').trim()
    const isLikelyValid = normalized && normalized !== 'undefined' && normalized !== 'null'
    token = isLikelyValid ? normalized : (useDevJwt ? devJwt : undefined)
  }

  // 对写请求（POST/PUT/PATCH/DELETE），若仍未拿到 token，则等待一次无超时获取，避免 401
  if (!token && typeof window !== 'undefined' && !isGet) {
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


