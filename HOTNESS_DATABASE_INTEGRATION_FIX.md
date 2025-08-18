# 热度系统数据库集成修复方案

## 📋 项目背景与问题分析

### 当前问题
- ❌ 热度数值与数据库不同步
- ❌ 缺少必要的数据库字段支持热度计算
- ❌ 热度数据未持久化存储
- ❌ 热度更新触发机制不完善
- ❌ 批量热度计算效率低下

### 目标状态
- ✅ 热度数值与数据库完全同步
- ✅ 完整的数据库字段支持
- ✅ 高效的批量热度更新机制
- ✅ 实时和定时触发更新
- ✅ 可靠的回滚和修复机制

## 🔧 数据库结构分析与补充

### 1. 现有数据库表结构检查

```sql
-- 检查现有表结构
PRAGMA table_info(artworks);
PRAGMA table_info(users);
PRAGMA table_info(artworks_like);
PRAGMA table_info(artworks_favorite);
```

### 2. 需要补充的字段

#### 2.1 artworks表补充字段
```sql
-- 为artworks表添加热度相关字段
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS hot_score INTEGER DEFAULT 0;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS hot_level TEXT DEFAULT 'new';
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS last_hot_update INTEGER DEFAULT 0;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS engagement_weight REAL DEFAULT 0;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
```

#### 2.2 创建热度历史表
```sql
-- 创建热度历史记录表
CREATE TABLE IF NOT EXISTS artworks_hot_history (
    id TEXT PRIMARY KEY,
    artwork_id TEXT NOT NULL,
    hot_score INTEGER NOT NULL,
    hot_level TEXT NOT NULL,
    calculated_at INTEGER NOT NULL,
    calculation_method TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_hot_history_artwork_id ON artworks_hot_history(artwork_id);
CREATE INDEX IF NOT EXISTS idx_hot_history_calculated_at ON artworks_hot_history(calculated_at);
CREATE INDEX IF NOT EXISTS idx_artworks_hot_score ON artworks(hot_score DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_hot_level ON artworks(hot_level);
CREATE INDEX IF NOT EXISTS idx_artworks_last_hot_update ON artworks(last_hot_update);
```

## 🚀 数据库迁移指令

### 1. 创建迁移文件

```bash
# 创建迁移文件
cd apps/worker-api
npx wrangler d1 migrations create test-d1 add_hotness_fields
```

### 2. 迁移文件内容

```sql
-- migrations/0005_add_hotness_fields.sql
-- 热度系统数据库字段补充

-- 为artworks表添加热度相关字段
ALTER TABLE artworks ADD COLUMN hot_score INTEGER DEFAULT 0;
ALTER TABLE artworks ADD COLUMN hot_level TEXT DEFAULT 'new';
ALTER TABLE artworks ADD COLUMN last_hot_update INTEGER DEFAULT 0;
ALTER TABLE artworks ADD COLUMN engagement_weight REAL DEFAULT 0;
ALTER TABLE artworks ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE artworks ADD COLUMN share_count INTEGER DEFAULT 0;
ALTER TABLE artworks ADD COLUMN comment_count INTEGER DEFAULT 0;

-- 创建热度历史记录表
CREATE TABLE artworks_hot_history (
    id TEXT PRIMARY KEY,
    artwork_id TEXT NOT NULL,
    hot_score INTEGER NOT NULL,
    hot_level TEXT NOT NULL,
    calculated_at INTEGER NOT NULL,
    calculation_method TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_hot_history_artwork_id ON artworks_hot_history(artwork_id);
CREATE INDEX idx_hot_history_calculated_at ON artworks_hot_history(calculated_at);
CREATE INDEX idx_artworks_hot_score ON artworks(hot_score DESC);
CREATE INDEX idx_artworks_hot_level ON artworks(hot_level);
CREATE INDEX idx_artworks_last_hot_update ON artworks(last_hot_update);

-- 初始化现有数据
UPDATE artworks SET 
    hot_score = 0,
    hot_level = 'new',
    last_hot_update = strftime('%s', 'now') * 1000,
    engagement_weight = 0,
    view_count = 0,
    share_count = 0,
    comment_count = 0
WHERE hot_score IS NULL;
```

