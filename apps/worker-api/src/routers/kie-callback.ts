import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { KIECallbackResponse } from '../types/kie'

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

    if (resultImageUrl) {
      // 生成成功，创建作品记录
      const generatedImageUrl = resultImageUrl
      
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
        
        // 查找并更新现有的KIE作品记录
        const existingArtwork = await d1.getArtworkByKieTaskId(taskId)
        let artworkId: string
        
        if (existingArtwork) {
          // 更新现有的作品记录
          artworkId = existingArtwork.id
          await d1.updateArtworkUrl(artworkId, generatedImageUrl, generatedImageUrl)
          await d1.updateArtworkStatus(artworkId, 'published')
          
// 更新KIE相关字段和状态
          await d1.updateKieArtworkInfo(artworkId, {
            model: taskInfo.model || 'flux-kontext-pro',
            aspectRatio: taskInfo.aspectRatio || '1:1',
            outputFormat: 'png',
            originalImageUrl: originImageUrl
          })
          
          // 更新生成状态
          await d1.updateArtworkGenerationStatus(artworkId, {
            status: 'completed',
            completedAt: Date.now(),
            resultImageUrl: generatedImageUrl
          })
        } else {
          // 创建新的作品记录（兼容性回退）
          artworkId = await d1.createKieArtwork(
            taskInfo.userId,
            taskInfo.title,
            {
              taskId: taskId,
              prompt: taskInfo.prompt,
              model: taskInfo.model,
              aspectRatio: taskInfo.aspectRatio,
              inputImage: originImageUrl,
              status: 'published'
            }
          )
          await d1.updateArtworkUrl(artworkId, generatedImageUrl, generatedImageUrl)
        }
        
        console.log(`🎨 作品 ${artworkId} 创建成功，图片: ${generatedImageUrl}`)
        
        // 清除缓存和临时任务信息
        await redis.del(`artwork:${artworkId}`)
        await redis.del(`kie_task:${taskId}`)
        
      } catch (error) {
        console.error(`❌ 创建作品失败:`, error)
        return new Response(JSON.stringify({ 
          error: '创建作品失败',
          message: error instanceof Error ? error.message : '未知错误'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    } else {
      console.log(`ℹ️ 生成失败，没有结果图片URL`)
    }

    return new Response(JSON.stringify({ success: true, message: '回调处理完成' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
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
