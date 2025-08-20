import { useState, useCallback } from 'react'
import { artworkStateManager } from '@/lib/artworkStateManager'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

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
      const data = await authFetch(API.base(`/api/artworks/${artworkId}/state`))
      setLocalState({
        liked: data.user_state?.liked ?? false,
        faved: data.user_state?.faved ?? false,
        like_count: data.like_count ?? 0,
        fav_count: data.fav_count ?? 0,
      })
    } catch (e) {
      console.error('Failed to sync state:', e)
    }
  }, [artworkId])

  const toggleLike = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authFetch(API.like(artworkId), { method: 'POST' })
      setLocalState(prev => ({
        ...prev,
        liked: result.user_state?.liked ?? true,
        like_count: result.like_count ?? prev.like_count + 1,
      }))
      // 同步到全局状态
      artworkStateManager.updateArtworkState(artworkId, result)
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
      const result = await authFetch(API.favorite(artworkId), { method: 'POST' })
      setLocalState(prev => ({
        ...prev,
        faved: result.user_state?.faved ?? true,
        fav_count: result.fav_count ?? prev.fav_count + 1,
      }))
      artworkStateManager.updateArtworkState(artworkId, result)
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