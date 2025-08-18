/**
 * AI Social 平台热度系统监控指标
 * 基于 HOTNESS_OPTIMIZATION.md 的监控需求
 */

export interface HotnessMetrics {
  // 热度更新相关指标
  hotnessUpdates: number;
  hotnessCalculationTime: number;
  topArtworks: number;
  spamDetections: number;
  
  // 缓存相关指标
  cacheHits: number;
  cacheMisses: number;
  
  // 性能相关指标
  averageResponseTime: number;
  errorRate: number;
  
  // 用户行为指标
  uniqueUsers: number;
  totalActions: number;
}

export class HotnessMetricsCollector {
  private metrics: HotnessMetrics;
  private startTime: number;
  
  constructor() {
    this.metrics = {
      hotnessUpdates: 0,
      hotnessCalculationTime: 0,
      topArtworks: 0,
      spamDetections: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uniqueUsers: 0,
      totalActions: 0
    };
    this.startTime = Date.now();
  }

  /**
   * 记录热度更新
   */
  recordHotnessUpdate(): void {
    this.metrics.hotnessUpdates++;
  }

  /**
   * 记录热度计算时间
   */
  recordCalculationTime(duration: number): void {
    this.metrics.hotnessCalculationTime = duration;
  }

  /**
   * 记录热门作品数量
   */
  recordTopArtworks(count: number): void {
    this.metrics.topArtworks = count;
  }

  /**
   * 记录垃圾检测
   */
  recordSpamDetection(): void {
    this.metrics.spamDetections++;
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  /**
   * 记录响应时间
   */
  recordResponseTime(duration: number): void {
    this.metrics.averageResponseTime = duration;
  }

  /**
   * 记录错误
   */
  recordError(): void {
    this.metrics.errorRate++;
  }

  /**
   * 记录用户行为
   */
  recordUserAction(userId: string): void {
    this.metrics.totalActions++;
  }

  /**
   * 获取当前指标
   */
  getMetrics(): HotnessMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取运行时统计
   */
  getRuntimeStats(): { uptime: number; memory: any } {
    return {
      uptime: Date.now() - this.startTime,
      memory: null
    };
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.metrics = {
      hotnessUpdates: 0,
      hotnessCalculationTime: 0,
      topArtworks: 0,
      spamDetections: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uniqueUsers: 0,
      totalActions: 0
    };
  }

  /**
   * 获取缓存命中率
   */
  getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? this.metrics.cacheHits / total : 0;
  }

  /**
   * 获取错误率
   */
  getErrorRatePercentage(): number {
    const total = this.metrics.totalActions + this.metrics.errorRate;
    return total > 0 ? (this.metrics.errorRate / total) * 100 : 0;
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): string {
    const stats = this.getRuntimeStats();
    const cacheHitRate = this.getCacheHitRate();
    const errorRate = this.getErrorRatePercentage();

    return `
=== AI Social 热度系统性能报告 ===
运行时间: ${Math.round(stats.uptime / 1000)} 秒
内存使用: ${stats.memory ? Math.round(stats.memory.heapUsed / 1024 / 1024) : 'N/A'} MB

热度更新次数: ${this.metrics.hotnessUpdates}
热门作品数量: ${this.metrics.topArtworks}
垃圾检测次数: ${this.metrics.spamDetections}

缓存命中率: ${(cacheHitRate * 100).toFixed(2)}%
平均响应时间: ${this.metrics.averageResponseTime.toFixed(2)}ms
错误率: ${errorRate.toFixed(2)}%

总用户操作: ${this.metrics.totalActions}
`;
  }
}

// 全局指标收集器实例
export const hotnessMetrics = new HotnessMetricsCollector();

/**
 * 性能计时器工具
 */
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }

  end(): number {
    const duration = Date.now() - this.startTime;
    
    // 根据标签记录到对应指标
    if (this.label === 'hotness_calculation') {
      hotnessMetrics.recordCalculationTime(duration);
    } else if (this.label === 'api_response') {
      hotnessMetrics.recordResponseTime(duration);
    }

    return duration;
  }
}

/**
 * 监控中间件
 */
export const monitoringMiddleware = {
  /**
   * 记录API请求
   */
  recordRequest: async (request: Request, response: Response) => {
    const url = new URL(request.url);
    const startTime = Date.now();
    
    // 记录特定API路径的指标
    if (url.pathname.includes('/api/hotness') || url.pathname.includes('/api/trending')) {
      const duration = Date.now() - startTime;
      hotnessMetrics.recordResponseTime(duration);
    }
  },

  /**
   * 记录错误
   */
  recordError: (error: Error) => {
    console.error('Hotness system error:', error);
    hotnessMetrics.recordError();
  }
};