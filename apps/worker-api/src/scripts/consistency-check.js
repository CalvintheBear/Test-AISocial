/**
 * Cache Consistency Check Script
 * Verifies cache and database consistency
 */

import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'

// Mock environment for testing
const mockEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    DEV_MODE: '1'
}

class ConsistencyChecker {
    constructor(d1, redis) {
        this.d1 = d1
        this.redis = redis
    }

    async checkFeedCacheConsistency() {
        console.log('🔍 Checking feed cache consistency...')
        
        try {
            // Get feed from D1
            const d1Feed = await this.d1.listFeed(20)
            
            // Get feed from cache
            const cachedFeed = await this.redis.getFeed(20)
            const cachedData = cachedFeed ? JSON.parse(cachedFeed) : []
            
            // Compare counts
            console.log(`   D1 count: ${d1Feed.length}`)
            console.log(`   Cache count: ${cachedData.length}`)
            
            // Check for mismatched IDs
            const d1Ids = new Set(d1Feed.map(item => item.id))
            const cacheIds = new Set(cachedData.map(item => item.id))
            
            const missingInCache = d1Feed.filter(item => !cacheIds.has(item.id))
            const extraInCache = cachedData.filter(item => !d1Ids.has(item.id))
            
            if (missingInCache.length > 0) {
                console.log(`   ⚠️  Missing in cache: ${missingInCache.length} items`)
            }
            
            if (extraInCache.length > 0) {
                console.log(`   ⚠️  Extra in cache: ${extraInCache.length} items`)
            }
            
            const isConsistent = missingInCache.length === 0 && extraInCache.length === 0
            console.log(`   ✅ Feed cache consistency: ${isConsistent ? 'PASSED' : 'FAILED'}`)
            
            return {
                type: 'feed',
                consistent: isConsistent,
                d1Count: d1Feed.length,
                cacheCount: cachedData.length,
                missing: missingInCache.length,
                extra: extraInCache.length
            }
            
        } catch (error) {
            console.error('   ❌ Error checking feed consistency:', error)
            return { type: 'feed', consistent: false, error: error.message }
        }
    }

    async checkUserArtworksConsistency(userId) {
        console.log(`🔍 Checking user artworks cache for ${userId}...`)
        
        try {
            // Get from D1
            const d1Artworks = await this.d1.listUserArtworks(userId)
            
            // Get from cache
            const cachedArtworks = await this.redis.getUserArtworks(userId)
            const cachedData = cachedArtworks ? JSON.parse(cachedArtworks) : []
            
            console.log(`   D1 count: ${d1Artworks.length}`)
            console.log(`   Cache count: ${cachedData.length}`)
            
            const d1Ids = new Set(d1Artworks.map(item => item.id))
            const cacheIds = new Set(cachedData.map(item => item.id))
            
            const missingInCache = d1Artworks.filter(item => !cacheIds.has(item.id))
            const extraInCache = cachedData.filter(item => !d1Ids.has(item.id))
            
            const isConsistent = missingInCache.length === 0 && extraInCache.length === 0
            console.log(`   ✅ User artworks cache consistency: ${isConsistent ? 'PASSED' : 'FAILED'}`)
            
            return {
                type: 'user-artworks',
                userId,
                consistent: isConsistent,
                d1Count: d1Artworks.length,
                cacheCount: cachedData.length,
                missing: missingInCache.length,
                extra: extraInCache.length
            }
            
        } catch (error) {
            console.error('   ❌ Error checking user artworks consistency:', error)
            return { type: 'user-artworks', userId, consistent: false, error: error.message }
        }
    }

    async checkUserFavoritesConsistency(userId) {
        console.log(`🔍 Checking user favorites cache for ${userId}...`)
        
        try {
            // Get from Redis (source of truth)
            const redisFavorites = await this.redis.listFavorites(userId)
            
            // Get from cache
            const cachedFavorites = await this.redis.getUserFavorites(userId)
            const cachedData = cachedFavorites ? JSON.parse(cachedFavorites) : []
            
            console.log(`   Redis count: ${redisFavorites.length}`)
            console.log(`   Cache count: ${cachedData.length}`)
            
            const redisIds = new Set(redisFavorites)
            const cacheIds = new Set(cachedData)
            
            const missingInCache = redisFavorites.filter(id => !cacheIds.has(id))
            const extraInCache = cachedData.filter(id => !redisIds.has(id))
            
            const isConsistent = missingInCache.length === 0 && extraInCache.length === 0
            console.log(`   ✅ User favorites cache consistency: ${isConsistent ? 'PASSED' : 'FAILED'}`)
            
            return {
                type: 'user-favorites',
                userId,
                consistent: isConsistent,
                redisCount: redisFavorites.length,
                cacheCount: cachedData.length,
                missing: missingInCache.length,
                extra: extraInCache.length
            }
            
        } catch (error) {
            console.error('   ❌ Error checking user favorites consistency:', error)
            return { type: 'user-favorites', userId, consistent: false, error: error.message }
        }
    }

