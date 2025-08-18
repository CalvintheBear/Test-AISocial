import useSWR from 'swr'
import { useCallback } from 'react'
import { artworkStateManager } from '@/lib/artworkStateManager'

interface ArtworkState {
  like_count: number
  fav_count: number
  user_state: {
    liked: boolean
    faved: boolean
  }
}

interface ArtworkStateManager {
  getArtworkState: (artworkId: string) => ArtworkState | undefined
  toggleLike: (artworkId: string) => Promise<void>
  toggleFavorite: (artworkId: string) => Promise<void>
  refreshArtwork: (artworkId: string) => Promise<void>
  refreshAll: () => Promise<void>
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch artwork state')
  }
  const data = await response.json()
  return data.data
}

export function useArtworkState(artworkId: string) {
  const { data, error, mutate } = useSWR<ArtworkState>(
    artworkId ? `/api/artworks/${artworkId}/state` : null,
    fetcher,
    {
      // 基础配置
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      
      // 优化配置
      dedupingInterval: 2000,       // 减少重复请求到2秒
      errorRetryCount: 2,           // 最多重试2次
      errorRetryInterval: 500,      // 重试间隔500ms
      refreshInterval: 15000,       // 每15秒自动刷新
      keepPreviousData: true,       // 保持旧数据减少闪烁
      
      // 预加载配置
      refreshWhenHidden: true,      // 后台也刷新
      suspense: false,              // 禁用suspense避免阻塞
    }
  )

  const toggleLike = useCallback(async () => {
    if (!artworkId) return

    // Optimistic update
    mutate(
      (current) => {
        if (!current) return current
        return {
          ...current,
          like_count: current.user_state.liked 
            ? Math.max(0, current.like_count - 1) 
            : current.like_count + 1,
          user_state: {
            ...current.user_state,
            liked: !current.user_state.liked,
          },
        }
      },
      false // Don't revalidate, wait for API response
    )

    try {
      const response = await fetch(`/api/artworks/${artworkId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      
      if (result.success) {
        mutate(result.data, false)
        // Broadcast update to all related caches
        artworkStateManager.updateArtworkState(artworkId, result.data)
        artworkStateManager.refreshFeed()
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      // Rollback to previous state
      mutate()
    }
  }, [artworkId, mutate])

  const toggleFavorite = useCallback(async () => {
    if (!artworkId) return

    mutate(
      (current) => {
        if (!current) return current
        return {
          ...current,
          fav_count: current.user_state.faved 
            ? Math.max(0, current.fav_count - 1) 
            : current.fav_count + 1,
          user_state: {
            ...current.user_state,
            faved: !current.user_state.faved,
          },
        }
      },
      false
    )

    try {
      const response = await fetch(`/api/artworks/${artworkId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      
      if (result.success) {
        mutate(result.data, false)
        artworkStateManager.updateArtworkState(artworkId, result.data)
        artworkStateManager.refreshFeed()
        artworkStateManager.refreshUserFavorites()
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      mutate()
    }
  }, [artworkId, mutate])

  const refreshArtwork = useCallback(async () => {
    mutate()
  }, [mutate])

  // 智能刷新函数
  const smartRefresh = useCallback(async () => {
    await mutate(undefined, { revalidate: true })
  }, [mutate])

  // 批量刷新相关数据
  const refreshRelatedData = useCallback(async () => {
    await Promise.all([
      mutate(),
      artworkStateManager.refreshFeed(),
      artworkStateManager.refreshUserFavorites()
    ])
  }, [mutate])

  return {
    state: data,
    isLoading: !error && !data,
    isError: error,
    toggleLike,
    toggleFavorite,
    refreshArtwork,
    refresh: smartRefresh,
    refreshRelated: refreshRelatedData,
  }
}