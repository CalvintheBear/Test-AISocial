import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

interface LikeResponse {
  likeCount: number
  isLiked: boolean
}

export function useLike() {
  const like = async (artworkId: string): Promise<LikeResponse> => {
    if (!artworkId) throw new Error('Artwork ID is required')
    
    try {
      return await authFetch(API.like(artworkId), {
        method: 'POST',
      })
    } catch (error) {
      console.error('Failed to like artwork:', error)
      throw error
    }
  }

  const unlike = async (artworkId: string): Promise<LikeResponse> => {
    if (!artworkId) throw new Error('Artwork ID is required')
    
    try {
      return await authFetch(API.like(artworkId), {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Failed to unlike artwork:', error)
      throw error
    }
  }

  return { like, unlike }
}