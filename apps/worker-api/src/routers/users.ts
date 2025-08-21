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

// 聚合：个人主页首屏数据（强缓存+Redis）
router.get('/:id/summary', async (c) => {
  const { id } = validateParam(UserIdParamSchema, { id: c.req.param('id') })
  const currentUserId = (c as any).get('userId') as string
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)

  // 缓存键：公开数据（profile+works）对匿名与登录一致；但 userStates 取决于 currentUserId
  const cacheKey = `user:${id}:summary:v1`
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return c.json(ok(JSON.parse(cached)))
    }
  } catch {}

  // 基础资料与作品（发布态）
  const user = await d1.getUser(id)
  const allWorks = await d1.listUserArtworks(id)
  const visibleWorks = (currentUserId === id) ? allWorks : allWorks.filter((a: any) => a.status === 'published')

  // 用户状态
  const artworkIds = visibleWorks.map((a: any) => a.id)
  let userStates: Array<{ liked: boolean; faved: boolean }> = []
  if (currentUserId && artworkIds.length > 0) {
    try {
      const [likedIds, favedIds] = await Promise.all([
        redis.listUserLikes(currentUserId),
        d1.listUserFavorites(currentUserId)
      ])
      const likedSet = new Set(likedIds)
      const favedSet = new Set(favedIds)
      userStates = artworkIds.map((id: string) => ({ liked: likedSet.has(id), faved: favedSet.has(id) }))
    } catch {
      userStates = await Promise.all(
        artworkIds.map(async (aid: string) => ({
          liked: await d1.isLikedByUser(currentUserId, aid),
          faved: await d1.isFavoritedByUser(currentUserId, aid)
        }))
      )
    }
  } else {
    userStates = artworkIds.map(() => ({ liked: false, faved: false }))
  }

  const items = formatArtworkListForAPI(visibleWorks as any, userStates)
  const payload = { profile: user || { id }, artworks: items }

  try { await redis.set(cacheKey, JSON.stringify(payload), 300) } catch {}
  return c.json(ok(payload))
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
  const validArtworks = await d1.getArtworksByIds(favIds)
  
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
  
  // 直接使用快照计数
  const items = formatArtworkListForAPI(validArtworks as any, userStates)
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
  const validArtworks = await d1.getArtworksByIds(likeIds)
  
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
  
  // 直接使用快照计数
  const items = formatArtworkListForAPI(validArtworks as any, userStates)
  return c.json(ok(items))
})

export default router