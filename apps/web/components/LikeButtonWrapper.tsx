import React from 'react'
import { EnhancedLikeButton } from './EnhancedLikeButton'

interface LikeButtonWrapperProps {
  artworkId: string
  initialLikeCount?: number
  initialIsLiked?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showCount?: boolean
}

export function LikeButtonWrapper({
  artworkId,
  initialLikeCount = 0,
  initialIsLiked = false,
  size = 'md',
  className,
  showCount = true,
}: LikeButtonWrapperProps) {
  // 直接使用新系统，忽略旧参数
  return (
    <EnhancedLikeButton
      artworkId={artworkId}
      initialState={{
        liked: initialIsLiked,
        likeCount: initialLikeCount,
      }}
      className={className}
      showCount={showCount}
    />
  )
}