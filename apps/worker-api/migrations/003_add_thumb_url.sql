-- Add thumb_url column to artworks table for thumbnail storage
ALTER TABLE artworks ADD COLUMN thumb_url TEXT;

-- Update existing records to use url as thumb_url initially
UPDATE artworks SET thumb_url = url WHERE thumb_url IS NULL;