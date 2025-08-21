import { Hono } from 'hono'
import { CreditsService } from '../services/credits'

const router = new Hono()

// Public webhook for Creem
router.post('/creem', async (c) => {
  const env = c.env as any
  try {
    const signature = c.req.header('x-creem-signature') || ''
    const secret = env.CREEM_WEBHOOK_SECRET || ''
    if (secret && signature !== secret) {
      return c.json({ error: 'INVALID_SIGNATURE' }, 401)
    }

    const payload = await c.req.json()
    const eventType = payload?.type || payload?.event || 'unknown'
    const data = payload?.data || {}
    const sessionId = data?.id || data?.sessionId
    const userId = data?.metadata?.userId
    const amount = Number(data?.amount || 0)
    const currency = String(data?.currency || 'USD')
    const credits = Number(data?.credits || data?.metadata?.credits || 0)

    if (!sessionId) return c.json({ error: 'NO_SESSION' }, 400)

    const creditsService = new CreditsService((c.env as any).DB)

    if (eventType === 'checkout.session.completed' || eventType === 'payment.succeeded') {
      if (userId && credits > 0) {
        await creditsService.addCredits(userId, credits)
      }
      await creditsService.createOrUpdatePayment({
        id: sessionId,
        userId: userId || 'unknown',
        provider: 'creem',
        status: 'succeeded',
        amount,
        currency,
        credits,
        raw: payload,
      })
    } else if (eventType === 'payment.failed') {
      await creditsService.createOrUpdatePayment({
        id: sessionId,
        userId: userId || 'unknown',
        provider: 'creem',
        status: 'failed',
        amount,
        currency,
        credits,
        raw: payload,
      })
    }

    return c.json({ ok: true })
  } catch (e: any) {
    return c.json({ error: e?.message || 'WEBHOOK_ERROR' }, 500)
  }
})

export default router


