import { Artwork } from '../services/d1'

export interface UnifiedArtworkResponse {
  id: string
  title: string
  url: string
  thumb_url: string
  slug: string
  status: 'draft' | 'published' | 'generating'
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
  const authorName = (artwork.author?.name || '').trim() || '未命名用户'
  const authorPic = (artwork.author as any)?.profilePic || (artwork as any)?.author?.profile_pic || '/images/default-avatar.jpg'
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
      name: authorName,
      profile_pic: authorPic
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