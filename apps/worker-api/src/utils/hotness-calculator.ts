/**
 * 热度计算工具类
 * 实现AI Social平台的热度算法核心逻辑
 */

export interface ArtworkData {
  id: string;
  user_id: string;
  title?: string;
  prompt?: string;
  model?: string;
  width?: number;
  height?: number;
  created_at: number;
  published_at?: number;
  engagement_weight?: number;
  like_count?: number;
  favorite_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
  latitude?: number;
  longitude?: number;
  country?: string;
  region?: string;
}

export interface InteractionData {
  likes?: number;
  favorites?: number;
  comments?: number;
  shares?: number;
  views?: number;
}

export interface HotnessConfig {
  weights: {
    like: number;
    favorite: number;
    publish: number;
    view: number;
    comment: number;
    share: number;
  };
  decay: {
    daily: number;
    hourly: number;
    fast: number;
  };
  quality: {
    prompt_bonus: number;
    model_bonus: number;
    resolution_bonus: number;
    aspect_ratio_bonus: number;
  };
}

export class HotnessCalculator {
  
  /**
   * 默认配置
   * 严格遵循HOTNESS_OPTIMIZATION.md中的权重设计
   */
  static readonly DEFAULT_CONFIG: HotnessConfig = {
    weights: {
      like: 1,
      favorite: 2,
      publish: 0,
      view: 0,
      comment: 0,
      share: 0
    },
    decay: {
      daily: 0.8,
      hourly: 0.95,
      fast: 0.7
    },
    quality: {
      prompt_bonus: 1.2,
      model_bonus: 1.1,
      resolution_bonus: 2.0,
      aspect_ratio_bonus: 0.5
    }
  };

  private config: HotnessConfig;

  constructor(config: Partial<HotnessConfig> = {}) {
    this.config = {
      ...HotnessCalculator.DEFAULT_CONFIG,
      ...config,
      weights: { ...HotnessCalculator.DEFAULT_CONFIG.weights, ...config.weights },
      decay: { ...HotnessCalculator.DEFAULT_CONFIG.decay, ...config.decay },
      quality: { ...HotnessCalculator.DEFAULT_CONFIG.quality, ...config.quality }
    };
  }

  /**
   * 计算作品热度分数
   * 公式：实时热度 = (基础权重 + 用户互动权重) × 时间衰减权重 × 质量权重
   */
  calculateHotScore(artwork: ArtworkData, interactions?: InteractionData): number {
    const now = Date.now();
    const publishedAt = artwork.published_at || artwork.created_at;
    
    // 1. 基础权重
    const baseWeight = artwork.engagement_weight || 0;
    
    // 2. 用户互动权重
    const interactionWeight = this.calculateInteractionWeight(interactions || {
      likes: artwork.like_count || 0,
      favorites: artwork.favorite_count || 0,
      comments: artwork.comment_count || 0,
      shares: artwork.share_count || 0,
      views: artwork.view_count || 0
    });
    
    // 3. 时间衰减权重
    const timeDecay = this.calculateTimeDecay(publishedAt, now);
    
    // 4. 质量权重
    const qualityFactor = this.calculateQualityFactor(artwork);
    
    // 最终热度计算
    const finalScore = (Number(baseWeight) + Number(interactionWeight)) * Number(timeDecay) * Number(qualityFactor);
    
    return Math.max(finalScore, 0); // 确保热度不为负数
  }

  /**
   * 计算用户互动权重
   */
  private calculateInteractionWeight(interactions: InteractionData): number {
    const { weights } = this.config;
    
    return (
      (interactions.likes || 0) * weights.like +
      (interactions.favorites || 0) * weights.favorite +
      (interactions.comments || 0) * weights.comment +
      (interactions.shares || 0) * weights.share +
      (interactions.views || 0) * weights.view
    );
  }

