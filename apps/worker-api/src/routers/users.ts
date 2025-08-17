import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { UserIdParamSchema, PaginationQuerySchema, validateParam } from '../schemas/validation'
import { ok, fail } from '../utils/response'

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
  const [favorites, likedIds] = await Promise.all([
    redis.listFavorites(currentUserId),
    redis.listUserLikes(currentUserId)
  ])
  const likedSet = new Set(likedIds)
  
  const items = visibleList.map((a: any) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    thumbUrl: a.url,
    author: a.author,
    likeCount: (a as any).likeCount || 0,
    isFavorite: favorites.includes(a.id),
    favoriteCount: (a as any).favoriteCount || 0,
    isLiked: likedSet.has(a.id),
    status: a.status,
  }))
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
    favIds = await redis.listFavorites(id)
    await redis.setUserFavorites(id, JSON.stringify(favIds), 600)
  }
  
  const items = await Promise.all(
    favIds.map(async (artId: string) => {
      const a = await d1.getArtwork(artId)
      if (!a) return null
      const likeCount = await redis.getLikes(artId)
      const currentUserId = (c as any).get('userId') as string
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        thumbUrl: a.url,
        author: a.author,
        likeCount,
        isFavorite: true,
        isLiked: await redis.isLiked(currentUserId, a.id),
        favoriteCount: (a as any).favoriteCount || 0,
        status: a.status,
      }
    })
  )
  return c.json(ok(items.filter(Boolean)))
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
  const items = await Promise.all(
    likeIds.map(async (artId: string) => {
      const a = await d1.getArtwork(artId)
      if (!a) return null
      const likeCount = a.likeCount
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        thumbUrl: a.url,
        author: a.author,
        likeCount,
        isFavorite: await redis.isFavorite(currentUserId, a.id),
        favoriteCount: (a as any).favoriteCount || 0,
        isLiked: await redis.isLiked(currentUserId, a.id),
        status: a.status,
      }
    })
  )
  return c.json(ok(items.filter(Boolean)))
})

export default router


