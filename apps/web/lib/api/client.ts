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

  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    token = process.env.NEXT_PUBLIC_DEV_JWT
  } else {
    // 前端（浏览器）优先使用 Clerk 注入的 token（仅客户端可用）
    if (typeof window !== 'undefined' && (window as any)?.Clerk) {
      try {
        const clerk = (window as any).Clerk
        if (!(clerk as any)?.loaded) {
          await clerk.load?.()
        }
        const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE
        if (template) {
          token = await clerk?.session?.getToken?.({ template, skipCache: true })
          if (!token) token = await clerk?.session?.getToken?.({ template })
        } else {
          token = await clerk?.session?.getToken?.({ skipCache: true })
          if (!token) token = await clerk?.session?.getToken?.()
        }
      } catch {
        token = undefined
      }
    }
    // 回退到 DEV_JWT
    if (!token) {
      await initClerkTokenProvider()
      token = (await tokenProvider?.()) || process.env.NEXT_PUBLIC_DEV_JWT
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
  const res = await fetch(url, { ...init, headers, cache: 'no-store', credentials: 'include' })
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


