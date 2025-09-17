-- Add generation_metadata column to artifacts table
ALTER TABLE artifacts 
ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb;