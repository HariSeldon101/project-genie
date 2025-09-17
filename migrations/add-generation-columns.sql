-- Comprehensive migration to add all missing columns to artifacts table
-- Run this in the Supabase Dashboard SQL Editor

-- Add generation tracking columns
ALTER TABLE artifacts
ADD COLUMN IF NOT EXISTS generation_provider TEXT,
ADD COLUMN IF NOT EXISTS generation_model TEXT,
ADD COLUMN IF NOT EXISTS generation_tokens INTEGER,
ADD COLUMN IF NOT EXISTS generation_cost NUMERIC(10,6),
ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb;

-- Add comments to explain each column
COMMENT ON COLUMN artifacts.generation_provider IS 'LLM provider used (e.g., openai, anthropic)';
COMMENT ON COLUMN artifacts.generation_model IS 'Model used for generation (e.g., gpt-5-nano, gpt-4)';
COMMENT ON COLUMN artifacts.generation_tokens IS 'Total tokens used in generation';
COMMENT ON COLUMN artifacts.generation_cost IS 'Cost in USD for the generation';
COMMENT ON COLUMN artifacts.generation_time_ms IS 'Time taken to generate in milliseconds';
COMMENT ON COLUMN artifacts.generation_metadata IS 'Detailed generation metrics (input/output/reasoning tokens, temperature, etc)';

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'artifacts'
ORDER BY ordinal_position;