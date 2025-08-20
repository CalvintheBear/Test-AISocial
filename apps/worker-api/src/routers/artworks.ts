import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { HotnessService } from '../services/hotness'
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
    
    // 直接使用快照计数，避免每次请求进行 COUNT
    
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
    
    // Create response with actual counts
    const response = {
      ...formatArtworkForAPI(art, userState),
      like_count: art.likeCount,
      fav_count: art.favoriteCount
    }
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
  
  // 检查防刷保护
  const redis = RedisService.fromEnv(c.env)
  const hotness = new HotnessService(redis, d1)
  
  const canProceed = await hotness.checkRateLimit(userId, 'like', id)
  if (!canProceed) {
    return c.json(fail('RATE_LIMIT', 'Too many likes, please try again later'), 429)
  }
  
  // 检查是否已点赞（防止重复点赞刷热度）
  const alreadyLiked = await d1.isLikedByUser(userId, id)
  if (alreadyLiked) {
    return c.json(fail('ALREADY_LIKED', 'Artwork already liked'), 400)
  }
  
  // 执行点赞操作：并行写入，使用返回的新计数直接响应
  const [ , , newLikeCount ] = await Promise.all([
    d1.addLike(userId, id),
    redis.addUserLike(userId, id),
    d1.incrLikeCount(id, 1)
  ])

  // 热度更新异步处理，避免阻塞请求
  try {
    const p = (async () => {
      try {
        await hotness.updateArtworkHotness(id, 'like', userId)
        await hotness.syncHotnessToDatabase(id)
      } catch (e) { console.error('hotness like async failed:', e) }
    })()
    ;(c as any).executionCtx?.waitUntil?.(p)
  } catch {}
  
  // 获取用户状态
  let userState = { liked: true, faved: false }
  try {
    const isFavorited = await redis.isFavorite(userId, id)
    userState.faved = isFavorited
  } catch (e) {
    // Fallback to D1 for favorite status if Redis fails
    userState.faved = await d1.isFavoritedByUser(userId, id)
  }
  
  // Invalidate cache
  // 点赞不会影响“收藏列表”缓存；此处不清理整页Feed，依赖前端乐观更新
  try { /* no-op invalidation */ } catch {}
  
  return c.json(ok({
    like_count: Number(newLikeCount) || 0,
    // fav_count 不变，前端已做乐观更新；如需精确可轻读一次
    fav_count: undefined as any,
    user_state: userState,
    // 热度异步更新，响应中不返回
  }))
})

router.delete('/:id/like', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const userId = (c as any).get('userId') as string
  const d1 = D1Service.fromEnv(c.env)
  
  // 检查是否已经点赞（防止重复取消）
  const alreadyLiked = await d1.isLikedByUser(userId, id)
  if (!alreadyLiked) {
    return c.json(fail('NOT_LIKED', 'Artwork not liked'), 400)
  }
  
  // 执行取消点赞操作
  const redis = RedisService.fromEnv(c.env)
  const [ , , newLikeCount2 ] = await Promise.all([
    d1.removeLike(userId, id),
    redis.removeUserLike(userId, id),
    d1.incrLikeCount(id, -1)
  ])

  // 热度异步
  const hotness = new HotnessService(redis, d1)
  try {
    const p = (async () => {
      try {
        await hotness.updateArtworkHotness(id, 'unlike', userId)
        await hotness.syncHotnessToDatabase(id)
      } catch (e) { console.error('hotness unlike async failed:', e) }
    })()
    ;(c as any).executionCtx?.waitUntil?.(p)
  } catch {}
  
  let userState = { liked: false, faved: false }
  try {
    const isFavorited = await redis.isFavorite(userId, id)
    userState.faved = isFavorited
  } catch (e) {
    userState.faved = await d1.isFavoritedByUser(userId, id)
  }
  
  try { /* no-op invalidation */ } catch {}
  
  return c.json(ok({
    like_count: Number(newLikeCount2) || 0,
    fav_count: undefined as any,
    user_state: userState,
    
  }))
})

router.post('/:id/favorite', async (c) => {
  const userId = (c as any).get('userId') as string
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  const hotness = new HotnessService(redis, d1)
  
  // 检查防刷保护
  const canProceed = await hotness.checkRateLimit(userId, 'favorite', id)
  if (!canProceed) {
    return c.json(fail('RATE_LIMIT', 'Too many favorites, please try again later'), 429)
  }
  
  // 检查是否已收藏
  const alreadyFavorited = await d1.isFavoritedByUser(userId, id)
  if (alreadyFavorited) {
    return c.json(fail('ALREADY_FAVORITED', 'Artwork already favorited'), 400)
  }
  
  // 执行收藏操作，直接使用自增后的计数
  const [ , , newFavCount ] = await Promise.all([
    redis.addFavorite(userId, id),
    d1.addFavorite(userId, id),
    d1.incrFavoriteCount(id, 1)
  ])

  // 热度异步
  try {
    const p = (async () => {
      try {
        await hotness.updateArtworkHotness(id, 'favorite', userId)
        await hotness.syncHotnessToDatabase(id)
      } catch (e) { console.error('hotness favorite async failed:', e) }
    })()
    ;(c as any).executionCtx?.waitUntil?.(p)
  } catch {}
  
  await Promise.all([
    redis.invalidateUserFavorites(userId)
  ])
  
  // 获取用户状态
  const isLiked = await redis.isLiked(userId, id)
  
  return c.json(ok({
    like_count: undefined as any,
    fav_count: Number(newFavCount) || 0,
    user_state: { liked: isLiked, faved: true },
    
  }))
})

