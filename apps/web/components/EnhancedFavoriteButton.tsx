import React, { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useArtworkState } from '@/hooks/useArtworkState'
import { cn } from '@/lib/utils'

interface EnhancedFavoriteButtonProps {
  artworkId: string
  initialState?: {
    faved: boolean
    favCount: number
  }
  className?: string
  showCount?: boolean
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function EnhancedFavoriteButton({
  artworkId,
  initialState,
  className,
  showCount = true,
  onSuccess,
  onError,
}: EnhancedFavoriteButtonProps) {
  const { state, toggleFavorite, isLoading, isError } = useArtworkState(artworkId)
  const [isAnimating, setIsAnimating] = useState(false)

  const faved = state?.user_state.faved ?? initialState?.faved ?? false
  const favCount = state?.fav_count ?? initialState?.favCount ?? 0

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) return

    setIsAnimating(true)
    
    try {
      await toggleFavorite()
      onSuccess?.()
    } catch (error) {
      onError?.(error as Error)
    } finally {
      setTimeout(() => setIsAnimating(false), 300)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          'flex items-center space-x-1 transition-all duration-200',
          'hover:scale-110 active:scale-95',
          faved && 'text-yellow-500',
          isLoading && 'opacity-50 cursor-not-allowed',
          isAnimating && 'animate-pulse',
          className
        )}
        aria-label={faved ? '取消收藏' : '收藏'}
      >
        <Bookmark
          className={cn(
            'h-5 w-5 transition-all',
            faved ? 'fill-current' : 'fill-none'
          )}
        />
        {showCount && (
          <span className="text-sm font-medium tabular-nums">
            {isLoading ? '...' : favCount}
          </span>
        )}
      </button>

      {isError && (
        <button
          onClick={() => window.location.reload()} // 简单重试
          className="text-xs text-red-500 hover:text-red-700"
          title="同步失败，点击刷新"
        >
          ⚠️
        </button>
      )}
    </div>
  )
}