### 3. 执行迁移

```bash
# 应用迁移
npx wrangler d1 migrations apply test-d1

# 验证迁移结果
npx wrangler d1 execute test-d1 --command "PRAGMA table_info(artworks)"
npx wrangler d1 execute test-d1 --command "SELECT * FROM artworks_hot_history LIMIT 1"
```

## 🔄 热度数值同步机制

### 1. 服务层集成设计

#### 1.1 扩展D1Service

```typescript
// apps/worker-api/src/services/d1.ts
export class D1Service {
  // 新增：获取作品互动数据
  async getArtworkInteractionData(artworkId: string) {
    const [likes, favorites, comments, shares, views] = await Promise.all([
      this.getLikeCount(artworkId),
      this.getFavoriteCount(artworkId),
      this.getCommentCount(artworkId),
      this.getShareCount(artworkId),
      this.getViewCount(artworkId)
    ]);
    
    return { likes, favorites, comments, shares, views };
  }

  // 新增：更新作品热度字段
  async updateArtworkHotness(artworkId: string, hotScore: number, hotLevel: string) {
    const now = Date.now();
    await this.db.prepare(`
      UPDATE artworks 
      SET hot_score = ?, hot_level = ?, last_hot_update = ?
      WHERE id = ?
    `).bind(hotScore, hotLevel, now, artworkId).run();
    
    // 记录历史
    await this.logHotnessHistory(artworkId, hotScore, hotLevel, 'realtime');
  }

  // 新增：获取作品热度数据
  async getArtworkHotData(artworkId: string) {
    return await this.db.prepare(`
      SELECT id, hot_score, hot_level, last_hot_update, 
             like_count, favorite_count, view_count, share_count, comment_count
      FROM artworks WHERE id = ?
    `).bind(artworkId).first();
  }

  // 新增：批量获取热度数据
  async getArtworksHotData(artworkIds: string[]) {
    const placeholders = artworkIds.map(() => '?').join(',');
    return await this.db.prepare(`
      SELECT id, hot_score, hot_level, last_hot_update,
             like_count, favorite_count, view_count, share_count, comment_count
      FROM artworks WHERE id IN (${placeholders})
    `).bind(...artworkIds).all();
  }

  // 新增：记录热度历史
  async logHotnessHistory(
    artworkId: string, 
    hotScore: number, 
    hotLevel: string, 
    method: string,
    metadata?: any
  ) {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    await this.db.prepare(`
      INSERT INTO artworks_hot_history 
      (id, artwork_id, hot_score, hot_level, calculated_at, calculation_method, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, artworkId, hotScore, hotLevel, now, method, 
      metadata ? JSON.stringify(metadata) : null
    ).run();
  }

  // 新增：获取需要重新计算热度的作品
  async getArtworksNeedingHotUpdate(limit: number = 100) {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    return await this.db.prepare(`
      SELECT a.*, 
             (SELECT COUNT(*) FROM artworks_like WHERE artwork_id = a.id) as actual_likes,
             (SELECT COUNT(*) FROM artworks_favorite WHERE artwork_id = a.id) as actual_favorites
      FROM artworks a
      WHERE a.last_hot_update < ? OR a.hot_score IS NULL
      ORDER BY a.created_at DESC
      LIMIT ?
    `).bind(twentyFourHoursAgo, limit).all();
  }
}
```

### 2. 热度计算服务集成

#### 2.1 扩展HotnessService

```typescript
// apps/worker-api/src/services/hotness.ts
export class HotnessService {
  private d1: D1Service;
  
  constructor(redis: RedisService, d1: D1Service) {
    this.redis = redis;
    this.d1 = d1;
  }

