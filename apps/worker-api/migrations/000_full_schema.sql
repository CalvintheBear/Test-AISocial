PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- users
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

-- artworks
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

  -- generation params
  prompt TEXT,
  model TEXT,
  seed INTEGER,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,

  -- KIE fields
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

  -- counters and hotness snapshot
  like_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  engagement_weight REAL DEFAULT 0,
  hot_score INTEGER DEFAULT 0,
  hot_level TEXT DEFAULT '🆕 新作品',
  last_hot_update INTEGER DEFAULT 0,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- likes
CREATE TABLE IF NOT EXISTS artworks_like (
  user_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artwork_id),
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- favorites
CREATE TABLE IF NOT EXISTS artworks_favorite (
  user_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artwork_id),
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- hotness history
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

-- credits
CREATE TABLE IF NOT EXISTS user_credits (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- payments (包含 expires_at/expired_at 字段，避免后续 ALTER)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  credits INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER,
  expired_at INTEGER,
  raw TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- daily check-in
CREATE TABLE IF NOT EXISTS user_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  checkin_date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checkin_credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  checkin_id INTEGER NOT NULL,
  credits INTEGER NOT NULL DEFAULT 12,
  expires_at INTEGER NOT NULL,
  expired_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (checkin_id) REFERENCES user_checkins(id) ON DELETE CASCADE
);

-- indexes (aligned with code)
CREATE INDEX IF NOT EXISTS idx_artworks_user ON artworks(user_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status_created ON artworks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_slug ON artworks(slug);
CREATE INDEX IF NOT EXISTS idx_artworks_comment_count ON artworks(comment_count);
CREATE INDEX IF NOT EXISTS idx_artworks_hot_score ON artworks(hot_score);
CREATE INDEX IF NOT EXISTS idx_artworks_last_hot_update ON artworks(last_hot_update);
CREATE INDEX IF NOT EXISTS idx_artworks_like_count ON artworks(like_count);
CREATE INDEX IF NOT EXISTS idx_artworks_favorite_count ON artworks(favorite_count);
CREATE INDEX IF NOT EXISTS idx_artworks_created_at ON artworks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_published_at ON artworks(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_task_id ON artworks(kie_task_id);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_status ON artworks(kie_generation_status);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_started_at ON artworks(kie_generation_started_at);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_completed_at ON artworks(kie_generation_completed_at);

CREATE INDEX IF NOT EXISTS idx_like_user ON artworks_like(user_id);
CREATE INDEX IF NOT EXISTS idx_like_artwork ON artworks_like(artwork_id);
CREATE INDEX IF NOT EXISTS idx_like_artwork_user ON artworks_like(artwork_id, user_id);

CREATE INDEX IF NOT EXISTS idx_fav_user ON artworks_favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_artwork ON artworks_favorite(artwork_id);
CREATE INDEX IF NOT EXISTS idx_fav_artwork_user ON artworks_favorite(artwork_id, user_id);

CREATE INDEX IF NOT EXISTS idx_hot_history_artwork_id ON artworks_hot_history(artwork_id);
CREATE INDEX IF NOT EXISTS idx_hot_history_calculated_at ON artworks_hot_history(calculated_at);

CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON user_checkins(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON user_checkins(checkin_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_user_date_unique ON user_checkins(user_id, checkin_date);

CREATE INDEX IF NOT EXISTS idx_checkin_credits_user ON checkin_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_credits_expires ON checkin_credits(expires_at);
CREATE INDEX IF NOT EXISTS idx_checkin_credits_expired ON checkin_credits(expired_at);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- normalization guards (safe no-op on empty tables)
UPDATE artworks SET like_count = COALESCE(like_count, 0);
UPDATE artworks SET favorite_count = COALESCE(favorite_count, 0);
UPDATE artworks SET comment_count = COALESCE(comment_count, 0);
UPDATE artworks SET view_count = COALESCE(view_count, 0);
UPDATE artworks SET share_count = COALESCE(share_count, 0);
UPDATE artworks SET engagement_weight = COALESCE(engagement_weight, 0);
UPDATE artworks SET hot_score = COALESCE(hot_score, 0);
UPDATE artworks SET hot_level = COALESCE(hot_level, '🆕 新作品');
UPDATE artworks SET last_hot_update = COALESCE(last_hot_update, 0);

UPDATE artworks SET kie_generation_status = COALESCE(kie_generation_status, 'pending');
UPDATE artworks SET kie_aspect_ratio = COALESCE(kie_aspect_ratio, '1:1');
UPDATE artworks SET kie_model = COALESCE(kie_model, 'flux-kontext-pro');
UPDATE artworks SET kie_output_format = COALESCE(kie_output_format, 'png');
UPDATE artworks SET kie_safety_tolerance = COALESCE(kie_safety_tolerance, 2);

COMMIT;


