import { useCallback, useEffect, useState } from 'react'
import { API } from '@/lib/api/endpoints'
import { authFetch } from '@/lib/api/client'

export function useCredits() {
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authFetch<{ credits: number }>(API.credits.me)
      const value = (data as any)?.credits ?? (data as any)
      setCredits(typeof value === 'number' ? value : 0)
    } catch (e: any) {
      setError(e?.message || '获取积分失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { credits, loading, error, refresh }
}


