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
  const [likesMap, favorites] = await Promise.all([
    Promise.all(artworkIds.map((id: string) => redis.getLikes(id))).then(likes => 
      Object.fromEntries(artworkIds.map((id: string, i: number) => [id, likes[i]]))
    ),
    redis.listFavorites(currentUserId)
  ])
  
  const items = visibleList.map((a: any) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    thumbUrl: a.url,
    author: a.author,
    likeCount: likesMap[a.id] || 0,
    isFavorite: favorites.includes(a.id),
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
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        thumbUrl: a.url,
        author: a.author,
        likeCount,
        isFavorite: true,
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

  const list = await d1.listUserLikes(id)
  const artworkIds = list.map((a: any) => a.id)
  const likesMap = await Promise.all(artworkIds.map((aid: string) => redis.getLikes(aid)))
    .then(likes => Object.fromEntries(artworkIds.map((aid: string, i: number) => [aid, likes[i]])))

  const items = list.map((a: any) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    thumbUrl: a.url,
    author: a.author,
    likeCount: likesMap[a.id] || 0,
    isFavorite: false,
    status: a.status,
  }))
  return c.json(ok(items))
})

export default router


