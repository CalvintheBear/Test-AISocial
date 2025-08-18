import { ArtworkListItem, ArtworkDetail, User } from './types'
import { authFetch } from '@/lib/api/client'

// 后端返回的统一格式
interface BackendArtworkResponse {
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
  hotness?: number
  trend?: 'up' | 'down' | 'stable'
  rank?: number
}

// 适配器函数 - 将后端响应转换为前端类型
export function adaptArtworkListItem(backendArtwork: BackendArtworkResponse): ArtworkListItem {
  return {
    id: backendArtwork.id,
    slug: backendArtwork.slug,
    title: backendArtwork.title,
    thumb_url: backendArtwork.thumb_url || backendArtwork.url,
    author: {
      id: backendArtwork.author.id,
      name: backendArtwork.author.name,
      profile_pic: backendArtwork.author.profile_pic
    },
    like_count: backendArtwork.like_count,
    fav_count: backendArtwork.fav_count,
    user_state: backendArtwork.user_state,
    hot_score: backendArtwork.hot_score ?? backendArtwork.hotness,
    hotness: backendArtwork.hotness,
    trend: backendArtwork.trend,
    rank: backendArtwork.rank,
    status: backendArtwork.status
  }
}

export function adaptArtworkDetail(backendArtwork: BackendArtworkResponse): ArtworkDetail {
  return {
    id: backendArtwork.id,
    slug: backendArtwork.slug,
    title: backendArtwork.title,
    url: backendArtwork.url,
    thumb_url: backendArtwork.thumb_url || backendArtwork.url,
    created_at: backendArtwork.created_at,
    status: backendArtwork.status,
    author: {
      id: backendArtwork.author.id,
      name: backendArtwork.author.name,
      profile_pic: backendArtwork.author.profile_pic
    },
    like_count: backendArtwork.like_count,
    fav_count: backendArtwork.fav_count,
    user_state: backendArtwork.user_state,
    hot_score: backendArtwork.hot_score ?? backendArtwork.hotness,
    hotness: backendArtwork.hotness,
    trend: backendArtwork.trend,
    rank: backendArtwork.rank
  }
}

// 批量适配器
export function adaptArtworkList(backendArtworks: BackendArtworkResponse[]): ArtworkListItem[] {
  return backendArtworks.map(adaptArtworkListItem)
}

// 客户端数据获取适配器
export async function fetchArtworkList(endpoint: string): Promise<ArtworkListItem[]> {
  const data = await authFetch(endpoint)
  return adaptArtworkList(Array.isArray(data) ? data : [])
}

export async function fetchArtworkDetail(endpoint: string): Promise<ArtworkDetail> {
  const data = await authFetch(endpoint)
  return adaptArtworkDetail(data)
}