    async checkLikesConsistency() {
        console.log('🔍 Checking likes count consistency...')
        
        try {
            // Get a sample of artworks
            const artworks = await this.d1.listFeed(10)
            const results = []
            
            for (const artwork of artworks) {
                const d1Likes = artwork.likeCount || 0
                const redisLikes = await this.redis.getLikes(artwork.id)
                
                const isConsistent = d1Likes === redisLikes
                results.push({
                    artworkId: artwork.id,
                    d1Likes,
                    redisLikes,
                    consistent: isConsistent
                })
                
                if (!isConsistent) {
                    console.log(`   ⚠️  Mismatch for ${artwork.id}: D1=${d1Likes}, Redis=${redisLikes}`)
                }
            }
            
            const consistentCount = results.filter(r => r.consistent).length
            console.log(`   ✅ Likes consistency: ${consistentCount}/${results.length} artworks`)
            
            return {
                type: 'likes',
                results,
                consistentCount,
                totalCount: results.length,
                consistent: consistentCount === results.length
            }
            
        } catch (error) {
            console.error('   ❌ Error checking likes consistency:', error)
            return { type: 'likes', consistent: false, error: error.message }
        }
    }

    async runFullCheck() {
        console.log('🔍 Running full consistency check...')
        console.log('====================================')
        
        const results = []
        
        // Check feed cache
        results.push(await this.checkFeedCacheConsistency())
        
        // Check user caches (test with sample users)
        const sampleUsers = ['user-1', 'user-2'] // Replace with actual user IDs
        for (const userId of sampleUsers) {
            results.push(await this.checkUserArtworksConsistency(userId))
            results.push(await this.checkUserFavoritesConsistency(userId))
        }
        
        // Check likes
        results.push(await this.checkLikesConsistency())
        
        // Summary
        console.log('\n📊 Consistency Check Summary')
        console.log('============================')
        
        const passed = results.filter(r => r.consistent).length
        const total = results.length
        
        console.log(`Total checks: ${total}`)
        console.log(`Passed: ${passed}`)
        console.log(`Failed: ${total - passed}`)
        console.log(`Success rate: ${Math.round((passed/total) * 100)}%`)
        
        return {
            summary: {
                total,
                passed,
                failed: total - passed,
                successRate: Math.round((passed/total) * 100)
            },
            details: results
        }
    }
}

// Main execution
async function runConsistencyCheck() {
    console.log('🎯 Cache Consistency Check Starting...')
    
    try {
        const d1 = D1Service.fromEnv(mockEnv)
        const redis = RedisService.fromEnv(mockEnv)
        
        const checker = new ConsistencyChecker(d1, redis)
        const results = await checker.runFullCheck()
        
        console.log('\n✅ Consistency check completed!')
        return results
        
    } catch (error) {
        console.error('❌ Consistency check failed:', error)
        return { error: error.message }
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2)
    const command = args[0]
    
    switch (command) {
        case 'full':
            runConsistencyCheck().catch(console.error)
            break
            
        case 'feed':
            (async () => {
                const d1 = D1Service.fromEnv(mockEnv)
                const redis = RedisService.fromEnv(mockEnv)
                const checker = new ConsistencyChecker(d1, redis)
                await checker.checkFeedCacheConsistency()
            })().catch(console.error)
            break
            
        case 'user':
            (async () => {
                const userId = args[1] || 'test-user'
                const d1 = D1Service.fromEnv(mockEnv)
                const redis = RedisService.fromEnv(mockEnv)
                const checker = new ConsistencyChecker(d1, redis)
                await checker.checkUserArtworksConsistency(userId)
                await checker.checkUserFavoritesConsistency(userId)
            })().catch(console.error)
            break
            
        default:
            console.log(`
🎯 Cache Consistency Testing Tool

Usage: node consistency-check.js [command]

Commands:
  full    - Run full consistency check
  feed    - Check feed cache consistency
  user [userId] - Check user-specific caches

🧪 Manual Testing:
1. Start dev server: npm run api:dev
2. Run consistency check: node consistency-check.js full
3. Check specific user: node consistency-check.js user test-user-id
            `)
    }
}

export { ConsistencyChecker, runConsistencyCheck }