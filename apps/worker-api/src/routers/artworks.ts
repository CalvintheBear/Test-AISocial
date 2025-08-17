import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { IdParamSchema, validateParam } from '../schemas/validation'
import { ok, fail } from '../utils/response'

const router = new Hono()

router.get('/:id', async (c) => {
  try {
    const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
    const userId = (c as any).get('userId') as string
    const d1 = D1Service.fromEnv(c.env)
    
    const art = await d1.getArtwork(id)
    if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
    
    let likeCount = 0
    let isFavorite = false
    try {
      const redis = RedisService.fromEnv(c.env)
      ;[likeCount, isFavorite] = await Promise.all([
        redis.getLikes(id),
        redis.isFavorite(userId, id)
      ])
    } catch (e) {
      console.warn('Redis unavailable, using defaults for likes/favorites')
    }
    
    const detail = {
      id: art.id,
      slug: art.slug,
      title: art.title,
      originalUrl: art.url,
      thumbUrl: art.url,
      createdAt: art.createdAt,
      status: art.status,
      author: art.author,
      likeCount,
      isFavorite
    }
    return c.json(ok(detail))
  } catch (error) {
    console.error('Error in artwork detail:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

router.post('/:id/like', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const redis = RedisService.fromEnv(c.env)
  const d1 = D1Service.fromEnv(c.env)
  try { await d1.addLike((c as any).get('userId'), id) } catch {}
  const likeCount = await redis.incrLikes(id, 1)
  
  // Invalidate relevant caches
  await redis.invalidateFeed()
  
  return c.json(ok({ likeCount, isLiked: true }))
})

router.delete('/:id/like', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const redis = RedisService.fromEnv(c.env)
  const d1 = D1Service.fromEnv(c.env)
  try { await d1.removeLike((c as any).get('userId'), id) } catch {}
  const likeCount = await redis.incrLikes(id, -1)
  
  // Invalidate relevant caches
  await redis.invalidateFeed()
  
  return c.json(ok({ likeCount, isLiked: false }))
})

router.post('/:id/favorite', async (c) => {
  const userId = (c as any).get('userId') as string
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const redis = RedisService.fromEnv(c.env)
  const d1 = D1Service.fromEnv(c.env)
  await redis.addFavorite(userId, id)
  try { await d1.addFavorite(userId, id) } catch {}
  
  // Invalidate relevant caches
  await Promise.all([
    redis.invalidateUserFavorites(userId),
    redis.invalidateFeed()
  ])
  
  return c.json(ok({ isFavorite: true }))
})

router.delete('/:id/favorite', async (c) => {
  const userId = (c as any).get('userId') as string
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const redis = RedisService.fromEnv(c.env)
  const d1 = D1Service.fromEnv(c.env)
  await redis.removeFavorite(userId, id)
  try { await d1.removeFavorite(userId, id) } catch {}
  
  // Invalidate relevant caches
  await Promise.all([
    redis.invalidateUserFavorites(userId),
    redis.invalidateFeed()
  ])
  
  return c.json(ok({ isFavorite: false }))
})

router.post('/:id/publish', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  const art = await d1.publishArtwork(id)
  if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  
  // Invalidate relevant caches
  const userId = (c as any).get('userId') as string
  await Promise.all([
    redis.invalidateUserArtworks(userId),
    redis.invalidateFeed()
  ])
  
  return c.json(ok({ status: 'published', id }))
})

router.post('/:id/unpublish', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  await d1.unpublishArtwork(id)
  const userId = (c as any).get('userId') as string
  await Promise.all([
    redis.invalidateUserArtworks(userId),
    redis.invalidateFeed()
  ])
  return c.json(ok({ status: 'draft', id }))
})

router.delete('/:id', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  await d1.deleteArtwork(id)
  const userId = (c as any).get('userId') as string
  await Promise.all([
    redis.invalidateUserArtworks(userId),
    redis.invalidateFeed()
  ])
  return c.json(ok({ deleted: true, id }))
})

router.post('/upload', async (c) => {
  const userId = (c as any).get('userId') as string
  const body = await c.req.parseBody()
  const file = body.file as File
  const title = body.title as string
  
  if (!file) {
    return c.json(fail('INVALID_INPUT', 'No file provided'), 400)
  }
  
  if (!title) {
    return c.json(fail('INVALID_INPUT', 'No title provided'), 400)
  }
  
  try {
    const fileName = file.name || 'upload.png'
    const contentType = file.type || 'image/png'
    
    // Import R2Service
    const { R2Service } = await import('../services/r2')
    const r2 = R2Service.fromEnv(c.env)
    
    // Upload to R2
    const { key, url } = await r2.putObject('upload', fileName, await file.arrayBuffer(), contentType)
    
    // Create artwork in D1
    const d1 = D1Service.fromEnv(c.env)
    const artworkId = await d1.createArtwork(userId, title, url, url, {
      mimeType: contentType,
      // 若可获取尺寸再填；此处不传递以满足类型
      width: undefined,
      height: undefined
    })
    
    const response = {
      id: artworkId,
      originalUrl: url,
      thumbUrl: url, // For now, thumbUrl equals originalUrl until cron generates thumbnails
      status: 'draft',
      title
    }
    
    // Invalidate user cache to show new artwork
    const redis = RedisService.fromEnv(c.env)
    await redis.invalidateUserArtworks(userId)
    
    return c.json(ok(response))
  } catch (error) {
    return c.json(fail('UPLOAD_ERROR', 'Failed to upload file'), 500)
  }
})

export default router


