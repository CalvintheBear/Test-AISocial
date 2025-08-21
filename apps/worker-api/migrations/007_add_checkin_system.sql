-- 签到记录表
CREATE TABLE IF NOT EXISTS user_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  checkin_date TEXT NOT NULL, -- YYYY-MM-DD 格式
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON user_checkins(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON user_checkins(checkin_date);

-- 签到积分记录表（用于过期管理）
CREATE TABLE IF NOT EXISTS checkin_credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  checkin_id INTEGER NOT NULL,
  credits INTEGER NOT NULL DEFAULT 12,
  expires_at INTEGER NOT NULL, -- 隔天过期时间戳
  expired_at INTEGER, -- 过期时间戳
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (checkin_id) REFERENCES user_checkins(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_checkin_credits_user ON checkin_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_credits_expires ON checkin_credits(expires_at);
CREATE INDEX IF NOT EXISTS idx_checkin_credits_expired ON checkin_credits(expired_at);
