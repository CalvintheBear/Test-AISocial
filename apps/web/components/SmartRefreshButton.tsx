'use client'

import React, { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { artworkStateManager } from '@/lib/artworkStateManager'
import { mutate } from 'swr'

interface SmartRefreshButtonProps {
  type: 'feed' | 'user' | 'artwork'
  artworkId?: string
  className?: string
}

export function SmartRefreshButton({ type, artworkId, className }: SmartRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      switch (type) {
        case 'feed':
          await artworkStateManager.refreshFeed()
          break
        case 'user':
          await artworkStateManager.refreshUserFavorites()
          break
        case 'artwork':
          if (artworkId) {
            await mutate(`/api/artworks/${artworkId}/state`, undefined, { revalidate: true })
          }
          break
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${className}`}
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>{isRefreshing ? '刷新中...' : '刷新'}</span>
    </button>
  )
}