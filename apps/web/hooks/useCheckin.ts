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
  // 基于 localStorage 的首屏乐观回退，做到“秒锁定”
  const today = new Date().toISOString().split('T')[0]
  const localChecked =
    (typeof window !== 'undefined' && localStorage.getItem('checkin:lastDate') === today) || false

  const { data, error, isLoading } = useSWR<{ success: boolean; data: CheckinStats }>(
    API.checkin.status,
    authFetch,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
      shouldRetryOnError: false,
      fallbackData: localChecked
        ? { success: true, data: { todayCheckedIn: true, consecutiveDays: 0, totalCheckins: 0, lastCheckinDate: today } }
        : undefined,
    }
  )

  // 服务端确认后，写入本地，供下次首屏快速锁定
  if (typeof window !== 'undefined' && data?.data?.todayCheckedIn) {
    try { localStorage.setItem('checkin:lastDate', today) } catch {}
  }

  return {
    stats: data?.data,
    isLoading,
    error,
    refetch: () => mutate(API.checkin.status),
  }
}

export function useCheckin() {
  const checkin = async (): Promise<CheckinResult> => {
    const response = await authFetch(API.checkin.checkin, {
      method: 'POST',
    })
    
    if (!response.ok) {
      throw new Error('签到失败')
    }
    
    const result = await response.json()
    
    // 签到成功后刷新积分和签到状态
    if (result.success) {
      mutate(API.credits.me)
      // 乐观更新：立刻将 todayCheckedIn 置为 true
      mutate(API.checkin.status, (prev: CheckinStats | undefined) => ({
        todayCheckedIn: true,
        consecutiveDays: (prev?.consecutiveDays ?? 0) + 1,
        totalCheckins: (prev?.totalCheckins ?? 0) + 1,
        lastCheckinDate: new Date().toISOString().split('T')[0],
      }), false)
      // 写入本地锁定
      try { localStorage.setItem('checkin:lastDate', new Date().toISOString().split('T')[0]) } catch {}
      // 再触发一次校正请求
      mutate(API.checkin.status)
    }
    // 已签到的场景：也同步锁定状态
    if (!result.success && String(result.message || '').includes('已经签到')) {
      mutate(API.checkin.status, (prev: CheckinStats | undefined) => ({
        todayCheckedIn: true,
        consecutiveDays: prev?.consecutiveDays ?? 0,
        totalCheckins: prev?.totalCheckins ?? 0,
        lastCheckinDate: prev?.lastCheckinDate ?? null,
      }), false)
      try { localStorage.setItem('checkin:lastDate', new Date().toISOString().split('T')[0]) } catch {}
    }
    
    return result
  }

  return { checkin }
}
