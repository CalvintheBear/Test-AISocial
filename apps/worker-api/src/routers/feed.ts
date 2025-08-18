import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { PaginationQuerySchema, validateParam } from '../schemas/validation'
import { ok } from '../utils/response'
import { formatArtworkListForAPI } from '../utils/formatters'

const router = new Hono()

router.get('/', async (c) => {
  const { limit } = validateParam(PaginationQuerySchema, { limit: c.req.query('limit') || '20' }) as { limit: number }
  const userId = (c as any).get('userId') as string
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  
  // Try to get from cache first
  const cacheKey = `feed:list:${limit}`
  const cached = await redis.getFeed(limit)
  
  let list
  if (cached) {
    list = JSON.parse(cached)
  } else {
    // Cache miss - get from D1 and cache it
    list = await d1.listFeed(Number(limit))
    await redis.setFeed(limit, JSON.stringify(list), 600) // 10 minutes TTL
  }
  
  // Sync counts for all artworks and get actual counts
  const artworkIds = list.map((a: any) => a.id)
  const [favorites, likedIds] = await Promise.all([
    redis.listFavorites(userId),
    redis.listUserLikes(userId)
  ])
  const likedSet = new Set(likedIds)
  
  // Sync actual counts for all artworks
  const syncedArtworks = await Promise.all(
    list.map(async (artwork: any) => {
      const actualCounts = await d1.syncArtworkCounts(artwork.id)
      return {
        ...artwork,
        likeCount: actualCounts.likeCount,
        favoriteCount: actualCounts.favoriteCount
      }
    })
  )
  
  const items = formatArtworkListForAPI(syncedArtworks, artworkIds.map((id: string) => ({
    liked: likedSet.has(id),
    faved: favorites.includes(id)
  })))
  return c.json(ok(items))
})

export default router


