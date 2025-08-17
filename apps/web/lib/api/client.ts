// 可选接入 Clerk：在存在 @clerk/nextjs 时动态获取 token，否则回退到 DEV_JWT
// 注意：为兼容 Edge/Pages 构建环境，不在顶层 require/clerk。
let tokenProvider: (() => Promise<string | undefined>) | null = null
export async function initClerkTokenProvider(): Promise<void> {
  if (tokenProvider) return
  try {
    // 动态导入，避免在 Edge 构建时引入 Node 依赖（fs/path）
    const mod = (await import('@clerk/nextjs')).default || (await import('@clerk/nextjs'))
    const { auth } = (mod as any)
    tokenProvider = async () => {
      const { getToken } = auth()
      return await getToken()?.catch(() => undefined)
    }
  } catch {
    tokenProvider = null
  }
}

export async function authFetch<T = any>(input: RequestInfo, init: RequestInit = {}) {
  let token: string | undefined

  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    token = process.env.NEXT_PUBLIC_DEV_JWT
  } else {
    try {
      await initClerkTokenProvider()
      token = (await tokenProvider?.()) || process.env.NEXT_PUBLIC_DEV_JWT
    } catch {
      token = process.env.NEXT_PUBLIC_DEV_JWT
    }
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8787'
  const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  let url: RequestInfo
  if (typeof input === 'string') {
    if (input.startsWith('/api/')) {
      url = new URL(input, API_BASE).toString()
    } else if (input.startsWith('/mocks/')) {
      url = new URL(input, SITE_BASE).toString()
    } else {
      url = input
    }
  } else {
    url = input
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(url, { ...init, headers, cache: 'no-store' })
  if (!res.ok) {
    let err: any
    try { err = await res.json() } catch { err = { message: res.statusText } }
    throw err
  }
  const data = await res.json()
  // Handle unified response format (envelope pattern)
  return data?.success ? data.data : data // Compatibility for transition period
}

// Server-safe mock flag
export const isMockEnabled = () => process.env.NEXT_PUBLIC_USE_MOCK === '1'
// Deprecated: do not use in Server Components
export const useMock = () => typeof window !== 'undefined' && isMockEnabled()


