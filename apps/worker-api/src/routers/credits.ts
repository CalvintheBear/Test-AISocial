import { Hono } from 'hono'
import { CreditsService } from '../services/credits'

const router = new Hono()

router.get('/me', async (c) => {
  try {
    const userId = (c as any).get('userId') as string
    if (!userId) return c.json({ error: 'UNAUTHORIZED' }, 401)
    const credits = await new CreditsService((c.env as any).DB).getBalance(userId)
    return c.json({ data: { credits } })
  } catch (e: any) {
    return c.json({ error: e?.message || 'FAILED' }, 500)
  }
})

export default router


