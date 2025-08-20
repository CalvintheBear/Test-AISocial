-- 002_performance.sql - 查询性能索引（兼容上线，可重复执行）

-- 用户主页常用：按用户+状态过滤并按创建时间倒序
CREATE INDEX IF NOT EXISTS idx_artworks_user_status_created 
ON artworks(user_id, status, created_at DESC);

-- 批量判断“某用户是否对若干作品操作”的连接加速
CREATE INDEX IF NOT EXISTS idx_like_artwork_user 
ON artworks_like(artwork_id, user_id);

CREATE INDEX IF NOT EXISTS idx_fav_artwork_user 
ON artworks_favorite(artwork_id, user_id);


