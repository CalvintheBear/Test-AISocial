import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { IdParamSchema, validateParam } from '../schemas/validation'

const router = new Hono()

router.get('/:id', async (c) => {
  try {
    const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
    const userId = (c as any).get('userId') as string
    const d1 = D1Service.fromEnv(c.env)
    
    const art = await d1.getArtwork(id)
    if (!art) return c.json({ code: 'NOT_FOUND', message: 'Artwork not found' }, 404)
    
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
    return c.json(detail)
  } catch (error) {
    console.error('Error in artwork detail:', error)
    return c.json({ code: 'INTERNAL_ERROR', message: 'Internal server error' }, 500)
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
  
  return c.json({ likeCount, isLiked: true })
})

router.delete('/:id/like', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const redis = RedisService.fromEnv(c.env)
  const d1 = D1Service.fromEnv(c.env)
  try { await d1.removeLike((c as any).get('userId'), id) } catch {}
  const likeCount = await redis.incrLikes(id, -1)
  
  // Invalidate relevant caches
  await redis.invalidateFeed()
  
  return c.json({ likeCount, isLiked: false })
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
  
  return c.json({ isFavorite: true })
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
  
  return c.json({ isFavorite: false })
})

router.post('/:id/publish', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  const art = await d1.publishArtwork(id)
  if (!art) return c.json({ code: 'NOT_FOUND', message: 'Artwork not found' }, 404)
  
  // Invalidate relevant caches
  const userId = (c as any).get('userId') as string
  await Promise.all([
    redis.invalidateUserArtworks(userId),
    redis.invalidateFeed()
  ])
  
  return c.json({ status: 'published', id })
})

router.post('/upload', async (c) => {
  const userId = (c as any).get('userId') as string
  const body = await c.req.parseBody()
  const file = body.file as File
  const title = body.title as string
  
  if (!file) {
    return c.json({ code: 'INVALID_INPUT', message: 'No file provided' }, 400)
  }
  
  if (!title) {
    return c.json({ code: 'INVALID_INPUT', message: 'No title provided' }, 400)
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
    const artworkId = await d1.createArtwork(userId, title, url, url) // thumbUrl same as originalUrl initially
    
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
    
    return c.json(response)
  } catch (error) {
    return c.json({ code: 'UPLOAD_ERROR', message: 'Failed to upload file' }, 500)
  }
})

export default router


