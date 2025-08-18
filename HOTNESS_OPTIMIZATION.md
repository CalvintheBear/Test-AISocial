# AI Social 平台热度优化方案

## 📋 项目概述

当前AI Social平台的热度机制过于简单，仅依赖于`engagement_weight`基础值和时间衰减，缺乏用户互动对热度的实时影响。本方案将建立一个完整的、实时的、可扩展的热度系统。

## 🎯 优化目标

1. **实时性**: 用户互动立即影响热度
2. **公平性**: 新旧作品都有机会获得热度
3. **可控性**: 管理员可调整权重参数
4. **扩展性**: 支持未来新互动类型
5. **性能**: 使用Redis缓存减少数据库压力

## 🏗️ 架构设计

### 1. 多层热度计算模型

```
实时热度 = 基础权重 + 用户互动权重 + 时间衰减权重 + 质量权重
```

### 2. 数据存储架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   D1数据库      │    │    Redis缓存     │    │   内存计算      │
│                 │    │                  │    │                 │
│ engagement_weight│◄───┤ hot_rank:zset   │◄───┤ 实时计算引擎    │
│ like_count      │    │ artwork:{id}:hot │    │                 │
│ favorite_count  │    │ user:{id}:stats │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 热度权重设计

### 1. 互动行为权重表

| 行为类型 | 权重值 | 权重说明 | 防刷保护 |
|---------|--------|----------|----------|
| 点赞 | +2 | 基础互动 | 用户限频 |
| 取消点赞 | -2 | 撤销互动 | 同用户限制 |
| 收藏 | +5 | 高质量互动 | 用户限频 |
| 取消收藏 | -5 | 撤销高质量互动 | 同用户限制 |
| 发布作品 | +10 | 内容贡献 | 无 |
| 作品浏览 | +0.1 | 轻度互动 | IP限频 |
| 评论 | +3 | 深度互动 | 用户限频 |
| 分享 | +8 | 传播价值 | 用户限频 |

### 2. 时间衰减模型

```typescript
// 复合衰减模型
const timeDecay = Math.pow(0.8, days) * Math.pow(0.95, hours)

// 分段衰减
if (days < 1) decay = 1.0      // 24小时内不衰减
if (days < 7) decay = 0.9^days // 7天内缓慢衰减
else decay = 0.7^days          // 7天后快速衰减
```

### 3. 质量权重因子

```typescript
const qualityFactors = {
  completion: artwork.prompt ? 1.2 : 1.0,  // 完整提示词
  resolution: Math.min(width * height / 1000000, 2.0), // 高分辨率奖励
  aspectRatio: Math.abs(1 - Math.abs(1 - width/height)) * 0.5, // 标准比例奖励
  userReputation: Math.log10(userArtworkCount + 1) * 0.1 // 用户声誉
}
```

## 🔧 技术实现方案

### 1. Redis数据结构

```typescript
// 全局热度排行榜（有序集合）
// 键: hot_rank
// 值: artwork_id -> hot_score
ZADD hot_rank ${hot_score} ${artwork_id}

// 作品热度详情（哈希表）
// 键: artwork:${id}:hot
HSET artwork:${id}:hot 
  base_weight ${engagement_weight}
  like_weight ${like_weight}
  favorite_weight ${favorite_weight}
  time_decay ${time_decay}
  total_score ${total_score}
  updated_at ${timestamp}

// 用户行为记录（哈希表）
// 键: user:${userId}:actions
HSET user:${userId}:actions:${artworkId}
  liked ${timestamp}
  favorited ${timestamp}
  viewed ${timestamp}
```

### 2. 热度计算引擎

