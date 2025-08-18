/**
 * AI Social 平台热度系统批量更新优化
 * 基于 HOTNESS_OPTIMIZATION.md 的批量更新需求
 */

import { HotnessService } from '../services/hotness.js';
import { RedisService } from '../services/redis.js';
import { D1Service } from '../services/d1.js';
import { HotnessMetricsCollector } from './hotness-metrics.js';
import { PERFORMANCE_CONFIG } from '../config/hotness.config.js';

export interface BatchHotnessUpdate {
  artworkId: string;
  action: string;
  userId?: string;
  metadata?: any;
  deltaWeight?: number;
}

export interface BatchUpdateResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  duration: number;
  metrics: {
    totalScoreUpdate: number;
    redisOperations: number;
    dbOperations: number;
  };
}

export class HotnessBatchUpdater {
  private hotnessService: HotnessService;
  private redis: RedisService;
  private d1: D1Service;
  private metrics: HotnessMetricsCollector;
  private updateQueue: BatchHotnessUpdate[] = [];
  private processing = false;
  private lastProcessTime = 0;

  constructor(
    hotnessService: HotnessService,
    redis: RedisService,
    d1: D1Service,
    metrics: HotnessMetricsCollector
  ) {
    this.hotnessService = hotnessService;
    this.redis = redis;
    this.d1 = d1;
    this.metrics = metrics;
    
    // 启动定时批量处理
    this.startBatchProcessor();
  }

  /**
   * 添加批量更新到队列
   */
  addToBatch(update: BatchHotnessUpdate): void {
    this.updateQueue.push(update);
    
    // 如果队列达到批处理大小，立即处理
    if (this.updateQueue.length >= PERFORMANCE_CONFIG.BATCH_UPDATE_SIZE) {
      this.processBatch();
    }
  }

  /**
   * 启动定时批处理器
   */
  private startBatchProcessor(): void {
    setInterval(() => {
      if (this.updateQueue.length > 0 && !this.processing) {
        this.processBatch();
      }
    }, PERFORMANCE_CONFIG.UPDATE_INTERVAL);
  }

  /**
   * 执行批量更新
   */
  async processBatch(): Promise<BatchUpdateResult> {
    if (this.processing || this.updateQueue.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        errors: [],
        duration: 0,
        metrics: {
          totalScoreUpdate: 0,
          redisOperations: 0,
          dbOperations: 0
        }
      };
    }

    this.processing = true;
    const startTime = Date.now();
    const updates = [...this.updateQueue];
    this.updateQueue = [];

