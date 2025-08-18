-- Migration number: 0002 	 2025-08-18T16:03:45.108Z
-- 热度系统数据库字段补充和表结构完善

-- 为artworks表添加缺失的comment_count字段
-- SQLite不支持IF NOT EXISTS在ALTER TABLE中，使用兼容性方式
ALTER TABLE artworks ADD COLUMN comment_count INTEGER DEFAULT 0;

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

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_hot_history_artwork_id ON artworks_hot_history(artwork_id);
CREATE INDEX IF NOT EXISTS idx_hot_history_calculated_at ON artworks_hot_history(calculated_at);
CREATE INDEX IF NOT EXISTS idx_artworks_comment_count ON artworks(comment_count);

-- 确保所有现有数据的comment_count字段有默认值
UPDATE artworks SET comment_count = 0 WHERE comment_count IS NULL;
