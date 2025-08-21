PRAGMA foreign_keys = ON;

-- 用户
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  profile_pic TEXT,
  hide_name INTEGER DEFAULT 0,
  hide_email INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

-- 作品（含 KIE 与热度、互动计数；状态允许 generating）
CREATE TABLE IF NOT EXISTS artworks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  url TEXT NOT NULL,
  thumb_url TEXT,
  slug TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft','published','generating')),
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

  -- KIE 生成相关
  kie_task_id TEXT,
  kie_generation_status TEXT DEFAULT 'pending' CHECK (kie_generation_status IN ('pending','generating','completed','failed','timeout')),
  kie_original_image_url TEXT,
  kie_result_image_url TEXT,
  kie_generation_started_at INTEGER,
  kie_generation_completed_at INTEGER,
  kie_error_message TEXT,
  kie_model TEXT DEFAULT 'flux-kontext-pro' CHECK (kie_model IN ('flux-kontext-pro','flux-kontext-max')),
  kie_aspect_ratio TEXT DEFAULT '1:1' CHECK (kie_aspect_ratio IN ('1:1','16:9','9:16','4:3','3:4')),
  kie_prompt TEXT,
  kie_output_format TEXT DEFAULT 'png' CHECK (kie_output_format IN ('png','jpeg')),
  kie_safety_tolerance INTEGER DEFAULT 2 CHECK (kie_safety_tolerance BETWEEN 0 AND 6),

  -- 互动计数快照
  like_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  -- 热度快照
  engagement_weight REAL DEFAULT 0,
  hot_score INTEGER DEFAULT 0,
  hot_level TEXT DEFAULT 'new',
  last_hot_update INTEGER DEFAULT 0,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 点赞关系
CREATE TABLE IF NOT EXISTS artworks_like (
  user_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artwork_id),
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 收藏关系
CREATE TABLE IF NOT EXISTS artworks_favorite (
  user_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artwork_id),
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 热度历史
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

-- 索引（与代码真实查询对齐）
CREATE INDEX IF NOT EXISTS idx_artworks_user ON artworks(user_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status_created ON artworks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_slug ON artworks(slug);
CREATE INDEX IF NOT EXISTS idx_artworks_user_status_created ON artworks(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_comment_count ON artworks(comment_count);
CREATE INDEX IF NOT EXISTS idx_artworks_hot_score ON artworks(hot_score);
CREATE INDEX IF NOT EXISTS idx_artworks_last_hot_update ON artworks(last_hot_update);
CREATE INDEX IF NOT EXISTS idx_artworks_like_count ON artworks(like_count);
CREATE INDEX IF NOT EXISTS idx_artworks_favorite_count ON artworks(favorite_count);

-- KIE 查询优化索引
CREATE INDEX IF NOT EXISTS idx_artworks_kie_task_id ON artworks(kie_task_id);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_status ON artworks(kie_generation_status);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_started_at ON artworks(kie_generation_started_at);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_completed_at ON artworks(kie_generation_completed_at);

-- 关系表索引
CREATE INDEX IF NOT EXISTS idx_like_user ON artworks_like(user_id);
CREATE INDEX IF NOT EXISTS idx_like_artwork ON artworks_like(artwork_id);
CREATE INDEX IF NOT EXISTS idx_like_artwork_user ON artworks_like(artwork_id, user_id);

CREATE INDEX IF NOT EXISTS idx_fav_user ON artworks_favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_artwork ON artworks_favorite(artwork_id);
CREATE INDEX IF NOT EXISTS idx_fav_artwork_user ON artworks_favorite(artwork_id, user_id);

-- 热度历史索引
CREATE INDEX IF NOT EXISTS idx_hot_history_artwork_id ON artworks_hot_history(artwork_id);
CREATE INDEX IF NOT EXISTS idx_hot_history_calculated_at ON artworks_hot_history(calculated_at);

-- 兜底：清洗空值
UPDATE artworks SET like_count = COALESCE(like_count, 0);
UPDATE artworks SET favorite_count = COALESCE(favorite_count, 0);
UPDATE artworks SET comment_count = COALESCE(comment_count, 0);
UPDATE artworks SET view_count = COALESCE(view_count, 0);
UPDATE artworks SET share_count = COALESCE(share_count, 0);
UPDATE artworks SET engagement_weight = COALESCE(engagement_weight, 0);
UPDATE artworks SET hot_score = COALESCE(hot_score, 0);
UPDATE artworks SET hot_level = COALESCE(hot_level, 'new');
UPDATE artworks SET last_hot_update = COALESCE(last_hot_update, 0);

-- 兜底：KIE 默认值
UPDATE artworks SET kie_generation_status = COALESCE(kie_generation_status, 'pending');
UPDATE artworks SET kie_aspect_ratio = COALESCE(kie_aspect_ratio, '1:1');
UPDATE artworks SET kie_model = COALESCE(kie_model, 'flux-kontext-pro');
UPDATE artworks SET kie_output_format = COALESCE(kie_output_format, 'png');
UPDATE artworks SET kie_safety_tolerance = COALESCE(kie_safety_tolerance, 2);