    try {
      const result = await this.executeBatchUpdates(updates);
      this.lastProcessTime = Date.now();
      return result;
    } catch (error) {
      return {
        success: false,
        processed: 0,
        failed: updates.length,
        errors: [error instanceof Error ? error.message : String(error)],
        duration: Date.now() - startTime,
        metrics: {
          totalScoreUpdate: 0,
          redisOperations: 0,
          dbOperations: 0
        }
      };
    } finally {
      this.processing = false;
    }
  }

  /**
   * 执行批量更新逻辑
   */
  private async executeBatchUpdates(updates: BatchHotnessUpdate[]): Promise<BatchUpdateResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;
    let totalScoreUpdate = 0;
    let redisOperations = 0;
    let dbOperations = 0;

    try {
      // 按artworkId分组处理
      const updatesByArtwork = this.groupUpdatesByArtwork(updates);
      const artworkIds = Object.keys(updatesByArtwork);

      // 批量获取当前热度数据
      const currentDataPromises = artworkIds.map(id => this.getArtworkCurrentData(id));
      const currentDataResults = await Promise.all(currentDataPromises);
      const currentDataMap = new Map(artworkIds.map((id, index) => [id, currentDataResults[index]]));

      // 使用Redis Pipeline批量操作
      const pipeline: any[] = [];
      const updatedScores: Array<{artworkId: string, newScore: number}> = [];

      // 处理每个作品的所有更新
      for (const artworkId of artworkIds) {
        const artworkUpdates = updatesByArtwork[artworkId];
        const currentData = currentDataMap.get(artworkId);
        
        if (!currentData) {
          errors.push(`Artwork ${artworkId} data not found`);
          failed += artworkUpdates.length;
          continue;
        }

        // 计算总权重变化
        let totalDelta = 0;
        for (const update of artworkUpdates) {
          const weight = update.deltaWeight || HotnessService.getActionWeight(update.action);
          totalDelta += weight;
        }

        // 重新计算热度分数
        const newScore = await this.recalculateHotScore(artworkId, currentData, totalDelta);
        
        // 添加到pipeline
        pipeline.push(['zadd', 'hot_rank', newScore, artworkId]);
        pipeline.push(['hmset', `artwork:${artworkId}:hot`, 
          'total_score', String(newScore), 
          'updated_at', String(Date.now())
        ]);

        updatedScores.push({ artworkId, newScore });
        totalScoreUpdate += Math.abs(newScore - (currentData.total_score || 0));
        redisOperations += 2;
        processed += artworkUpdates.length;
      }

      // 执行Redis Pipeline
      if (pipeline.length > 0) {
        await this.executeRedisPipeline(pipeline);
        dbOperations += artworkIds.length;
      }

      // 记录用户行为
      const userActions = updates.filter(u => u.userId);
      if (userActions.length > 0) {
        await this.recordUserActionsBatch(userActions);
      }

      // 批量更新D1数据库
      await this.updateD1EngagementBatch(updates);

      return {
        success: true,
        processed,
        failed,
        errors,
        duration: Date.now() - startTime,
        metrics: {
          totalScoreUpdate,
          redisOperations,
          dbOperations
        }
      };

    } catch (error) {
      return {
        success: false,
        processed,
        failed: updates.length - processed,
        errors: [...errors, error instanceof Error ? error.message : String(error)],
        duration: Date.now() - startTime,
        metrics: {
          totalScoreUpdate,
          redisOperations,
          dbOperations
        }
      };
    }
  }

  /**
   * 按artworkId分组更新
   */
  private groupUpdatesByArtwork(updates: BatchHotnessUpdate[]): Record<string, BatchHotnessUpdate[]> {
    const groups: Record<string, BatchHotnessUpdate[]> = {};
    
    for (const update of updates) {
      if (!groups[update.artworkId]) {
        groups[update.artworkId] = [];
      }
      groups[update.artworkId].push(update);
    }
    
    return groups;
  }

  /**
   * 获取作品当前热度数据
   */
  private async getArtworkCurrentData(artworkId: string): Promise<any> {
    const [hotData, artwork] = await Promise.all([
      this.hotnessService.getArtworkHotData(artworkId),
      this.d1.getArtwork(artworkId)
    ]);
    
    return {
      ...hotData,
      ...artwork,
      engagementWeight: artwork?.engagementWeight || 0
    };
  }

  /**
   * 重新计算热度分数
   */
  private async recalculateHotScore(
    artworkId: string, 
    currentData: any, 
    deltaWeight: number
  ): Promise<number> {
    const baseWeight = currentData.engagementWeight + deltaWeight;
    const interactionWeight = this.calculateInteractionWeight(currentData);
    
    // 计算时间衰减
    const now = Date.now();
    const publishedAt = currentData.createdAt || now;
    const days = Math.max(0, Math.floor((now - publishedAt) / 86400000));
    const hours = Math.max(0, Math.floor((now - publishedAt) / 3600000));
    
    const timeDecay = Math.pow(0.8, days) * Math.pow(0.95, Math.min(hours, 24));
    
    // 计算质量因子
    const qualityFactor = this.calculateQualityFactor(currentData);
    
    return Math.max((baseWeight + interactionWeight) * timeDecay * qualityFactor, 0);
  }

  /**
   * 执行Redis Pipeline
   */
  private async executeRedisPipeline(commands: any[][]): Promise<void> {
    // 在内存模式下，我们模拟pipeline执行
    if ((this.redis as any).isDevMode) {
      for (const [command, ...args] of commands) {
        await (this.redis as any)[command](...args);
      }
      return;
    }

    // 实际pipeline执行
    try {
      await this.redis.execute('MULTI');
      for (const cmd of commands) {
        const [command, ...args] = cmd;
        await this.redis.execute(command, ...args);
      }
      await this.redis.execute('EXEC');
    } catch (error) {
      console.error('Redis pipeline error:', error);
      throw error;
    }
  }

  /**
   * 批量记录用户行为
   */
  private async recordUserActionsBatch(actions: BatchHotnessUpdate[]): Promise<void> {
    const pipeline: any[] = [];
    
    for (const action of actions) {
      if (action.userId) {
        const key = `user:${action.userId}:actions:${action.artworkId}`;
        pipeline.push(['hset', key, action.action, String(Date.now())]);
        pipeline.push(['expire', key, 86400 * 30]); // 30天
      }
    }
    
    if (pipeline.length > 0) {
      await this.executeRedisPipeline(pipeline);
    }
  }

  /**
   * 批量更新D1数据库
   */
  private async updateD1EngagementBatch(updates: BatchHotnessUpdate[]): Promise<void> {
    // 按artworkId分组计算总权重变化
    const engagementUpdates: Record<string, number> = {};
    
    for (const update of updates) {
      const weight = update.deltaWeight || HotnessService.getActionWeight(update.action);
      if (!engagementUpdates[update.artworkId]) {
        engagementUpdates[update.artworkId] = 0;
      }
      engagementUpdates[update.artworkId] += weight;
    }

    // 批量更新数据库
    const promises = Object.entries(engagementUpdates).map(([artworkId, delta]) =>
      this.d1.incrEngagement(artworkId, delta)
    );
    
    await Promise.all(promises);
  }

  /**
   * 计算互动权重
   */
  private calculateInteractionWeight(data: any): number {
    return (data.like_weight || 0) + (data.favorite_weight || 0) + 
           (data.comment_count || 0) * 3 +
           (data.share_count || 0) * 8 +
           (data.view_count || 0) * 0.1;
  }

  /**
   * 计算质量因子
   */
  private calculateQualityFactor(data: any): number {
    let factor = 1.0;
    
    if (data.width && data.height) {
      const pixels = data.width * data.height;
      factor *= Math.min(pixels / 1000000, 2.0);
    }
    
    if (data.prompt) factor *= 1.2;
    if (data.model) factor *= 1.1;
    
    return Math.max(factor, 0.5);
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    pending: number;
    isProcessing: boolean;
    lastProcessTime: number;
  } {
    return {
      pending: this.updateQueue.length,
      isProcessing: this.processing,
      lastProcessTime: this.lastProcessTime
    };
  }

  /**
   * 强制处理队列中的所有更新
   */
  async flushQueue(): Promise<BatchUpdateResult> {
    if (this.updateQueue.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        errors: [],
        duration: 0,
        metrics: {
          totalScoreUpdate: 0,
          redisOperations: 0,
          dbOperations: 0
        }
      };
    }

    return await this.processBatch();
  }

  /**
   * 清理过期的热度数据
   */
  async cleanupExpiredData(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = [];
    let cleaned = 0;

    try {
      // 获取所有热度数据键
      const keys = await this.redis.keys('artwork:*:hot');
      const now = Date.now();
      const cutoffTime = now - 86400 * 7 * 1000; // 7天前

      // 批量检查过期数据
      const cleanupPromises = keys.map(async (key) => {
        try {
          const updatedAt = await this.redis.hget(key, 'updated_at');
          if (updatedAt && parseInt(updatedAt) < cutoffTime) {
            await this.redis.execute('DEL', key);
            cleaned++;
          }
        } catch (error) {
          errors.push(`Failed to cleanup ${key}: ${error}`);
        }
      });

      await Promise.all(cleanupPromises);
    } catch (error) {
      errors.push(`Cleanup error: ${error}`);
    }

    return { cleaned, errors };
  }
}

// 批量更新管理器
export class BatchUpdateManager {
  private batchUpdaters = new Map<string, HotnessBatchUpdater>();

  /**
   * 获取或创建批量更新器
   */
  getBatchUpdater(
    hotnessService: HotnessService,
    redis: RedisService,
    d1: D1Service,
    metrics: HotnessMetricsCollector
  ): HotnessBatchUpdater {
    const key = `${hotnessService.constructor.name}-${redis.constructor.name}`;
    
    if (!this.batchUpdaters.has(key)) {
      this.batchUpdaters.set(key, new HotnessBatchUpdater(hotnessService, redis, d1, metrics));
    }
    
    return this.batchUpdaters.get(key)!;
  }

  /**
   * 关闭所有批量更新器
   */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.batchUpdaters.values()).map(updater => updater.flushQueue());
    await Promise.all(promises);
    this.batchUpdaters.clear();
  }
}

// 全局批量更新管理器
export const batchUpdateManager = new BatchUpdateManager();