```typescript
class HotnessCalculator {
  private static readonly WEIGHTS = {
    LIKE: 2,
    FAVORITE: 5,
    PUBLISH: 10,
    VIEW: 0.1,
    COMMENT: 3,
    SHARE: 8
  };

  private static readonly DECAY_FACTORS = {
    DAILY: 0.8,
    HOURLY: 0.95,
    FAST: 0.7
  };

  static calculateHotScore(artwork: Artwork, interactions: InteractionData): number {
    const now = Date.now();
    const days = Math.max(0, Math.floor((now - artwork.publishedAt) / 86400000));
    const hours = Math.max(0, Math.floor((now - artwork.publishedAt) / 3600000));

    // 基础权重
    let baseWeight = artwork.engagementWeight || 0;

    // 互动权重
    const interactionWeight = 
      interactions.likes * this.WEIGHTS.LIKE +
      interactions.favorites * this.WEIGHTS.FAVORITE +
      interactions.comments * this.WEIGHTS.COMMENT +
      interactions.shares * this.WEIGHTS.SHARE +
      interactions.views * this.WEIGHTS.VIEW;

    // 时间衰减
    const timeDecay = Math.pow(this.DECAY_FACTORS.DAILY, days) * 
                     Math.pow(this.DECAY_FACTORS.HOURLY, Math.min(hours, 24));

    // 质量因子
    const qualityFactor = this.calculateQualityFactor(artwork);

    // 最终热度
    return (baseWeight + interactionWeight) * timeDecay * qualityFactor;
  }

  private static calculateQualityFactor(artwork: Artwork): number {
    let factor = 1.0;
    
    // 分辨率奖励
    if (artwork.width && artwork.height) {
      const pixels = artwork.width * artwork.height;
      factor *= Math.min(pixels / 1000000, 2.0);
    }

    // 完整度奖励
    if (artwork.prompt) factor *= 1.2;
    if (artwork.model) factor *= 1.1;

    return Math.max(factor, 0.5); // 最低0.5倍
  }
}
```

### 3. 实时更新机制

```typescript
class HotnessService {
  async updateArtworkHotness(artworkId: string, action: string, userId?: string) {
    const weight = this.getActionWeight(action);
    
    // 更新D1数据库
    await d1.incrEngagement(artworkId, weight);
    
    // 更新Redis排行榜
    const newScore = await this.recalculateHotScore(artworkId);
    await redis.updateHotRank(artworkId, newScore);
    
    // 记录用户行为
    if (userId) {
      await redis.recordUserAction(userId, artworkId, action);
    }
    
    // 触发排行榜更新
    await this.notifyHotRankUpdate();
  }

  async getTopHotArtworks(limit: number = 20): Promise<Artwork[]> {
    return await redis.getTopFromHotRank(limit);
  }

  async getTrendingArtworks(timeWindow: string = '24h'): Promise<Artwork[]> {
    return await redis.getTrending(timeWindow);
  }
}
```

### 4. 防刷保护机制

```typescript
class AntiSpamProtection {
  async checkRateLimit(userId: string, action: string, artworkId: string): Promise<boolean> {
    const key = `rate_limit:${userId}:${action}:${artworkId}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, 3600); // 1小时窗口
    }
    
    const limits = {
      like: 10,      // 每小时最多10次点赞
      favorite: 5,   // 每小时最多5次收藏
      comment: 20,   // 每小时最多20次评论
      share: 3       // 每小时最多3次分享
    };
    
    return count <= limits[action];
  }

  async detectBotBehavior(userId: string): Promise<boolean> {
    const actions = await redis.getUserActions(userId, '1h');
    
    // 检测异常行为模式
    const totalActions = actions.reduce((sum, action) => sum + action.count, 0);
    const uniqueArtworks = new Set(actions.map(a => a.artworkId)).size;
    
    // 如果操作过于频繁或针对同一作品，视为机器人
    return totalActions > 100 || uniqueArtworks < 3;
  }
}
```

## 📱 前端展示优化

### 1. 热度可视化组件

```typescript
interface HotnessIndicatorProps {
  hotScore: number;
  trend: 'up' | 'down' | 'stable';
  rank?: number;
}

