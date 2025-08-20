import useSWR from 'swr'
import { ArtworkListItem } from '@/lib/types'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { adaptArtworkList } from '@/lib/apiAdapter'

const fetchUserArtworks = async (userId: string): Promise<ArtworkListItem[]> => {
  if (!userId) throw new Error('User ID is required')
  const response = await authFetch(API.userArtworks(userId))
  return adaptArtworkList(response)
}

export function useUserArtworks(userId: string, initialData?: ArtworkListItem[]) {
  const { data, error, isLoading, mutate } = useSWR<ArtworkListItem[]>(
    userId ? `user-artworks-${userId}` : null,
    () => fetchUserArtworks(userId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      fallbackData: initialData,
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