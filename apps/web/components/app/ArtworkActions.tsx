'use client'

import { useCallback, useMemo, useState } from 'react'
import { Button, Card } from '@/components/ui'
import { useLike } from '@/hooks/useLike'
import { useFavorite } from '@/hooks/useFavorite'
import { usePublish } from '@/hooks/usePublish'

interface ArtworkActionsProps {
  artworkId: string
  initialLikeCount: number
  initialIsFavorite: boolean
  status: 'draft' | 'published'
}

export function ArtworkActions({ artworkId, initialLikeCount, initialIsFavorite, status }: ArtworkActionsProps) {
  const { like } = useLike()
  const { addFavorite, removeFavorite } = useFavorite()
  const { publish } = usePublish()

  const [likeCount, setLikeCount] = useState<number>(initialLikeCount || 0)
  const [isFavorite, setIsFavorite] = useState<boolean>(!!initialIsFavorite)
  const [publishing, setPublishing] = useState(false)

  const onLike = useCallback(async () => {
    setLikeCount((c) => c + 1)
    try { await like(artworkId) } catch {}
  }, [artworkId, like])

  const onFavorite = useCallback(async () => {
    setIsFavorite((f) => !f)
    try {
      if (!isFavorite) await addFavorite(artworkId)
      else await removeFavorite(artworkId)
    } catch {}
  }, [artworkId, isFavorite, addFavorite, removeFavorite])

  const onPublish = useCallback(async () => {
    if (publishing) return
    setPublishing(true)
    try {
      await publish(artworkId)
      // 简单刷新页面以获取最新状态
      if (typeof window !== 'undefined') window.location.reload()
    } finally {
      setPublishing(false)
    }
  }, [artworkId, publish, publishing])

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center space-x-2" onClick={onLike}>
            <span>♥</span>
            <span>{likeCount}</span>
          </Button>
          <Button variant={isFavorite ? 'primary' : 'outline'} className="flex items-center space-x-2" onClick={onFavorite}>
            <span>{isFavorite ? '★' : '☆'}</span>
            <span>收藏</span>
          </Button>
        </div>
        {status === 'draft' && (
          <Button variant="primary" className="bg-green-600 hover:bg-green-700" onClick={onPublish} disabled={publishing}>
            {publishing ? '发布中…' : '发布作品'}
          </Button>
        )}
      </div>
    </Card>
  )
}


