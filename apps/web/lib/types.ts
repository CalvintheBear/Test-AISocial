export type User = { id: string; name: string; profilePic?: string }

export type ArtworkListItem = {
  id: string
  slug: string
  title: string
  thumbUrl: string
  author: User
  likeCount: number
  isFavorite: boolean
  status: 'draft' | 'published'
}

export type ArtworkDetail = {
  id: string
  slug: string
  title: string
  originalUrl: string
  createdAt: number
  status: 'draft' | 'published'
  author: User
  likeCount: number
  isFavorite: boolean
}


