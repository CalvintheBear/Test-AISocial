import { D1Service } from './d1'
import { KIEService } from './kie-api'
import { RedisService } from './redis'

export class GenerationMonitor {
  private d1: D1Service
  private kie: KIEService
  private redis: RedisService

  constructor(d1: D1Service, kie: KIEService, redis: RedisService) {
    this.d1 = d1
    this.kie = kie
    this.redis = redis
  }

  async monitorGenerationStatus(artworkId: string, taskId: string): Promise<void> {
    try {
      console.log(`[GenerationMonitor] Starting monitoring for artwork ${artworkId}, task ${taskId}`)

      // 检查当前状态
      const artwork = await this.d1.getKieArtworkData(artworkId)
      if (!artwork) {
        console.error(`[GenerationMonitor] Artwork not found: ${artworkId}`)
        return
      }

      // 开始轮询状态
      const maxAttempts = 120 // 10分钟
      let attempts = 0
      
      while (attempts < maxAttempts) {
        try {
          const status = await this.kie.getGenerationStatus(taskId)
          
          console.log(`[GenerationMonitor] Task ${taskId} status: ${status.status}`)

          // 更新数据库状态
          await this.d1.updateArtworkGenerationStatus(artworkId, {
            status: status.status,
            completedAt: status.status === 'completed' ? Date.now() : undefined,
            errorMessage: status.errorMessage,
            resultImageUrl: status.resultImageUrl
          })

          // 更新缓存
          await this.redis.invalidateArtworkCache(artworkId)

          // 如果完成或失败，停止监控
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'timeout') {
            if (status.status === 'completed' && status.resultImageUrl) {
              // 更新作品URL和状态
              await this.d1.updateArtworkGenerationStatus(artworkId, {
                resultImageUrl: status.resultImageUrl,
                status: 'completed'
              })
              
              console.log(`[GenerationMonitor] Generation completed for artwork ${artworkId}: ${status.resultImageUrl}`)
            } else if (status.status === 'failed') {
              console.error(`[GenerationMonitor] Generation failed for artwork ${artworkId}: ${status.errorMessage}`)
            }
            
            // 发布完成通知
            await this.publishGenerationComplete(artworkId, status)
            return
          }

          attempts++
          
          // 等待5秒后再次检查
          await new Promise(resolve => setTimeout(resolve, 5000))
          
        } catch (error) {
          console.error(`[GenerationMonitor] Error checking status for task ${taskId}:`, error)
          
          // 更新错误状态
          await this.d1.updateArtworkGenerationStatus(artworkId, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          })
          
          return
        }
      }

      // 超时处理
      console.warn(`[GenerationMonitor] Generation timeout for artwork ${artworkId}, task ${taskId}`)
      await this.d1.updateArtworkGenerationStatus(artworkId, {
        status: 'timeout',
        errorMessage: 'Generation timeout after 10 minutes'
      })

    } catch (error) {
      console.error(`[GenerationMonitor] Fatal error monitoring generation:`, error)
    }
  }

  async publishGenerationComplete(artworkId: string, status: any): Promise<void> {
    try {
      // 发布到Redis通知频道
      const channel = `generation:${artworkId}`
      await this.redis.publish(channel, JSON.stringify({
        type: 'generation_complete',
        artworkId,
        status: status.status,
        resultUrl: status.resultImageUrl,
        error: status.errorMessage,
        timestamp: Date.now()
      }))

      console.log(`[GenerationMonitor] Published completion notification for ${artworkId}`)
    } catch (error) {
      console.error(`[GenerationMonitor] Error publishing completion:`, error)
    }
  }

  async handleExpiredGenerations(): Promise<void> {
    try {
      // 获取超时或失败的生成任务
      const generatingArtworks = await this.d1.listKieGeneratingArtworks(100)
      
      for (const artwork of generatingArtworks) {
        const startedAt = artwork.kie_generation_started_at
        const now = Date.now()
        const timeoutMs = 15 * 60 * 1000 // 15分钟
        
        if (now - startedAt > timeoutMs) {
          console.log(`[GenerationMonitor] Marking expired generation: ${artwork.id}`)
          await this.d1.updateArtworkGenerationStatus(artwork.id, {
            status: 'timeout',
            errorMessage: 'Generation timeout after 15 minutes'
          })
        }
      }
    } catch (error) {
      console.error(`[GenerationMonitor] Error handling expired generations:`, error)
    }
  }
}