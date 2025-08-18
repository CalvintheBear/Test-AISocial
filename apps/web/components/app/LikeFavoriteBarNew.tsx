'use client'

import LikeButton from './LikeButton'
import FavoriteButton from './FavoriteButton'

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
      <LikeButton
        artworkId={artworkId}
        initialLikeCount={initialLikeCount}
        initialIsLiked={initialIsLiked}
        size={size}
        showCount={showCount}
      />
      <FavoriteButton
        artworkId={artworkId}
        initialFavoriteCount={initialFavoriteCount}
        initialIsFavorite={initialIsFavorite}
        size={size}
        showCount={showCount}
      />
    </div>
  )
}