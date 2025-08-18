import { D1Service } from '../services/d1.js';
import { RedisService } from '../services/redis.js';
import { HotnessService } from '../services/hotness.js';
import { HotnessCalculator } from '../utils/hotness-calculator.js';

export async function fixHotnessDatabaseSync() {
  console.log('🔧 开始修复热度数据库同步...');
  
  try {
    const d1 = D1Service.fromEnv(process.env);
    const redis = RedisService.fromEnv(process.env);
    const hotness = new HotnessService(redis, d1);
    
    // 1. 检查需要修复的作品
    const artworksToFix = await d1.getArtworksNeedingHotUpdate(1000);
    console.log(`📊 发现 ${artworksToFix.results?.length || 0} 个需要修复的作品`);
    
    if (!artworksToFix.results || artworksToFix.results.length === 0) {
      console.log('✅ 所有作品热度已同步');
      return;
    }
    
    // 2. 批量修复
    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < artworksToFix.results.length; i += chunkSize) {
      chunks.push(artworksToFix.results.slice(i, i + chunkSize));
    }
    
    let totalFixed = 0;
    let totalFailed = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔄 处理批次 ${i + 1}/${chunks.length}`);
      
      const chunk = chunks[i];
      const artworkIds = chunk.map(a => a.id);
      
      const result = await hotness.batchSyncHotnessToDatabase(artworkIds);
      totalFixed += result.success;
      totalFailed += result.failed;
      
      console.log(`✅ 成功: ${result.success}, ❌ 失败: ${result.failed}`);
      
      if (result.errors && result.errors.length > 0) {
        console.error('❌ 错误详情:', result.errors);
      }
      
      // 避免过载
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 3. 验证修复结果
    console.log('📈 开始验证修复结果...');
    const verificationIds = artworksToFix.results.slice(0, 10).map(a => a.id);
    const verification = await d1.getArtworksHotData(verificationIds);
    
    console.log('✅ 验证结果:', {
      验证数量: verification.results?.length || 0,
      修复成功率: totalFixed > 0 ? `${((totalFixed / (totalFixed + totalFailed)) * 100).toFixed(2)}%` : '0%'
    });
    
    if (verification.results && verification.results.length > 0) {
      console.log('📊 样本数据:', verification.results.slice(0, 3).map(r => ({
        id: r.id,
        hot_score: r.hot_score,
        hot_level: r.hot_level,
        last_update: new Date(r.last_hot_update).toISOString()
      })));
    }
    
    console.log(`🎉 修复完成！共修复 ${totalFixed} 个作品，失败 ${totalFailed} 个`);
    
    // 4. 生成统计报告
    const stats = await generateFixStats(d1);
    console.log('📊 修复统计:', stats);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  }
}

async function generateFixStats(d1) {
  try {
    // 获取热度分布
    const distribution = await d1.db.prepare(`
      SELECT hot_level, COUNT(*) as count
      FROM artworks
      WHERE hot_level IS NOT NULL
      GROUP BY hot_level
      ORDER BY count DESC
    `).all();
    
    // 获取空值统计
    const nullStats = await d1.db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN hot_score IS NULL THEN 1 END) as null_score,
        COUNT(CASE WHEN hot_level IS NULL THEN 1 END) as null_level,
        COUNT(CASE WHEN last_hot_update IS NULL THEN 1 END) as null_update
      FROM artworks
    `).first();
    
    // 获取热门作品统计
    const topArtworks = await d1.db.prepare(`
      SELECT COUNT(*) as count
      FROM artworks
      WHERE hot_score > 100
    `).first();
    
    return {
      热度分布: distribution.results || [],
      空值统计: nullStats || {},
      热门作品数量: topArtworks?.count || 0
    };
  } catch (error) {
    console.error('生成统计报告失败:', error);
    return { error: '统计生成失败' };
  }
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  fixHotnessDatabaseSync()
    .then(() => {
      console.log('🎉 修复脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 修复脚本执行失败:', error);
      process.exit(1);
    });
}