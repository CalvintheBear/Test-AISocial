import useSWR from 'swr'
import { ArtworkDetail } from '@/lib/types'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

const fetchArtworkDetail = async (artworkId: string): Promise<ArtworkDetail> => {
  if (!artworkId) throw new Error('Artwork ID is required')
  return authFetch(API.artwork(artworkId))
}

export function useArtworkDetail(artworkId: string) {
  const { data, error, isLoading, mutate } = useSWR<ArtworkDetail>(
    artworkId ? `artwork-${artworkId}` : null,
    () => fetchArtworkDetail(artworkId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    artwork: data,
    isLoading,
    error,
    mutate,
  }
}