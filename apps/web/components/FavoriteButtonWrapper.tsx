import React from 'react'
import { EnhancedFavoriteButton } from './EnhancedFavoriteButton'

interface FavoriteButtonWrapperProps {
  artworkId: string
  initialFavCount?: number
  initialIsFaved?: boolean
  className?: string
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function FavoriteButtonWrapper({
  artworkId,
  initialFavCount = 0,
  initialIsFaved = false,
  className,
  showCount = true,
}: FavoriteButtonWrapperProps) {
  return (
    <EnhancedFavoriteButton
      artworkId={artworkId}
      initialState={{
        faved: initialIsFaved,
        favCount: initialFavCount,
      }}
      className={className}
      showCount={showCount}
    />
  )
}