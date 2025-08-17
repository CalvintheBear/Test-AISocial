import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { UserIdParamSchema, PaginationQuerySchema, validateParam } from '../schemas/validation'
import { ok } from '../utils/response'

const router = new Hono()

router.get('/:id/artworks', async (c) => {
  const { id } = validateParam(UserIdParamSchema, { id: c.req.param('id') })
  const currentUserId = (c as any).get('userId') as string
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  
  // Try to get from cache first
  const cached = await redis.getUserArtworks(id)
  
  let list
  if (cached) {
    list = JSON.parse(cached)
  } else {
    // Cache miss - get from D1 and cache it
    list = await d1.listUserArtworks(id)
    await redis.setUserArtworks(id, JSON.stringify(list), 600) // 10 minutes TTL
  }
  
  // 过滤可见性：非owner只能看到published作品
  const visibleList = currentUserId === id 
    ? list 
    : list.filter((a: any) => a.status === 'published')
  
  // Get likes and favorites for the current user
  const artworkIds = visibleList.map((a: any) => a.id)
  const [likesMap, favorites] = await Promise.all([
    Promise.all(artworkIds.map((id: string) => redis.getLikes(id))).then(likes => 
      Object.fromEntries(artworkIds.map((id: string, i: number) => [id, likes[i]]))
    ),
    redis.listFavorites(currentUserId)
  ])
  
  const items = visibleList.map((a: any) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    thumbUrl: a.url,
    author: a.author,
    likeCount: likesMap[a.id] || 0,
    isFavorite: favorites.includes(a.id),
    status: a.status,
  }))
  return c.json(ok(items))
})

router.get('/:id/favorites', async (c) => {
  const { id } = validateParam(UserIdParamSchema, { id: c.req.param('id') })
  const redis = RedisService.fromEnv(c.env)
  const d1 = D1Service.fromEnv(c.env)
  
  // Try to get from cache first
  const cached = await redis.getUserFavorites(id)
  
  let favIds
  if (cached) {
    favIds = JSON.parse(cached)
  } else {
    // Cache miss - get from Redis and cache it
    favIds = await redis.listFavorites(id)
    await redis.setUserFavorites(id, JSON.stringify(favIds), 600) // 10 minutes TTL
  }
  
  // 将收藏 id 列表映射为 ArtworkListItem[]
  const items = await Promise.all(
    favIds.map(async (artId: string) => {
      const a = await d1.getArtwork(artId)
      if (!a) return null
      const likeCount = await redis.getLikes(artId)
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        thumbUrl: a.url,
        author: a.author,
        likeCount,
        isFavorite: true,
        status: a.status,
      }
    })
  )
  return c.json(ok(items.filter(Boolean)))
})

export default router


