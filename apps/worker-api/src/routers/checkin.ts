import { Hono } from 'hono'
import { CheckinService } from '../services/checkin'
import type { Env } from '../types'

const router = new Hono<{ Bindings: Env }>()

// 获取签到状态
router.get('/status', async (c) => {
  try {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }

    const checkinService = CheckinService.fromEnv(c.env)
    const stats = await checkinService.getCheckinStats(userId)
    
    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Get checkin status error:', error)
    return c.json({ success: false, message: '获取签到状态失败' }, 500)
  }
})

// 执行签到
router.post('/checkin', async (c) => {
  try {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }

    const checkinService = CheckinService.fromEnv(c.env)
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
    return c.json({ success: false, message: '签到失败' }, 500)
  }
})

export default router
