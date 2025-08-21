import { Hono } from 'hono'
import { CreditsService } from '../services/credits'

const router = new Hono()

router.post('/checkout', async (c) => {
  const env = c.env as any
  const userId = (c as any).get('userId') as string
  if (!userId) return c.json({ error: 'UNAUTHORIZED' }, 401)

  const { packageId, credits, amount, currency, interval, productId } = await c.req.json().catch(() => ({})) as any

  if (!env.CREEM_API_KEY || !env.CREEM_API_BASE_URL) {
    return c.json({ error: 'PAYMENT_PROVIDER_NOT_CONFIGURED' }, 501)
  }

  const successUrl = env.CREEM_SUCCESS_URL || `${env.ALLOWED_ORIGIN || ''}/user/me`
  const cancelUrl = env.CREEM_CANCEL_URL || `${env.ALLOWED_ORIGIN || ''}/pricing`
  const body: any = {
    // 尽可能兼容 Creem 各版本字段
    product: productId || packageId,
    product_id: productId || packageId,
    amount: typeof amount === 'number' ? amount : undefined,
    currency: currency || 'USD',
    metadata: { userId, packageId, interval, credits, productId },
    success_url: successUrl,
    cancel_url: cancelUrl,
    successUrl,
    cancelUrl,
  }

  try {
    const res = await fetch(`${env.CREEM_API_BASE_URL.replace(/\/$/, '')}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.CREEM_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const txt = await res.text()
      // 测试环境兜底：直接返回测试直链，避免阻塞支付链路
      if (productId && String(productId).startsWith('prod_')) {
        const directUrl = `https://www.creem.io/test/payment/${productId}`
        return c.json({ data: { id: productId, url: directUrl, mode: 'direct-test-link' }, warning: 'fallback_direct_link', detail: txt })
      }
      return c.json({ error: 'CREEM_CREATE_SESSION_FAILED', detail: txt }, 400)
    }
    const data = await res.json().catch(() => ({})) as any

    // 统一以 subscriptionId 作为 ID，避免和 checkoutId 造成两条记录
    const sessionId = data?.subscriptionId || data?.subscription_id || data?.id || data?.sessionId || crypto.randomUUID()
    const redirectUrl = data?.url || data?.checkout_url || data?.checkoutUrl

    await new CreditsService((c.env as any).DB).createOrUpdatePayment({
      id: sessionId,
      userId,
      provider: 'creem',
      status: 'pending',
      amount: Number(amount || 0),
      currency: String(currency || 'USD'),
      credits: Number(credits || 0),
      raw: data,
    })

    return c.json({ data: { id: sessionId, url: redirectUrl } })
  } catch (e: any) {
    return c.json({ error: 'CHECKOUT_FAILED', detail: e?.message || String(e) }, 500)
  }
})

export default router


