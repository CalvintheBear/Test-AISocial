'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui'
import { useLike } from '@/hooks/useLike'
import { useFavorite } from '@/hooks/useFavorite'

interface LikeFavoriteBarProps {
  artworkId: string
  initialLikeCount: number
  initialFavoriteCount?: number
  initialIsLiked?: boolean
  initialIsFavorite?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export default function LikeFavoriteBar({
  artworkId,
  initialLikeCount,
  initialFavoriteCount = 0,
  initialIsLiked = false,
  initialIsFavorite = false,
  size = 'sm',
  className,
}: LikeFavoriteBarProps) {
  const { like, unlike } = useLike()
  const { addFavorite, removeFavorite } = useFavorite()

  const [likeCount, setLikeCount] = useState<number>(initialLikeCount || 0)
  const [favoriteCount, setFavoriteCount] = useState<number>(initialFavoriteCount || 0)
  const [isLiked, setIsLiked] = useState<boolean>(!!initialIsLiked)
  const [isFavorite, setIsFavorite] = useState<boolean>(!!initialIsFavorite)

  const onToggleLike = useCallback(async () => {
    try {
      if (isLiked) {
        setIsLiked(false)
        setLikeCount((c) => Math.max(0, c - 1))
        await unlike(artworkId)
      } else {
        setIsLiked(true)
        setLikeCount((c) => c + 1)
        await like(artworkId)
      }
    } catch (e) {
      // revert on error
      setIsLiked((v) => !v)
      setLikeCount((c) => (isLiked ? c + 1 : Math.max(0, c - 1)))
    }
  }, [artworkId, isLiked, like, unlike])

  const onToggleFavorite = useCallback(async () => {
    try {
      if (isFavorite) {
        setIsFavorite(false)
        setFavoriteCount((c) => Math.max(0, c - 1))
        await removeFavorite(artworkId)
      } else {
        setIsFavorite(true)
        setFavoriteCount((c) => c + 1)
        await addFavorite(artworkId)
      }
    } catch (e) {
      // revert on error
      setIsFavorite((v) => !v)
      setFavoriteCount((c) => (isFavorite ? c + 1 : Math.max(0, c - 1)))
    }
  }, [artworkId, isFavorite, addFavorite, removeFavorite])

  return (
    <div className={`flex items-center space-x-4 ${className || ''}`}>
      <Button
        variant="ghost"
        size={size}
        onClick={onToggleLike}
        className={`flex items-center space-x-1 ${isLiked ? 'text-red-600' : ''}`}
      >
        <span>♥</span>
        <span>{likeCount}</span>
      </Button>
      <Button
        variant="ghost"
        size={size}
        onClick={onToggleFavorite}
        className={`flex items-center space-x-1 ${isFavorite ? 'text-yellow-500' : ''}`}
      >
        <span>{isFavorite ? '★' : '☆'}</span>
        <span>{favoriteCount}</span>
      </Button>
    </div>
  )
}


