import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { KIECallbackResponse } from '../types/kie'
import { ok, fail } from '../utils/response'

const router = new Hono()

// KIE API 回调处理
router.post('/kie-callback', async (c) => {
  try {
    const body = await c.req.json() as KIECallbackResponse
    
    console.log('[KIE Callback] Received callback:', body)
    
    if (body.code !== 200) {
      console.error('[KIE Callback] Generation failed:', body.msg)
      return c.json(ok({ status: 'error_received', message: body.msg }))
    }
    
    const { taskId, info } = body.data
    
    if (!taskId) {
      console.error('[KIE Callback] Missing taskId in callback')
      return c.json(fail('INVALID_CALLBACK', 'Missing taskId'), 400)
    }
    
    const d1 = D1Service.fromEnv(c.env as any)
    const redis = RedisService.fromEnv(c.env as any)
    
    // 查找对应的作品
    const artwork = await d1.getArtworkByKieTaskId(taskId)
    if (!artwork) {
      console.error('[KIE Callback] Artwork not found for taskId:', taskId)
      return c.json(fail('ARTWORK_NOT_FOUND', 'Artwork not found'), 404)
    }
    
    if (body.code === 200 && info) {
      // 生成成功
      const { originImageUrl, resultImageUrl } = info
      
      // 更新数据库状态
      await d1.updateArtworkGenerationStatus(artwork.id, {
        status: 'completed',
        completedAt: Date.now(),
        resultImageUrl,
        errorMessage: undefined
      })
      
      // 更新作品URL - 暂时只更新生成状态，URL更新通过其他方式处理
      console.log(`[KIE Callback] Generated image URL: ${resultImageUrl}`)
      
      // 清除缓存
      await redis.invalidateArtworkCache(artwork.id)
      
      console.log('[KIE Callback] Successfully updated artwork:', artwork.id)
      
      // 发布完成通知到Redis
      await redis.publish(`generation:${artwork.id}`, JSON.stringify({
        type: 'generation_complete',
        artworkId: artwork.id,
        status: 'completed',
        resultUrl: resultImageUrl,
        timestamp: Date.now()
      }))
      
    } else {
      // 生成失败
      await d1.updateArtworkGenerationStatus(artwork.id, {
        status: 'failed',
        completedAt: Date.now(),
        errorMessage: body.msg || 'Generation failed'
      })
      
      console.error('[KIE Callback] Generation failed for artwork:', artwork.id)
    }
    
    return c.json(ok({ status: 'callback_processed', taskId }))
    
  } catch (error) {
    console.error('[KIE Callback] Error processing callback:', error)
    return c.json(fail('CALLBACK_PROCESSING_ERROR', 'Failed to process callback'), 500)
  }
})

export default router
