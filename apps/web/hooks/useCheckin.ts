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
  const { data, error, isLoading } = useSWR<{ success: boolean; data: CheckinStats }>(
    API.checkin.status,
    authFetch,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

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
      mutate(API.checkin.status)
    }
    
    return result
  }

  return { checkin }
}
