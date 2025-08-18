/**
 * AI Social 平台热度系统配置
 * 基于 HOTNESS_OPTIMIZATION.md 的权重设计
 */

export interface HotnessWeights {
  LIKE: number;
  FAVORITE: number;
  PUBLISH: number;
  VIEW: number;
  COMMENT: number;
  SHARE: number;
  UNLIKE: number;
  UNFAVORITE: number;
}

export interface DecayFactors {
  DAILY: number;
  HOURLY: number;
  FAST: number;
}

export interface RateLimits {
  LIKE: number;
  FAVORITE: number;
  COMMENT: number;
  SHARE: number;
  VIEW: number;
}

export interface QualityFactors {
  PROMPT_BONUS: number;
  MODEL_BONUS: number;
  RESOLUTION_BONUS: number;
  ASPECT_RATIO_BONUS: number;
  USER_REPUTATION_BONUS: number;
}

export interface CacheConfig {
  HOT_RANK_TTL: number;
  ARTWORK_HOT_TTL: number;
  USER_ACTIONS_TTL: number;
  TRENDING_TTL: number;
}

export interface HotnessConfig {
  weights: HotnessWeights;
  decay: DecayFactors;
  rateLimits: RateLimits;
  quality: QualityFactors;
  cache: CacheConfig;
  thresholds: {
    VIRAL: number;
    HOT: number;
    RISING: number;
    ACTIVE: number;
    NEW: number;
  };
}

/**
 * 默认配置 - 严格遵循 HOTNESS_OPTIMIZATION.md
 */
export const DEFAULT_HOTNESS_CONFIG: HotnessConfig = {
  weights: {
    LIKE: 2,          // 点赞权重
    FAVORITE: 5,      // 收藏权重
    PUBLISH: 10,      // 发布作品权重
    VIEW: 0.1,        // 浏览权重
    COMMENT: 3,       // 评论权重
    SHARE: 8,         // 分享权重
    UNLIKE: -2,       // 取消点赞权重
    UNFAVORITE: -5    // 取消收藏权重
  },

  decay: {
    DAILY: 0.8,      // 每日衰减因子
    HOURLY: 0.95,    // 每小时衰减因子
    FAST: 0.7        // 快速衰减因子
  },

  rateLimits: {
    LIKE: 10,        // 每小时最多点赞次数
    FAVORITE: 5,     // 每小时最多收藏次数
    COMMENT: 20,     // 每小时最多评论次数
    SHARE: 3,        // 每小时最多分享次数
    VIEW: 50         // 每小时最多浏览次数
  },

  quality: {
    PROMPT_BONUS: 1.2,        // 完整提示词奖励
    MODEL_BONUS: 1.1,         // 模型信息奖励
    RESOLUTION_BONUS: 2.0,    // 高分辨率奖励上限
    ASPECT_RATIO_BONUS: 0.5,  // 标准比例奖励
    USER_REPUTATION_BONUS: 0.1 // 用户声誉奖励系数
  },

  cache: {
    HOT_RANK_TTL: 3600 * 24 * 7,     // 7天
    ARTWORK_HOT_TTL: 3600 * 24 * 7,  // 7天
    USER_ACTIONS_TTL: 3600 * 24 * 30, // 30天
    TRENDING_TTL: 3600 * 2           // 2小时
  },

  thresholds: {
    VIRAL: 100,   // 爆红作品
    HOT: 50,      // 热门作品
    RISING: 20,   // 上升作品
    ACTIVE: 10,   // 活跃作品
    NEW: 5        // 新作品
  }
};

/**
 * 环境变量配置
 * 允许通过环境变量覆盖默认配置
 */
