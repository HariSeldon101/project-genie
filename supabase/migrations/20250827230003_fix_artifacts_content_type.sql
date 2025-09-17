-- Fix artifacts content column to properly handle large JSON documents
-- Convert from text to jsonb for better handling of large documents

-- First, ensure all existing content is valid JSON or can be converted
UPDATE artifacts 
SET content = '{}' 
WHERE content IS NULL OR content = '';

-- Check current column type
DO $$ 
BEGIN
    -- Only alter if not already jsonb
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'artifacts' 
        AND column_name = 'content' 
        AND data_type = 'jsonb'
    ) THEN
        -- Convert the column to jsonb
        ALTER TABLE artifacts 
        ALTER COLUMN content TYPE jsonb 
        USING content::jsonb;
    END IF;
END $$;

-- Drop constraint if exists
ALTER TABLE artifacts 
DROP CONSTRAINT IF EXISTS content_must_be_json;

-- Add check constraint to ensure content is always valid JSON
ALTER TABLE artifacts 
ADD CONSTRAINT content_must_be_json 
CHECK (jsonb_typeof(content) IS NOT NULL);

-- Create index for better query performance on content field
CREATE INDEX IF NOT EXISTS idx_artifacts_content_type 
ON artifacts ((content->>'type'));

-- Add comment explaining the column
COMMENT ON COLUMN artifacts.content IS 'Document content stored as JSONB for reliable storage of complex nested structures';