-- 001_init.sql - AI Social D1 初始化完整结构（整合版）
-- 说明：本文件整合了当前项目所需的全部表结构与索引，适用于新库的一次性初始化。

-- ===============================
-- 用户表：存储基础资料与隐私开关
-- ===============================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,                -- 用户名（允许为空，后端会兜底为空串）
  email TEXT,               -- 邮箱（允许为空，后端会兜底为空串）
  profile_pic TEXT,         -- 头像URL
  hide_name INTEGER DEFAULT 0,   -- 是否隐藏名称（0/1）
  hide_email INTEGER DEFAULT 0,  -- 是否隐藏邮箱（0/1）
  created_at INTEGER,       -- 创建时间（ms）
  updated_at INTEGER        -- 更新时间（ms）
);

-- ===============================
-- 作品表：当前快照（热度与互动计数直接读这里）
-- ===============================
CREATE TABLE IF NOT EXISTS artworks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,        -- 作者ID
  title TEXT,
  url TEXT NOT NULL,            -- 原图URL
  thumb_url TEXT,               -- 缩略图URL
  slug TEXT,                    -- SEO友好slug
  status TEXT NOT NULL CHECK (status IN ('draft','published')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  published_at INTEGER,
  
  -- 生成参数/属性
  prompt TEXT,
  model TEXT,
  seed INTEGER,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,

  -- 互动计数快照（与关系表保持同步）
  like_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  -- 热度快照
  engagement_weight REAL DEFAULT 0,  -- 质量/基础权重
  hot_score INTEGER DEFAULT 0,       -- 当前热度分数
  hot_level TEXT DEFAULT 'new',      -- 当前热度等级
  last_hot_update INTEGER DEFAULT 0, -- 最近热度刷新时间（ms）

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =======================================
-- 点赞关系表：持久化“谁点了谁”的映射（防重复与列表）
-- =======================================
CREATE TABLE IF NOT EXISTS artworks_like (
  user_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artwork_id),
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =======================================
-- 收藏关系表：持久化“谁收藏了谁”的映射（个人收藏页）
-- =======================================
CREATE TABLE IF NOT EXISTS artworks_favorite (
  user_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artwork_id),
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =======================================
-- 热度历史表：记录每次热度计算的不可变快照（审计/趋势）
-- =======================================
CREATE TABLE IF NOT EXISTS artworks_hot_history (
  id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL,
  hot_score INTEGER NOT NULL,
  hot_level TEXT NOT NULL,
  calculated_at INTEGER NOT NULL,     -- 计算时间（ms）
  calculation_method TEXT NOT NULL,   -- 计算方式（如 realtime/batch 等）
  metadata TEXT,                      -- 额外元数据（JSON）
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
);

-- ===============================
-- 索引（避免使用 UNIQUE 以规避 D1 限制）
-- ===============================
CREATE INDEX IF NOT EXISTS idx_artworks_user ON artworks(user_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status_created ON artworks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_slug ON artworks(slug);

CREATE INDEX IF NOT EXISTS idx_like_user ON artworks_like(user_id);
CREATE INDEX IF NOT EXISTS idx_like_artwork ON artworks_like(artwork_id);

CREATE INDEX IF NOT EXISTS idx_fav_user ON artworks_favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_artwork ON artworks_favorite(artwork_id);

CREATE INDEX IF NOT EXISTS idx_hot_history_artwork_id ON artworks_hot_history(artwork_id);
CREATE INDEX IF NOT EXISTS idx_hot_history_calculated_at ON artworks_hot_history(calculated_at);

CREATE INDEX IF NOT EXISTS idx_artworks_comment_count ON artworks(comment_count);
CREATE INDEX IF NOT EXISTS idx_artworks_hot_score ON artworks(hot_score);
CREATE INDEX IF NOT EXISTS idx_artworks_last_hot_update ON artworks(last_hot_update);

-- ===============================
-- 兜底初始化：确保旧数据里的新列不为 NULL
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