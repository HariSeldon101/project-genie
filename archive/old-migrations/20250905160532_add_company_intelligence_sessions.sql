-- Create research sessions table for phase-based execution
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'awaiting_review', 'completed', 'failed', 'aborted')),
  current_phase TEXT CHECK (current_phase IN ('scraping', 'extraction', 'enrichment', 'generation', NULL)),
  completed_phases TEXT[] DEFAULT '{}',
  
  -- Store phase results as JSONB
  phase_results JSONB DEFAULT '{}'::jsonb,
  
  -- Configuration
  config JSONB NOT NULL,
  
  -- Metrics
  metrics JSONB DEFAULT '{
    "startedAt": null,
    "updatedAt": null,
    "completedAt": null,
    "phaseDurations": {},
    "totalCost": 0,
    "llmCalls": 0,
    "errors": []
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Create phase results table for detailed tracking
CREATE TABLE IF NOT EXISTS research_phase_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('scraping', 'extraction', 'enrichment', 'generation')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  
  -- Data storage
  data JSONB NOT NULL,
  
  -- Metrics
  duration_ms INTEGER,
  items_processed INTEGER,
  llm_calls INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  
  -- Quality tracking
  quality_score NUMERIC(3, 2) CHECK (quality_score >= 0 AND quality_score <= 1),
  errors JSONB DEFAULT '[]'::jsonb,
  warnings TEXT[] DEFAULT '{}',
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, phase)
);

-- Create approval gates table
CREATE TABLE IF NOT EXISTS research_approval_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('scraping', 'extraction', 'enrichment', 'generation')),
  
  -- Approval status
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Auto-approval tracking
  auto_approval_threshold NUMERIC(3, 2),
  quality_score NUMERIC(3, 2),
  
  -- User feedback
  rejection_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_research_sessions_user_id ON research_sessions(user_id);
CREATE INDEX idx_research_sessions_domain ON research_sessions(domain);
CREATE INDEX idx_research_sessions_status ON research_sessions(status);
CREATE INDEX idx_research_sessions_expires_at ON research_sessions(expires_at);
CREATE INDEX idx_phase_results_session_id ON research_phase_results(session_id);
CREATE INDEX idx_approval_gates_session_id ON research_approval_gates(session_id);

-- Enable RLS
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_phase_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_approval_gates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own research sessions" ON research_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own phase results" ON research_phase_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM research_sessions
      WHERE research_sessions.id = research_phase_results.session_id
      AND research_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own approval gates" ON research_approval_gates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM research_sessions
      WHERE research_sessions.id = research_approval_gates.session_id
      AND research_sessions.user_id = auth.uid()
    )
  );

-- Add cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM research_sessions
  WHERE expires_at < NOW()
  AND status NOT IN ('completed', 'aborted');
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions();');