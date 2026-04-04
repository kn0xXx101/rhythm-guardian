-- Migration: Fix reviews content column error
-- Adds content column as alias for comment to resolve schema cache issues

-- Add content column that mirrors the comment column
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS content TEXT;

-- Update existing records to copy comment to content
UPDATE reviews SET content = comment WHERE content IS NULL OR content = '';

-- Create a trigger to keep content and comment in sync
CREATE OR REPLACE FUNCTION sync_reviews_content()
RETURNS TRIGGER AS $$
BEGIN
  -- If comment is updated, update content
  IF NEW.comment IS DISTINCT FROM OLD.comment THEN
    NEW.content = NEW.comment;
  END IF;
  
  -- If content is updated, update comment
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.comment = NEW.content;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync content and comment
DROP TRIGGER IF EXISTS trigger_sync_reviews_content ON reviews;
CREATE TRIGGER trigger_sync_reviews_content
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION sync_reviews_content();

-- For new inserts, ensure both fields are populated
CREATE OR REPLACE FUNCTION populate_reviews_content()
RETURNS TRIGGER AS $$
BEGIN
  -- If only comment is provided, copy to content
  IF NEW.comment IS NOT NULL AND (NEW.content IS NULL OR NEW.content = '') THEN
    NEW.content = NEW.comment;
  END IF;
  
  -- If only content is provided, copy to comment
  IF NEW.content IS NOT NULL AND (NEW.comment IS NULL OR NEW.comment = '') THEN
    NEW.comment = NEW.content;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inserts
DROP TRIGGER IF EXISTS trigger_populate_reviews_content ON reviews;
CREATE TRIGGER trigger_populate_reviews_content
  BEFORE INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION populate_reviews_content();

-- Log the fix
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM reviews
  WHERE content IS NOT NULL;
  
  RAISE NOTICE 'Reviews content column fix completed';
  RAISE NOTICE '- Added content column to reviews table';
  RAISE NOTICE '- Updated % existing records', updated_count;
  RAISE NOTICE '- Added triggers to keep content and comment in sync';
END $$;