-- ========================================
-- AI Social 完整数据库结构 (2025版)
-- 基于真实代码扫描和实际使用情况重写
-- 适用于新库的一次性初始化或换壳操作
-- ========================================

-- ===============================
-- 用户表：存储基础资料与隐私开关
-- ===============================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,                    -- 用户名（允许为空，后端会兜底为空串）
  email TEXT,                   -- 邮箱（允许为空，后端会兜底为空串）
  profile_pic TEXT,             -- 头像URL
  hide_name INTEGER DEFAULT 0,  -- 是否隐藏名称（0/1）
  hide_email INTEGER DEFAULT 0, -- 是否隐藏邮箱（0/1）
  created_at INTEGER,           -- 创建时间（毫秒时间戳）
  updated_at INTEGER            -- 更新时间（毫秒时间戳）
);

-- ===============================
-- 作品表：核心数据表，包含所有作品信息和统计快照
-- ===============================
CREATE TABLE IF NOT EXISTS artworks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,        -- 作者ID，外键关联users表
  title TEXT,                   -- 作品标题
  url TEXT NOT NULL,            -- 原图URL（必填）
  thumb_url TEXT,               -- 缩略图URL
  slug TEXT,                    -- SEO友好的URL slug
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')), -- 作品状态
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

-- =======================================
-- 点赞关系表：持久化用户点赞记录
-- =======================================
CREATE TABLE IF NOT EXISTS artworks_like (
  user_id TEXT NOT NULL,        -- 用户ID
  artwork_id TEXT NOT NULL,     -- 作品ID
  created_at INTEGER NOT NULL,  -- 点赞时间（毫秒时间戳）
  PRIMARY KEY (user_id, artwork_id), -- 复合主键，防止重复点赞
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =======================================
-- 收藏关系表：持久化用户收藏记录
-- =======================================
CREATE TABLE IF NOT EXISTS artworks_favorite (
  user_id TEXT NOT NULL,        -- 用户ID
  artwork_id TEXT NOT NULL,     -- 作品ID
  created_at INTEGER NOT NULL,  -- 收藏时间（毫秒时间戳）
  PRIMARY KEY (user_id, artwork_id), -- 复合主键，防止重复收藏
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =======================================
-- 热度历史表：记录每次热度计算的不可变快照
-- =======================================
CREATE TABLE IF NOT EXISTS artworks_hot_history (
  id TEXT PRIMARY KEY,          -- 历史记录ID
  artwork_id TEXT NOT NULL,     -- 作品ID
  hot_score INTEGER NOT NULL,   -- 热度分数
  hot_level TEXT NOT NULL,      -- 热度等级
  calculated_at INTEGER NOT NULL,     -- 计算时间（毫秒时间戳）
  calculation_method TEXT NOT NULL,   -- 计算方式（realtime/batch等）
  metadata TEXT,                      -- 额外元数据（JSON格式）
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
);

-- ===============================
-- 性能优化索引
-- ===============================

-- 作品表索引
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

-- 点赞表索引
CREATE INDEX IF NOT EXISTS idx_like_user ON artworks_like(user_id);
CREATE INDEX IF NOT EXISTS idx_like_artwork ON artworks_like(artwork_id);
CREATE INDEX IF NOT EXISTS idx_like_artwork_user ON artworks_like(artwork_id, user_id);

-- 收藏表索引
CREATE INDEX IF NOT EXISTS idx_fav_user ON artworks_favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_artwork ON artworks_favorite(artwork_id);
CREATE INDEX IF NOT EXISTS idx_fav_artwork_user ON artworks_favorite(artwork_id, user_id);

-- 热度历史表索引
CREATE INDEX IF NOT EXISTS idx_hot_history_artwork_id ON artworks_hot_history(artwork_id);
CREATE INDEX IF NOT EXISTS idx_hot_history_calculated_at ON artworks_hot_history(calculated_at);

-- ===============================
-- 数据初始化：确保默认值正确设置
-- ===============================
UPDATE artworks SET like_count = COALESCE(like_count, 0);
UPDATE artworks SET favorite_count = COALESCE(favorite_count, 0);
UPDATE artworks SET comment_count = COALESCE(comment_count, 0);
UPDATE artworks SET view_count = COALESCE(view_count, 0);
UPDATE artworks SET share_count = COALESCE(share_count, 0);
UPDATE artworks SET engagement_weight = COALESCE(engagement_weight, 0);
UPDATE artworks SET hot_score = COALESCE(hot_score, 0);
UPDATE artworks SET hot_level = COALESCE(hot_level, 'new');
UPDATE artworks SET last_hot_update = COALESCE(last_hot_update, 0);

-- KIE字段默认值设置
UPDATE artworks SET kie_generation_status = COALESCE(kie_generation_status, 'pending');
UPDATE artworks SET kie_aspect_ratio = COALESCE(kie_aspect_ratio, '1:1');
UPDATE artworks SET kie_model = COALESCE(kie_model, 'flux-kontext-pro');
UPDATE artworks SET kie_output_format = COALESCE(kie_output_format, 'png');
UPDATE artworks SET kie_safety_tolerance = COALESCE(kie_safety_tolerance, 2);

-- ===============================
-- 表结构说明
-- ===============================

/*
数据库设计说明：

1. 用户表 (users)：
   - 支持隐私控制（hide_name, hide_email）
   - 时间戳使用毫秒级精度
   - 头像URL支持

2. 作品表 (artworks)：
   - 包含完整的AI生成参数（prompt, model, seed, width, height, mime_type）
   - 包含完整的KIE AI生成字段（kie_* 系列字段）
   - 统计字段作为快照，与关系表同步
   - 热度系统支持实时计算和历史记录
   - 支持草稿和发布两种状态
   - SEO友好的slug支持

3. 关系表 (artworks_like, artworks_favorite)：
   - 使用复合主键防止重复操作
   - 级联删除确保数据一致性
   - 支持批量查询优化

4. 热度历史表 (artworks_hot_history)：
   - 记录每次热度计算的快照
   - 支持审计和趋势分析
   - 包含计算方法和元数据

5. 索引优化：
   - 覆盖常用查询场景（用户作品、状态筛选、热度排序）
   - 支持分页和排序
   - 优化关联查询性能
   - KIE相关查询优化

6. 数据完整性：
   - 外键约束确保引用完整性
   - CHECK约束限制状态值和范围
   - 默认值处理避免NULL值问题
   - 级联删除维护数据一致性

7. 性能考虑：
   - 复合索引支持多字段查询
   - 覆盖索引减少回表查询
   - 统计字段作为快照避免实时计算
   - 批量操作支持

8. 扩展性：
   - 预留字段支持未来功能
   - 灵活的元数据结构
   - 支持多种AI模型和参数
   - 热度系统可配置权重和算法

使用说明：
1. 新库初始化：直接执行此SQL文件
2. 现有库升级：按顺序执行迁移文件（001_init.sql, 002_performance.sql, 003_add_kie_fields.sql）
3. 换壳操作：备份数据后执行此完整SQL文件
4. 数据验证：使用 checkDataConsistency 函数验证数据一致性
*/
