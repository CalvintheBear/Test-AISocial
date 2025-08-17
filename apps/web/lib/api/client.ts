// 可选接入 Clerk：在存在 @clerk/nextjs 时动态获取 token，否则回退到 DEV_JWT
let tokenProvider: (() => Promise<string | undefined>) | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@clerk/nextjs')
  tokenProvider = async () => {
    const { auth } = mod
    const { getToken } = auth()
    return await getToken()?.catch(() => undefined)
  }
} catch {}

export async function authFetch<T = any>(input: RequestInfo, init: RequestInit = {}) {
  let token: string | undefined

  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    token = process.env.NEXT_PUBLIC_DEV_JWT
  } else {
    try {
      token = (await tokenProvider?.()) || process.env.NEXT_PUBLIC_DEV_JWT
    } catch {
      token = process.env.NEXT_PUBLIC_DEV_JWT
    }
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8787'
  const url = typeof input === 'string' && input.startsWith('/api/')
    ? new URL(input, API_BASE).toString()
    : input

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


