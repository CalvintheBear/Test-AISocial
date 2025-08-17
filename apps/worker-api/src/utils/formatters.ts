import { Artwork } from '../services/d1'

export interface UnifiedArtworkResponse {
  id: string
  title: string
  url: string
  thumb_url: string
  slug: string
  status: 'draft' | 'published'
  created_at: number
  published_at?: number
  author: {
    id: string
    name: string
    profile_pic?: string
  }
  like_count: number
  fav_count: number
  user_state: {
    liked: boolean
    faved: boolean
  }
  hot_score?: number
}

export function formatArtworkForAPI(
  artwork: Artwork,
  userState: { liked: boolean; faved: boolean }
): UnifiedArtworkResponse {
  return {
    id: artwork.id,
    title: artwork.title,
    url: artwork.originalUrl || artwork.url,
    thumb_url: artwork.thumbUrl || artwork.url,
    slug: artwork.slug,
    status: artwork.status,
    created_at: artwork.createdAt,
    published_at: artwork.publishedAt,
    author: {
      id: artwork.author.id,
      name: artwork.author.name,
      profile_pic: artwork.author.profilePic
    },
    like_count: artwork.likeCount,
    fav_count: artwork.favoriteCount,
    user_state: userState,
    hot_score: artwork.engagementWeight
      ? artwork.engagementWeight * Math.pow(0.5, Math.max(0, Math.floor((Date.now() - (artwork.publishedAt || artwork.createdAt || 0)) / 86400000)))
      : 0
  }
}

export function formatArtworkListForAPI(
  artworks: Artwork[],
  userStates: Array<{ liked: boolean; faved: boolean }>
): UnifiedArtworkResponse[] {
  return artworks.map((artwork, index) => formatArtworkForAPI(artwork, userStates[index]))
}