const HotnessIndicator: React.FC<HotnessIndicatorProps> = ({ hotScore, trend, rank }) => {
  const getColor = () => {
    if (hotScore > 100) return 'text-red-500';
    if (hotScore > 50) return 'text-orange-500';
    if (hotScore > 20) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const getIcon = () => {
    switch (trend) {
      case 'up': return '🔥';
      case 'down': return '📉';
      case 'stable': return '📊';
    }
  };

  return (
    <div className={`flex items-center gap-1 ${getColor()}`}>
      <span>{getIcon()}</span>
      <span>{hotScore.toFixed(1)}</span>
      {rank && <span className="text-xs">#{rank}</span>}
    </div>
  );
};
```

### 2. 热点推荐页面

```typescript
const TrendingPage = () => {
  const [timeFilter, setTimeFilter] = useState('24h');
  const [category, setCategory] = useState('all');
  
  const { data: trendingArtworks, isLoading } = useSWR(
    [`/api/trending`, timeFilter, category],
    fetchTrendingArtworks
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🔥 热门作品</h1>
        <div className="flex gap-2">
          <Select value={timeFilter} onChange={setTimeFilter}>
            <option value="1h">1小时</option>
            <option value="6h">6小时</option>
            <option value="24h">24小时</option>
            <option value="7d">7天</option>
          </Select>
        </div>
      </div>
      
      <ArtworkGrid artworks={trendingArtworks} />
    </div>
  );
};
```

## 🚀 实施计划

### 阶段1：基础框架 (1-2天)
- [ ] 创建Redis热度数据结构
- [ ] 实现HotnessCalculator类
- [ ] 添加热度权重常量配置

### 阶段2：核心功能 (2-3天)
- [ ] 更新点赞/收藏操作增加热度
- [ ] 实现实时热度计算
- [ ] 添加防刷保护机制

### 阶段3：高级功能 (2-3天)
- [ ] 实现时间衰减优化
- [ ] 添加质量权重因子
- [ ] 创建热点推荐API

### 阶段4：前端集成 (1-2天)
- [ ] 创建热度展示组件
- [ ] 实现热点推荐页面
- [ ] 添加热度筛选功能

### 阶段5：测试优化 (1-2天)
- [ ] 压力测试热度计算
- [ ] 性能优化和缓存策略
- [ ] A/B测试权重参数

## 📊 性能优化

### 1. 缓存策略
```typescript
// 多层缓存
const cacheLayers = {
  L1: '内存缓存 (1分钟)',
  L2: 'Redis缓存 (5分钟)', 
  L3: '数据库查询'
};
```

### 2. 批量更新
```typescript
// 批量更新热度，减少Redis调用
async batchUpdateHotness(updates: HotnessUpdate[]) {
  const pipeline = redis.pipeline();
  updates.forEach(update => {
    pipeline.zincrby('hot_rank', update.delta, update.artworkId);
  });
  await pipeline.exec();
}
```

### 3. 异步计算
```typescript
// 使用Cloudflare Workers的Queue进行异步热度计算
export default {
  async queue(batch: MessageBatch<HotnessUpdate>, env: Env) {
    for (const message of batch.messages) {
      await processHotnessUpdate(message.body);
    }
  }
};
```

## 🔍 监控与调试

### 1. 监控指标
```typescript
const metrics = {
  hotnessUpdates: new Counter('hotness_updates_total'),
  hotnessCalculationTime: new Histogram('hotness_calculation_duration'),
  topArtworks: new Gauge('top_hot_artworks'),
  spamDetections: new Counter('spam_detections_total')
};
```

### 2. 调试工具
```typescript
// 热度追踪工具
class HotnessDebugger {
  async getArtworkHotnessDetails(artworkId: string) {
    return {
      baseWeight: await redis.get(`artwork:${artworkId}:base_weight`),
      interactionWeight: await redis.get(`artwork:${artworkId}:interaction_weight`),
      timeDecay: await redis.get(`artwork:${artworkId}:time_decay`),
      finalScore: await redis.zscore('hot_rank', artworkId)
    };
  }
}
```

## 📋 配置管理

### 1. 权重配置
```typescript
// 配置文件: config/hotness.config.ts
export const hotnessConfig = {
  weights: {
    like: parseInt(process.env.HOTNESS_LIKE_WEIGHT || '2'),
    favorite: parseInt(process.env.HOTNESS_FAVORITE_WEIGHT || '5'),
    comment: parseInt(process.env.HOTNESS_COMMENT_WEIGHT || '3')
  },
  decay: {
    daily: parseFloat(process.env.HOTNESS_DAILY_DECAY || '0.8'),
    hourly: parseFloat(process.env.HOTNESS_HOURLY_DECAY || '0.95')
  },
  limits: {
    maxDailyActions: parseInt(process.env.HOTNESS_MAX_DAILY_ACTIONS || '100')
  }
};
```

这个优化方案将AI Social平台的热度系统从简单的静态计算升级为动态、实时的智能推荐引擎，大幅提升用户体验和内容发现效率。