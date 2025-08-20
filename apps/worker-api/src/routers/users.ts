import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { UserIdParamSchema, PaginationQuerySchema, validateParam } from '../schemas/validation'
import { ok, fail } from '../utils/response'
import { formatArtworkForAPI, formatArtworkListForAPI } from '../utils/formatters'

const router = new Hono()

router.get('/me', async (c) => {
	const userId = (c as any).get('userId') as string
	if (!userId) return c.json({ success: false, code: 'AUTH_REQUIRED', message: 'signin' }, 401)
	const d1 = D1Service.fromEnv(c.env)
	try { 
		const claims = (c as any).get('claims') as any || {}
		await d1.upsertUser({ id: userId, name: claims.name ?? null, email: claims.email ?? null, profilePic: claims.picture ?? null }) 
		console.log(JSON.stringify({ level: 'info', event: 'upsert_user', userId }))
	} catch (e: any) {
		console.error(JSON.stringify({ level: 'error', event: 'upsert_user_failed', userId, message: e?.message }))
	}
	const me = await d1.getUser(userId)
	console.log(JSON.stringify({ level: 'info', event: 'get_user', userId, found: !!me }))
	return c.json(ok(me || { id: userId }))
})

// Update privacy flags
router.post('/me/privacy', async (c) => {
  const userId = (c as any).get('userId') as string
  if (!userId) return c.json({ success: false, code: 'AUTH_REQUIRED', message: 'signin' }, 401)
  const body = await c.req.json().catch(() => ({})) as any
  const d1 = D1Service.fromEnv(c.env)
  await d1.updateUserPrivacy(userId, { hideName: body?.hideName, hideEmail: body?.hideEmail })
  const me = await d1.getUser(userId)
  return c.json(ok(me || { id: userId }))
})

