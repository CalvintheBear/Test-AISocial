import { useState, useCallback } from 'react'
import { artworkStateManager } from '@/lib/artworkStateManager'

export function useCompatibleArtworkActions(artworkId: string, initialData?: any) {
  const [localState, setLocalState] = useState({
    liked: initialData?.user_state?.liked ?? false,
    faved: initialData?.user_state?.faved ?? false,
    like_count: initialData?.like_count ?? 0,
    fav_count: initialData?.fav_count ?? 0,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const syncWithGlobalState = useCallback(async () => {
    // 与新系统同步
    try {
      const response = await fetch(`/api/artworks/${artworkId}/state`)
      const data = await response.json()
      setLocalState({
        liked: data.user_state.liked,
        faved: data.user_state.faved,
        like_count: data.like_count,
        fav_count: data.fav_count,
      })
    } catch (e) {
      console.error('Failed to sync state:', e)
    }
  }, [artworkId])

  const toggleLike = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/artworks/${artworkId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()

      if (result.success) {
        setLocalState(prev => ({
          ...prev,
          liked: result.data.user_state.liked,
          like_count: result.data.like_count,
        }))
        
        // 同步到全局状态
        artworkStateManager.updateArtworkState(artworkId, result.data)
      }
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [artworkId])

  const toggleFavorite = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/artworks/${artworkId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()

      if (result.success) {
        setLocalState(prev => ({
          ...prev,
          faved: result.data.user_state.faved,
          fav_count: result.data.fav_count,
        }))
        
        artworkStateManager.updateArtworkState(artworkId, result.data)
      }
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [artworkId])

  return {
    ...localState,
    isLoading,
    error,
    toggleLike,
    toggleFavorite,
    syncWithGlobalState,
  }
}