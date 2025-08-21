import { RedisService } from './redis.js';
import { D1Service } from './d1.js';
import { HotnessCalculator } from '../utils/hotness-calculator.js';

/**
 * 热度计算服务
 * 实现AI Social平台的热度优化方案
 */
export class HotnessService {
  private redis: RedisService;
  private d1: D1Service;

  constructor(redis: RedisService, d1: D1Service) {
    this.redis = redis;
    this.d1 = d1;
  }

  /**
   * Redis键名常量
   */
  private static readonly KEYS = {
    // 全局热度排行榜（有序集合）
    HOT_RANK: 'hot_rank',
    
    // 作品热度详情（哈希表）
    ARTWORK_HOT: (artworkId: string) => `artwork:${artworkId}:hot`,
    
    // 用户行为记录（哈希表）
    USER_ACTIONS: (userId: string, artworkId: string) => `user:${userId}:actions:${artworkId}`,
    
    // 用户统计信息
    USER_STATS: (userId: string) => `user:${userId}:stats`,
    
    // 防刷保护
    RATE_LIMIT: (userId: string, action: string, artworkId: string) => 
      `rate_limit:${userId}:${action}:${artworkId}`,
    
    // 趋势数据
    TRENDING: (timeWindow: string) => `trending:${timeWindow}`,
  };

  /**
   * 互动行为权重表
   */
  static readonly WEIGHTS = {
    LIKE: 1,
    FAVORITE: 2,
    PUBLISH: 0,
    VIEW: 0,
    COMMENT: 0,
    SHARE: 0,
    UNLIKE: -1,
    UNFAVORITE: -2
  };

  /**
   * 时间衰减因子
   */
  static readonly DECAY_FACTORS = {
    DAILY: 0.8,
    HOURLY: 0.95,
    FAST: 0.7
  };

  /**
   * 防刷限制配置
   */
  static readonly RATE_LIMITS = {
    LIKE: 10,      // 每小时最多10次点赞
    FAVORITE: 5,   // 每小时最多5次收藏
    COMMENT: 20,   // 每小时最多20次评论
    SHARE: 3,      // 每小时最多3次分享
    VIEW: 50       // 每小时最多50次浏览
  };

  /**
   * 初始化Redis数据结构
   * 在系统启动时调用
   */
  async initializeStructures(): Promise<void> {
    console.log('Initializing Redis hotness structures...');
    
    // 确保热度排行榜存在
    const exists = await this.redis.zcard(HotnessService.KEYS.HOT_RANK);
    console.log(`Hot rank contains ${exists} artworks`);
  }

  /**
   * 更新作品热度
   */
  async updateArtworkHotness(
    artworkId: string, 
    action: string, 
    userId?: string,
    metadata?: any
  ): Promise<number> {
    const lockKey = `hotness_lock:${artworkId}`;
    const lockValue = Date.now().toString();
    
    try {
      // 1. 获取分布式锁
      const locked = await this.redis.set(lockKey, lockValue, 5); // 5秒锁
      if (!locked) {
        throw new Error('Could not acquire lock for hotness update');
      }

      // 2. 检查防刷限制
      if (userId && !(await this.checkRateLimit(userId, action, artworkId))) {
        throw new Error('Rate limit exceeded');
      }

      // 3. 计算新的热度值（直接基于数据库真实数据，避免依赖不完整的Redis字段）
      const newScore = await this.calculateHotnessFromDB(artworkId);
      
      // 5. 更新Redis数据结构
      await this.updateRedisStructures(artworkId, newScore, action, userId);
      
      // 6. 记录用户行为（如果有用户ID）
      if (userId) {
        await this.recordUserAction(userId, artworkId, action, metadata);
      }
      
      // 7. 失效相关缓存
      await this.invalidateRelatedCaches(artworkId, userId);
      
      return newScore;
    } catch (error) {
      console.error('Failed to update artwork hotness:', error);
      throw error;
    } finally {
      // 释放锁
      await this.redis.execute('DEL', lockKey);
    }
  }

  /**
   * 获取作品热度详情
   */
  async getArtworkHotData(artworkId: string): Promise<any> {
    const key = HotnessService.KEYS.ARTWORK_HOT(artworkId);
    const data = await this.redis.hgetall(key);
    
    return {
      base_weight: parseFloat(data.base_weight || '0'),
      like_weight: parseFloat(data.like_weight || '0'),
      favorite_weight: parseFloat(data.favorite_weight || '0'),
      time_decay: parseFloat(data.time_decay || '1'),
      total_score: parseFloat(data.total_score || '0'),
      updated_at: parseInt(data.updated_at || '0'),
      view_count: parseInt(data.view_count || '0'),
      comment_count: parseInt(data.comment_count || '0'),
      share_count: parseInt(data.share_count || '0')
    };
  }

