import { useState, useCallback, useEffect } from 'react'
import { isFeatureEnabled } from '@/lib/featureFlags'

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
  getState: (id: string) => `/api/artworks/${id}/state`,
  like: (id: string) => `/api/artworks/${id}/like`,
  favorite: (id: string) => `/api/artworks/${id}/favorite`,
}

// 旧的API端点（兼容性）
const oldEndpoints = {
  getArtwork: (id: string) => `/api/artworks/${id}`,
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
        const response = await fetch(newEndpoints.getState(artworkId), {
          credentials: 'include',
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        if (data.success) {
          setState(data.data)
        }
      } else {
        // 使用旧端点进行兼容
        const response = await fetch(oldEndpoints.getArtwork(artworkId), {
          credentials: 'include',
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        if (data.success) {
          setState({
            like_count: data.data.like_count || 0,
            fav_count: data.data.favorite_count || 0,
            user_state: {
              liked: data.data.user_liked || false,
              faved: data.data.user_favorited || false,
            },
          })
        }
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
    if (!artworkId || !state) return

    setIsLoading(true)
    
    try {
      const currentLiked = state.user_state.liked
      const method = useNewSystem ? (currentLiked ? 'DELETE' : 'POST') : 'POST'
      const endpoint = useNewSystem 
        ? newEndpoints.like(artworkId)
        : `/api/artworks/${artworkId}/like`

      const response = await fetch(endpoint, {
        method: method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: useNewSystem ? undefined : JSON.stringify({ action: currentLiked ? 'unlike' : 'like' }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        // 更新本地状态
        setState(prev => prev ? {
          ...prev,
          like_count: data.data.like_count || prev.like_count + (currentLiked ? -1 : 1),
          user_state: {
            ...prev.user_state,
            liked: !currentLiked,
          },
        } : null)
        
        // 延迟刷新以确保一致性
        setTimeout(() => fetchState(), 500)
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [artworkId, state, useNewSystem, fetchState])

  // 切换收藏
  const toggleFavorite = useCallback(async () => {
    if (!artworkId || !state) return

    setIsLoading(true)
    
    try {
      const currentFaved = state.user_state.faved
      const method = useNewSystem ? (currentFaved ? 'DELETE' : 'POST') : 'POST'
      const endpoint = useNewSystem 
        ? newEndpoints.favorite(artworkId)
        : `/api/artworks/${artworkId}/favorite`

      const response = await fetch(endpoint, {
        method: method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: useNewSystem ? undefined : JSON.stringify({ action: currentFaved ? 'unfavorite' : 'favorite' }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        // 更新本地状态
        setState(prev => prev ? {
          ...prev,
          fav_count: data.data.fav_count || prev.fav_count + (currentFaved ? -1 : 1),
          user_state: {
            ...prev.user_state,
            faved: !currentFaved,
          },
        } : null)
        
        // 延迟刷新以确保一致性
        setTimeout(() => fetchState(), 500)
      }
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