-- 添加缺失的计数字段
-- 迁移文件：005_add_missing_count_fields.sql

-- 1. 检查当前表结构
SELECT sql FROM sqlite_master WHERE type='table' AND name='artworks';

-- 2. 添加缺失的字段
ALTER TABLE artworks ADD COLUMN like_count INTEGER DEFAULT 0;
ALTER TABLE artworks ADD COLUMN favorite_count INTEGER DEFAULT 0;

-- 3. 验证字段已添加
PRAGMA table_info(artworks);

-- 4. 为现有记录设置默认值
UPDATE artworks SET like_count = 0 WHERE like_count IS NULL;
UPDATE artworks SET favorite_count = 0 WHERE favorite_count IS NULL;

-- 5. 创建相关索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_artworks_like_count ON artworks(like_count);
CREATE INDEX IF NOT EXISTS idx_artworks_favorite_count ON artworks(favorite_count);

-- 完成迁移
SELECT 'Migration 005_add_missing_count_fields completed successfully' as status;
