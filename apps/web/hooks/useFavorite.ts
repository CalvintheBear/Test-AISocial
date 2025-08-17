import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

interface FavoriteResponse {
  isFavorite: boolean
  favoriteCount?: number
}

export function useFavorite() {
  const addFavorite = async (artworkId: string): Promise<FavoriteResponse> => {
    if (!artworkId) throw new Error('Artwork ID is required')
    
    try {
      return await authFetch(API.favorite(artworkId), {
        method: 'POST',
      })
    } catch (error) {
      console.error('Failed to add favorite:', error)
      throw error
    }
  }

  const removeFavorite = async (artworkId: string): Promise<FavoriteResponse> => {
    if (!artworkId) throw new Error('Artwork ID is required')
    
    try {
      return await authFetch(API.favorite(artworkId), {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Failed to remove favorite:', error)
      throw error
    }
  }

  return { addFavorite, removeFavorite }
}