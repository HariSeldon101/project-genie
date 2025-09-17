-- Create research sessions table for saving and loading company intelligence research
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  
  -- Core data
  scraped_data JSONB,
  stage_reviews JSONB,
  enrichment_data JSONB,
  
  -- Configuration
  config JSONB DEFAULT '{}',
  scraper_options JSONB DEFAULT '{}',
  model_settings JSONB DEFAULT '{}',
  
  -- Metadata
  stage TEXT DEFAULT 'discovery' CHECK (stage IN ('discovery', 'scraping', 'review', 'enrichment', 'export', 'completed')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  pages_scraped INTEGER DEFAULT 0,
  duration_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Ensure unique session names per user
  CONSTRAINT unique_session_name_per_user UNIQUE(user_id, session_name)
);

-- Create indexes for performance
CREATE INDEX idx_research_sessions_user_id ON research_sessions(user_id);
CREATE INDEX idx_research_sessions_domain ON research_sessions(domain);
CREATE INDEX idx_research_sessions_status ON research_sessions(status);
CREATE INDEX idx_research_sessions_created_at ON research_sessions(created_at DESC);

-- Create session logs table for debugging
CREATE TABLE IF NOT EXISTS research_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  level TEXT CHECK (level IN ('debug', 'info', 'warn', 'error')),
  category TEXT,
  message TEXT,
  metadata JSONB
);

-- Create indexes for logs
CREATE INDEX idx_session_logs_session_id ON research_session_logs(session_id);
CREATE INDEX idx_session_logs_timestamp ON research_session_logs(timestamp DESC);
CREATE INDEX idx_session_logs_level ON research_session_logs(level);

-- Enable Row Level Security
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_session_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for research_sessions
CREATE POLICY "Users can view their own sessions"
  ON research_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON research_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON research_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON research_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for research_session_logs
CREATE POLICY "Users can view logs for their sessions"
  ON research_session_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM research_sessions
      WHERE research_sessions.id = research_session_logs.session_id
      AND research_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create logs for their sessions"
  ON research_session_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM research_sessions
      WHERE research_sessions.id = research_session_logs.session_id
      AND research_sessions.user_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_research_sessions_updated_at
  BEFORE UPDATE ON research_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE research_sessions IS 'Stores company intelligence research sessions for save/load functionality';
COMMENT ON TABLE research_session_logs IS 'Stores debug logs for research sessions';
COMMENT ON COLUMN research_sessions.stage IS 'Current stage in the research process';
COMMENT ON COLUMN research_sessions.status IS 'Overall status of the research session';
COMMENT ON COLUMN research_sessions.scraped_data IS 'Raw scraped data from websites';
COMMENT ON COLUMN research_sessions.stage_reviews IS 'User review decisions at each stage';
COMMENT ON COLUMN research_sessions.enrichment_data IS 'AI-enriched data and analysis';