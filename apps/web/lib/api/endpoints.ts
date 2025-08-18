export const API = {
  feed: '/api/feed',
  me: '/api/users/me',
  userProfile: (id: string) => `/api/users/${id}/profile`,
  userArtworks: (id: string) => `/api/users/${id}/artworks`,
  userFavorites: (id: string) => `/api/users/${id}/favorites`,
  userLikes: (id: string) => `/api/users/${id}/likes`,
  artwork: (id: string) => `/api/artworks/${id}`,
  like: (id: string) => `/api/artworks/${id}/like`,
  favorite: (id: string) => `/api/artworks/${id}/favorite`,
  publish: (id: string) => `/api/artworks/${id}/publish`,
  unpublish: (id: string) => `/api/artworks/${id}/unpublish`,
  delete: (id: string) => `/api/artworks/${id}`,
  
  // 热点相关API
  trending: '/api/hotness/trending',
  hot: '/api/hotness/hot',
  rising: '/api/hotness/rising',
  viral: '/api/hotness/viral',
  
  hotness: {
    trending: '/api/hotness/trending',
    byCategory: (category: string, limit?: number) => 
      `/api/hotness/trending?category=${category}&limit=${limit || 20}`,
    detail: (id: string) => `/api/hotness/${id}`,
    rank: '/api/hotness/rank',
    refresh: '/api/hotness/refresh',
  },
  
  base: (p: string) => p,
}


