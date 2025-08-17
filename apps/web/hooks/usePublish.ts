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
      const response = await authFetch(API.publish(artworkId), {
        method: 'POST',
      })
      
      // SWR revalidation after successful publish
      if (typeof window !== 'undefined') {
        // Invalidate user artworks cache
        const userId = await getCurrentUserId()
        if (userId) {
          // Use global mutate function from SWR
          const { mutate } = await import('swr')
          mutate(`user-artworks-${userId}`)
          mutate('feed')
        }
      }
      
      return response
    } catch (error) {
      console.error('Failed to publish artwork:', error)
      throw error
    }
  }

  return { publish }
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const response = await authFetch('/api/users/me')
    return response?.id || null
  } catch {
    return null
  }
}