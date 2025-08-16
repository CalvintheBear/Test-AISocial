import useSWR from 'swr'
import { ArtworkListItem } from '@/lib/types'
import { authFetch, useMock } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

const fetchFeed = async (): Promise<ArtworkListItem[]> => {
  const url = useMock() ? '/mocks/feed.json' : API.feed
  return authFetch(url)
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