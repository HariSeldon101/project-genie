-- Create company_intelligence_sessions table
CREATE TABLE IF NOT EXISTS company_intelligence_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  phase INTEGER DEFAULT 1,
  merged_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ci_sessions_domain ON company_intelligence_sessions(domain);
CREATE INDEX IF NOT EXISTS idx_ci_sessions_status ON company_intelligence_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ci_sessions_created ON company_intelligence_sessions(created_at);

-- Enable RLS
ALTER TABLE company_intelligence_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view sessions" ON company_intelligence_sessions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create sessions" ON company_intelligence_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update sessions" ON company_intelligence_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete sessions" ON company_intelligence_sessions
  FOR DELETE USING (true);

-- Add helpful comment
COMMENT ON TABLE company_intelligence_sessions IS 'Tracks company intelligence scraping sessions for additive data collection';