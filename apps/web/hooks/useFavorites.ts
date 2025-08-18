import useSWR from 'swr'
import { ArtworkListItem } from '@/lib/types'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { adaptArtworkList } from '@/lib/apiAdapter'

const fetchUserFavorites = async (userId: string): Promise<ArtworkListItem[]> => {
  if (!userId) throw new Error('User ID is required')
  const response = await authFetch(API.userFavorites(userId))
  return adaptArtworkList(response)
}

export function useFavorites(userId: string) {
  const { data, error, isLoading, mutate } = useSWR<ArtworkListItem[]>(
    userId ? `user-favorites-${userId}` : null,
    () => fetchUserFavorites(userId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    artworks: data || [],
    isLoading,
    error,
    mutate,
  }
}