router.get('/:id/profile', async (c) => {
  const { id } = validateParam(UserIdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const user = await d1.getUser(id)
  return c.json(ok(user || { id }))
})

router.get('/:id/artworks', async (c) => {
  const { id } = validateParam(UserIdParamSchema, { id: c.req.param('id') })
  const currentUserId = (c as any).get('userId') as string
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  
  const cached = await redis.getUserArtworks(id)
  
  let list
  if (cached) {
    list = JSON.parse(cached)
  } else {
    list = await d1.listUserArtworks(id)
    await redis.setUserArtworks(id, JSON.stringify(list), 600)
  }
  
  const visibleList = currentUserId === id 
    ? list 
    : list.filter((a: any) => a.status === 'published')
  
  const artworkIds = visibleList.map((a: any) => a.id)
  
  // Get user states for all artworks
  let userStates: Array<{ liked: boolean; faved: boolean }> = []
  
  if (currentUserId && artworkIds.length > 0) {
    try {
      const [likedIds, favedIds] = await Promise.all([
        redis.listUserLikes(currentUserId),
        d1.listUserFavorites(currentUserId)
      ])
      
      const likedSet = new Set(likedIds)
      const favedSet = new Set(favedIds)
      
      userStates = artworkIds.map((id: string) => ({
        liked: likedSet.has(id),
        faved: favedSet.has(id)
      }))
    } catch (e) {
      userStates = await Promise.all(
        artworkIds.map(async (id: string) => ({
          liked: await d1.isLikedByUser(currentUserId, id),
          faved: await d1.isFavoritedByUser(currentUserId, id)
        }))
      )
    }
  } else {
    userStates = artworkIds.map(() => ({ liked: false, faved: false }))
  }
  
  // Sync counts for all artworks
  // 直接使用快照计数，避免N次COUNT
  const syncedArtworks = visibleList
  
  const items = formatArtworkListForAPI(syncedArtworks, userStates)
  return c.json(ok(items))
})

router.get('/:id/favorites', async (c) => {
  const { id } = validateParam(UserIdParamSchema, { id: c.req.param('id') })
  const redis = RedisService.fromEnv(c.env)
  const d1 = D1Service.fromEnv(c.env)
  
  const cached = await redis.getUserFavorites(id)
  let favIds
  if (cached) {
    favIds = JSON.parse(cached)
  } else {
    favIds = await d1.listUserFavorites(id)
    await redis.setUserFavorites(id, JSON.stringify(favIds), 600)
  }
  
  const currentUserId = (c as any).get('userId') as string
  const artworks = await Promise.all(favIds.map((id: string) => d1.getArtwork(id)))
  const validArtworks = artworks.filter(Boolean)
  
  // Get user states for all artworks
  let userStates: Array<{ liked: boolean; faved: boolean }> = []
  
  if (currentUserId && validArtworks.length > 0) {
    try {
      const [likedIds, favedIds] = await Promise.all([
        redis.listUserLikes(currentUserId),
        d1.listUserFavorites(currentUserId)
      ])
      
      const likedSet = new Set(likedIds)
      const favedSet = new Set(favedIds)
      
      userStates = validArtworks.filter(art => art != null).map((art: any) => ({
        liked: likedSet.has(art.id),
        faved: favedSet.has(art.id)
      }))
    } catch (e) {
      userStates = await Promise.all(
        validArtworks.filter(art => art != null).map(async (art: any) => ({
          liked: await d1.isLikedByUser(currentUserId, art!.id),
          faved: true // All are favorites since this is favorites endpoint
        }))
      )
    }
  } else {
    userStates = validArtworks.map(() => ({ liked: false, faved: true }))
  }
  
  // Sync counts for all artworks
  const syncedArtworks = await Promise.all(
    validArtworks.filter(art => art != null).map(async (artwork: any) => {
      const actualCounts = await d1.syncArtworkCounts(artwork.id)
      return {
        ...artwork,
        likeCount: actualCounts.likeCount,
        favoriteCount: actualCounts.favoriteCount
      }
    })
  )
  
  const items = formatArtworkListForAPI(syncedArtworks, userStates)
  return c.json(ok(items))
})

router.get('/:id/likes', async (c) => {
  const { id } = validateParam(UserIdParamSchema, { id: c.req.param('id') })
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)

  // 新实现：优先从 Redis 的用户 Like 集合读取；若为空则从 D1 关系表兜底
  let likeIds = await redis.listUserLikes(id)
  if (!likeIds || likeIds.length === 0) {
    try {
      // 直接查询关系表（保持与旧数据兼容）
      const rows = await (d1 as any).db.prepare(`SELECT artwork_id FROM artworks_like WHERE user_id = ?`).bind(id).all()
      likeIds = (rows?.results || []).map((r: any) => String(r.artwork_id))
    } catch {}
  }
  
  const currentUserId = (c as any).get('userId') as string
  const artworks = await Promise.all(likeIds.map((id: string) => d1.getArtwork(id)))
  const validArtworks = artworks.filter(Boolean)
  
  // Get user states for all artworks
  let userStates: Array<{ liked: boolean; faved: boolean }> = []
  
  if (currentUserId && validArtworks.length > 0) {
    try {
      const [likedIds, favedIds] = await Promise.all([
        redis.listUserLikes(currentUserId),
        d1.listUserFavorites(currentUserId)
      ])
      
      const likedSet = new Set(likedIds)
      const favedSet = new Set(favedIds)
      
      userStates = validArtworks.filter(art => art != null).map((art: any) => ({
        liked: likedSet.has(art.id),
        faved: favedSet.has(art.id)
      }))
    } catch (e) {
      userStates = await Promise.all(
        validArtworks.filter(art => art != null).map(async (art: any) => ({
          liked: true, // All are likes since this is likes endpoint
          faved: await d1.isFavoritedByUser(currentUserId, art.id)
        }))
      )
    }
  } else {
    userStates = validArtworks.map(() => ({ liked: true, faved: false }))
  }
  
  // Sync counts for all artworks
  const syncedArtworks = await Promise.all(
    validArtworks.filter(art => art != null).map(async (artwork: any) => {
      const actualCounts = await d1.syncArtworkCounts(artwork.id)
      return {
        ...artwork,
        likeCount: actualCounts.likeCount,
        favoriteCount: actualCounts.favoriteCount
      }
    })
  )
  
  const items = formatArtworkListForAPI(syncedArtworks, userStates)
  return c.json(ok(items))
})

export default router