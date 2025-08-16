export async function authFetch<T = any>(input: RequestInfo, init: RequestInit = {}) {
  // TODO: 集成 Clerk 前端获取 JWT，附加到 Authorization 头
  const res = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
  })
  if (!res.ok) {
    let err: any
    try { err = await res.json() } catch { err = { message: res.statusText } }
    throw err
  }
  return res.json() as Promise<T>
}

// Server-safe mock flag
export const isMockEnabled = () => process.env.NEXT_PUBLIC_USE_MOCK === '1'
// Deprecated: do not use in Server Components
export const useMock = () => typeof window !== 'undefined' && isMockEnabled()


