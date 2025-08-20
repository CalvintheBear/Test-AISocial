export type User = { id: string; name: string; profile_pic?: string }

export type ArtworkListItem = {
  id: string
  slug: string
  title: string
  thumb_url: string
  author: User
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
  status: 'draft' | 'published' | 'generating'
}

export type ArtworkDetail = {
  id: string
  slug: string
  title: string
  url: string
  thumb_url: string
  created_at: number
  status: 'draft' | 'published' | 'generating'
  author: User
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
  prompt?: string
  kie_model?: string
  kie_aspect_ratio?: string
  kie_output_format?: string
}


