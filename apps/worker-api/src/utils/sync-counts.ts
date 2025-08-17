import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'

/**
 * 同步D1数据库中的like_count和favorite_count字段
 * 从关系表计算实际数量并更新到artworks表
 */
export async function syncArtworkCounts(env: any) {
  const d1 = D1Service.fromEnv(env)
  const redis = RedisService.fromEnv(env)
  
  console.log('开始同步作品点赞和收藏数量...')
  
  try {
    // 获取所有作品
    const artworks = await d1.listAllArtworks()
    console.log(`找到 ${artworks.length} 个作品需要同步`)
    
    let updatedCount = 0
    
    for (const artwork of artworks) {
      const { id } = artwork
      
      // 计算实际的点赞数量
      const actualLikes = await d1.getLikesCount(id)
      
      // 计算实际的收藏数量
      const actualFavorites = await (async () => {
        const stmt = d1.db.prepare(`SELECT COUNT(*) as count FROM artworks_favorite WHERE artwork_id = ?`)
        const rows = await stmt.bind(id).all() as any
        return Number((rows.results || [])[0]?.count || 0)
      })()
      
      // 获取当前D1中的数量
      const currentArtwork = await d1.getArtwork(id)
      if (!currentArtwork) continue
      
      const currentLikes = currentArtwork.likeCount
      const currentFavorites = currentArtwork.favoriteCount
      
      // 检查是否需要更新
      if (currentLikes !== actualLikes || currentFavorites !== actualFavorites) {
        await d1.db.prepare(`
          UPDATE artworks 
          SET like_count = ?, favorite_count = ? 
          WHERE id = ?
        `).bind(actualLikes, actualFavorites, id).run()
        
        console.log(`作品 ${id}: 点赞 ${currentLikes}→${actualLikes}, 收藏 ${currentFavorites}→${actualFavorites}`)
        updatedCount++
      }
    }
    
    console.log(`同步完成，共更新 ${updatedCount} 个作品的数量`)
    
    // 同步Redis缓存
    await syncRedisWithD1(env)
    
    return { updatedCount, totalArtworks: artworks.length }
    
  } catch (error) {
    console.error('同步失败:', error)
    throw error
  }
}

/**
 * 同步Redis缓存与D1数据库
 */
async function syncRedisWithD1(env: any) {
  const d1 = D1Service.fromEnv(env)
  const redis = RedisService.fromEnv(env)
  
  try {
    // 获取所有用户
    const users = await d1.listAllUsers()
    
    console.log('开始同步Redis缓存...')
    
    for (const user of users) {
      const { id: userId } = user
      
      // 同步用户的点赞列表到Redis
      const likedArtworks = await (async () => {
        const stmt = d1.db.prepare(`SELECT artwork_id FROM artworks_like WHERE user_id = ?`)
        const rows = await stmt.bind(userId).all() as any
        return (rows.results || []).map((row: any) => String(row.artwork_id))
      })()
      
      // 同步用户的收藏列表到Redis
      const favoritedArtworks = await d1.listUserFavorites(userId)
      
      // 更新Redis缓存
      for (const artworkId of likedArtworks) {
        await redis.addUserLike(userId, artworkId)
      }
      
      for (const artworkId of favoritedArtworks) {
        await redis.addFavorite(userId, artworkId)
      }
    }
    
    console.log('Redis缓存同步完成')
    
  } catch (error) {
    console.error('Redis同步失败:', error)
  }
}

/**
 * 检查数据一致性
 */
export async function checkDataConsistency(env: any) {
  const d1 = D1Service.fromEnv(env)
  const redis = RedisService.fromEnv(env)
  
  console.log('开始检查数据一致性...')
  
  const issues = []
  const artworks = await d1.listAllArtworks()
  
  for (const artwork of artworks) {
    const { id } = artwork
    
    // 检查D1中的数量是否正确
    const actualLikes = await d1.getLikesCount(id)
    const actualFavorites = await (async () => {
      const stmt = d1.db.prepare(`SELECT COUNT(*) as count FROM artworks_favorite WHERE artwork_id = ?`)
      const rows = await stmt.bind(id).all() as any
      return Number((rows.results || [])[0]?.count || 0)
    })()
    
    const currentArtwork = await d1.getArtwork(id)
    if (!currentArtwork) continue
    
    const currentLikes = currentArtwork.likeCount
    const currentFavorites = currentArtwork.favoriteCount
    
    if (currentLikes !== actualLikes) {
      issues.push({
        type: 'like_count_mismatch',
        artworkId: id,
        d1Count: currentLikes,
        actualCount: actualLikes
      })
    }
    
    if (currentFavorites !== actualFavorites) {
      issues.push({
        type: 'favorite_count_mismatch',
        artworkId: id,
        d1Count: currentFavorites,
        actualCount: actualFavorites
      })
    }
  }
  
  console.log(`检查发现 ${issues.length} 个数据不一致问题`)
  return issues
}