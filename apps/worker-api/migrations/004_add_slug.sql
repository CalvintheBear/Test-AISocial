-- 已由 002_add_slug.sql 添加，此迁移留空以避免重复执行失败
-- ALTER TABLE artworks ADD COLUMN slug TEXT;

-- 注意：D1暂不支持传统唯一索引，通过应用层保证slug唯一性