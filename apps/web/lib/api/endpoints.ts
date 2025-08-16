export const API = {
  feed: '/api/feed',
  userArtworks: (id: string) => `/api/users/${id}/artworks`,
  userFavorites: (id: string) => `/api/users/${id}/favorites`,
  artwork: (id: string) => `/api/artworks/${id}`,
  like: (id: string) => `/api/artworks/${id}/like`,
  favorite: (id: string) => `/api/artworks/${id}/favorite`,
  publish: (id: string) => `/api/artworks/${id}/publish`,
}


