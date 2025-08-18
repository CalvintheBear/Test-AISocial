#!/usr/bin/env node

/**
 * AI Social 平台热度系统初始化脚本
 * 用于为现有作品初始化热度分数
 */

import { D1Service } from '../services/d1.js';
import { RedisService } from '../services/redis.js';
import { HotnessService } from '../services/hotness.js';
import { HotnessCalculator } from '../utils/hotness-calculator.js';

async function recalculateAllHotness() {
  console.log('🔄 开始重新计算所有作品热度...');
  
  try {
    // 初始化服务
    const d1 = D1Service.fromEnv(process.env);
    const redis = RedisService.fromEnv(process.env);
    const hotness = new HotnessService(redis);

    // 获取所有作品
    console.log('📋 获取所有作品...');
    const artworks = await d1.getAllArtworks();
    console.log(`找到 ${artworks.length} 个作品`);

    let processed = 0;
    let failed = 0;

    // 批量处理
    const batchSize = 50;
    for (let i = 0; i < artworks.length; i += batchSize) {
      const batch = artworks.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (artwork) => {
        try {
          // 获取互动数据
          const [likeCount, favoriteCount, commentCount, shareCount, viewCount] = await Promise.all([
            d1.getLikeCount(artwork.id),
            d1.getFavoriteCount(artwork.id),
            d1.getCommentCount(artwork.id),
            d1.getShareCount(artwork.id),
            d1.getViewCount(artwork.id)
          ]);

          // 计算热度分数
          const score = new HotnessCalculator().calculateHotScore(
            {
              id: artwork.id,
              user_id: artwork.user_id,
              title: artwork.title,
              prompt: artwork.prompt,
              model: artwork.model,
              width: artwork.width,
              height: artwork.height,
              created_at: artwork.created_at,
              published_at: artwork.published_at,
              like_count: likeCount,
              favorite_count: favoriteCount,
              comment_count: commentCount,
              share_count: shareCount,
              view_count: viewCount
            },
            {
              likes: likeCount,
              favorites: favoriteCount,
              comments: commentCount,
              shares: shareCount,
              views: viewCount
            }
          );

          // 更新热度数据
          await hotness.updateArtworkHotness(
            artwork.id,
            'initialize',
            score,
            { likeCount, favCount: favoriteCount }
          );

          processed++;
          if (processed % 20 === 0) {
            console.log(`已处理 ${processed}/${artworks.length} 个作品`);
          }
        } catch (error) {
          console.error(`处理作品 ${artwork.id} 失败:`, error);
          failed++;
        }
      }));

      // 避免过载
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ 热度计算完成！`);
    console.log(`成功处理: ${processed} 个作品`);
    console.log(`失败: ${failed} 个作品`);

    // 验证结果
    const topArtworks = await hotness.getTopHotArtworks(10);
    console.log('\n📊 当前热度排行榜前10:');
    topArtworks.forEach((artwork, index) => {
      console.log(`${index + 1}. 作品ID: ${artwork.artworkId}, 热度: ${artwork.score}`);
    });

  } catch (error) {
    console.error('❌ 热度计算失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  recalculateAllHotness();
}

export { recalculateAllHotness };