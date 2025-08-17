import useSWR from 'swr'
import { ArtworkListItem } from '@/lib/types'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

const fetchFeed = async (): Promise<ArtworkListItem[]> => {
  return authFetch(API.feed)
}

export function useFeed() {
  const { data, error, isLoading, mutate } = useSWR<ArtworkListItem[]>(
    'feed',
    fetchFeed,
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