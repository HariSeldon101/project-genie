-- Create enum type for session status
-- This replaces the CHECK constraint with a proper enum for better TypeScript type generation
CREATE TYPE session_status AS ENUM ('active', 'paused', 'completed', 'failed', 'aborted');

-- Drop the existing CHECK constraint
ALTER TABLE company_intelligence_sessions
DROP CONSTRAINT IF EXISTS company_intelligence_sessions_status_check;

-- Convert the status column to use the enum type
-- This requires creating a new column, copying data, and swapping
ALTER TABLE company_intelligence_sessions
ADD COLUMN status_new session_status;

-- Copy existing data with explicit casting
UPDATE company_intelligence_sessions
SET status_new = status::session_status
WHERE status IS NOT NULL;

-- Drop the old column and rename the new one
ALTER TABLE company_intelligence_sessions
DROP COLUMN status;

ALTER TABLE company_intelligence_sessions
RENAME COLUMN status_new TO status;

-- Set NOT NULL constraint and default value
ALTER TABLE company_intelligence_sessions
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'active'::session_status;

-- Add comment for documentation
COMMENT ON TYPE session_status IS 'Status values for company intelligence sessions';