-- Add missing phase column to company_intelligence_sessions table
-- This column is required by the bulletproof architecture spec
-- Tracks which phase (1-5) the session is currently in

ALTER TABLE company_intelligence_sessions 
ADD COLUMN IF NOT EXISTS phase INTEGER DEFAULT 1 NOT NULL;

-- Add index for efficient phase queries
CREATE INDEX IF NOT EXISTS idx_sessions_phase 
ON company_intelligence_sessions(phase);

-- Add check constraint to ensure phase is between 1 and 5
ALTER TABLE company_intelligence_sessions 
DROP CONSTRAINT IF EXISTS check_phase;

ALTER TABLE company_intelligence_sessions 
ADD CONSTRAINT check_phase CHECK (phase >= 1 AND phase <= 5);

-- Add comment for documentation
COMMENT ON COLUMN company_intelligence_sessions.phase IS 'Current phase of intelligence gathering (1-5): 1=Discovery, 2=Initial Scraping, 3=Deep Scraping, 4=Enrichment, 5=Complete';