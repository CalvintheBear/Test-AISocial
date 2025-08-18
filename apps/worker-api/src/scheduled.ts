import { D1Service } from './services/d1'
import { R2Service } from './services/r2'
import { RedisService } from './services/redis'
import { HotnessService } from './services/hotness'
import { syncArtworkCounts, checkDataConsistency } from './utils/sync-counts'
import { hotnessMetrics } from './utils/hotness-metrics'
import { batchUpdateManager } from './utils/hotness-batch-updater'

export interface Env extends Record<string, unknown> {
  DB: D1Database
  R2_UPLOAD: R2Bucket
  R2_AFTER: R2Bucket
  UPSTASH_REDIS_REST_URL: string
  UPSTASH_REDIS_REST_TOKEN: string
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const d1 = D1Service.fromEnv(env)
    const r2 = R2Service.fromEnv(env)
    const redis = RedisService.fromEnv(env)

    try {
      // 1. Get recent published artworks with original/thumb URLs
      const recentArtworks = await d1.listRecentPublishedWithUrls(50)

      console.log(`Processing ${recentArtworks.length} artworks for thumbnail generation`)

      for (const artwork of recentArtworks) {
        try {
          // Skip if already has a distinct thumbnail URL
          if (artwork.thumbUrl && artwork.thumbUrl !== artwork.originalUrl) continue

          // Extract key from original URL
          const key = artwork.originalUrl.split('/').slice(-1)[0]
          if (!key) continue

          // 2. Get original image from R2_UPLOAD
          const original = await r2.getObject('upload', key)
          if (!original) {
            console.warn(`Original image not found: ${key}`)
            continue
          }

          // 3. Generate thumbnail using image processing
          const arrayBuffer = await original.arrayBuffer()
          
          // Use Cloudflare's Image Resizing service or basic resize
          const resizedResponse = await fetch('https://images.cloudflare.com/workers/image', {
            method: 'POST',
            body: arrayBuffer,
            headers: {
              'Content-Type': 'image/jpeg',
            },
            cf: {
              image: {
                width: 512,
                height: 512,
                fit: 'cover',
                format: 'webp',
                quality: 85,
              }
            }
          })

          if (!resizedResponse.ok) {
            console.error(`Failed to resize image: ${resizedResponse.status}`)
            continue
          }

          const resizedBuffer = await resizedResponse.arrayBuffer()

          // 4. Upload thumbnail to R2_AFTER
          const thumbKey = `thumb-${key}`
          const { url: thumbUrl } = await r2.putObject('after', thumbKey, resizedBuffer, 'image/webp')

          // 5. Update D1 with thumbnail URL
          await d1.updateThumbUrl(artwork.id, thumbUrl)

          // 6. Invalidate cache
          await redis.invalidateArtworkCache(artwork.id)
          await redis.invalidateFeed()

          console.log(`Generated thumbnail for artwork ${artwork.id}: ${thumbUrl}`)

        } catch (error) {
          console.error(`Error processing artwork ${artwork.id}:`, error)
        }
      }

      console.log('Thumbnail generation cron job completed')
    } catch (error) {
      console.error('Error in thumbnail generation cron job:', error)
    }

    try {
      // 每15分钟同步一次点赞和收藏数量
      console.log('开始同步点赞和收藏数量...')
      const syncResult = await syncArtworkCounts(env)
      console.log(`数量同步完成: 更新 ${syncResult.updatedCount} 个作品`)
    } catch (error) {
      console.error('数量同步失败:', error)
    }

    try {
      // 每30分钟刷新一次作品热度
      console.log('开始刷新作品热度...')
      const d1 = D1Service.fromEnv(env)
      const redis = RedisService.fromEnv(env)
      const hotness = new HotnessService(redis, d1)
      const batchUpdater = batchUpdateManager.getBatchUpdater(hotness, redis, d1, hotnessMetrics)
      
      // 获取最近发布的作品
      const thirtyDaysAgo = Date.now() - (30 * 24 * 3600 * 1000)
      const recentArtworks = await d1.getArtworksInTimeRange(thirtyDaysAgo, 100)
      
      // 使用批量更新优化
      if (recentArtworks.length > 0) {
        // 首先批量获取所有需要的计数
        const countPromises = recentArtworks.map(async (artwork) => {
          const [likeCount, favCount] = await Promise.all([
            d1.getLikeCount(artwork.id),
            d1.getFavoriteCount(artwork.id)
          ])
          
          return {
            artworkId: artwork.id,
            likeCount,
            favCount,
            viewCount: 0,
            commentCount: 0,
            shareCount: 0
          }
        })
        
        const counts = await Promise.all(countPromises)
        
        // 添加到批量更新队列
        for (const artwork of recentArtworks) {
          const count = counts.find(c => c.artworkId === artwork.id)
          if (count) {
            batchUpdater.addToBatch({
              artworkId: artwork.id,
              action: 'refresh',
              deltaWeight: 0, // 使用refresh模式，权重由现有数据计算
              metadata: count
            })
          }
        }
        
        // 强制处理批量队列
        const result = await batchUpdater.flushQueue()
        console.log(`热度刷新完成: ${result.processed}/${recentArtworks.length} 个作品已更新`)
        
        // 记录指标
        hotnessMetrics.recordHotnessUpdate()
        hotnessMetrics.recordCalculationTime(result.duration)
        hotnessMetrics.recordTopArtworks(recentArtworks.length)
        
      } else {
        console.log('没有需要刷新热度的作品')
      }
      
      // 清理过期数据
      const cleanupResult = await batchUpdater.cleanupExpiredData()
      console.log(`清理完成: 删除 ${cleanupResult.cleaned} 个过期数据项`)
      
    } catch (error) {
      console.error('热度刷新失败:', error)
      hotnessMetrics.recordError()
    }
  }
}