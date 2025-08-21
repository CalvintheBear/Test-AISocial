import useSWR from 'swr'
import { API } from '@/lib/api/endpoints'
import { authFetch } from '@/lib/api/client'

export function useCredits() {
  const localInitial = (() => {
    if (typeof window === 'undefined') return undefined as number | undefined
    try {
      const raw = localStorage.getItem('credits:value')
      return raw ? Number(raw) : undefined
    } catch { return undefined }
  })()

  const { data, error, isLoading, mutate } = useSWR<any>(
    API.credits.me,
    authFetch,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      fallbackData: typeof localInitial === 'number' ? { credits: localInitial } : undefined,
    }
  )

  const parsed = (() => {
    const value = typeof data === 'number' ? data : (data?.credits ?? data)
    return typeof value === 'number' ? value : 0
  })()

  // 将最新积分写入本地，用于下次首屏回显
  if (typeof window !== 'undefined') {
    try { localStorage.setItem('credits:value', String(parsed)) } catch {}
  }

  return {
    credits: parsed as number,
    loading: isLoading,
    error: error ? (error as any).message || '获取积分失败' : null,
    refresh: () => mutate(),
  }
}


