import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

interface PublishResponse {
  status: 'published'
  id: string
}

export function usePublish() {
  const publish = async (artworkId: string): Promise<PublishResponse> => {
    if (!artworkId) throw new Error('Artwork ID is required')
    
    try {
      return await authFetch(API.publish(artworkId), {
        method: 'POST',
      })
    } catch (error) {
      console.error('Failed to publish artwork:', error)
      throw error
    }
  }

  return { publish }
}