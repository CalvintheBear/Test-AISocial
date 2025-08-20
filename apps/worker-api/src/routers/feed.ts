import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { PaginationQuerySchema, validateParam } from '../schemas/validation'
import { ok } from '../utils/response'
import { formatArtworkListForAPI } from '../utils/formatters'

const router = new Hono()

router.get('/', async (c) => {
  const { limit } = validateParam(PaginationQuerySchema, { limit: c.req.query('limit') || '20' }) as { limit: number }
  const userId = (c as any).get('userId') as string
  const d1 = D1Service.fromEnv(c.env)
  const redis = RedisService.fromEnv(c.env)
  
  // 匿名态优先使用缓存；登录态直接用 LEFT JOIN 一次性取到关系位
  let items
  if (!userId) {
    const cached = await redis.getFeed(limit)
    let list
    if (cached) {
      list = JSON.parse(cached)
    } else {
      list = await d1.listFeed(Number(limit))
      await redis.setFeed(limit, JSON.stringify(list), 600)
    }
    const userStates = list.map(() => ({ liked: false, faved: false }))
    items = formatArtworkListForAPI(list, userStates)
  } else {
    const { artworks, userStates } = await d1.listFeedWithUserState(userId, Number(limit))
    items = formatArtworkListForAPI(artworks, userStates)
  }
  return c.json(ok(items))
})

export default router


