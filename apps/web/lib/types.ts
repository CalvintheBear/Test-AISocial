export type User = { id: string; name: string; profilePic?: string }

export type ArtworkListItem = {
  id: string
  slug: string
  title: string
  thumbUrl: string
  author: User
  likeCount: number
  isFavorite: boolean
  favoriteCount?: number
  isLiked?: boolean
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
  likeCount: number
  favoriteCount?: number
  isFavorite: boolean
  isLiked?: boolean
  hotScore?: number
}


