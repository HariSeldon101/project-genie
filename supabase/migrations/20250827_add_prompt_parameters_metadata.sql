-- Add columns to store prompt parameters and additional generation metadata
ALTER TABLE artifacts
ADD COLUMN IF NOT EXISTS generation_reasoning_level TEXT,
ADD COLUMN IF NOT EXISTS generation_temperature DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS generation_max_tokens INTEGER,
ADD COLUMN IF NOT EXISTS generation_input_tokens INTEGER,
ADD COLUMN IF NOT EXISTS generation_output_tokens INTEGER,
ADD COLUMN IF NOT EXISTS generation_reasoning_tokens INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN artifacts.generation_reasoning_level IS 'Reasoning level used for generation (minimal, low, medium, high)';
COMMENT ON COLUMN artifacts.generation_temperature IS 'Temperature parameter used for generation';
COMMENT ON COLUMN artifacts.generation_max_tokens IS 'Maximum tokens parameter used for generation';
COMMENT ON COLUMN artifacts.generation_input_tokens IS 'Number of input tokens used';
COMMENT ON COLUMN artifacts.generation_output_tokens IS 'Number of output tokens generated';
COMMENT ON COLUMN artifacts.generation_reasoning_tokens IS 'Number of reasoning tokens used (GPT-5 models)';