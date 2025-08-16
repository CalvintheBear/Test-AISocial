/**
 * D1 ↔ Redis 一致性校验脚本
 * 
 * 功能：
 * 1. 检查点赞计数一致性 (D1 vs Redis)
 * 2. 检查收藏列表一致性 (D1 vs Redis)
 * 3. 报告差异并支持回写修正
 */

import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'

interface ConsistencyReport {
  timestamp: string
  totalArtworks: number
  totalUsers: number
  likeDiscrepancies: Array<{
    artworkId: string
    d1Count: number
    redisCount: number
    difference: number
  }>
  favoriteDiscrepancies: Array<{
    userId: string
    artworkId: string
    inD1: boolean
    inRedis: boolean
  }>
  summary: {
    totalLikeDiscrepancies: number
    totalFavoriteDiscrepancies: number
    maxLikeDifference: number
    needsCorrection: boolean
  }
}

export async function runConsistencyCheck(
  env: any,
  options: { fix: boolean; verbose: boolean } = { fix: false, verbose: false }
): Promise<ConsistencyReport> {
  const d1 = D1Service.fromEnv(env)
  const redis = RedisService.fromEnv(env)
  
  const report: ConsistencyReport = {
    timestamp: new Date().toISOString(),
    totalArtworks: 0,
    totalUsers: 0,
    likeDiscrepancies: [],
    favoriteDiscrepancies: [],
    summary: {
      totalLikeDiscrepancies: 0,
      totalFavoriteDiscrepancies: 0,
      maxLikeDifference: 0,
      needsCorrection: false
    }
  }

  try {
    if (redis['isDevMode']) {
      console.log('⚠️  DEV mode detected, skipping consistency check')
      return report
    }

    console.log('🔍 Starting D1 ↔ Redis consistency check...')

    // 1. 检查点赞计数一致性
    console.log('📊 Checking like counts...')
    const artworks = await d1.listAllArtworks()
    report.totalArtworks = artworks.length

    for (const artwork of artworks) {
      const d1Likes = await d1.getLikesCount(artwork.id)
      const redisLikes = await redis.getLikes(artwork.id)
      
      if (d1Likes !== redisLikes) {
        const discrepancy = {
          artworkId: artwork.id,
          d1Count: d1Likes,
          redisCount: redisLikes,
          difference: d1Likes - redisLikes
        }
        report.likeDiscrepancies.push(discrepancy)
        
        if (options.verbose) {
          console.log(`⚠️  Like discrepancy: ${artwork.id} (D1: ${d1Likes}, Redis: ${redisLikes})`)
        }

        if (options.fix) {
          console.log(`🔄 Fixing like count for ${artwork.id} to ${d1Likes}`)
          await redis.execute('SET', `artwork:${artwork.id}:likes`, d1Likes.toString())
        }
      }
    }

    // 2. 检查收藏列表一致性
    console.log('❤️  Checking favorites...')
    const users = await d1.listAllUsers()
    report.totalUsers = users.length

    for (const user of users) {
      const d1Favorites = await d1.getUserFavorites(user.id)
      const redisFavorites = await redis.listFavorites(user.id)
      
      // 检查D1中有但Redis中没有的收藏
      for (const artworkId of d1Favorites) {
        if (!redisFavorites.includes(artworkId)) {
          report.favoriteDiscrepancies.push({
            userId: user.id,
            artworkId,
            inD1: true,
            inRedis: false
          })
          
          if (options.verbose) {
            console.log(`⚠️  Favorite missing in Redis: ${user.id} -> ${artworkId}`)
          }
          
          if (options.fix) {
            console.log(`🔄 Adding missing favorite to Redis: ${user.id} -> ${artworkId}`)
            await redis.addFavorite(user.id, artworkId)
          }
        }
      }

      // 检查Redis中有但D1中没有的收藏
      for (const artworkId of redisFavorites) {
        if (!d1Favorites.includes(artworkId)) {
          report.favoriteDiscrepancies.push({
            userId: user.id,
            artworkId,
            inD1: false,
            inRedis: true
          })
          
          if (options.verbose) {
            console.log(`⚠️  Extra favorite in Redis: ${user.id} -> ${artworkId}`)
          }
          
          if (options.fix) {
            console.log(`🔄 Removing extra favorite from Redis: ${user.id} -> ${artworkId}`)
            await redis.removeFavorite(user.id, artworkId)
          }
        }
      }
    }

    // 生成摘要
    report.summary = {
      totalLikeDiscrepancies: report.likeDiscrepancies.length,
      totalFavoriteDiscrepancies: report.favoriteDiscrepancies.length,
      maxLikeDifference: Math.max(...report.likeDiscrepancies.map(d => Math.abs(d.difference)), 0),
      needsCorrection: report.likeDiscrepancies.length > 0 || report.favoriteDiscrepancies.length > 0
    }

    console.log('\n📋 Consistency Check Report')
    console.log('==========================')
    console.log(`📅 Timestamp: ${report.timestamp}`)
    console.log(`🎨 Total Artworks: ${report.totalArtworks}`)
    console.log(`👥 Total Users: ${report.totalUsers}`)
    console.log(`👍 Like Discrepancies: ${report.summary.totalLikeDiscrepancies}`)
    console.log(`❤️  Favorite Discrepancies: ${report.summary.totalFavoriteDiscrepancies}`)
    console.log(`⚡ Max Like Difference: ${report.summary.maxLikeDifference}`)
    
    if (report.summary.needsCorrection) {
      console.log('⚠️  Issues found - manual review recommended')
    } else {
      console.log('✅ All data consistent')
    }

    return report

  } catch (error) {
    console.error('❌ Consistency check failed:', error)
    throw error
  }
}