export const getHotnessConfig = (env?: Record<string, string | undefined>): HotnessConfig => {
  const config = { ...DEFAULT_HOTNESS_CONFIG };
  const envVars = env || {};

  // 从环境变量读取权重配置
  if (envVars.HOTNESS_LIKE_WEIGHT) {
    config.weights.LIKE = parseInt(envVars.HOTNESS_LIKE_WEIGHT);
  }
  if (envVars.HOTNESS_FAVORITE_WEIGHT) {
    config.weights.FAVORITE = parseInt(envVars.HOTNESS_FAVORITE_WEIGHT);
  }
  if (envVars.HOTNESS_COMMENT_WEIGHT) {
    config.weights.COMMENT = parseInt(envVars.HOTNESS_COMMENT_WEIGHT);
  }
  if (envVars.HOTNESS_SHARE_WEIGHT) {
    config.weights.SHARE = parseInt(envVars.HOTNESS_SHARE_WEIGHT);
  }
  if (envVars.HOTNESS_VIEW_WEIGHT) {
    config.weights.VIEW = parseFloat(envVars.HOTNESS_VIEW_WEIGHT);
  }

  // 从环境变量读取衰减配置
  if (envVars.HOTNESS_DAILY_DECAY) {
    config.decay.DAILY = parseFloat(envVars.HOTNESS_DAILY_DECAY);
  }
  if (envVars.HOTNESS_HOURLY_DECAY) {
    config.decay.HOURLY = parseFloat(envVars.HOTNESS_HOURLY_DECAY);
  }

  // 从环境变量读取限制配置
  if (envVars.HOTNESS_MAX_DAILY_ACTIONS) {
    const maxActions = parseInt(envVars.HOTNESS_MAX_DAILY_ACTIONS);
    config.rateLimits.LIKE = maxActions;
    config.rateLimits.FAVORITE = Math.floor(maxActions / 2);
    config.rateLimits.COMMENT = maxActions * 2;
    config.rateLimits.SHARE = Math.floor(maxActions / 3);
  }

  return config;
};

/**
 * 配置验证工具
 */
export const validateHotnessConfig = (config: Partial<HotnessConfig>): boolean => {
  try {
    // 验证权重
    if (config.weights) {
      Object.entries(config.weights).forEach(([key, value]) => {
        if (typeof value !== 'number' || value < -100 || value > 100) {
          throw new Error(`Invalid weight for ${key}: ${value}`);
        }
      });
    }

    // 验证衰减因子
    if (config.decay) {
      Object.entries(config.decay).forEach(([key, value]) => {
        if (typeof value !== 'number' || value <= 0 || value > 1) {
          throw new Error(`Invalid decay factor for ${key}: ${value}`);
        }
      });
    }

    // 验证限制
    if (config.rateLimits) {
      Object.entries(config.rateLimits).forEach(([key, value]) => {
        if (typeof value !== 'number' || value <= 0 || value > 1000) {
          throw new Error(`Invalid rate limit for ${key}: ${value}`);
        }
      });
    }

    // 验证质量因子
    if (config.quality) {
      Object.entries(config.quality).forEach(([key, value]) => {
        if (typeof value !== 'number' || value < 0 || value > 5) {
          throw new Error(`Invalid quality factor for ${key}: ${value}`);
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Invalid hotness configuration:', error);
    return false;
  }
};

/**
 * 热点推荐策略配置
 */
export const TRENDING_STRATEGIES = {
  TIME_WINDOWS: {
    '1h': 3600 * 1000,
    '6h': 3600 * 6 * 1000,
    '24h': 3600 * 24 * 1000,
    '7d': 3600 * 24 * 7 * 1000,
    '30d': 3600 * 24 * 30 * 1000
  },

  CATEGORIES: {
    ALL: 'all',
    NEW: 'new',
    TRENDING: 'trending',
    VIRAL: 'viral'
  }
};

/**
 * Redis键名模板
 */
export const HOTNESS_KEYS = {
  HOT_RANK: 'hot_rank',
  ARTWORK_HOT: (artworkId: string) => `artwork:${artworkId}:hot`,
  USER_ACTIONS: (userId: string, artworkId: string) => `user:${userId}:actions:${artworkId}`,
  USER_STATS: (userId: string) => `user:${userId}:stats`,
  RATE_LIMIT: (userId: string, action: string, artworkId: string) => `rate_limit:${userId}:${action}:${artworkId}`,
  TRENDING: (timeWindow: string) => `trending:${timeWindow}`,
  HOTNESS_HISTORY: (artworkId: string) => `hotness_history:${artworkId}`
};

/**
 * 性能优化配置
 */
export const PERFORMANCE_CONFIG = {
  BATCH_UPDATE_SIZE: 100,
  UPDATE_INTERVAL: 5000, // 5秒
  MAX_CACHE_SIZE: 10000,
  CLEANUP_INTERVAL: 3600 * 1000 // 1小时
};

/**
 * 监控指标配置
 */
export const METRICS_CONFIG = {
  HOTNESS_UPDATES: 'hotness_updates_total',
  HOTNESS_CALCULATION_TIME: 'hotness_calculation_duration_ms',
  TOP_ARTWORKS: 'top_hot_artworks',
  SPAM_DETECTIONS: 'spam_detections_total',
  CACHE_HITS: 'hotness_cache_hits',
  CACHE_MISSES: 'hotness_cache_misses'
};