  /**
   * 基于数据库计算热度
   */
  async calculateHotnessFromDB(artworkId: string): Promise<number> {
    const artwork = await this.d1.getArtworkHotData(artworkId);
    if (!artwork) return 0;
    
    const interactions = await this.d1.getArtworkInteractionData(artworkId);
    
    const calculator = new HotnessCalculator();
    const score = calculator.calculateHotScore(
      {
        id: String(artwork.id),
        user_id: String(artwork.user_id),
        title: String(artwork.title || ''),
        prompt: String(artwork.prompt || ''),
        model: String(artwork.model || ''),
        width: Number(artwork.width || 0),
        height: Number(artwork.height || 0),
        created_at: Number(artwork.created_at),
        published_at: Number(artwork.published_at || artwork.created_at),
        like_count: interactions.likes,
        favorite_count: interactions.favorites,
        comment_count: interactions.comments,
        share_count: interactions.shares,
        view_count: interactions.views
      },
      interactions
    );
    
    return score;
  }

  /**
   * 同步热度到数据库
   */
  async syncHotnessToDatabase(artworkId: string) {
    const score = await this.calculateHotnessFromDB(artworkId);
    const level = HotnessCalculator.getHotnessLevel(score);
    
    await this.d1.updateArtworkHotness(artworkId, score, level);
    
    // 同时更新Redis
    await this.redis.zadd('hot_rank', score, artworkId);
    await this.redis.hset(`artwork:${artworkId}:hot`, 'total_score', String(score));
    await this.redis.hset(`artwork:${artworkId}:hot`, 'updated_at', String(Date.now()));
    
    return { score, level };
  }

