-- KIE Flux Kontext API 集成数据库迁移
-- 为 artworks 表添加 KIE 生成相关字段

-- 添加 KIE 生成相关字段
ALTER TABLE artworks ADD COLUMN kie_task_id TEXT;
ALTER TABLE artworks ADD COLUMN kie_generation_status TEXT DEFAULT 'pending' CHECK (kie_generation_status IN ('pending', 'generating', 'completed', 'failed', 'timeout'));
ALTER TABLE artworks ADD COLUMN kie_original_image_url TEXT;
ALTER TABLE artworks ADD COLUMN kie_result_image_url TEXT;
ALTER TABLE artworks ADD COLUMN kie_generation_started_at INTEGER;
ALTER TABLE artworks ADD COLUMN kie_generation_completed_at INTEGER;
ALTER TABLE artworks ADD COLUMN kie_error_message TEXT;
ALTER TABLE artworks ADD COLUMN kie_model TEXT DEFAULT 'flux-kontext-pro' CHECK (kie_model IN ('flux-kontext-pro', 'flux-kontext-max'));
ALTER TABLE artworks ADD COLUMN kie_aspect_ratio TEXT DEFAULT '1:1' CHECK (kie_aspect_ratio IN ('1:1', '16:9', '9:16', '4:3', '3:4'));
ALTER TABLE artworks ADD COLUMN kie_prompt TEXT;
ALTER TABLE artworks ADD COLUMN kie_output_format TEXT DEFAULT 'png' CHECK (kie_output_format IN ('png', 'jpeg'));
ALTER TABLE artworks ADD COLUMN kie_safety_tolerance INTEGER DEFAULT 2 CHECK (kie_safety_tolerance BETWEEN 0 AND 6);

-- 添加索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_artworks_kie_task_id ON artworks(kie_task_id);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_status ON artworks(kie_generation_status);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_started_at ON artworks(kie_generation_started_at);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_completed_at ON artworks(kie_generation_completed_at);

-- 更新现有记录的默认值
UPDATE artworks SET 
  kie_generation_status = 'pending',
  kie_aspect_ratio = '1:1',
  kie_model = 'flux-kontext-pro',
  kie_output_format = 'png',
  kie_safety_tolerance = 2
WHERE kie_generation_status IS NULL;