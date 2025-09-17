-- Add generation_metadata column to artifacts table
ALTER TABLE artifacts 
ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN artifacts.generation_metadata IS 'Stores detailed LLM generation metrics including token counts, reasoning effort, and temperature settings';