import { useState, useCallback, useEffect } from 'react'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

interface ArtworkState {
  like_count: number
  fav_count: number
  user_state: {
    liked: boolean
    faved: boolean
  }
}

interface ArtworkStateHook {
  state: ArtworkState | null
  isLoading: boolean
  isError: boolean
  toggleLike: () => Promise<void>
  toggleFavorite: () => Promise<void>
  refresh: () => Promise<void>
}

// 新的API端点
const newEndpoints = {
  getState: (id: string) => API.base(`/api/artworks/${id}/state`),
  like: (id: string) => API.like(id),
  favorite: (id: string) => API.favorite(id),
}

// 旧的API端点（兼容性）
const oldEndpoints = {
  getArtwork: (id: string) => API.artwork(id),
}

export function useCompatibleArtworkState(artworkId: string): ArtworkStateHook {
  const useNewSystem = isFeatureEnabled('USE_NEW_LIKE_SYSTEM')
  
  const [state, setState] = useState<ArtworkState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  // 获取状态数据
  const fetchState = useCallback(async () => {
    if (!artworkId) return

    setIsLoading(true)
    setIsError(false)

    try {
      if (useNewSystem) {
        // 使用新端点
        const data = await authFetch(newEndpoints.getState(artworkId))
        setState(data)
      } else {
        // 使用旧端点进行兼容
        const data = await authFetch(oldEndpoints.getArtwork(artworkId))
        setState({
          like_count: data.like_count || 0,
          fav_count: data.favorite_count || data.fav_count || 0,
          user_state: {
            liked: data.user_liked ?? data.user_state?.liked ?? false,
            faved: data.user_favorited ?? data.user_state?.faved ?? false,
          },
        })
      }
    } catch (error) {
      console.error('Failed to fetch artwork state:', error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [artworkId, useNewSystem])

  // 切换点赞
  const toggleLike = useCallback(async () => {
    if (!artworkId) return

    setIsLoading(true)
    
    try {
      const currentLiked = state?.user_state.liked ?? false
      const method = useNewSystem ? (currentLiked ? 'DELETE' : 'POST') : 'POST'
      const endpoint = useNewSystem 
        ? newEndpoints.like(artworkId)
        : `/api/artworks/${artworkId}/like`

      const data = await authFetch(endpoint, {
        method: method,
        ...(useNewSystem ? {} : { body: JSON.stringify({ action: currentLiked ? 'unlike' : 'like' }) }),
      })
      // 更新本地状态
      setState(prev => prev ? {
        ...prev,
        like_count: data.like_count ?? prev.like_count + (currentLiked ? -1 : 1),
        user_state: {
          ...prev.user_state,
          liked: !currentLiked,
        },
      } : {
        like_count: data.like_count ?? (currentLiked ? 0 : 1),
        fav_count: 0,
        user_state: { liked: !currentLiked, faved: false }
      })
      // 省略二次拉取，依赖本地合并与后端返回的计数，减少一次网络请求
    } catch (error) {
      console.error('Failed to toggle like:', error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [artworkId, state, useNewSystem, fetchState])

  // 切换收藏
  const toggleFavorite = useCallback(async () => {
    if (!artworkId) return

    setIsLoading(true)
    
    try {
      const currentFaved = state?.user_state.faved ?? false
      const method = useNewSystem ? (currentFaved ? 'DELETE' : 'POST') : 'POST'
      const endpoint = useNewSystem 
        ? newEndpoints.favorite(artworkId)
        : `/api/artworks/${artworkId}/favorite`

      const data = await authFetch(endpoint, {
        method: method,
        ...(useNewSystem ? {} : { body: JSON.stringify({ action: currentFaved ? 'unfavorite' : 'favorite' }) }),
      })
      // 更新本地状态
      setState(prev => prev ? {
        ...prev,
        fav_count: data.fav_count ?? prev.fav_count + (currentFaved ? -1 : 1),
        user_state: {
          ...prev.user_state,
          faved: !currentFaved,
        },
      } : {
        like_count: 0,
        fav_count: data.fav_count ?? (currentFaved ? 0 : 1),
        user_state: { liked: false, faved: !currentFaved }
      })
      // 省略二次拉取，依赖本地合并与后端返回的计数，减少一次网络请求
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [artworkId, state, useNewSystem, fetchState])

  // 刷新数据
  const refresh = useCallback(async () => {
    await fetchState()
  }, [fetchState])

  // 初始化加载
  useEffect(() => {
    fetchState()
  }, [fetchState])

  return {
    state,
    isLoading,
    isError,
    toggleLike,
    toggleFavorite,
    refresh,
  }
}