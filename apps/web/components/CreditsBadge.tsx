"use client"
import { Badge, Button } from '@/components/ui'
import { useCredits } from '@/hooks/useCredits'

export default function CreditsBadge() {
  const { credits, loading, refresh } = useCredits()
  return (
    <div className="flex items-center gap-2">
      <Badge variant="default" className="bg-primary-100 text-primary-700">
        {loading ? '积分加载中…' : `积分：${credits ?? 0}`}
      </Badge>
      <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
        {loading ? '刷新中…' : '刷新'}
      </Button>
    </div>
  )
}


