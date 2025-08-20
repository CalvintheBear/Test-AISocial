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
    
    // 根据KIE API文档，检查回调状态码
    if (body.code !== 200) {
      console.error('[KIE Callback] Generation failed:', body.msg)
      
      // 即使失败也要处理，更新数据库状态
      if (body.data?.taskId) {
        const d1 = D1Service.fromEnv(c.env as any)
        const artwork = await d1.getArtworkByKieTaskId(body.data.taskId)
        
        if (artwork) {
          await d1.updateArtworkGenerationStatus(artwork.id, {
            status: 'failed',
            completedAt: Date.now(),
            errorMessage: body.msg || 'Generation failed'
          })
          
          console.error('[KIE Callback] Updated artwork status to failed:', artwork.id)
        }
      }
      
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
      // 生成成功 - 根据KIE API文档处理
      const { originImageUrl, resultImageUrl } = info
      
      console.log(`[KIE Callback] Success - TaskId: ${taskId}`)
      console.log(`[KIE Callback] Origin Image URL: ${originImageUrl}`)
      console.log(`[KIE Callback] Result Image URL: ${resultImageUrl}`)
      
      // 更新数据库状态
      await d1.updateArtworkGenerationStatus(artwork.id, {
        status: 'completed',
        completedAt: Date.now(),
        resultImageUrl,
        errorMessage: undefined
      })
      
      // 更新作品URL - 将生成结果设置为作品的主图
      await d1.updateArtworkUrl(artwork.id, resultImageUrl)
      
      console.log(`[KIE Callback] Successfully updated artwork: ${artwork.id}`)
      
      // 清除缓存
      await redis.invalidateArtworkCache(artwork.id)
      
      // 发布完成通知到Redis
      await redis.publish(`generation:${artwork.id}`, JSON.stringify({
        type: 'generation_complete',
        artworkId: artwork.id,
        status: 'completed',
        resultUrl: resultImageUrl,
        originUrl: originImageUrl,
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
