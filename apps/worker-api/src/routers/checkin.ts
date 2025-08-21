import { Hono } from 'hono'
import { CheckinService } from '../services/checkin'
import type { Env } from '../types'

const router = new Hono<{ Bindings: Env }>()

// 获取签到状态
router.get('/status', async (c) => {
  const debug: any = { step: 'start' }
  try {
    const userId = (c as any).get('userId') as string | undefined
    if (!userId) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }

    debug.step = 'ensureTables'
    const checkinService = CheckinService.fromEnv(c.env)
    ;(checkinService as any).ensureTables && await (checkinService as any).ensureTables()

    debug.step = 'getStats'
    const stats = await checkinService.getCheckinStats(userId)
    
    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Get checkin status error:', error)
    const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : '获取签到状态失败'
    return c.json({ success: false, message, debug }, 500)
  }
})

// 执行签到
router.post('/checkin', async (c) => {
  const debug: any = { step: 'start' }
  try {
    const userId = (c as any).get('userId') as string | undefined
    if (!userId) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }

    debug.step = 'ensureTables'
    const checkinService = CheckinService.fromEnv(c.env)
    ;(checkinService as any).ensureTables && await (checkinService as any).ensureTables()

    debug.step = 'checkin'
    const result = await checkinService.checkin(userId)
    
    return c.json({
      success: result.success,
      message: result.message,
      data: {
        creditsAdded: result.creditsAdded,
        consecutiveDays: result.consecutiveDays
      }
    })
  } catch (error) {
    console.error('Checkin error:', error)
    const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : '签到失败'
    return c.json({ success: false, message, debug }, 500)
  }
})

export default router
