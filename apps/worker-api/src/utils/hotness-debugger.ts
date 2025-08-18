/**
 * AI Social 平台热度系统调试工具
 * 基于 HOTNESS_OPTIMIZATION.md 的调试需求
 */

import { HotnessService } from '../services/hotness.js';
import { RedisService } from '../services/redis.js';
import { D1Service } from '../services/d1.js';
import { hotnessMetrics } from './hotness-metrics.js';

export interface DebugArtworkData {
  artworkId: string;
  title?: string;
  baseWeight: number;
  interactionWeight: number;
  timeDecay: number;
  qualityFactor: number;
  finalScore: number;
  rank?: number;
  interactions: {
    likes: number;
    favorites: number;
    comments: number;
    shares: number;
    views: number;
  };
  quality: {
    hasPrompt: boolean;
    hasModel: boolean;
    resolution: { width: number; height: number };
    aspectRatio: number;
  };
  decay: {
    days: number;
    hours: number;
    dailyDecay: number;
    hourlyDecay: number;
  };
  debugInfo: {
    lastUpdated: string;
    calculationTime: number;
    cacheHit: boolean;
  };
}

export interface DebugUserData {
  userId: string;
  totalActions: number;
  rateLimits: Record<string, {
    current: number;
    limit: number;
    percentage: number;
  }>;
  recentActions: Array<{
    artworkId: string;
    action: string;
    timestamp: number;
    weight: number;
  }>;
  isBot: boolean;
}

export interface DebugSystemData {
  hotRankSize: number;
  trendingData: Record<string, number>;
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  performance: {
    avgCalculationTime: number;
    totalUpdates: number;
    errorRate: number;
  };
}

export class HotnessDebugger {
  private hotnessService: HotnessService;
  private redis: RedisService;
  private d1: D1Service;

  constructor(hotnessService: HotnessService, redis: RedisService, d1: D1Service) {
    this.hotnessService = hotnessService;
    this.redis = redis;
    this.d1 = d1;
  }

  /**
   * 获取作品热度详情（调试模式）
   */
  async getArtworkHotnessDetails(artworkId: string): Promise<DebugArtworkData> {
    const startTime = Date.now();
    
    try {
      // 获取基础作品信息
      const artwork = await this.d1.getArtwork(artworkId);
      if (!artwork) {
        throw new Error(`Artwork ${artworkId} not found`);
      }

      // 获取热度数据
      const hotData = await this.hotnessService.getArtworkHotData(artworkId);
      const rank = await this.redis.zrevrank('hot_rank', artworkId);
      const score = await this.redis.zscore('hot_rank', artworkId);

      // 计算时间衰减
      const now = Date.now();
      const days = Math.max(0, Math.floor((now - (artwork.createdAt || now)) / 86400000));
      const hours = Math.max(0, Math.floor((now - (artwork.createdAt || now)) / 3600000));
      
      const dailyDecay = Math.pow(0.8, days);
      const hourlyDecay = Math.pow(0.95, Math.min(hours, 24));

      // 计算质量因子
      const hasPrompt = !!(artwork as any).prompt;
      const hasModel = !!(artwork as any).model;
      const resolution = { width: (artwork as any).width || 0, height: (artwork as any).height || 0 };
      const aspectRatio = resolution.width > 0 && resolution.height > 0 
        ? Math.abs(1 - Math.abs(1 - resolution.width / resolution.height)) 
        : 0;

      const qualityFactor = this.calculateQualityFactor(artwork);

      // 获取互动数据
      const interactions = {
        likes: (artwork as any).like_count || 0,
        favorites: (artwork as any).favorite_count || 0,
        comments: hotData.comment_count || 0,
        shares: hotData.share_count || 0,
        views: hotData.view_count || 0
      };

      const interactionWeight = 
        interactions.likes * 2 +
        interactions.favorites * 5 +
        interactions.comments * 3 +
        interactions.shares * 8 +
        interactions.views * 0.1;

      const calculationTime = Date.now() - startTime;

      return {
        artworkId,
        title: artwork.title,
        baseWeight: (artwork as any).engagementWeight || 0,
        interactionWeight,
        timeDecay: dailyDecay * hourlyDecay,
        qualityFactor,
        finalScore: score ? parseFloat(String(score)) : 0,
        rank: rank !== null ? rank + 1 : undefined,
        interactions,
        quality: {
          hasPrompt,
          hasModel,
          resolution,
          aspectRatio
        },
        decay: {
          days,
          hours,
          dailyDecay,
          hourlyDecay
        },
        debugInfo: {
          lastUpdated: new Date(hotData.updated_at || Date.now()).toISOString(),
          calculationTime,
          cacheHit: true // 假设从缓存获取
        }
      };
    } catch (error) {
      throw new Error(`Failed to get artwork hotness details: ${error}`);
    }
  }

