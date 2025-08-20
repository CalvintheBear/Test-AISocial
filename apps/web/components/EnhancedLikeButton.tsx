import React, { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useCompatibleArtworkState } from '@/hooks/useCompatibleArtworkState'
import { cn } from '@/lib/utils'
import { useClerkEnabled } from '@/hooks/useClerkEnabled'
import { useAuth } from '@clerk/nextjs'

interface EnhancedLikeButtonProps {
  artworkId: string
  initialState?: {
    liked: boolean
    likeCount: number
  }
  className?: string
  showCount?: boolean
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function EnhancedLikeButton({
  artworkId,
  initialState,
  className,
  showCount = true,
  onSuccess,
  onError,
}: EnhancedLikeButtonProps) {
  const { state, toggleLike, isLoading, isError } = useCompatibleArtworkState(artworkId)
  const [isAnimating, setIsAnimating] = useState(false)
  const isClerkEnabled = useClerkEnabled()
  const { isLoaded, isSignedIn } = useAuth()

  // 使用初始状态或从全局状态获取
  const liked = state?.user_state.liked ?? initialState?.liked ?? false
  const likeCount = state?.like_count ?? initialState?.likeCount ?? 0

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) return

    if (isClerkEnabled && isLoaded && !isSignedIn) {
      const current = typeof window !== 'undefined' ? window.location.href : '/'
      window.location.href = `/login?redirect=${encodeURIComponent(current)}`
      return
    }

    setIsAnimating(true)
    
    try {
      await toggleLike()
      onSuccess?.()
    } catch (error) {
      onError?.(error as Error)
    } finally {
      setTimeout(() => setIsAnimating(false), 300)
    }
  }

  const handleRetry = () => {
    // 重新获取最新状态
    window.location.reload()
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          'flex items-center space-x-1 transition-all duration-200',
          'hover:scale-110 active:scale-95',
          liked && 'text-red-500',
          isLoading && 'opacity-50 cursor-not-allowed',
          isAnimating && 'animate-pulse',
          className
        )}
        aria-label={liked ? '取消点赞' : '点赞'}
      >
        <Heart
          className={cn(
            'h-5 w-5 transition-all',
            liked ? 'fill-current' : 'fill-none'
          )}
        />
        {showCount && (
          <span className="text-sm font-medium tabular-nums">
            {isLoading ? '...' : likeCount}
          </span>
        )}
      </button>

      {isError && (
        <button
          onClick={handleRetry}
          className="text-xs text-red-500 hover:text-red-700"
          title="点击重试"
        >
          ⚠️
        </button>
      )}
    </div>
  )
}