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
  
  const list = await d1.listUserArtworks(id)
  
  // 过滤可见性：非owner只能看到published作品
  const visibleList = currentUserId === id 
    ? list 
    : list.filter(a => a.status === 'published')
  
  // Get likes and favorites for the current user
  const artworkIds = visibleList.map(a => a.id)
  const [likesMap, favorites] = await Promise.all([
    Promise.all(artworkIds.map(id => redis.getLikes(id))).then(likes => 
      Object.fromEntries(artworkIds.map((id, i) => [id, likes[i]]))
    ),
    redis.listFavorites(currentUserId)
  ])
  
  const items = visibleList.map((a) => ({
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

router.get('/:id/favorites', async (c) => {
  const { id } = validateParam(UserIdParamSchema, { id: c.req.param('id') })
  const redis = RedisService.fromEnv(c.env)
  const d1 = D1Service.fromEnv(c.env)
  const favIds = await redis.listFavorites(id)
  // 将收藏 id 列表映射为 ArtworkListItem[]
  const items = await Promise.all(
    favIds.map(async (artId) => {
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
  return c.json(items.filter(Boolean))
})

export default router


