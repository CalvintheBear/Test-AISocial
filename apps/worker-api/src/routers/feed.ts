import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { PaginationQuerySchema, validateParam } from '../schemas/validation'
import { ok } from '../utils/response'

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
  
  // Get favorites set for current user (for isFavorite display)
  const artworkIds = list.map((a: any) => a.id)
  const favorites = await redis.listFavorites(userId)
  
  const items = list.map((a: any) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    thumbUrl: (a as any).thumb_url || a.url,
    author: a.author,
    likeCount: (a as any).likeCount || 0,
    isFavorite: favorites.includes(a.id),
    favoriteCount: (a as any).favoriteCount || 0,
    status: a.status,
  }))
  return c.json(ok(items))
})

export default router


