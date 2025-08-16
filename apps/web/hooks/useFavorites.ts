import useSWR from 'swr'
import { ArtworkListItem } from '@/lib/types'
import { authFetch, useMock } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

const fetchUserFavorites = async (userId: string): Promise<ArtworkListItem[]> => {
  if (!userId) throw new Error('User ID is required')
  const url = useMock() ? '/mocks/favorites.json' : API.userFavorites(userId)
  return authFetch(url)
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