  /**
   * 计算时间衰减权重
   * 使用复合衰减模型 + 分段衰减策略
   */
  private calculateTimeDecay(publishedAt: number, currentTime: number): number {
    const { decay } = this.config;
    
    // 确保时间差不为负
    const timeDiff = Math.max(0, currentTime - Math.min(publishedAt, currentTime));
    const days = Math.max(0, Math.floor(timeDiff / 86400000));
    const hours = Math.max(0, Math.floor(timeDiff / 3600000));
    
    // 复合衰减模型
    const compoundDecay = Math.pow(Math.max(0.1, decay.daily), days) * Math.pow(Math.max(0.1, decay.hourly), Math.min(hours, 24));
    
    // 分段衰减策略
    const segmentedDecay = days < 1
      ? 1.0 // 24小时内不衰减
      : days < 7
      ? Math.pow(0.9, days) // 7天内缓慢衰减
      : Math.pow(Math.max(0.1, decay.fast), days); // 7天后快速衰减
    
    // 返回复合衰减和分段衰减的较小值，确保最小值为0.01
    return Math.max(0.01, Math.min(compoundDecay, segmentedDecay));
  }

/**
   * 计算质量权重因子 - 包含用户声誉计算
   */
  calculateQualityFactor(_artwork: ArtworkData): number {
    // 简化：质量因子固定为 1
    return 1;
  }

  /**
   * 使用依赖注入计算热度分数 - 支持用户声誉计算
   */
  // 已移除含“用户声誉”的扩展版本，前端未使用，避免复杂度

  /**
   * 计算预测热度（用于新作品）
   */
  calculatePredictedHotScore(artwork: ArtworkData): number {
    // 新作品使用基础权重 + 质量因子
    const baseWeight = artwork.engagement_weight || this.config.weights.publish;
    const qualityFactor = this.calculateQualityFactor(artwork);
    
    return Number(baseWeight) * Number(qualityFactor);
  }

  /**
   * 计算热度变化
   */
  calculateHotnessDelta(
    oldScore: number, 
    newInteractions: InteractionData, 
    removedInteractions?: InteractionData
  ): number {
    const addedWeight = this.calculateInteractionWeight(newInteractions);
    const removedWeight = removedInteractions ? this.calculateInteractionWeight(removedInteractions) : 0;
    
    return addedWeight - removedWeight;
  }

  /**
   * 获取热度等级
   */
  static getHotnessLevel(score: number): string {
    if (score > 100) return '🔥🔥🔥 爆红';
    if (score > 50) return '🔥🔥 热门';
    if (score > 20) return '🔥 上升';
    if (score > 10) return '📊 活跃';
    if (score > 5) return '👀 关注';
    return '🆕 新作品';
  }

  /**
   * 获取热度趋势
   */
  static getHotnessTrend(currentScore: number, previousScore: number): 'up' | 'down' | 'stable' {
    const delta = currentScore - previousScore;
    const threshold = 0.1 * Math.max(currentScore, previousScore);
    
    if (delta > threshold) return 'up';
    if (delta < -threshold) return 'down';
    return 'stable';
  }

  /**
   * 格式化热度分数（用于显示）
   */
  static formatHotnessScore(score: number): string {
    if (score >= 1000) {
      return (score / 1000).toFixed(1) + 'k';
    }
    if (score >= 100) {
      return score.toFixed(0);
    }
    return score.toFixed(1);
  }

  /**
   * 验证配置参数
   */
  static validateConfig(config: Partial<HotnessConfig>): boolean {
    try {
      // 验证权重
      if (config.weights) {
        Object.values(config.weights).forEach(weight => {
          if (weight < 0 || weight > 100) {
            throw new Error('Weight must be between 0 and 100');
          }
        });
      }
      
      // 验证衰减因子
      if (config.decay) {
        Object.values(config.decay).forEach(factor => {
          if (factor <= 0 || factor > 1) {
            throw new Error('Decay factor must be between 0 and 1');
          }
        });
      }
      
      // 验证质量因子
      if (config.quality) {
        Object.values(config.quality).forEach(factor => {
          if (factor < 0 || factor > 5) {
            throw new Error('Quality factor must be between 0 and 5');
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Invalid hotness config:', error);
      return false;
    }
  }
}