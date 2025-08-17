import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { IdParamSchema, validateParam } from '../schemas/validation'
import { ok, fail } from '../utils/response'
import { formatArtworkForAPI } from '../utils/formatters'

const router = new Hono()

router.get('/:id', async (c) => {
  try {
    const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
    const userId = (c as any).get('userId') as string
    const d1 = D1Service.fromEnv(c.env)
    
    const art = await d1.getArtwork(id)
    if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
    
    // Get user state (liked/faved) from Redis or D1
    let userState = { liked: false, faved: false }
    try {
      const redis = RedisService.fromEnv(c.env)
      const [isLiked, isFavorited] = await Promise.all([
        userId ? redis.isLiked(userId, id) : Promise.resolve(false),
        userId ? redis.isFavorite(userId, id) : Promise.resolve(false)
      ])
      userState = { liked: isLiked, faved: isFavorited }
    } catch (e) {
      // Fallback to D1 if Redis is unavailable
      if (userId) {
        userState = {
          liked: await d1.isLikedByUser(userId, id),
          faved: await d1.isFavoritedByUser(userId, id)
        }
      }
    }
    
    const response = formatArtworkForAPI(art, userState)
    return c.json(ok(response))
  } catch (error) {
    console.error('Error in artwork detail:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

router.post('/:id/like', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const userId = (c as any).get('userId') as string
  const d1 = D1Service.fromEnv(c.env)
  
  // Sync DB counter
  const likeCount = await d1.incrLikeCount(id, 1)
  
  // Track per-user like set and persist to D1
  let userState = { liked: true, faved: false }
  try {
    if (userId) {
      const redis = RedisService.fromEnv(c.env)
      await Promise.all([
        redis.addUserLike(userId, id),
        d1.addLike(userId, id)
      ])
      
      // Also check favorite status
      const isFavorited = await redis.isFavorite(userId, id)
      userState.faved = isFavorited
    }
  } catch (e) {
    // Fallback to D1 for favorite status if Redis fails
    if (userId) {
      userState.faved = await d1.isFavoritedByUser(userId, id)
    }
  }
  
  // Invalidate cache
  try { await RedisService.fromEnv(c.env).invalidateFeed() } catch {}
  
  // Get updated artwork to return consistent format
  const art = await d1.getArtwork(id)
  if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  
  return c.json(ok({
    like_count: likeCount,
    fav_count: art.favoriteCount,
    user_state: userState
  }))
})

router.delete('/:id/like', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const userId = (c as any).get('userId') as string
  const d1 = D1Service.fromEnv(c.env)
  
  const likeCount = await d1.incrLikeCount(id, -1)
  
  let userState = { liked: false, faved: false }
  try {
    if (userId) {
      const redis = RedisService.fromEnv(c.env)
      await Promise.all([
        redis.removeUserLike(userId, id),
        d1.removeLike(userId, id)
      ])
      
      const isFavorited = await redis.isFavorite(userId, id)
      userState.faved = isFavorited
    }
  } catch (e) {
    if (userId) {
      userState.faved = await d1.isFavoritedByUser(userId, id)
    }
  }
  
  try { await RedisService.fromEnv(c.env).invalidateFeed() } catch {}
  
  const art = await d1.getArtwork(id)
  if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  
  return c.json(ok({
    like_count: likeCount,
    fav_count: art.favoriteCount,
    user_state: userState
  }))
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
  
  // Get updated artwork and user state
  const art = await d1.getArtwork(id)
  if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  
  const isLiked = await redis.isLiked(userId, id)
  
  return c.json(ok({
    like_count: art.likeCount,
    fav_count: favoriteCount,
    user_state: { liked: isLiked, faved: true }
  }))
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
  
  // Get updated artwork and user state
  const art = await d1.getArtwork(id)
  if (!art) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  
  const isLiked = await redis.isLiked(userId, id)
  
  return c.json(ok({
    like_count: art.likeCount,
    fav_count: favoriteCount,
    user_state: { liked: isLiked, faved: false }
  }))
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


