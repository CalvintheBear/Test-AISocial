"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCheckinStatus, useCheckin } from '@/hooks/useCheckin'

export default function CheckinButton() {
  const { stats, isLoading, refetch } = useCheckinStatus()
  const { checkin } = useCheckin()
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [checkedTodayLocal, setCheckedTodayLocal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const today = new Date().toLocaleDateString('en-CA')
      return localStorage.getItem('checkin:lastDate') === today
    } catch {
      return false
    }
  })

  const handleCheckin = async () => {
    if (isCheckingIn || stats?.todayCheckedIn || checkedTodayLocal) return
    
    setIsCheckingIn(true)
    try {
      const result = await checkin()
      if (result.success) {
        setCheckedTodayLocal(true)
        // 立即拉取一次最新状态，防止按钮可重复点击
        refetch()
      } else {
        if (result.message?.includes('已经签到')) {
          setCheckedTodayLocal(true)
          refetch()
        } else {
        }
      }
    } catch (error) {
      // Handle error silently or with console log
      console.error('签到失败:', error)
    } finally {
      setIsCheckingIn(false)
    }
  }

  // 加载时也先禁用，文字提示更明确
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        正在检测今日签到…
      </Button>
    )
  }

  const consecutiveDays = stats?.consecutiveDays ?? 0
  const checkedToday = Boolean(stats?.todayCheckedIn || checkedTodayLocal)

  return (
    <div className="flex items-center gap-2">
      {consecutiveDays > 0 && (
        <Badge variant="secondary" className="text-xs">
          连续{consecutiveDays}天
        </Badge>
      )}
      <Button
        variant={checkedToday ? "outline" : "default"}
        size="sm"
        onClick={handleCheckin}
        disabled={checkedToday || isCheckingIn}
        aria-disabled={checkedToday || isCheckingIn}
        className={checkedToday ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-default hover:bg-gray-100 pointer-events-none' : ''}
      >
        {checkedToday ? '今日已签到' : isCheckingIn ? '签到中...' : '签到'}
      </Button>
    </div>
  )
}
