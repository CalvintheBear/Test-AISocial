-- Consolidated D1 schema (single migration)
-- Users
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

-- Artworks
CREATE TABLE IF NOT EXISTS artworks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  url TEXT NOT NULL,
  thumb_url TEXT,
  slug TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft','published')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  published_at INTEGER,
  hot_base INTEGER DEFAULT 0,
  prompt TEXT,
  model TEXT,
  seed INTEGER,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  like_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  engagement_weight INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Likes
CREATE TABLE IF NOT EXISTS artworks_like (
  user_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artwork_id)
);

-- Favorites
CREATE TABLE IF NOT EXISTS artworks_favorite (
  user_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artwork_id)
);

-- Helpful indexes (no UNIQUE to avoid D1 limitations)
CREATE INDEX IF NOT EXISTS idx_artworks_user ON artworks(user_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status_created ON artworks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_slug ON artworks(slug);
CREATE INDEX IF NOT EXISTS idx_like_user ON artworks_like(user_id);
CREATE INDEX IF NOT EXISTS idx_like_artwork ON artworks_like(artwork_id);
CREATE INDEX IF NOT EXISTS idx_fav_user ON artworks_favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_artwork ON artworks_favorite(artwork_id);