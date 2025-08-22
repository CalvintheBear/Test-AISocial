"use client"
import { Badge, Button } from '@/components/ui'
import { useCredits } from '@/hooks/useCredits'

export default function CreditsBadge() {
  const { credits, loading, refresh } = useCredits()
  return (
    <div className="flex items-center gap-2">
      <Badge variant="gradient" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md border-0 px-3 py-1">
        💎 {loading ? '加载中…' : `${credits ?? 0} 积分`}
      </Badge>
      <Button variant="ghost" size="sm" onClick={refresh} disabled={loading} className="text-xs hover:bg-accent/50">
        {loading ? '⟳' : '↻'}
      </Button>
    </div>
  )
}


