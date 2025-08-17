export type User = { id: string; name: string; profilePic?: string }

export type ArtworkListItem = {
  id: string
  slug: string
  title: string
  thumbUrl: string
  author: User
  like_count: number
  fav_count: number
  user_state: {
    liked: boolean
    faved: boolean
  }
  hotScore?: number
  status: 'draft' | 'published'
}

export type ArtworkDetail = {
  id: string
  slug: string
  title: string
  originalUrl: string
  thumbUrl: string
  createdAt: number
  status: 'draft' | 'published'
  author: User
  like_count: number
  fav_count: number
  user_state: {
    liked: boolean
    faved: boolean
  }
  hotScore?: number
}


