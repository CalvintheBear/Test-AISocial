'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui'
import { useFavorite } from '@/hooks/useFavorite'

interface FavoriteButtonProps {
  artworkId: string
  initialFavoriteCount: number
  initialIsFavorite?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showCount?: boolean
  onFavoriteChange?: (favoriteCount: number, isFavorite: boolean) => void
}

export default function FavoriteButton({
  artworkId,
  initialFavoriteCount,
  initialIsFavorite = false,
  size = 'md',
  className = '',
  showCount = true,
  onFavoriteChange,
}: FavoriteButtonProps) {
  const { addFavorite, removeFavorite } = useFavorite()
  
  const [favoriteCount, setFavoriteCount] = useState<number>(initialFavoriteCount || 0)
  const [isFavorite, setIsFavorite] = useState<boolean>(!!initialIsFavorite)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const onToggleFavorite = useCallback(async () => {
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      if (isFavorite) {
        // Optimistic update
        setIsFavorite(false)
        setFavoriteCount((c) => Math.max(0, c - 1))
        
        const res = await removeFavorite(artworkId)
        setFavoriteCount(res.fav_count)
        setIsFavorite(res.user_state.faved)
        
        onFavoriteChange?.(res.fav_count, res.user_state.faved)
      } else {
        // Optimistic update
        setIsFavorite(true)
        setFavoriteCount((c) => c + 1)
        
        const res = await addFavorite(artworkId)
        setFavoriteCount(res.fav_count)
        setIsFavorite(res.user_state.faved)
        
        onFavoriteChange?.(res.fav_count, res.user_state.faved)
      }
    } catch (e) {
      // Revert on error
      setIsFavorite((v) => !v)
      setFavoriteCount((c) => (isFavorite ? c + 1 : Math.max(0, c - 1)))
      console.error('Failed to toggle favorite:', e)
    } finally {
      setIsLoading(false)
    }
  }, [artworkId, isFavorite, addFavorite, removeFavorite, onFavoriteChange, isLoading])

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  }

  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'sm' : 'lg'}
      onClick={onToggleFavorite}
      disabled={isLoading}
      className={`flex items-center space-x-1 transition-colors ${
        isFavorite ? 'text-yellow-600 hover:text-yellow-700' : 'text-gray-500 hover:text-yellow-500'
      } ${sizeClasses[size]} ${className}`}
    >
      <span className="text-lg">{isFavorite ? '★' : '☆'}</span>
      {showCount && <span className="font-medium">{favoriteCount}</span>}
    </Button>
  )
}