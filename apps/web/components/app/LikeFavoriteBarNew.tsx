'use client'

import { LikeButtonWrapper } from '../LikeButtonWrapper'
import { FavoriteButtonWrapper } from '../FavoriteButtonWrapper'

interface LikeFavoriteBarNewProps {
  artworkId: string
  initialLikeCount: number
  initialFavoriteCount: number
  initialIsLiked?: boolean
  initialIsFavorite?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showCount?: boolean
}

export default function LikeFavoriteBarNew({
  artworkId,
  initialLikeCount,
  initialFavoriteCount,
  initialIsLiked = false,
  initialIsFavorite = false,
  size = 'md',
  className = '',
  showCount = true,
}: LikeFavoriteBarNewProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <LikeButtonWrapper
        artworkId={artworkId}
        initialLikeCount={initialLikeCount}
        initialIsLiked={initialIsLiked}
        size={size}
        showCount={showCount}
      />
      <FavoriteButtonWrapper
        artworkId={artworkId}
        initialFavCount={initialFavoriteCount}
        initialIsFaved={initialIsFavorite}
        size={size}
        showCount={showCount}
      />
    </div>
  )
}