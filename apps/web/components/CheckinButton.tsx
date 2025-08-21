"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCheckinStatus, useCheckin } from '@/hooks/useCheckin'
import { toast } from '@/components/ui/toast'

export default function CheckinButton() {
  const { stats, isLoading } = useCheckinStatus()
  const { checkin } = useCheckin()
  const [isCheckingIn, setIsCheckingIn] = useState(false)

  const handleCheckin = async () => {
    if (isCheckingIn || stats?.todayCheckedIn) return
    
    setIsCheckingIn(true)
    try {
      const result = await checkin()
      if (result.success) {
        toast.success('签到成功！', `获得${result.data.creditsAdded}积分，连续签到${result.data.consecutiveDays}天`)
      } else {
        toast.error('签到失败', result.message)
      }
    } catch (error) {
      toast.error('签到失败', '网络错误，请稍后重试')
    } finally {
      setIsCheckingIn(false)
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        加载中...
      </Button>
    )
  }

  const consecutiveDays = stats?.consecutiveDays ?? 0

  return (
    <div className="flex items-center gap-2">
      {consecutiveDays > 0 && (
        <Badge variant="secondary" className="text-xs">
          连续{consecutiveDays}天
        </Badge>
      )}
      <Button
        variant={stats?.todayCheckedIn ? "outline" : "primary"}
        size="sm"
        onClick={handleCheckin}
        disabled={stats?.todayCheckedIn || isCheckingIn}
      >
        {stats?.todayCheckedIn ? '已签到' : isCheckingIn ? '签到中...' : '签到'}
      </Button>
    </div>
  )
}
