-- ============================================================================
-- CLEAN COMPANY INTELLIGENCE SCHEMA - BULLETPROOF ARCHITECTURE
-- Date: September 11, 2025
-- Purpose: Implement the EXACT schema required by the bulletproof architecture
--          from company-intelligence-full-new-strategy-11-sept-2025.md
--
-- IMPORTANT: This migration:
-- 1. Drops ALL old conflicting tables (dev data only)
-- 2. Creates the single source of truth schema
-- 3. Implements all supporting tables for bulletproof architecture
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DROP ALL OLD CONFLICTING TABLES
-- ============================================================================

-- Drop all the old, conflicting tables and their dependencies
DROP TABLE IF EXISTS research_session_logs CASCADE;
DROP TABLE IF EXISTS research_sessions CASCADE;
DROP TABLE IF EXISTS research_phase_results CASCADE;
DROP TABLE IF EXISTS research_approval_gates CASCADE;
DROP TABLE IF EXISTS scraping_passes CASCADE;
DROP TABLE IF EXISTS scraping_merge_results CASCADE;
DROP TABLE IF EXISTS company_intelligence_packs CASCADE;
DROP TABLE IF EXISTS research_jobs CASCADE;

-- Drop existing tables that will be recreated with correct schema
DROP TABLE IF EXISTS execution_locks CASCADE;
DROP TABLE IF EXISTS scraping_results_cache CASCADE;
DROP TABLE IF EXISTS execution_metrics CASCADE;
DROP TABLE IF EXISTS scraper_registry CASCADE;
DROP TABLE IF EXISTS company_intelligence_sessions CASCADE;

-- ============================================================================
-- STEP 2: CREATE THE CORE TABLE - company_intelligence_sessions
-- This is the SINGLE SOURCE OF TRUTH for all session data
-- ============================================================================

CREATE TABLE company_intelligence_sessions (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Company information
  company_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  
  -- Session status tracking
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'paused', 'completed', 'failed', 'aborted')),
  
  -- CRITICAL: URLs discovered during sitemap stage (database-first architecture)
  discovered_urls JSONB DEFAULT '[]'::jsonb,
  
  -- CRITICAL: Merged data from all scraping runs (additive architecture)
  merged_data JSONB DEFAULT '{
    "stats": {
      "totalPages": 0,
      "dataPoints": 0,
      "totalLinks": 0,
      "phaseCounts": {}
    },
    "pages": {},
    "extractedData": {}
  }'::jsonb,
  
  -- Version for optimistic locking (prevent race conditions)
  version INTEGER DEFAULT 0 NOT NULL,
  
  -- Execution tracking
  last_lock_id UUID,
  execution_history JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_user_domain UNIQUE(user_id, domain)
);

-- Indexes for performance
CREATE INDEX idx_ci_sessions_user_id ON company_intelligence_sessions(user_id);
CREATE INDEX idx_ci_sessions_domain ON company_intelligence_sessions(domain);
CREATE INDEX idx_ci_sessions_status ON company_intelligence_sessions(status);
CREATE INDEX idx_ci_sessions_created_at ON company_intelligence_sessions(created_at DESC);

-- ============================================================================
-- STEP 3: CREATE EXECUTION LOCKS TABLE
-- Prevents duplicate scraper runs (traffic light system)
-- ============================================================================

CREATE TABLE execution_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lock identification
  lock_key TEXT UNIQUE NOT NULL, -- Hash of session+scraper+urls
  session_id UUID NOT NULL REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  scraper_id TEXT NOT NULL,
  
  -- Lock timing
  acquired_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, -- Auto-expire after 30 seconds
  released BOOLEAN DEFAULT FALSE,
  released_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for lock management
CREATE INDEX idx_lock_key ON execution_locks(lock_key);
CREATE INDEX idx_lock_expires ON execution_locks(expires_at);
CREATE INDEX idx_lock_session ON execution_locks(session_id);

-- ============================================================================
-- STEP 4: CREATE RESULTS CACHE TABLE
-- For idempotent responses (same request = same response)
-- ============================================================================

CREATE TABLE scraping_results_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cache identification
  session_id UUID NOT NULL REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL,
  
  -- Cached data
  stats JSONB NOT NULL,
  formatted_data JSONB NOT NULL,
  suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- Cache management
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL -- 5 minute cache
);

-- Indexes for cache lookup
CREATE INDEX idx_cache_session ON scraping_results_cache(session_id);
CREATE INDEX idx_cache_execution ON scraping_results_cache(execution_id);
CREATE INDEX idx_cache_expires ON scraping_results_cache(expires_at);

-- ============================================================================
-- STEP 5: CREATE SCRAPER REGISTRY TABLE
-- Tracks available scrapers and their capabilities
-- ============================================================================

