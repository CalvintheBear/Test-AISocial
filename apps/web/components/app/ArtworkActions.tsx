"use client"

import { useCallback, useEffect, useState } from 'react'
import { Button, Card } from '@/components/ui'
import { useLike } from '@/hooks/useLike'
import { useFavorite } from '@/hooks/useFavorite'
import { usePublish } from '@/hooks/usePublish'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

interface ArtworkActionsProps {
  artworkId: string
  initialLikeCount: number
  initialIsFavorite: boolean
  status: 'draft' | 'published' | 'generating'
  isAuthor?: boolean
  authorId?: string
}

export function ArtworkActions({ artworkId, initialLikeCount, initialIsFavorite, status, isAuthor: isAuthorProp, authorId }: ArtworkActionsProps) {
  const { like } = useLike()
  const { addFavorite, removeFavorite } = useFavorite()
  const { publish } = usePublish()
  const router = useRouter()

  const [likeCount, setLikeCount] = useState<number>(initialLikeCount || 0)
  const [isFavorite, setIsFavorite] = useState<boolean>(!!initialIsFavorite)
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusState, setStatusState] = useState<'draft' | 'published' | 'generating'>(status)
  const [isAuthor, setIsAuthor] = useState<boolean>(!!isAuthorProp)

  useEffect(() => { setIsAuthor(!!isAuthorProp) }, [isAuthorProp])
  useEffect(() => { setStatusState(status) }, [status])

  // 客户端判定作者身份（SSR 下拿不到 token），若父组件未显式给出则尝试自检
  useEffect(() => {
    if (isAuthorProp) return
    if (!authorId) return
    ;(async () => {
      try {
        const me = await authFetch(API.me)
        if (me?.id) setIsAuthor(me.id === authorId)
      } catch {}
    })()
  }, [isAuthorProp, authorId])

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
      setStatusState('published')
      if (typeof window !== 'undefined') router.refresh()
    } finally {
      setPublishing(false)
    }
  }, [artworkId, publish, publishing])

  const onUnpublish = useCallback(async () => {
    if (unpublishing) return
    setUnpublishing(true)
    try {
      await authFetch(API.unpublish(artworkId), { method: 'POST' })
      setStatusState('draft')
      if (typeof window !== 'undefined') router.refresh()
    } finally {
      setUnpublishing(false)
    }
  }, [artworkId, unpublishing, router])

  const onDelete = useCallback(async () => {
    if (deleting) return
    if (typeof window !== 'undefined') {
      const ok = window.confirm('确定要删除该作品吗？此操作不可恢复。')
      if (!ok) return
    }
    setDeleting(true)
    try {
      await authFetch(API.delete(artworkId), { method: 'DELETE' })
      router.push('/user/me')
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }, [artworkId, deleting, router])

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
        <div className="flex items-center space-x-2">
          {statusState === 'draft' && isAuthor && (
            <Button variant="primary" className="bg-green-600 hover:bg-green-700" onClick={onPublish} disabled={publishing}>
              {publishing ? '发布中…' : '发布作品'}
            </Button>
          )}
          {statusState === 'published' && isAuthor && (
            <Button variant="outline" onClick={onUnpublish} disabled={unpublishing}>
              {unpublishing ? '处理中…' : '取消发布'}
            </Button>
          )}
          {isAuthor && (
            <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={onDelete} disabled={deleting}>
              {deleting ? '删除中…' : '删除作品'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}


