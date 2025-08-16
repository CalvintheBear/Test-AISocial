import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { ok } from '../utils/response'

const router = new Hono()

router.get('/:id/artworks', async (c) => {
  const id = c.req.param('id')
  const d1 = D1Service.fromEnv(c.env)
  const list = await d1.listUserArtworks(id)
  // Map to list items
  const items = list.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    thumbUrl: a.url,
    author: a.author,
    likeCount: a.likeCount,
    isFavorite: false,
    status: a.status,
  }))
  return c.json(ok(items))
})

router.get('/:id/favorites', async (c) => {
  const id = c.req.param('id')
  const redis = RedisService.fromEnv(c.env)
  const favIds = await redis.listFavorites(id)
  // 最小实现：仅返回 id 列表
  return c.json(ok(favIds))
})

export default router


