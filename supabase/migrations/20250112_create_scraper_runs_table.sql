-- Migration: Create scraper_runs table for tracking individual scraper executions
-- Purpose: Proper persistence and tracking of scraper runs with optimized queries
-- Author: Claude
-- Date: 2025-01-12

-- Create scraper_runs table
CREATE TABLE IF NOT EXISTS scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  scraper_id TEXT NOT NULL,
  scraper_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  pages_scraped INTEGER DEFAULT 0,
  data_points INTEGER DEFAULT 0,
  discovered_links INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('running', 'complete', 'failed')) DEFAULT 'running',
  error_message TEXT,
  extracted_data JSONB DEFAULT '{}',
  event_id TEXT UNIQUE, -- For deduplication
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraper_runs_session ON scraper_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_status ON scraper_runs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_event ON scraper_runs(event_id);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_created ON scraper_runs(created_at DESC);

-- Enable RLS
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scraper runs"
  ON scraper_runs FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM company_intelligence_sessions 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own scraper runs"
  ON scraper_runs FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM company_intelligence_sessions 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own scraper runs"
  ON scraper_runs FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM company_intelligence_sessions 
      WHERE user_id = auth.uid()
    )
  );

-- Function to get session statistics with scraper runs
CREATE OR REPLACE FUNCTION get_session_statistics(p_session_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_runs', COUNT(*),
    'pages_scraped', COALESCE(SUM(pages_scraped), 0),
    'data_points', COALESCE(SUM(data_points), 0),
    'discovered_links', COALESCE(SUM(discovered_links), 0),
    'scraper_ids', COALESCE(array_agg(DISTINCT scraper_id) FILTER (WHERE scraper_id IS NOT NULL), ARRAY[]::TEXT[]),
    'last_run', MAX(completed_at),
    'successful_runs', COUNT(*) FILTER (WHERE status = 'complete'),
    'failed_runs', COUNT(*) FILTER (WHERE status = 'failed'),
    'running_runs', COUNT(*) FILTER (WHERE status = 'running')
  ) INTO result
  FROM scraper_runs
  WHERE session_id = p_session_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get detailed scraper history
CREATE OR REPLACE FUNCTION get_scraper_history(p_session_id UUID)
RETURNS TABLE (
  id UUID,
  scraper_id TEXT,
  scraper_name TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  pages_scraped INTEGER,
  data_points INTEGER,
  discovered_links INTEGER,
  status TEXT,
  duration_seconds INTEGER,
  extracted_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.scraper_id,
    sr.scraper_name,
    sr.started_at,
    sr.completed_at,
    sr.pages_scraped,
    sr.data_points,
    sr.discovered_links,
    sr.status,
    CASE 
      WHEN sr.completed_at IS NOT NULL AND sr.started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (sr.completed_at - sr.started_at))::INTEGER
      ELSE NULL
    END as duration_seconds,
    sr.extracted_data
  FROM scraper_runs sr
  WHERE sr.session_id = p_session_id
  ORDER BY sr.started_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scraper_runs_updated_at
  BEFORE UPDATE ON scraper_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment for documentation
COMMENT ON TABLE scraper_runs IS 'Tracks individual scraper executions within company intelligence sessions';
COMMENT ON COLUMN scraper_runs.event_id IS 'Unique event ID for deduplication of SSE events';
COMMENT ON COLUMN scraper_runs.extracted_data IS 'JSON data extracted by the scraper (titles, descriptions, etc.)';
COMMENT ON FUNCTION get_session_statistics IS 'Returns aggregated statistics for a scraping session';
COMMENT ON FUNCTION get_scraper_history IS 'Returns detailed history of scraper runs for a session';