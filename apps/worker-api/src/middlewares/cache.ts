import { Context, Next } from 'hono'

export async function cacheMiddleware(c: Context, next: Next) {
  const url = new URL(c.req.url)
  const cacheKey = `artwork_state:${url.pathname}${url.search}`
  
  // 检查缓存
  if (c.req.method === 'GET') {
    try {
      const cached = await c.env.CACHE?.get(cacheKey)
      if (cached) {
        return c.json(JSON.parse(cached))
      }
    } catch (error) {
      console.error('Cache read error:', error)
    }
  }

  await next()

  // 缓存响应
  if (c.req.method === 'GET' && c.res.status === 200) {
    try {
      const response = await c.res.clone().json()
      await c.env.CACHE?.put(cacheKey, JSON.stringify(response), {
        expirationTtl: 300 // 5分钟缓存
      })
    } catch (error) {
      console.error('Cache write error:', error)
    }
  }
}

// 缓存失效工具
export class CacheInvalidator {
  static async invalidateArtwork(c: Context, artworkId: string) {
    const keys = [
      `artwork_state:/api/artworks/${artworkId}/state`,
      `/api/artworks/${artworkId}`,
      '/api/feed',
    ]
    
    await Promise.all(keys.map(key => 
      c.env.CACHE?.delete(key).catch((err: Error) => console.error(`Failed to delete cache key ${key}:`, err))
    ))
  }

  static async invalidateUserFavorites(c: Context, userId: string) {
    try {
      await c.env.CACHE?.delete(`/api/users/${userId}/favorites`)
    } catch (error) {
      console.error('Failed to invalidate user favorites cache:', error)
    }
  }

  static async invalidateFeed(c: Context) {
    try {
      await c.env.CACHE?.delete('/api/feed')
    } catch (error) {
      console.error('Failed to invalidate feed cache:', error)
    }
  }

  static async invalidateUserArtworks(c: Context, userId: string) {
    try {
      await c.env.CACHE?.delete(`/api/users/${userId}/artworks`)
    } catch (error) {
      console.error('Failed to invalidate user artworks cache:', error)
    }
  }
}