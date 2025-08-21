import { Hono } from 'hono'
import { CreditsService } from '../services/credits'

const router = new Hono()

// Public webhook for Creem
router.post('/creem', async (c) => {
  const env = c.env as any
  try {
    const signature = c.req.header('x-creem-signature') || c.req.header('creem-signature') || c.req.header('x-signature') || ''
    const secret = env.CREEM_WEBHOOK_SECRET || ''
    const isTest = String(env.CREEM_API_BASE_URL || '').includes('creem.dev') || String(env.CREEM_API_BASE_URL || '').includes('test')
    if (secret && !isTest && signature !== secret) {
      return c.json({ error: 'INVALID_SIGNATURE' }, 401)
    }

    // 兼容各种 Content-Type：优先 text，再尝试 JSON
    let payload: any
    try {
      const text = await c.req.text()
      try { payload = JSON.parse(text) } catch { payload = text }
    } catch {
      try { payload = await c.req.json() } catch { payload = {} }
    }
    const eventType = payload?.eventType || payload?.type || payload?.event || 'unknown'
    const obj = payload?.object || payload?.data || {}
    // 统一以 subscription.id 作为主键（可避免 checkout.id 与 subscription.id 产生两条记录）
    const sessionId = obj?.subscription?.id || obj?.order?.id || obj?.id || payload?.id || crypto.randomUUID()
    let userId = obj?.metadata?.userId || obj?.subscription?.metadata?.userId || obj?.order?.metadata?.userId || obj?.customer?.metadata?.userId
    const amount = Number(obj?.order?.amount || obj?.product?.price || obj?.amount || obj?.items?.[0]?.price || 0)
    const currency = String(obj?.order?.currency || obj?.product?.currency || obj?.currency || 'USD')
    let credits = Number(obj?.credits || obj?.metadata?.credits || 0)
    const productId = obj?.product?.id || obj?.order?.product || obj?.product || obj?.product_id || obj?.items?.[0]?.product_id || obj?.metadata?.productId
    
    // 年费产品ID列表
    const yearlyProductIds = [
      'prod_54wpsAr6bPuE0RaPGsToUW', // Basic yearly
      'prod_2B1IyF8TesaUeCNuLlM8fD', // Pro yearly  
      'prod_68tgdFA0fAFhFx7giLbwzd'  // Max yearly
    ]
    
    // 优先通过 productId 判断，再通过 billing_period 和产品名称判断
    const isYearly = yearlyProductIds.includes(productId) || 
                    (obj?.product?.billing_period || obj?.subscription?.billing_period || '').includes('year') || 
                    (obj?.product?.name || '').toLowerCase().includes('year')
    
    // 调试日志
    console.log('Payment webhook debug:', {
      productId,
      isYearly,
      billingPeriod: obj?.product?.billing_period || obj?.subscription?.billing_period,
      productName: obj?.product?.name,
      yearlyProductIds
    })

    // 如果仍然没有用户ID，尝试从邮箱映射（作为最后兜底，不强制）
    // 在测试模式可能拿不到 userId，这里允许跳过加分但仍记录 payment

    // 本地产品-积分映射（测试链路直付时没有 metadata）
    const productCreditsMap: Record<string, number> = {
      // monthly
      'prod_3DytMxaAcwQWGDEbL0d4eI': 300,
      'prod_5ujQhBIn1aN14PkF16h92y': 1200,
      'prod_5l6w793yJv6MeG8GqrTvJ3': 5000,
      // yearly -> 12x 月度积分
      'prod_54wpsAr6bPuE0RaPGsToUW': 300 * 12,
      'prod_2B1IyF8TesaUeCNuLlM8fD': 1200 * 12,
      'prod_68tgdFA0fAFhFx7giLbwzd': 5000 * 12,
    }
    // 如果 metadata 没有提供明确的 credits，按产品映射给一次；若 metadata 提供了 credits，以 metadata 为准（避免重复乘12）
    if ((!obj?.metadata || obj?.metadata?.credits == null) && productId && productCreditsMap[productId]) {
      credits = productCreditsMap[productId]
    }

    if (!sessionId) return c.json({ ok: true, note: 'NO_SESSION_ID' })

    // 兜底：如果缺少 userId，且 payload 含有 customer.email，则按邮箱查用户
    if (!userId) {
      const email = obj?.customer?.email || obj?.order?.customer?.email
      if (email) {
        try {
          const { D1Service } = await import('../services/d1')
          const d1 = new D1Service((CreditsService.fromEnv(c.env as any) as any).db)
          const u = await d1.getUserByEmail(String(email))
          if (u?.id) userId = u.id
        } catch {}
      }
    }

    const creditsService = CreditsService.fromEnv(c.env as any)

    const successEvents = new Set([
      'checkout.session.completed',
      'checkout.completed',
      'payment.succeeded',
      'subscription.paid',
      'subscription.active',
    ])
    if (successEvents.has(eventType)) {
      // 幂等保护：同一 sessionId 已成功则忽略后续成功事件
      try {
        const existing = await creditsService.getPayment(sessionId)
        if (existing?.status === 'succeeded') {
          return c.json({ ok: true, note: 'duplicate_success_ignored' })
        }
      } catch {}

      try {
        if (userId && credits > 0) {
          await creditsService.addCredits(userId, credits)
        }
      } catch (e) {
        // 积分入账失败不影响回 200，避免 Creem 重试风暴
      }
      const expiresAt = (() => {
        const base = Date.now()
        // 年费：+365天，月费：+30天
        const daysToAdd = isYearly ? 365 : 30
        const millisecondsPerDay = 24 * 60 * 60 * 1000
        return base + (daysToAdd * millisecondsPerDay)
      })()
      try { await creditsService.createOrUpdatePayment({
        id: sessionId,
        userId: userId || 'unknown',
        provider: 'creem',
        status: 'succeeded',
        amount,
        currency,
        credits,
        expiresAt,
        raw: payload,
      }) } catch {}
      // 若 userId 缺失但我们能在 DB 查到早前 pending 记录（按 sessionId），则补写 userId 并加分
      if (!userId) {
        try {
          const pending = await creditsService.getPayment(sessionId)
          if (pending?.userId && credits && pending.status !== 'succeeded') {
            await creditsService.addCredits(pending.userId, credits)
          }
        } catch {}
      }
    } else if (eventType === 'payment.failed' || eventType === 'checkout.failed') {
      try { await creditsService.createOrUpdatePayment({
        id: sessionId,
        userId: userId || 'unknown',
        provider: 'creem',
        status: 'failed',
        amount,
        currency,
        credits,
        raw: payload,
      }) } catch {}
    }

    return c.json({ ok: true })
  } catch (e: any) {
    // 永远 200，避免 Creem 重试；通过日志定位错误
    return c.json({ ok: true, note: 'WEBHOOK_ERROR_SWALLOWED' })
  }
})

export default router