  /**
   * 获取用户行为详情（调试模式）
   */
  async getUserDebugData(userId: string): Promise<DebugUserData> {
    try {
      // 获取用户行为统计
      const userActionsKey = `user:${userId}:actions:*`;
      const keys = await this.redis.keys(userActionsKey);
      
      const totalActions = keys.length;
      const recentActions: DebugUserData['recentActions'] = [];

      // 获取最近10个行为
      const recentKeys = keys.slice(0, 10);
      for (const key of recentKeys) {
        const data = await this.redis.hgetall(key);
        const artworkId = key.split(':')[3];
        
        for (const [action, timestamp] of Object.entries(data)) {
          recentActions.push({
            artworkId,
            action,
            timestamp: parseInt(timestamp),
            weight: this.getActionWeight(action)
          });
        }
      }

      // 检查防刷限制
      const rateLimits: DebugUserData['rateLimits'] = {};
      const actions = ['like', 'favorite', 'comment', 'share', 'view'];
      
      for (const action of actions) {
        const limitKey = `rate_limit:${userId}:${action}:*`;
        const limitKeys = await this.redis.keys(limitKey);
        let totalCount = 0;
        
        for (const key of limitKeys) {
          const count = await this.redis.hget(key, 'count') || await (this.redis as any).get(key);
          totalCount += parseInt(count || '0');
        }

        const limits = {
          like: 10,
          favorite: 5,
          comment: 20,
          share: 3,
          view: 50
        };

        rateLimits[action] = {
          current: totalCount,
          limit: limits[action as keyof typeof limits],
          percentage: (totalCount / limits[action as keyof typeof limits]) * 100
        };
      }

      // 检测机器人行为
      const isBot = await this.hotnessService.detectBotBehavior(userId);

      return {
        userId,
        totalActions,
        rateLimits,
        recentActions: recentActions.sort((a, b) => b.timestamp - a.timestamp),
        isBot
      };
    } catch (error) {
      throw new Error(`Failed to get user debug data: ${error}`);
    }
  }

  /**
   * 获取系统调试数据
   */
  async getSystemDebugData(): Promise<DebugSystemData> {
    try {
      // 获取热度排行榜大小
      const hotRankSize = await this.redis.zcard('hot_rank');

      // 获取趋势数据
      const trendingWindows = ['1h', '6h', '24h', '7d'];
      const trendingData: Record<string, number> = {};
      
      for (const window of trendingWindows) {
        const key = `trending:${window}`;
        const count = await this.redis.zcard(key);
        trendingData[window] = count;
      }

      // 获取当前指标
      const metrics = hotnessMetrics.getMetrics();
      const cacheHitRate = hotnessMetrics.getCacheHitRate();

      return {
        hotRankSize,
        trendingData,
        cacheStats: {
          hits: metrics.cacheHits,
          misses: metrics.cacheMisses,
          hitRate: cacheHitRate
        },
        performance: {
          avgCalculationTime: metrics.hotnessCalculationTime,
          totalUpdates: metrics.hotnessUpdates,
          errorRate: hotnessMetrics.getErrorRatePercentage()
        }
      };
    } catch (error) {
      throw new Error(`Failed to get system debug data: ${error}`);
    }
  }

  /**
   * 验证热度计算
   */
  async validateHotnessCalculation(artworkId: string): Promise<{
    isValid: boolean;
    errors: string[];
    calculatedScore: number;
    storedScore: number;
  }> {
    const errors: string[] = [];
    
    try {
      const artworkData = await this.getArtworkHotnessDetails(artworkId);
      const storedScore = artworkData.finalScore;

      // 重新计算期望分数
      const expectedScore = 
        (artworkData.baseWeight + artworkData.interactionWeight) * 
        artworkData.timeDecay * 
        artworkData.qualityFactor;

      // 验证计算
      if (Math.abs(expectedScore - storedScore) > 0.1) {
        errors.push(`Score mismatch: expected ${expectedScore.toFixed(2)}, got ${storedScore.toFixed(2)}`);
      }

      // 验证范围
      if (storedScore < 0) {
        errors.push(`Invalid score: ${storedScore} (must be >= 0)`);
      }

      // 验证rank一致性
      const rank = await this.redis.zrevrank('hot_rank', artworkId);
      if (rank === null && storedScore > 0) {
        errors.push(`Artwork has score ${storedScore} but no rank in hot_rank`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        calculatedScore: expectedScore,
        storedScore
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error}`],
        calculatedScore: 0,
        storedScore: 0
      };
    }
  }

  /**
   * 获取调试报告
   */
  async getDebugReport(): Promise<string> {
    const systemData = await this.getSystemDebugData();
    const performanceReport = hotnessMetrics.getPerformanceReport();

    return `
=== AI Social 热度系统调试报告 ===
${performanceReport}

系统状态:
- 热度排行榜: ${systemData.hotRankSize} 个作品
- 趋势数据: ${JSON.stringify(systemData.trendingData, null, 2)}
- 缓存命中率: ${(systemData.cacheStats.hitRate * 100).toFixed(2)}%
- 平均计算时间: ${systemData.performance.avgCalculationTime.toFixed(2)}ms
- 总更新次数: ${systemData.performance.totalUpdates}

调试工具可用命令:
1. 获取作品详情: GET /api/debug/artwork/:id
2. 获取用户数据: GET /api/debug/user/:id  
3. 验证计算: POST /api/debug/validate/:id
4. 系统概览: GET /api/debug/system
`;
  }

  private calculateQualityFactor(artwork: any): number {
    let factor = 1.0;
    
    if (artwork.width && artwork.height) {
      const pixels = artwork.width * artwork.height;
      factor *= Math.min(pixels / 1000000, 2.0);
    }
    
    if (artwork.prompt) factor *= 1.2;
    if (artwork.model) factor *= 1.1;
    
    return Math.max(factor, 0.5);
  }

  private getActionWeight(action: string): number {
    const weights: Record<string, number> = {
      'like': 2,
      'unlike': -2,
      'favorite': 5,
      'unfavorite': -5,
      'publish': 10,
      'view': 0.1,
      'comment': 3,
      'share': 8
    };
    
    return weights[action] || 0;
  }
}

// 调试API响应格式化
export const formatDebugResponse = (data: any): Response => {
  return new Response(JSON.stringify({
    success: true,
    data,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const formatDebugError = (error: string): Response => {
  return new Response(JSON.stringify({
    success: false,
    error,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};