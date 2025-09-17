-- Migration: Add scraping passes tracking for multi-pass scraping
-- Date: 2025-09-09
-- Purpose: Track multiple scraping passes and their merge results

BEGIN;

-- Add migration metadata
INSERT INTO migrations (version, description, applied_at)
VALUES ('20250909001', 'Add scraping passes tracking for multi-pass scraping', NOW())
ON CONFLICT DO NOTHING;

-- Add scraping_passes column to company_intelligence_sessions
ALTER TABLE company_intelligence_sessions
ADD COLUMN IF NOT EXISTS scraping_passes JSONB DEFAULT '[]';

-- Create table for tracking individual scraping passes
CREATE TABLE IF NOT EXISTS scraping_passes (
  -- Standard fields
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Foreign keys
  session_id UUID REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pass information
  pass_number INTEGER NOT NULL,
  scraper_name TEXT NOT NULL,
  strategy_used TEXT NOT NULL,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Results
  pages_scraped INTEGER DEFAULT 0,
  pages_failed INTEGER DEFAULT 0,
  data_extracted JSONB DEFAULT '{}',
  
  -- Quality metrics
  content_length INTEGER,
  unique_data_points INTEGER,
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  errors JSONB DEFAULT '[]',
  
  -- Constraints
  CONSTRAINT unique_session_pass UNIQUE (session_id, pass_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraping_passes_session ON scraping_passes(session_id);
CREATE INDEX IF NOT EXISTS idx_scraping_passes_created ON scraping_passes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_passes_scraper ON scraping_passes(scraper_name);
CREATE INDEX IF NOT EXISTS idx_scraping_passes_strategy ON scraping_passes(strategy_used);

-- Create table for merged scraping results
CREATE TABLE IF NOT EXISTS scraping_merge_results (
  -- Standard fields
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Foreign keys
  session_id UUID REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Merge information
  total_passes INTEGER NOT NULL,
  passes_merged UUID[] NOT NULL, -- Array of scraping_passes IDs
  merge_strategy TEXT NOT NULL, -- 'highest_quality', 'latest', 'combine'
  
  -- Merged data
  merged_content TEXT,
  merged_structured JSONB DEFAULT '{}',
  merged_metadata JSONB DEFAULT '{}',
  
  -- Quality metrics
  quality_score DECIMAL(3,2),
  completeness_score DECIMAL(3,2),
  consistency_score DECIMAL(3,2),
  freshness_score DECIMAL(3,2),
  
  -- Statistics
  unique_data_points INTEGER,
  duplicate_data_points INTEGER,
  conflicting_data_points INTEGER,
  
  -- Data provenance
  sources JSONB DEFAULT '[]' -- Array of source information
);

-- Create indexes for merged results
CREATE INDEX IF NOT EXISTS idx_merge_results_session ON scraping_merge_results(session_id);
CREATE INDEX IF NOT EXISTS idx_merge_results_created ON scraping_merge_results(created_at DESC);

-- Add RLS policies for scraping_passes
ALTER TABLE scraping_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scraping passes"
  ON scraping_passes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scraping passes"
  ON scraping_passes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scraping passes"
  ON scraping_passes FOR UPDATE
  USING (auth.uid() = user_id);

-- Add RLS policies for scraping_merge_results
ALTER TABLE scraping_merge_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own merge results"
  ON scraping_merge_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own merge results"
  ON scraping_merge_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update scraping statistics
CREATE OR REPLACE FUNCTION update_scraping_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session with latest scraping stats
  UPDATE company_intelligence_sessions
  SET 
    updated_at = NOW(),
    scraping_passes = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'pass_number', pass_number,
          'scraper_name', scraper_name,
          'strategy_used', strategy_used,
          'pages_scraped', pages_scraped,
          'quality_score', quality_score,
          'duration_ms', duration_ms
        ) ORDER BY pass_number
      )
      FROM scraping_passes
      WHERE session_id = NEW.session_id
    )
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating statistics
CREATE TRIGGER update_scraping_stats_on_pass
  AFTER INSERT OR UPDATE ON scraping_passes
  FOR EACH ROW
  EXECUTE FUNCTION update_scraping_statistics();

-- Create trigger for updated_at
CREATE TRIGGER update_scraping_passes_updated_at
  BEFORE UPDATE ON scraping_passes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add function to get best scraping result for a session
CREATE OR REPLACE FUNCTION get_best_scraping_result(p_session_id UUID)
RETURNS TABLE (
  pass_id UUID,
  scraper_name TEXT,
  strategy_used TEXT,
  quality_score DECIMAL(3,2),
  pages_scraped INTEGER,
  duration_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as pass_id,
    sp.scraper_name,
    sp.strategy_used,
    sp.quality_score,
    sp.pages_scraped,
    sp.duration_ms
  FROM scraping_passes sp
  WHERE sp.session_id = p_session_id
  ORDER BY sp.quality_score DESC NULLS LAST, sp.pages_scraped DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMIT;