-- 修复artworks表的status约束，允许AI生成过程中的临时状态
-- 迁移文件：004_fix_status_constraint.sql

-- 方法1：尝试直接修改约束（如果支持的话）
-- 注意：SQLite的CHECK约束修改需要重建表，这里我们使用更安全的方法

-- 1. 先检查当前约束
SELECT sql FROM sqlite_master WHERE type='table' AND name='artworks';

-- 2. 创建一个临时表来存储现有数据
CREATE TEMP TABLE artworks_backup AS SELECT * FROM artworks;

-- 3. 删除原表
DROP TABLE artworks;

-- 4. 重新创建artworks表，允许generating状态
CREATE TABLE artworks (
  id TEXT PRIMARY KEY,          -- 作品唯一标识
  user_id TEXT NOT NULL,        -- 作者用户ID
  title TEXT NOT NULL,          -- 作品标题
  url TEXT NOT NULL,            -- 作品原图URL
  thumb_url TEXT,               -- 缩略图URL
  slug TEXT,                    -- SEO友好的URL slug
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'generating')), -- 作品状态：允许generating
  created_at INTEGER NOT NULL,  -- 创建时间（毫秒时间戳）
  updated_at INTEGER,           -- 更新时间（毫秒时间戳）
  published_at INTEGER,         -- 发布时间（毫秒时间戳）
  
  -- AI生成参数/属性
  prompt TEXT,                  -- AI提示词
  model TEXT,                   -- 使用的AI模型
  seed INTEGER,                 -- 随机种子
  width INTEGER,                -- 图片宽度
  height INTEGER,               -- 图片高度
  mime_type TEXT,               -- MIME类型

  -- KIE AI生成相关字段
  kie_task_id TEXT,             -- KIE任务ID
  kie_generation_status TEXT DEFAULT 'pending' CHECK (kie_generation_status IN ('pending', 'generating', 'completed', 'failed', 'timeout')),
  kie_original_image_url TEXT,  -- KIE原始图片URL
  kie_result_image_url TEXT,    -- KIE生成结果图片URL
  kie_generation_started_at INTEGER,    -- KIE生成开始时间
  kie_generation_completed_at INTEGER,  -- KIE生成完成时间
  kie_error_message TEXT,       -- KIE错误信息
  kie_model TEXT DEFAULT 'flux-kontext-pro' CHECK (kie_model IN ('flux-kontext-pro', 'flux-kontext-max')),
  kie_aspect_ratio TEXT DEFAULT '1:1' CHECK (kie_aspect_ratio IN ('1:1', '16:9', '9:16', '4:3', '3:4')),
  kie_prompt TEXT,              -- KIE生成提示词
  kie_output_format TEXT DEFAULT 'png' CHECK (kie_output_format IN ('png', 'jpeg')),
  kie_safety_tolerance INTEGER DEFAULT 2 CHECK (kie_safety_tolerance BETWEEN 0 AND 6),

  -- 互动计数快照（与关系表保持同步）
  like_count INTEGER DEFAULT 0,      -- 点赞数量
  favorite_count INTEGER DEFAULT 0,  -- 收藏数量
  comment_count INTEGER DEFAULT 0,   -- 评论数量
  view_count INTEGER DEFAULT 0,      -- 查看数量
  share_count INTEGER DEFAULT 0,     -- 分享数量

  -- 热度快照
  engagement_weight REAL DEFAULT 0,  -- 质量/基础权重
  hot_score INTEGER DEFAULT 0,       -- 当前热度分数
  hot_level TEXT DEFAULT 'new',      -- 当前热度等级（new/rising/hot/viral）
  last_hot_update INTEGER DEFAULT 0, -- 最近热度刷新时间（毫秒时间戳）

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. 恢复数据
INSERT INTO artworks SELECT * FROM artworks_backup;

-- 6. 删除临时表
DROP TABLE artworks_backup;

-- 7. 重新创建索引
CREATE INDEX IF NOT EXISTS idx_artworks_user ON artworks(user_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status_created ON artworks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_slug ON artworks(slug);
CREATE INDEX IF NOT EXISTS idx_artworks_user_status_created ON artworks(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_comment_count ON artworks(comment_count);
CREATE INDEX IF NOT EXISTS idx_artworks_hot_score ON artworks(hot_score);
CREATE INDEX IF NOT EXISTS idx_artworks_last_hot_update ON artworks(last_hot_update);

-- KIE相关索引
CREATE INDEX IF NOT EXISTS idx_artworks_kie_task_id ON artworks(kie_task_id);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_status ON artworks(kie_generation_status);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_started_at ON artworks(kie_generation_started_at);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_completed_at ON artworks(kie_generation_completed_at);

-- 8. 验证约束
PRAGMA table_info(artworks);

-- 9. 测试新约束
INSERT INTO artworks (id, user_id, title, url, status, created_at) 
VALUES ('test-constraint', 'test-user', 'Test', 'test.jpg', 'generating', 1234567890);

-- 10. 清理测试数据
DELETE FROM artworks WHERE id = 'test-constraint';

-- 完成迁移
SELECT 'Migration 004_fix_status_constraint completed successfully' as status;
