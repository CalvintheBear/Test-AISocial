import useSWR, { mutate } from 'swr'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

export interface CheckinStats {
  todayCheckedIn: boolean
  consecutiveDays: number
  totalCheckins: number
  lastCheckinDate: string | null
}

export interface CheckinResult {
  success: boolean
  message: string
  data: {
    creditsAdded: number
    consecutiveDays: number
  }
}

export function useCheckinStatus() {
  // 统一今天日期（本地时区），避免 UTC 跨天导致的错判
  const today = new Date().toLocaleDateString('en-CA')
  const localChecked =
    (typeof window !== 'undefined' && localStorage.getItem('checkin:lastDate') === today) || false

  const { data, error, isLoading } = useSWR<CheckinStats>(
    API.checkin.status,
    authFetch,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
      shouldRetryOnError: false,
      fallbackData: localChecked
        ? { todayCheckedIn: true, consecutiveDays: 0, totalCheckins: 0, lastCheckinDate: today }
        : undefined,
    }
  )

  // 服务端确认后，写入本地，供下次首屏快速锁定
  if (typeof window !== 'undefined' && data?.todayCheckedIn) {
    try { localStorage.setItem('checkin:lastDate', today) } catch {}
  }

  return {
    stats: data,
    isLoading,
    error,
    refetch: () => mutate(API.checkin.status),
  }
}

export function useCheckin() {
  const checkin = async (): Promise<CheckinResult> => {
    // authFetch 会在非 2xx 抛错，并解包后端的 { success, data } 为 data
    const data = await authFetch<{ creditsAdded: number; consecutiveDays: number }>(API.checkin.checkin, {
      method: 'POST',
    })

    // data 代表路由返回的 data 字段。若今日已签到，后端 success=false 但依然会返回 { creditsAdded: 0, consecutiveDays: 0 }
    const isSuccess = Number(data?.creditsAdded || 0) > 0

    if (isSuccess) {
      mutate(API.credits.me)
      // 乐观更新：立刻将 todayCheckedIn 置为 true
      mutate(
        API.checkin.status,
        (prev: CheckinStats | undefined) => ({
          todayCheckedIn: true,
          consecutiveDays: (prev?.consecutiveDays ?? 0) + 1,
          totalCheckins: (prev?.totalCheckins ?? 0) + 1,
          lastCheckinDate: new Date().toISOString().split('T')[0],
        }),
        false
      )
      // 写入本地锁定（本地时区）
      try { localStorage.setItem('checkin:lastDate', new Date().toLocaleDateString('en-CA')) } catch {}
      // 再触发一次校正请求
      mutate(API.checkin.status)
    } else {
      // 已签到的场景：同步锁定状态
      mutate(
        API.checkin.status,
        (prev: CheckinStats | undefined) => ({
          todayCheckedIn: true,
          consecutiveDays: prev?.consecutiveDays ?? 0,
          totalCheckins: prev?.totalCheckins ?? 0,
          lastCheckinDate: prev?.lastCheckinDate ?? null,
        }),
        false
      )
      try { localStorage.setItem('checkin:lastDate', new Date().toLocaleDateString('en-CA')) } catch {}
    }

    const result: CheckinResult = {
      success: isSuccess,
      message: isSuccess ? '签到成功！' : '今天已经签到过了',
      data: {
        creditsAdded: Number(data?.creditsAdded || 0),
        consecutiveDays: Number(data?.consecutiveDays || 0),
      },
    }

    return result
  }

  return { checkin }
}
