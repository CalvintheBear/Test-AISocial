import { Hono } from 'hono'
import { syncArtworkCounts, checkDataConsistency } from '../utils/sync-counts'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import type { Env } from '../types'

const router = new Hono<{ Bindings: Env }>()

/**
 * 管理员接口：同步所有作品的点赞和收藏数量
 */
router.post('/sync-counts', async (c) => {
  try {
    // 简单的管理员验证（生产环境应该更严格）
    const authHeader = c.req.header('Authorization')
    if (authHeader !== `Bearer ${c.env.ADMIN_TOKEN || 'admin-secret'}`) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }

    const result = await syncArtworkCounts(c.env)
    return c.json({ 
      success: true, 
      message: `同步完成，共更新 ${result.updatedCount} 个作品`,
      data: result
    })
  } catch (error) {
    console.error('同步失败:', error)
    return c.json({ success: false, message: '同步失败', error: (error as any).message }, 500)
  }
})

/**
 * 管理员接口：检查数据一致性
 */
router.get('/check-consistency', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (authHeader !== `Bearer ${c.env.ADMIN_TOKEN || 'admin-secret'}`) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }

    const issues = await checkDataConsistency(c.env)
    return c.json({ 
      success: true, 
      issues,
      issueCount: issues.length
    })
  } catch (error) {
    console.error('检查失败:', error)
    return c.json({ success: false, message: '检查失败', error: (error as any).message }, 500)
  }
})

/**
 * 修复单个作品的数量
 */
router.post('/fix-artwork/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (authHeader !== `Bearer ${c.env.ADMIN_TOKEN || 'admin-secret'}`) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }

    const artworkId = c.req.param('id')
    const d1 = D1Service.fromEnv(c.env)
    
    // 计算实际数量
    const actualLikes = await d1.getLikesCount(artworkId)
    const actualFavorites = await (async () => {
      const stmt = (d1 as any).db.prepare(`SELECT COUNT(*) as count FROM artworks_favorite WHERE artwork_id = ?`)
      const rows = await stmt.bind(artworkId).all() as any
      return Number((rows.results || [])[0]?.count || 0)
    })()
    
    // 更新D1
    await (d1 as any).db.prepare(`
      UPDATE artworks 
      SET like_count = ?, favorite_count = ? 
      WHERE id = ?
    `).bind(actualLikes, actualFavorites, artworkId).run()
    
    return c.json({ 
      success: true, 
      message: `作品 ${artworkId} 已修复`,
      data: { like_count: actualLikes, favorite_count: actualFavorites }
    })
  } catch (error) {
    console.error('修复失败:', error)
    return c.json({ success: false, message: '修复失败', error: (error as any).message }, 500)
  }
})

export default router