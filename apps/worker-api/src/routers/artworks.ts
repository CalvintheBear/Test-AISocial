import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { ok, fail } from '../utils/response'

const router = new Hono()

router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const d1 = D1Service.fromEnv(c.env)
  const art = await d1.getArtwork(id)
  if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  const detail = {
    id: art.id,
    slug: art.slug,
    title: art.title,
    originalUrl: art.url,
    createdAt: art.createdAt,
    status: art.status,
    author: art.author,
    likeCount: art.likeCount,
    isFavorite: false,
  }
  return c.json(ok(detail))
})

router.post('/:id/like', async (c) => {
  const id = c.req.param('id')
  const redis = RedisService.fromEnv(c.env)
  const likeCount = await redis.incrLikes(id, 1)
  return c.json(ok({ likeCount, isLiked: true }))
})

router.delete('/:id/like', async (c) => {
  const id = c.req.param('id')
  const redis = RedisService.fromEnv(c.env)
  const likeCount = await redis.incrLikes(id, -1)
  return c.json(ok({ likeCount, isLiked: false }))
})

router.post('/:id/favorite', async (c) => {
  // @ts-expect-error stored in context by auth middleware
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const redis = RedisService.fromEnv(c.env)
  await redis.addFavorite(userId, id)
  return c.json(ok({ is_favorite: true }))
})

router.delete('/:id/favorite', async (c) => {
  // @ts-expect-error stored in context by auth middleware
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const redis = RedisService.fromEnv(c.env)
  await redis.removeFavorite(userId, id)
  return c.json(ok({ is_favorite: false }))
})

router.post('/:id/publish', async (c) => {
  const id = c.req.param('id')
  const d1 = D1Service.fromEnv(c.env)
  const art = await d1.publishArtwork(id)
  if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  return c.json(ok({ status: 'published', id }))
})

export default router