router.delete('/:id/favorite', async (c) => {
  const userId = (c as any).get('userId') as string
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  const hotness = new HotnessService(redis, d1)
  
  // 检查是否已收藏
  const alreadyFavorited = await d1.isFavoritedByUser(userId, id)
  if (!alreadyFavorited) {
    return c.json(fail('NOT_FAVORITED', 'Artwork not favorited'), 400)
  }
  
  // 执行取消收藏操作
  const [ , , newFavCount2 ] = await Promise.all([
    redis.removeFavorite(userId, id),
    d1.removeFavorite(userId, id),
    d1.incrFavoriteCount(id, -1)
  ])

  // 热度异步
  try {
    const p = (async () => {
      try {
        await hotness.updateArtworkHotness(id, 'unfavorite', userId)
        await hotness.syncHotnessToDatabase(id)
      } catch (e) { console.error('hotness unfavorite async failed:', e) }
    })()
    ;(c as any).executionCtx?.waitUntil?.(p)
  } catch {}
  
  await Promise.all([
    redis.invalidateUserFavorites(userId),
    
  ])
  
  // 获取用户状态
  const isLiked = await redis.isLiked(userId, id)
  
  return c.json(ok({
    like_count: undefined as any,
    fav_count: Number(newFavCount2) || 0,
    user_state: { liked: isLiked, faved: false },
    
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


// 获取单个作品完整状态
router.get('/:id/state', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const userId = (c as any).get('userId') as string
  const d1 = D1Service.fromEnv(c.env)
  
  try {
    const [artwork, userState] = await Promise.all([
      d1.getArtwork(id),
      userId ? d1.getUserArtworkState(userId, id) : { liked: false, faved: false }
    ])

    if (!artwork) {
      return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
    }

    return c.json(ok({
      like_count: artwork.likeCount,
      fav_count: artwork.favoriteCount,
      user_state: userState
    }))
  } catch (error) {
    console.error('Failed to get artwork state:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

// 批量获取作品状态
router.post('/batch/state', async (c) => {
  const { artworkIds } = await c.req.json()
  const userId = (c as any).get('userId') as string
  
  if (!Array.isArray(artworkIds) || artworkIds.length === 0) {
    return c.json(fail('INVALID_INPUT', 'Invalid artwork IDs'), 400)
  }

  try {
    const d1 = D1Service.fromEnv(c.env)
    
    // 批量获取数据
    const [likes, favorites, userStates] = await Promise.all([
      d1.getBatchLikeCounts(artworkIds),
      d1.getBatchFavoriteCounts(artworkIds),
      userId ? d1.getBatchUserArtworkStates(userId, artworkIds) : {} as Record<string, { liked: boolean; faved: boolean }>
    ])

    const resultMap = new Map()
    
    artworkIds.forEach(id => {
      resultMap.set(id, {
        like_count: likes[id] || 0,
        fav_count: favorites[id] || 0,
        user_state: userStates[id] || { liked: false, faved: false }
      })
    })

    return c.json(ok(Object.fromEntries(resultMap)))
  } catch (error) {
    console.error('Failed to get batch artwork states:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

// 新增：获取作品热度详情
router.get('/:id/hot-data', async (c) => {
  try {
    const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
    const d1 = D1Service.fromEnv(c.env)
    
    const data = await d1.getArtworkHotData(id)
    if (!data) {
      return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
    }
    
    return c.json(ok(data))
  } catch (error) {
    console.error('Failed to get artwork hot data:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

// 新增：批量获取热度数据
router.post('/batch/hot-data', async (c) => {
  try {
    const { artworkIds } = await c.req.json()
    
    if (!Array.isArray(artworkIds) || artworkIds.length === 0) {
      return c.json(fail('INVALID_INPUT', 'Invalid artwork IDs'), 400)
    }
    
    const d1 = D1Service.fromEnv(c.env)
    const data = await d1.getArtworksHotData(artworkIds)
    
    return c.json(ok(data))
  } catch (error) {
    console.error('Failed to get batch artwork hot data:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

export default router


