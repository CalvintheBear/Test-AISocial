"use client"
import { Badge } from '@/components/ui'
import { useCredits } from '@/hooks/useCredits'

export default function CreditsBadge() {
  const { credits, loading } = useCredits()
  return (
    <Badge variant="default" className="bg-primary-100 text-primary-700">
      {loading ? '积分加载中…' : `积分：${credits ?? 0}`}
    </Badge>
  )
}


