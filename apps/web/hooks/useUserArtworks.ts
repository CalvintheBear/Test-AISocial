import useSWR from 'swr'
import { ArtworkListItem } from '@/lib/types'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

const fetchUserArtworks = async (userId: string): Promise<ArtworkListItem[]> => {
  if (!userId) throw new Error('User ID is required')
  return authFetch(API.userArtworks(userId))
}

export function useUserArtworks(userId: string) {
  const { data, error, isLoading, mutate } = useSWR<ArtworkListItem[]>(
    userId ? `user-artworks-${userId}` : null,
    () => fetchUserArtworks(userId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  const optimisticAddDraft = (item: ArtworkListItem) => {
    mutate((prev) => {
      const list = Array.isArray(prev) ? prev.slice(0) : []
      return [item, ...list]
    }, false)
  }

  const optimisticRemove = (artworkId: string) => {
    mutate((prev) => {
      const list = Array.isArray(prev) ? prev : []
      return list.filter((a) => a.id !== artworkId)
    }, false)
  }

  return {
    artworks: data || [],
    isLoading,
    error,
    mutate,
    optimisticAddDraft,
    optimisticRemove,
  }
}