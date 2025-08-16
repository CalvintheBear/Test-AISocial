import useSWR from 'swr'
import { ArtworkListItem } from '@/lib/types'
import { authFetch, useMock } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

const fetchUserArtworks = async (userId: string): Promise<ArtworkListItem[]> => {
  if (!userId) throw new Error('User ID is required')
  const url = useMock() ? '/mocks/user-artworks.json' : API.userArtworks(userId)
  return authFetch(url)
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

  return {
    artworks: data || [],
    isLoading,
    error,
    mutate,
  }
}