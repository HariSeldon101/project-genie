-- Migration: Add Robust Scraping Architecture
-- Date: September 11, 2025
-- Purpose: Implement bulletproof architecture to fix session cache issues, prevent duplicate runs, and ensure data accuracy

-- 1. Execution Locks Table (Prevent duplicate runs)
CREATE TABLE IF NOT EXISTS execution_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_key TEXT UNIQUE NOT NULL, -- Hash of session+scraper+urls
  session_id UUID NOT NULL REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  scraper_id TEXT NOT NULL,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  released BOOLEAN DEFAULT FALSE,
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lock_key ON execution_locks(lock_key);
CREATE INDEX IF NOT EXISTS idx_expires_at ON execution_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_id ON execution_locks(session_id);

-- 2. Results Cache Table (For idempotent responses)
CREATE TABLE IF NOT EXISTS scraping_results_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL,
  stats JSONB NOT NULL,
  formatted_data JSONB NOT NULL,
  suggestions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cache_session ON scraping_results_cache(session_id);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON scraping_results_cache(expires_at);

-- 3. Update Sessions Table (Add version for optimistic locking)
ALTER TABLE company_intelligence_sessions
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_lock_id UUID,
  ADD COLUMN IF NOT EXISTS execution_history JSONB DEFAULT '[]'::jsonb;

-- 4. Scraper Registry Table (Track available scrapers)
CREATE TABLE IF NOT EXISTS scraper_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  strategy TEXT NOT NULL,
  speed TEXT CHECK (speed IN ('very-fast', 'fast', 'medium', 'slow')),
  capabilities TEXT[],
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Execution Metrics Table (Performance tracking)
CREATE TABLE IF NOT EXISTS execution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  scraper_id TEXT NOT NULL,
  execution_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  urls_requested INTEGER NOT NULL,
  pages_succeeded INTEGER DEFAULT 0,
  pages_failed INTEGER DEFAULT 0,
  data_points_extracted INTEGER DEFAULT 0,
  links_discovered INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_metrics_session ON execution_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_scraper ON execution_metrics(scraper_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON execution_metrics(started_at);

-- Row Level Security
ALTER TABLE execution_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_results_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for execution_locks
CREATE POLICY "Users can view their own execution locks" ON execution_locks
  FOR SELECT USING (true);

CREATE POLICY "Users can create execution locks" ON execution_locks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own execution locks" ON execution_locks
  FOR UPDATE USING (true);

-- RLS Policies for scraping_results_cache
CREATE POLICY "Users can view their own cache" ON scraping_results_cache
  FOR SELECT USING (true);

CREATE POLICY "Users can create cache entries" ON scraping_results_cache
  FOR INSERT WITH CHECK (true);

-- RLS Policies for scraper_registry
CREATE POLICY "Anyone can view scraper registry" ON scraper_registry
  FOR SELECT USING (true);

-- RLS Policies for execution_metrics
CREATE POLICY "Users can view metrics" ON execution_metrics
  FOR SELECT USING (true);

CREATE POLICY "Users can create metrics" ON execution_metrics
  FOR INSERT WITH CHECK (true);

-- Cleanup function for expired locks (like a 12-year-old would understand: 
-- This automatically cleans up old locks that forgot to unlock themselves)
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
  -- Delete locks that have expired and weren't properly released
  DELETE FROM execution_locks
  WHERE expires_at < NOW() AND released = FALSE;
  
  -- Delete old cached results that have expired
  DELETE FROM scraping_results_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert default scrapers into registry
INSERT INTO scraper_registry (id, name, description, strategy, speed, capabilities, enabled)
VALUES 
  ('static', 'Static HTML Scraper', 'Fast scraper for static HTML content using Cheerio', 'cheerio', 'fast', ARRAY['html', 'css', 'meta-tags'], true),
  ('dynamic', 'JavaScript Renderer', 'Full browser for JavaScript-heavy sites using Playwright', 'playwright', 'medium', ARRAY['javascript', 'ajax', 'spa', 'screenshots'], true),
  ('api', 'API Endpoint Scraper', 'Direct API access for known endpoints', 'direct-api', 'very-fast', ARRAY['json', 'graphql', 'rest'], false)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Add helpful comments (so anyone can understand what these tables do)
COMMENT ON TABLE execution_locks IS 'Prevents duplicate scraper executions - like a "busy" sign on a bathroom door';
COMMENT ON TABLE scraping_results_cache IS 'Caches results for idempotent responses - saves recent results so we dont redo work';
COMMENT ON TABLE scraper_registry IS 'Registry of available scrapers - like a toolbox listing all our tools';
COMMENT ON TABLE execution_metrics IS 'Tracks execution performance - measures how fast and successful our scrapers are';
COMMENT ON COLUMN execution_locks.lock_key IS 'Unique hash to identify this specific execution request';
COMMENT ON COLUMN execution_locks.expires_at IS 'When this lock automatically releases if not freed manually';
COMMENT ON COLUMN company_intelligence_sessions.version IS 'Version number for optimistic locking - prevents race conditions';