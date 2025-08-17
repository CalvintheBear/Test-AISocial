-- Extend users with timestamps
ALTER TABLE users ADD COLUMN created_at INTEGER;
ALTER TABLE users ADD COLUMN updated_at INTEGER;

-- Extend artworks with timestamps and generation metadata
ALTER TABLE artworks ADD COLUMN updated_at INTEGER;
ALTER TABLE artworks ADD COLUMN published_at INTEGER;
ALTER TABLE artworks ADD COLUMN prompt TEXT;
ALTER TABLE artworks ADD COLUMN model TEXT;
ALTER TABLE artworks ADD COLUMN seed INTEGER;
ALTER TABLE artworks ADD COLUMN width INTEGER;
ALTER TABLE artworks ADD COLUMN height INTEGER;
ALTER TABLE artworks ADD COLUMN mime_type TEXT;