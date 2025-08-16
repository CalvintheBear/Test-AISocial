import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'

const router = new Hono()

router.get('/', async (c) => {
  const limitParam = c.req.query('limit')
  const limit = limitParam ? Math.max(1, Math.min(100, Number(limitParam))) : 20
  const userId = (c as any).get('userId') as string
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  
  const list = await d1.listFeed(limit)
  
  // Get likes and favorites for the current user
  const artworkIds = list.map(a => a.id)
  const [likesMap, favorites] = await Promise.all([
    Promise.all(artworkIds.map(id => redis.getLikes(id))).then(likes => 
      Object.fromEntries(artworkIds.map((id, i) => [id, likes[i]]))
    ),
    redis.listFavorites(userId)
  ])
  
  const items = list.map((a) => ({
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


