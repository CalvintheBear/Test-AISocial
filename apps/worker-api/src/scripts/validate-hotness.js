#!/usr/bin/env node

import { D1Service } from '../services/d1.js';
import { RedisService } from '../services/redis.js';

/**
 * 验证热度数据完整性
 * 该脚本用于验证热度数据的完整性和一致性
 */

export async function validateHotnessIntegrity() {
  console.log('🔍 验证热度数据完整性...');
  
  const d1 = D1Service.fromEnv(process.env);
  
  try {
    // 1. 检查空值
    const nullResults = await d1.db.prepare(`
      SELECT COUNT(*) as null_count 
      FROM artworks 
      WHERE hot_score IS NULL OR hot_level IS NULL
    `).first();
    
    console.log(`❌ 空值数量: ${nullResults.null_count}`);
    
    // 2. 检查一致性
    const inconsistentResults = await d1.db.prepare(`
      SELECT a.id, a.hot_score, a.like_count, a.favorite_count,
             (SELECT COUNT(*) FROM artworks_like WHERE artwork_id = a.id) as actual_likes,
             (SELECT COUNT(*) FROM artworks_favorite WHERE artwork_id = a.id) as actual_favorites
      FROM artworks a
      WHERE a.like_count != (SELECT COUNT(*) FROM artworks_like WHERE artwork_id = a.id)
         OR a.favorite_count != (SELECT COUNT(*) FROM artworks_favorite WHERE artwork_id = a.id)
      LIMIT 10
    `).all();
    
    console.log(`⚠️ 不一致数据: ${inconsistentResults.results.length}`);
    
    // 3. 统计热度分布
    const distribution = await d1.db.prepare(`
      SELECT hot_level, COUNT(*) as count
      FROM artworks
      WHERE hot_level IS NOT NULL
      GROUP BY hot_level
      ORDER BY count DESC
    `).all();
    
    console.log('📊 热度分布:', distribution.results);
    
    // 4. 获取热门作品
    const topArtworks = await d1.db.prepare(`
      SELECT id, title, hot_score, hot_level
      FROM artworks
      WHERE hot_score > 0
      ORDER BY hot_score DESC
      LIMIT 10
    `).all();
    
    console.log('🔥 热门作品:', topArtworks.results);
    
    // 5. 检查历史记录
    const historyCount = await d1.db.prepare(`
      SELECT COUNT(*) as total_history
      FROM artworks_hot_history
    `).first();
    
    console.log(`📈 历史记录数量: ${historyCount.total_history}`);
    
    // 6. 检查最近更新
    const recentUpdates = await d1.db.prepare(`
      SELECT COUNT(*) as recent_updates
      FROM artworks
      WHERE last_hot_update > strftime('%s', 'now', '-1 day') * 1000
    `).first();
    
    console.log(`🔄 最近24小时更新: ${recentUpdates.recent_updates}`);
    
    // 7. 生成验证报告
    const report = {
      null_values: nullResults.null_count,
      inconsistent_data: inconsistentResults.results.length,
      hot_level_distribution: distribution.results,
      top_artworks: topArtworks.results,
      history_records: historyCount.total_history,
      recent_updates: recentUpdates.recent_updates,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ 验证完成！');
    console.log('📊 验证报告:', JSON.stringify(report, null, 2));
    
    return report;
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
    throw error;
  }
}

/**
 * 检查特定作品的热度数据
 */
export async function validateArtworkHotness(artworkId) {
  console.log(`🔍 验证作品 ${artworkId} 的热度数据...`);
  
  const d1 = D1Service.fromEnv(process.env);
  
  try {
    const artwork = await d1.getArtworkHotData(artworkId);
    if (!artwork) {
      console.log(`❌ 作品 ${artworkId} 不存在`);
      return null;
    }
    
    const interactions = await d1.getArtworkInteractionData(artworkId);
    
    const report = {
      artwork_id: artworkId,
      title: artwork.title,
      hot_score: artwork.hot_score,
      hot_level: artwork.hot_level,
      last_update: new Date(artwork.last_hot_update).toISOString(),
      interactions: {
        likes: interactions.likes,
        favorites: interactions.favorites,
        comments: interactions.comments,
        shares: interactions.shares,
        views: interactions.views
      },
      database_counts: {
        like_count: artwork.like_count,
        favorite_count: artwork.favorite_count,
        comment_count: artwork.comment_count,
        share_count: artwork.share_count,
        view_count: artwork.view_count
      },
      consistency: {
        likes_match: artwork.like_count === interactions.likes,
        favorites_match: artwork.favorite_count === interactions.favorites
      }
    };
    
    console.log('✅ 作品验证完成！');
    console.log('📊 作品报告:', JSON.stringify(report, null, 2));
    
    return report;
    
  } catch (error) {
    console.error(`❌ 验证作品 ${artworkId} 失败:`, error);
    throw error;
  }
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const artworkId = process.argv[3];
  
  switch (command) {
    case 'validate':
      validateHotnessIntegrity();
      break;
    case 'validate-artwork':
      if (!artworkId) {
        console.log('使用方法: node validate-hotness.js validate-artwork <artwork_id>');
        process.exit(1);
      }
      validateArtworkHotness(artworkId);
      break;
    default:
      console.log('使用方法:');
      console.log('  node validate-hotness.js validate                    - 验证所有数据');
      console.log('  node validate-hotness.js validate-artwork <id>       - 验证特定作品');
      break;
  }
}