import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { ok } from '../utils/response'

const router = new Hono()

router.get('/', async (c) => {
  const limitParam = c.req.query('limit')
  const limit = limitParam ? Math.max(1, Math.min(100, Number(limitParam))) : 20
  const d1 = D1Service.fromEnv(c.env)
  const list = await d1.listFeed(limit)
  const items = list.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    thumbUrl: a.url,
    author: a.author,
    likeCount: a.likeCount,
    isFavorite: false,
    status: a.status,
  }))
  return c.json(ok(items))
})

export default router