  /**
   * 批量同步热度到数据库
   */
  async batchSyncHotnessToDatabase(artworkIds: string[]) {
    const results = await Promise.allSettled(
      artworkIds.map(id => this.syncHotnessToDatabase(id))
    );
    
    return {
      total: artworkIds.length,
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      errors: results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason)
    };
  }

  /**
   * 重新计算热度分数（基于Redis缓存）
   */
  private async recalculateHotScore(
    artworkId: string, 
    currentData: any, 
    deltaWeight: number
  ): Promise<number> {
    const now = Date.now();
    
    // 获取作品基础信息（需要从D1查询）
    // 这里暂时使用模拟数据，实际实现需要从D1Service获取
    const baseWeight = currentData.base_weight + deltaWeight;
    
    // 计算时间衰减
    const publishedAt = currentData.published_at || now;
    const days = Math.max(0, Math.floor((now - publishedAt) / 86400000));
    const hours = Math.max(0, Math.floor((now - publishedAt) / 3600000));
    
    const timeDecay = Math.pow(HotnessService.DECAY_FACTORS.DAILY, days) * 
                     Math.pow(HotnessService.DECAY_FACTORS.HOURLY, Math.min(hours, 24));
    
    // 质量因子（已简化为常数1）
    const qualityFactor = 1;
    
    // 最终热度分数
    const finalScore = (baseWeight + this.calculateInteractionWeight(currentData)) * 
                      timeDecay * qualityFactor;
    
    return Math.max(finalScore, 0);
  }

  /**
   * 更新Redis数据结构
   */
  private async updateRedisStructures(
    artworkId: string, 
    newScore: number, 
    action: string, 
    userId?: string
  ): Promise<void> {
    const now = Date.now();
    
    // 更新作品热度详情
    const artworkKey = HotnessService.KEYS.ARTWORK_HOT(artworkId);
    await this.redis.hmset(artworkKey, 'total_score', String(newScore), 'updated_at', String(now));
    
    // 更新全局热度排行榜
    await this.redis.zadd(HotnessService.KEYS.HOT_RANK, newScore, artworkId);
    
    // 设置过期时间（防止内存无限增长）
    await this.redis.expire(artworkKey, 86400 * 7); // 7天
    
    // 清除缓存
    await this.invalidateHotnessCache();
  }

  /**
   * 清除热度缓存
   */
  async invalidateHotnessCache(): Promise<void> {
    try {
      // 清除所有热度相关的缓存
      const patterns = ['hotness:top:*', 'trending:*'];
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
          await this.redis.del(key);
        }
      }
    } catch (error) {
      console.warn('Failed to invalidate hotness cache:', error);
    }
  }

  /**
   * 计算互动权重
   */
  private calculateInteractionWeight(data: any): number {
    return (data.like_weight || 0) + (data.favorite_weight || 0) + 
           (data.comment_count || 0) * HotnessService.WEIGHTS.COMMENT +
           (data.share_count || 0) * HotnessService.WEIGHTS.SHARE +
           (data.view_count || 0) * HotnessService.WEIGHTS.VIEW;
  }

  /**
   * 计算质量因子
   */
  private calculateQualityFactor(_data: any): number { return 1; }

  /**
   * 获取行为权重
   */
  static getActionWeight(action: string): number {
    const weights: Record<string, number> = {
      'like': HotnessService.WEIGHTS.LIKE,
      'unlike': HotnessService.WEIGHTS.UNLIKE,
      'favorite': HotnessService.WEIGHTS.FAVORITE,
      'unfavorite': HotnessService.WEIGHTS.UNFAVORITE,
      'publish': HotnessService.WEIGHTS.PUBLISH,
      'view': HotnessService.WEIGHTS.VIEW,
      'comment': HotnessService.WEIGHTS.COMMENT,
      'share': HotnessService.WEIGHTS.SHARE
    };
    
    return weights[action] || 0;
  }

  /**
   * 记录用户行为
   */
  private async recordUserAction(
    userId: string, 
    artworkId: string, 
    action: string, 
    metadata?: any
  ): Promise<void> {
    const key = HotnessService.KEYS.USER_ACTIONS(userId, artworkId);
    const now = Date.now();
    
    await this.redis.hmset(key, {
      [action]: now,
      ...metadata
    });
    
    await this.redis.expire(key, 86400 * 30); // 30天
  }

  /**
   * 检查防刷限制
   */
  async checkRateLimit(userId: string, action: string, artworkId: string): Promise<boolean> {
    const key = HotnessService.KEYS.RATE_LIMIT(userId, action, artworkId);
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, 3600); // 1小时窗口
    }
    
    const limit = HotnessService.RATE_LIMITS[action as keyof typeof HotnessService.RATE_LIMITS];
    return count <= (limit || 10);
  }

  /**
   * 获取热门作品（带缓存）
   */
  async getTopHotArtworks(limit: number = 20): Promise<Array<{artworkId: string, score: number}>> {
    // 使用缓存键
    const cacheKey = `hotness:top:${limit}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 从Redis获取数据
    const members = await this.redis.zrevrange(
      HotnessService.KEYS.HOT_RANK, 
      0, 
      limit - 1
    );
    
    const artworks: Array<{artworkId: string, score: number}> = [];
    for (const member of members) {
      const score = await this.redis.zscore(HotnessService.KEYS.HOT_RANK, member);
      if (score !== null) {
        artworks.push({
          artworkId: member,
          score: score
        });
      }
    }
    
    // 缓存结果（5分钟）
    await this.redis.set(cacheKey, JSON.stringify(artworks), 300);
    
    return artworks;
  }

  /**
   * 获取趋势作品
   */
  async getTrendingArtworks(timeWindow: string = '24h'): Promise<string[]> {
    const key = HotnessService.KEYS.TRENDING(timeWindow);
    return await this.redis.zrevrange(key, 0, -1);
  }

  /**
   * 检测机器人行为
   */
  async detectBotBehavior(userId: string): Promise<boolean> {
    // 获取用户最近1小时的行为
    const userActionsKey = `user:${userId}:actions:*`;
    const keys = await this.redis.keys(userActionsKey);
    
    if (keys.length > 100) {
      return true; // 行为过于频繁
    }
    
    // 检查行为模式
    const actions = await Promise.all(
      keys.map(async (key) => {
        const data = await this.redis.hgetall(key);
        return Object.keys(data).length;
      })
    );
    
    const totalActions = actions.reduce((sum, count) => sum + count, 0);
    return totalActions > 100;
  }

  /**
   * 获取热度详情（调试工具）
   */
  async getArtworkHotnessDetails(artworkId: string): Promise<any> {
    const hotData = await this.getArtworkHotData(artworkId);
    const rank = await this.redis.zrevrank(HotnessService.KEYS.HOT_RANK, artworkId);
    const score = await this.redis.zscore(HotnessService.KEYS.HOT_RANK, artworkId);
    
    return {
      hotData,
      rank: rank !== null ? rank + 1 : null,
      score: score ? parseFloat(String(score)) : 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 失效相关缓存 - 关键修复
   */
  async invalidateRelatedCaches(artworkId: string, userId?: string): Promise<void> {
    const promises: Promise<any>[] = [];
    
    // 失效feed缓存
    promises.push(this.redis.keys('feed:list:*').then(keys => 
      Promise.all(keys.map(key => this.redis.execute('DEL', key)))
    ));
    
    // 失效热度缓存
    promises.push(this.redis.execute('DEL', 'hot_rank'));
    promises.push(this.redis.execute('DEL', `artwork:${artworkId}:state`));
    
    // 失效趋势缓存
    promises.push(this.redis.keys('trending:*').then(keys => 
      Promise.all(keys.map(key => this.redis.execute('DEL', key)))
    ));
    
    // 如果提供了userId，失效用户相关缓存
    if (userId) {
      promises.push(this.redis.execute('DEL', `user:${userId}:artworks`));
      promises.push(this.redis.execute('DEL', `user:${userId}:favorites:list`));
    }

    // 获取作品作者并失效其缓存
    try {
      const artwork = await this.d1.getArtwork(artworkId);
      if (artwork && artwork.author.id !== userId) {
        promises.push(this.redis.execute('DEL', `user:${artwork.author.id}:artworks`));
      }
    } catch (error) {
      console.warn('Failed to get artwork for cache invalidation:', error);
    }

    await Promise.allSettled(promises);
  }
}