  // 新增：基于数据库计算热度
  async calculateHotnessFromDB(artworkId: string) {
    const artwork = await this.d1.getArtwork(artworkId);
    if (!artwork) return 0;
    
    const interactions = await this.d1.getArtworkInteractionData(artworkId);
    
    const calculator = new HotnessCalculator();
    const score = calculator.calculateHotScore(
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

  // 新增：同步热度到数据库
  async syncHotnessToDatabase(artworkId: string) {
    const score = await this.calculateHotnessFromDB(artworkId);
    const level = HotnessCalculator.getHotnessLevel(score);
    
    await this.d1.updateArtworkHotness(artworkId, score, level);
    
    // 同时更新Redis
    await this.redis.zadd('hot_rank', score, artworkId);
    await this.redis.hmset(`artwork:${artworkId}:hot`, {
      total_score: score,
      updated_at: Date.now()
    });
    
    return { score, level };
  }

  // 新增：批量同步热度
  async batchSyncHotnessToDatabase(artworkIds: string[]) {
    const results = await Promise.allSettled(
      artworkIds.map(id => this.syncHotnessToDatabase(id))
    );
    
    return {
      total: artworkIds.length,
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      errors: results.filter(r => r.status === 'rejected').map(r => r.reason)
    };
  }
}
```

## 🔄 路由集成优化

### 1. 扩展artworks.ts路由

```typescript
// apps/worker-api/src/routers/artworks.ts
import { HotnessService } from '../services/hotness'

// 在点赞/收藏操作后同步热度
router.post('/:id/like', async (c) => {
  // ... 现有代码 ...
  
  // 更新热度
  const hotness = new HotnessService(redis, d1)
  await hotness.syncHotnessToDatabase(artworkId)
  
  // 返回更新后的状态
  const updatedData = await d1.getArtworkHotData(artworkId)
  return c.json(ok(updatedData))
})

// 新增：获取作品热度详情
router.get('/:id/hot-data', async (c) => {
  const { id } = c.req.param()
  const d1 = D1Service.fromEnv(c.env)
  
  const data = await d1.getArtworkHotData(id)
  if (!data) {
    return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
  }
  
  return c.json(ok(data))
})

// 新增：批量获取热度数据
router.post('/batch/hot-data', async (c) => {
  const { artworkIds } = await c.req.json()
  
  if (!Array.isArray(artworkIds) || artworkIds.length === 0) {
    return c.json(fail('INVALID_INPUT', 'Invalid artwork IDs'), 400)
  }
  
  const d1 = D1Service.fromEnv(c.env)
  const data = await d1.getArtworksHotData(artworkIds)
  
  return c.json(ok(data))
})
```

### 2. 扩展hotness.ts路由

```typescript
// apps/worker-api/src/routers/hotness.ts

// 新增：强制同步热度到数据库
router.post('/sync/:id', async (c) => {
  try {
    const { id } = c.req.param()
    const redis = RedisService.fromEnv(c.env)
    const d1 = D1Service.fromEnv(c.env)
    const hotness = new HotnessService(redis, d1)
    
    const result = await hotness.syncHotnessToDatabase(id)
    
    return c.json(ok(result))
  } catch (error) {
    console.error('Failed to sync hotness:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

// 新增：批量同步热度
router.post('/sync-batch', async (c) => {
  try {
    const { artworkIds } = await c.req.json()
    
    if (!Array.isArray(artworkIds) || artworkIds.length === 0) {
      return c.json(fail('INVALID_INPUT', 'Invalid artwork IDs'), 400)
    }
    
    const redis = RedisService.fromEnv(c.env)
    const d1 = D1Service.fromEnv(c.env)
    const hotness = new HotnessService(redis, d1)
    
    const result = await hotness.batchSyncHotnessToDatabase(artworkIds)
    
    return c.json(ok(result))
  } catch (error) {
    console.error('Failed to batch sync hotness:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})
```

## 📊 批量修复脚本

### 1. 创建修复脚本

```typescript
// apps/worker-api/src/scripts/fix-hotness-sync.js

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
    console.log(`📊 发现 ${artworksToFix.length} 个需要修复的作品`);
    
    if (artworksToFix.length === 0) {
      console.log('✅ 所有作品热度已同步');
      return;
    }
    
    // 2. 批量修复
    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < artworksToFix.length; i += chunkSize) {
      chunks.push(artworksToFix.slice(i, i + chunkSize));
    }
    
    let totalFixed = 0;
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔄 处理批次 ${i + 1}/${chunks.length}`);
      
      const chunk = chunks[i];
      const artworkIds = chunk.map(a => a.id);
      
      const result = await hotness.batchSyncHotnessToDatabase(artworkIds);
      totalFixed += result.success;
      
      console.log(`✅ 成功: ${result.success}, ❌ 失败: ${result.failed}`);
      
      // 避免过载
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 3. 验证修复结果
    const verification = await d1.getArtworksHotData(artworksToFix.slice(0, 10).map(a => a.id));
    console.log('📈 修复结果验证:', verification.results);
    
    console.log(`🎉 修复完成！共修复 ${totalFixed} 个作品`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  }
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  fixHotnessDatabaseSync();
}
```

### 2. 添加到package.json

```json
{
  "scripts": {
    "hotness:fix-sync": "node src/scripts/fix-hotness-sync.js",
    "hotness:recalculate-all": "node src/scripts/recalculate-hotness.js",
    "hotness:validate": "node src/scripts/validate-hotness.js"
  }
}
```

## 🔍 验证和监控

### 1. 创建验证脚本

```typescript
// apps/worker-api/src/scripts/validate-hotness.js

import { D1Service } from '../services/d1.js';
import { RedisService } from '../services/redis.js';

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
    
    console.log(`⚠️  不一致数据: ${inconsistentResults.results.length}`);
    
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
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  }
}
```

## 🎯 使用指南

### 1. 执行完整修复流程

```bash
# 1. 应用数据库迁移
cd apps/worker-api
npx wrangler d1 migrations apply test-d1

# 2. 初始化现有数据
npm run hotness:recalculate-all

# 3. 验证修复结果
npm run hotness:validate

# 4. 修复任何同步问题
npm run hotness:fix-sync
```

### 2. 日常维护指令

```bash
# 每日同步检查
npm run hotness:validate

# 强制重新计算特定作品
curl -X POST "http://localhost:8787/api/hotness/sync/artwork-id-123"

# 批量重新计算
curl -X POST "http://localhost:8787/api/hotness/sync-batch" \
  -H "Content-Type: application/json" \
  -d '{"artworkIds":["id1","id2","id3"]}'

# 获取作品热度详情
curl "http://localhost:8787/api/artworks/artwork-id-123/hot-data"
```

### 3. 监控检查点

- ✅ 所有作品都有hot_score和hot_level字段
- ✅ 点赞/收藏数与互动表数据一致
- ✅ 热度历史记录正常生成
- ✅ 批量查询效率<100ms
- ✅ 实时更新触发正常

## 📈 性能优化建议

1. **批量处理**: 每次处理50-100个作品
2. **索引优化**: 确保所有查询字段都有索引
3. **缓存策略**: 使用Redis缓存热点数据
4. **异步处理**: 大计算任务使用队列
5. **监控告警**: 设置数据一致性监控

## 🔧 故障排除

### 常见问题及解决方案

| 问题 | 症状 | 解决方案 |
|------|------|----------|
| 热度值为0 | 所有作品hot_score=0 | 运行hotness:recalculate-all |
| 数值不一致 | 互动数与计数不符 | 运行hotness:fix-sync |
| 缺少字段 | 迁移失败 | 检查迁移文件并重新执行 |
| 性能问题 | 查询超时 | 检查索引和批量大小 |

## ✅ 验收标准

修复完成后，系统应满足：
- [ ] 所有作品具有有效的hot_score和hot_level
- [ ] 点赞/收藏数与互动表数据100%一致  
- [ ] 热度更新在点赞/收藏后立即生效
- [ ] 支持批量查询和更新
- [ ] 历史记录完整可追溯
- [ ] 性能满足<500ms响应要求