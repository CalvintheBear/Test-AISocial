-- 为artworks表添加slug字段
ALTER TABLE artworks ADD COLUMN slug TEXT;

-- 注意：D1暂不支持传统唯一索引，通过应用层保证slug唯一性