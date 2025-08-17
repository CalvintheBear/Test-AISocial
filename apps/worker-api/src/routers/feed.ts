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
  
  // Get favorites and likes for the current user
  const artworkIds = list.map((a: any) => a.id)
  const [favorites, likedIds] = await Promise.all([
    redis.listFavorites(userId),
    redis.listUserLikes(userId)
  ])
  const likedSet = new Set(likedIds)
  
  const items = list.map((a: any) => {
    const base = (a as any)
    const publishedAt = (base.publishedAt || base.createdAt || 0) as number
    const ageDays = Math.max(0, Math.floor((Date.now() - publishedAt) / 86400000))
    const engagement = Number(base.engagementWeight || base.engagement_weight || 0)
    const hotScore = engagement * Math.pow(0.5, ageDays)
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      thumbUrl: base.thumb_url || a.url,
      author: a.author,
      likeCount: base.likeCount || 0,
      isFavorite: favorites.includes(a.id),
      isLiked: likedSet.has(a.id),
      favoriteCount: base.favoriteCount || 0,
      status: a.status,
      hotScore,
    }
  })
  return c.json(ok(items))
})

export default router


