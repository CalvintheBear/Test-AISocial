import { D1Service } from './services/d1'
import { R2Service } from './services/r2'
import { RedisService } from './services/redis'
import { syncArtworkCounts, checkDataConsistency } from './utils/sync-counts'

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
  }
}