CREATE TABLE scraper_registry (
  id TEXT PRIMARY KEY, -- e.g., 'static', 'dynamic'
  
  -- Scraper information
  name TEXT NOT NULL, -- e.g., 'Static HTML Scraper'
  description TEXT,
  strategy TEXT NOT NULL, -- e.g., 'cheerio', 'playwright'
  
  -- Performance characteristics
  speed TEXT CHECK (speed IN ('very-fast', 'fast', 'medium', 'slow')),
  capabilities TEXT[], -- e.g., ['html', 'javascript', 'cookies']
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default scrapers
INSERT INTO scraper_registry (id, name, description, strategy, speed, capabilities) VALUES
  ('static', 'Static HTML Scraper', 'Fast HTML extraction using Cheerio', 'cheerio', 'fast', ARRAY['html', 'static']),
  ('dynamic', 'JavaScript Renderer', 'Full browser rendering with Playwright', 'playwright', 'medium', ARRAY['javascript', 'dynamic', 'cookies']);

-- ============================================================================
-- STEP 6: CREATE EXECUTION METRICS TABLE
-- Track performance and success rates
-- ============================================================================

CREATE TABLE execution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Execution identification
  execution_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  scraper_id TEXT NOT NULL,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Results
  url_count INTEGER NOT NULL,
  pages_scraped INTEGER DEFAULT 0,
  data_points INTEGER DEFAULT 0,
  
  -- Status
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for analytics
CREATE INDEX idx_metrics_session ON execution_metrics(session_id);
CREATE INDEX idx_metrics_scraper ON execution_metrics(scraper_id);
CREATE INDEX idx_metrics_date ON execution_metrics(started_at DESC);

-- ============================================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE company_intelligence_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_results_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: CREATE RLS POLICIES
-- ============================================================================

-- Policies for company_intelligence_sessions
CREATE POLICY "Users can view their own sessions" ON company_intelligence_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON company_intelligence_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON company_intelligence_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON company_intelligence_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for execution_locks (users can see all locks for transparency)
CREATE POLICY "Anyone can view locks" ON execution_locks
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create locks" ON execution_locks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update locks" ON execution_locks
  FOR UPDATE USING (true);

-- Policies for scraping_results_cache
CREATE POLICY "Users can view their own cache" ON scraping_results_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_intelligence_sessions
      WHERE company_intelligence_sessions.id = scraping_results_cache.session_id
      AND company_intelligence_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cache for their sessions" ON scraping_results_cache
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_intelligence_sessions
      WHERE company_intelligence_sessions.id = scraping_results_cache.session_id
      AND company_intelligence_sessions.user_id = auth.uid()
    )
  );

-- Policies for scraper_registry (read-only for all users)
CREATE POLICY "Anyone can view scrapers" ON scraper_registry
  FOR SELECT USING (true);

-- Policies for execution_metrics
CREATE POLICY "Users can view their own metrics" ON execution_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_intelligence_sessions
      WHERE company_intelligence_sessions.id = execution_metrics.session_id
      AND company_intelligence_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create metrics for their sessions" ON execution_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_intelligence_sessions
      WHERE company_intelligence_sessions.id = execution_metrics.session_id
      AND company_intelligence_sessions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 9: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic updated_at
CREATE TRIGGER update_ci_sessions_updated_at
  BEFORE UPDATE ON company_intelligence_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scraper_registry_updated_at
  BEFORE UPDATE ON scraper_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to clean expired locks (auto-cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM execution_locks
  WHERE expires_at < NOW()
  AND released = FALSE;
  
  DELETE FROM scraping_results_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 10: ADD TABLE COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE company_intelligence_sessions IS 
  'Core table for company intelligence scraping sessions. Single source of truth for all session data.';

COMMENT ON COLUMN company_intelligence_sessions.discovered_urls IS 
  'CRITICAL: URLs discovered during sitemap stage. Database is single source of truth - UI never passes URLs.';

COMMENT ON COLUMN company_intelligence_sessions.merged_data IS 
  'Aggregated data from all scraping runs using additive architecture. Contains stats, pages, and extracted data.';

COMMENT ON COLUMN company_intelligence_sessions.version IS 
  'Optimistic locking version to prevent race conditions during concurrent updates.';

COMMENT ON TABLE execution_locks IS 
  'Prevents duplicate scraper executions. Acts as traffic light system - only one execution per session+scraper combination.';

COMMENT ON TABLE scraping_results_cache IS 
  'Provides idempotent responses. Same request returns same cached result within TTL window.';

COMMENT ON TABLE scraper_registry IS 
  'Registry of available scrapers and their capabilities. Used for dynamic scraper selection.';

COMMENT ON TABLE execution_metrics IS 
  'Performance tracking for all scraper executions. Used for analytics and optimization.';

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- The database now has a clean, single source of truth schema
-- that fully implements the bulletproof architecture
-- ============================================================================