'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui'
import { useLike } from '@/hooks/useLike'

interface LikeButtonProps {
  artworkId: string
  initialLikeCount: number
  initialIsLiked?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showCount?: boolean
  onLikeChange?: (likeCount: number, isLiked: boolean) => void
}

export default function LikeButton({
  artworkId,
  initialLikeCount,
  initialIsLiked = false,
  size = 'md',
  className = '',
  showCount = true,
  onLikeChange,
}: LikeButtonProps) {
  const { like, unlike } = useLike()
  
  const [likeCount, setLikeCount] = useState<number>(initialLikeCount || 0)
  const [isLiked, setIsLiked] = useState<boolean>(!!initialIsLiked)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const onToggleLike = useCallback(async () => {
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      if (isLiked) {
        // Optimistic update
        setIsLiked(false)
        setLikeCount((c) => Math.max(0, c - 1))
        
        const res = await unlike(artworkId)
        setLikeCount(res.like_count)
        setIsLiked(res.user_state.liked)
        
        onLikeChange?.(res.like_count, res.user_state.liked)
      } else {
        // Optimistic update
        setIsLiked(true)
        setLikeCount((c) => c + 1)
        
        const res = await like(artworkId)
        setLikeCount(res.like_count)
        setIsLiked(res.user_state.liked)
        
        onLikeChange?.(res.like_count, res.user_state.liked)
      }
    } catch (e) {
      // Revert on error
      setIsLiked((v) => !v)
      setLikeCount((c) => (isLiked ? c + 1 : Math.max(0, c - 1)))
      console.error('Failed to toggle like:', e)
    } finally {
      setIsLoading(false)
    }
  }, [artworkId, isLiked, like, unlike, onLikeChange, isLoading])

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  }

  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg'}
      onClick={onToggleLike}
      disabled={isLoading}
      className={`flex items-center space-x-1 transition-colors ${
        isLiked ? 'text-red-600 hover:text-red-700' : 'text-gray-500 hover:text-red-500'
      } ${sizeClasses[size]} ${className}`}
    >
      <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
      {showCount && <span className="font-medium">{likeCount}</span>}
    </Button>
  )
}