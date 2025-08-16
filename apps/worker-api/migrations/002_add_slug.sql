-- 添加slug字段用于友好的URL
ALTER TABLE artworks ADD COLUMN slug TEXT;

-- 为slug创建唯一索引，确保唯一性
CREATE UNIQUE INDEX IF NOT EXISTS idx_artworks_slug ON artworks(slug);

-- 为已存在的记录生成slug
UPDATE artworks SET slug = LOWER(REPLACE(title, ' ', '-')) WHERE slug IS NULL;

-- 确保新记录有slug，如果没有提供则自动生成
CREATE TRIGGER IF NOT EXISTS set_artwork_slug
AFTER INSERT ON artworks
FOR EACH ROW
WHEN NEW.slug IS NULL OR NEW.slug = ''
BEGIN
  UPDATE artworks SET slug = LOWER(REPLACE(NEW.title, ' ', '-')) || '-' || substr(hex(randomblob(4)), 1, 8) WHERE id = NEW.id;
END;