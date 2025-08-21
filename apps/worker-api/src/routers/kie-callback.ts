import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'

const router = new Hono()

// Flux Kontext 回调处理 - 完全基于 furycode 实现
router.post('/kie-callback', async (c) => {
  try {
    const body = await c.req.json()
    console.log('📞 收到Flux Kontext回调:', JSON.stringify(body, null, 2))
    
    // 官方：{ code, msg, data }，成功 code=200
    const code = body?.code
    const data = body?.data || {}
    const msg = body?.msg || ''

    if (code !== 200) {
      console.error('❌ Flux Kontext回调失败:', msg)
      return new Response(JSON.stringify({ error: '回调失败', code, msg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const taskId = data?.taskId
    const info = data?.info || {}
    
    // 根据官方文档，成功时 data.info 包含 originImageUrl 和 resultImageUrl
    const resultImageUrl = info?.resultImageUrl
    const originImageUrl = info?.originImageUrl

    console.log(`✅ Flux Kontext回调成功 - taskId: ${taskId}, resultImageUrl: ${resultImageUrl}`)

    if (!resultImageUrl) {
      console.log(`ℹ️ 生成失败，没有结果图片URL`)
      return new Response(JSON.stringify({ success: true, message: '回调处理完成，但无结果图片' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      const d1 = D1Service.fromEnv(c.env as any)
      const redis = RedisService.fromEnv(c.env as any)
      
      // 从Redis中获取任务信息
      const taskInfoStr = await redis.get(`kie_task:${taskId}`)
      if (!taskInfoStr) {
        console.error(`❌ 找不到任务信息: ${taskId}`)
        return new Response(JSON.stringify({ error: '找不到任务信息' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      const taskInfo = JSON.parse(taskInfoStr)
      console.log(`📋 获取到任务信息:`, taskInfo)
      
      // 查找现有的KIE作品记录（仅当用户已创建草稿时）
      const existingArtwork = await d1.getArtworkByKieTaskId(taskId)
      
      if (existingArtwork) {
        // 更新现有的作品记录
        const artworkId = existingArtwork.id
        await d1.updateArtworkUrl(artworkId, resultImageUrl, resultImageUrl)
        
        // 更新KIE相关字段和状态
        await d1.updateKieArtworkInfo(artworkId, {
          model: taskInfo.model || 'flux-kontext-pro',
          aspectRatio: taskInfo.aspectRatio || '1:1',
          outputFormat: 'png',
          originalImageUrl: originImageUrl
        })
        
        // 更新生成状态为已完成
        await d1.updateArtworkGenerationStatus(artworkId, {
          status: 'completed',
          completedAt: Date.now(),
          resultImageUrl: resultImageUrl
        })
        
        console.log(`🎨 作品 ${artworkId} 更新成功，图片: ${resultImageUrl}`)
      } else {
        // 不自动创建记录，只在Redis中缓存结果供前端获取
        const resultInfo = {
          ...taskInfo,
          resultImageUrl: resultImageUrl,
          originalImageUrl: originImageUrl,
          status: 'completed',
          completedAt: Date.now()
        }
        
        // 缓存生成结果，供前端获取
        await redis.set(`kie_result:${taskId}`, JSON.stringify(resultInfo), 24 * 60 * 60)
        console.log(`✅ 生成结果已缓存: ${taskId}`)
      }
      
      // 清除临时任务信息
      await redis.del(`kie_task:${taskId}`)
      
      return new Response(JSON.stringify({ success: true, message: '回调处理完成' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      
    } catch (error) {
      console.error(`❌ 处理失败:`, error)
      return new Response(JSON.stringify({ 
        error: '处理失败',
        message: error instanceof Error ? error.message : '未知错误'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
  } catch (error) {
    console.error('❌ 回调处理异常:', error)
    return new Response(JSON.stringify({ 
      error: '回调处理异常',
      message: error instanceof Error ? error.message : '未知错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

export default router