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
    // compute hotScore from DB values
    const ageDays = Math.max(0, Math.floor((Date.now() - (art.publishedAt || art.createdAt || 0)) / 86400000))
    const hotScore = (art as any).engagementWeight ? (art as any).engagementWeight * Math.pow(0.5, ageDays) : 0
    const isLiked = userId ? await (async () => { try { return await RedisService.fromEnv(c.env).isLiked(userId, id) } catch { return false } })() : false
    const detail = {
      id: art.id,
      slug: art.slug,
      title: art.title,
      originalUrl: art.originalUrl || art.url,
      thumbUrl: art.thumbUrl || art.url,
      createdAt: art.createdAt,
      status: art.status,
      author: art.author,
      likeCount,
      favoriteCount: art.favoriteCount,
      isFavorite,
      isLiked,
      hotScore
    }
    return c.json(ok(detail))
  } catch (error) {
    console.error('Error in artwork detail:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

router.post('/:id/like', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  // Sync DB counter
  const likeCount = await d1.incrLikeCount(id, 1)
  // Track per-user like set AND持久化关系表
  try {
    const userId = (c as any).get('userId') as string
    if (userId) {
      const redis = RedisService.fromEnv(c.env)
      await redis.addUserLike(userId, id)
      // 同步关系到 D1（为“我的点赞”提供持久化兜底）
      await d1.addLike(userId, id)
    }
  } catch {}
  // Optional: also bump cache counter if configured
  try { await RedisService.fromEnv(c.env).invalidateFeed() } catch {}
  return c.json(ok({ likeCount, isLiked: true }))
})

router.delete('/:id/like', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const likeCount = await d1.incrLikeCount(id, -1)
  try {
    const userId = (c as any).get('userId') as string
    if (userId) {
      const redis = RedisService.fromEnv(c.env)
      await redis.removeUserLike(userId, id)
      await d1.removeLike(userId, id)
    }
  } catch {}
  try { await RedisService.fromEnv(c.env).invalidateFeed() } catch {}
  return c.json(ok({ likeCount, isLiked: false }))
})

router.post('/:id/favorite', async (c) => {
  const userId = (c as any).get('userId') as string
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  await redis.addFavorite(userId, id)
  const favoriteCount = await d1.incrFavoriteCount(id, 1)
  await Promise.all([
    redis.invalidateUserFavorites(userId),
    redis.invalidateFeed()
  ])
  return c.json(ok({ isFavorite: true, favoriteCount }))
})

router.delete('/:id/favorite', async (c) => {
  const userId = (c as any).get('userId') as string
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  await redis.removeFavorite(userId, id)
  const favoriteCount = await d1.incrFavoriteCount(id, -1)
  await Promise.all([
    redis.invalidateUserFavorites(userId),
    redis.invalidateFeed()
  ])
  return c.json(ok({ isFavorite: false, favoriteCount }))
})

router.post('/:id/publish', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  const art = await d1.getArtwork(id)
  if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  const userId = (c as any).get('userId') as string
  if (art.author.id !== userId) return c.json(fail('FORBIDDEN', 'Not author'), 403)
  await d1.publishArtwork(id)
  
  // Invalidate relevant caches
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
  const art = await d1.getArtwork(id)
  if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  const userId = (c as any).get('userId') as string
  if (art.author.id !== userId) return c.json(fail('FORBIDDEN', 'Not author'), 403)
  await d1.unpublishArtwork(id)
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
  const art = await d1.getArtwork(id)
  if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  const userId = (c as any).get('userId') as string
  if (art.author.id !== userId) return c.json(fail('FORBIDDEN', 'Not author'), 403)
  await d1.deleteArtwork(id)
  await Promise.all([
    redis.invalidateUserArtworks(userId),
    redis.invalidateFeed(),
    redis.delLikes(id),
    redis.invalidateAllFavoritesLists()
  ])
  return c.json(ok({ deleted: true, id }))
})

router.post('/upload', async (c) => {
  const userId = (c as any).get('userId') as string
  const body = await c.req.parseBody()
  const file = body.file as File
  const title = body.title as string
  const prompt = (body as any).prompt as string | undefined
  
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
      height: undefined,
      prompt: prompt || undefined,
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


