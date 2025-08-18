import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { HotnessService } from '../services/hotness'
import { HotnessCalculator } from '../utils/hotness-calculator'
import { ok, fail } from '../utils/response'
import { formatArtworkForAPI } from '../utils/formatters'

const router = new Hono()

/**
 * 获取热门作品
 * GET /api/hotness/trending
 */
router.get('/trending', async (c) => {
  try {
    const timeWindow = c.req.query('timeWindow') || '24h'
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
    const offset = parseInt(c.req.query('offset') || '0')
    const category = c.req.query('category') || 'all'
    
    // 验证分类参数
    const validCategories = ['all', 'viral', 'hot', 'rising']
    if (!validCategories.includes(category)) {
      return c.json(fail('INVALID_INPUT', 'Invalid category'), 400)
    }
    
    const redis = RedisService.fromEnv(c.env)
    const hotness = new HotnessService(redis)
    const d1 = D1Service.fromEnv(c.env)
    
    // 获取热门作品ID列表
    const hotArtworks = await hotness.getTopHotArtworks(limit + offset)
    const paginatedArtworks = hotArtworks.slice(offset, offset + limit)
    
    if (paginatedArtworks.length === 0) {
      return c.json(ok([]))
    }
    
    // 获取作品详细信息
    const artworks = await Promise.all(
      paginatedArtworks.map(async ({ artworkId, score }) => {
        const artwork = await d1.getArtwork(artworkId)
        if (!artwork) return null
        
        const userId = (c as any).get('userId') as string
        let userState = { liked: false, faved: false }
        
        if (userId) {
          try {
            const [isLiked, isFavorited] = await Promise.all([
              redis.isLiked(userId, artworkId),
              redis.isFavorite(userId, artworkId)
            ])
            userState = { liked: isLiked, faved: isFavorited }
          } catch (e) {
            // Fallback to D1
            userState = await d1.getUserArtworkState(userId, artworkId)
          }
        }
        
        const hotLevel = HotnessCalculator.getHotnessLevel(score)
        
        // 根据分类过滤
        if (category !== 'all') {
          const categoryMap: Record<string, number> = {
            'viral': 100,
            'hot': 50,
            'rising': 20
          }
          
          const minScore = categoryMap[category]
          if (minScore && score < minScore) {
            return null
          }
        }
        
        return {
          ...formatArtworkForAPI(artwork, userState),
          hot_score: score,
          hot_level: hotLevel,
          trend: 'stable' // 可以从历史数据计算趋势
        }
      })
    )
    
    // 过滤掉null值
    const validArtworks = artworks.filter(Boolean)
    
    return c.json(ok(validArtworks))
  } catch (error) {
    console.error('Failed to get trending artworks:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

/**
 * 获取趋势作品
 * GET /api/hotness/trending/:timeWindow
 */
router.get('/trending/:timeWindow', async (c) => {
  try {
    const { timeWindow } = c.req.param()
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
    const category = c.req.query('category') || 'all'
    
    // 验证分类参数
    const validCategories = ['all', 'viral', 'hot', 'rising']
    if (!validCategories.includes(category)) {
      return c.json(fail('INVALID_INPUT', 'Invalid category'), 400)
    }
    
    // 验证时间窗口
    const validTimeWindows = ['1h', '6h', '24h', '7d', '30d']
    if (!validTimeWindows.includes(timeWindow)) {
      return c.json(fail('INVALID_INPUT', 'Invalid time window'), 400)
    }
    
    const redis = RedisService.fromEnv(c.env)
    const hotness = new HotnessService(redis)
    const d1 = D1Service.fromEnv(c.env)
    
    // 计算时间范围
    const now = Date.now()
    const timeRanges = {
      '1h': 3600 * 1000,
      '6h': 6 * 3600 * 1000,
      '24h': 24 * 3600 * 1000,
      '7d': 7 * 24 * 3600 * 1000,
      '30d': 30 * 24 * 3600 * 1000
    }
    const since = now - timeRanges[timeWindow as keyof typeof timeRanges]
    
    // 获取该时间范围内的作品
    const artworkIds = await d1.getArtworksInTimeRange(since, now)
    
    if (artworkIds.length === 0) {
      return c.json(ok([]))
    }
    
    // 获取完整的作品信息
    const artworks = await Promise.all(
      artworkIds.map(async ({ id }) => await d1.getArtwork(id))
    )
    
    const validArtworks = artworks.filter(Boolean)
    
    // 获取用户状态
    const userId = (c as any).get('userId') as string
    const enhancedArtworks = await Promise.all(
      validArtworks.map(async (artwork) => {
        if (!artwork) return null
        
        let userState = { liked: false, faved: false }
        
        if (userId) {
          try {
            const [isLiked, isFavorited] = await Promise.all([
              redis.isLiked(userId, artwork.id),
              redis.isFavorite(userId, artwork.id)
            ])
            userState = { liked: isLiked, faved: isFavorited }
          } catch (e) {
            userState = await d1.getUserArtworkState(userId, artwork.id)
          }
        }
        
        // 获取热度分数
        const hotScore = await hotness.getArtworkHotData(artwork.id)
        
        return {
          ...formatArtworkForAPI(artwork, userState),
          hot_score: hotScore.total_score || 0,
          hot_level: HotnessCalculator.getHotnessLevel(hotScore.total_score || 0),
          time_window: timeWindow
        }
      })
    )
    
    // 根据分类过滤
    const filteredArtworks = enhancedArtworks.filter((artwork) => {
      if (!artwork) return false
      
      if (category === 'all') return true
      
      const categoryMap: Record<string, number> = {
        'viral': 100,
        'hot': 50,
        'rising': 20
      }
      
      const minScore = categoryMap[category]
      return minScore ? (artwork.hot_score || 0) >= minScore : true
    })
    
    // 按热度排序
    const validEnhancedArtworks = filteredArtworks.filter(Boolean)
    validEnhancedArtworks.sort((a, b) => ((b?.hot_score || 0) - (a?.hot_score || 0)))
    
    return c.json(ok(validEnhancedArtworks))
  } catch (error) {
    console.error('Failed to get trending artworks by time window:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

/**
 * 获取作品热度详情
 * GET /api/hotness/:id
 */
router.get('/:id', async (c) => {
  try {
    const { id } = c.req.param()
    const userId = (c as any).get('userId') as string
    
    const redis = RedisService.fromEnv(c.env)
    const hotness = new HotnessService(redis)
    const d1 = D1Service.fromEnv(c.env)
    
    // 获取作品
    const artwork = await d1.getArtwork(id)
    if (!artwork) {
      return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
    }
    
    // 获取热度详情
    const hotData = await hotness.getArtworkHotData(id)
    const hotDetails = await hotness.getArtworkHotnessDetails(id)
    
    // 获取用户状态
    let userState = { liked: false, faved: false }
    if (userId) {
      try {
        userState = await d1.getUserArtworkState(userId, id)
      } catch (e) {
        console.error('Failed to get user state:', e)
      }
    }
    
    const response = {
      artwork: formatArtworkForAPI(artwork, userState),
      hotness: {
        score: hotDetails.score || 0,
        level: HotnessCalculator.getHotnessLevel(hotDetails.score || 0),
        rank: hotDetails.rank,
        details: {
          base_weight: hotData.base_weight || 0,
          interaction_weight: hotData.like_weight + hotData.favorite_weight || 0,
          time_decay: hotData.time_decay || 1,
          view_count: hotData.view_count || 0,
          comment_count: hotData.comment_count || 0,
          share_count: hotData.share_count || 0
        }
      }
    }
    
    return c.json(ok(response))
  } catch (error) {
    console.error('Failed to get artwork hotness:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

/**
 * 获取热门排行榜
 * GET /api/hotness/rank
 */
router.get('/rank', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
    const offset = parseInt(c.req.query('offset') || '0')
    
    const redis = RedisService.fromEnv(c.env)
    const hotness = new HotnessService(redis)
    const d1 = D1Service.fromEnv(c.env)
    
    // 获取排行榜
    const rankings = await hotness.getTopHotArtworks(limit + offset)
    const paginatedRankings = rankings.slice(offset, offset + limit)
    
    if (paginatedRankings.length === 0) {
      return c.json(ok([]))
    }
    
    // 获取作品详细信息
    const detailedRankings = await Promise.all(
      paginatedRankings.map(async ({ artworkId, score }, index) => {
        const artwork = await d1.getArtwork(artworkId)
        if (!artwork) return null
        
        const userId = (c as any).get('userId') as string
        let userState = { liked: false, faved: false }
        
        if (userId) {
          try {
            userState = await d1.getUserArtworkState(userId, artworkId)
          } catch (e) {
            console.error('Failed to get user state:', e)
          }
        }
        
        return {
          rank: offset + index + 1,
          artwork: formatArtworkForAPI(artwork, userState),
          hot_score: score,
          hot_level: HotnessCalculator.getHotnessLevel(score)
        }
      })
    )
    
    // 过滤掉null值
    const validRankings = detailedRankings.filter(Boolean)
    
    return c.json(ok(validRankings))
  } catch (error) {
    console.error('Failed to get hotness rank:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

/**
 * 管理员更新热度权重
 * POST /api/hotness/config
 */
router.post('/config', async (c) => {
  try {
    // 检查管理员权限
    const userId = (c as any).get('userId') as string
    const isAdmin = (c as any).get('isAdmin') as boolean
    
    if (!isAdmin) {
      return c.json(fail('FORBIDDEN', 'Admin access required'), 403)
    }
    
    const config = await c.req.json()
    
    // 验证配置
    const { HotnessCalculator } = await import('../utils/hotness-calculator')
    if (!HotnessCalculator.validateConfig(config)) {
      return c.json(fail('INVALID_INPUT', 'Invalid configuration'), 400)
    }
    
    // 保存配置到Redis或数据库
    const redis = RedisService.fromEnv(c.env)
    await redis.set('hotness_config', JSON.stringify(config))
    
    return c.json(ok({ message: 'Configuration updated successfully' }))
  } catch (error) {
    console.error('Failed to update hotness config:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

/**
 * 刷新热度计算
 * POST /api/hotness/refresh
 */
router.post('/refresh', async (c) => {
  try {
    const { artworkIds } = await c.req.json()
    
    if (!Array.isArray(artworkIds) || artworkIds.length === 0) {
      return c.json(fail('INVALID_INPUT', 'Invalid artwork IDs'), 400)
    }
    
    const redis = RedisService.fromEnv(c.env)
    const hotness = new HotnessService(redis)
    const d1 = D1Service.fromEnv(c.env)
    
    // 批量刷新热度
    const results = await Promise.allSettled(
      artworkIds.map(async (id) => {
        const artwork = await d1.getArtwork(id)
        if (!artwork) return { id, error: 'Artwork not found' }
        
        // 获取互动数据
        const [likeCount, favCount] = await Promise.all([
          d1.getLikeCount(id),
          d1.getFavoriteCount(id)
        ])
        
        // 计算新的热度
        const score = await hotness.updateArtworkHotness(
          id, 
          'refresh', 
          undefined, 
          { likeCount, favCount }
        )
        
        return { id, score }
      })
    )
    
    return c.json(ok({
      refreshed: results.length,
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    }))
  } catch (error) {
    console.error('Failed to refresh hotness:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

// 新增：强制同步热度到数据库
router.post('/sync/:id', async (c) => {
  try {
    const { id } = c.req.param()
    const redis = RedisService.fromEnv(c.env)
    const d1 = D1Service.fromEnv(c.env)
    const hotness = new HotnessService(redis, d1)
    
    const result = await hotness.syncHotnessToDatabase(id)
    
    return c.json(ok(result))
  } catch (error) {
    console.error('Failed to sync hotness:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

// 新增：批量同步热度
router.post('/sync-batch', async (c) => {
  try {
    const { artworkIds } = await c.req.json()
    
    if (!Array.isArray(artworkIds) || artworkIds.length === 0) {
      return c.json(fail('INVALID_INPUT', 'Invalid artwork IDs'), 400)
    }
    
    const redis = RedisService.fromEnv(c.env)
    const d1 = D1Service.fromEnv(c.env)
    const hotness = new HotnessService(redis, d1)
    
    const result = await hotness.batchSyncHotnessToDatabase(artworkIds)
    
    return c.json(ok(result))
  } catch (error) {
    console.error('Failed to batch sync hotness:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

export default router