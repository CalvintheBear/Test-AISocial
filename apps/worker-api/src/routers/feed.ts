import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { PaginationQuerySchema, validateParam } from '../schemas/validation'

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
  
  // Get likes and favorites for the current user
  const artworkIds = list.map((a: any) => a.id)
  const [likesMap, favorites] = await Promise.all([
    Promise.all(artworkIds.map((id: string) => redis.getLikes(id))).then(likes => 
      Object.fromEntries(artworkIds.map((id: string, i: number) => [id, likes[i]]))
    ),
    redis.listFavorites(userId)
  ])
  
  const items = list.map((a: any) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    thumbUrl: a.url,
    author: a.author,
    likeCount: likesMap[a.id] || 0,
    isFavorite: favorites.includes(a.id),
    status: a.status,
  }))
  return c.json(items)
})

export default router


