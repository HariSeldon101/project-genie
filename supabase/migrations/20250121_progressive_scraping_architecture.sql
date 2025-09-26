-- ============================================
-- Progressive Scraping Architecture Migration
-- Date: 2025-01-21
-- Purpose: Add tables and columns for quality-driven progressive scraping
-- ============================================

-- ============================================
-- QUALITY METRICS IN SESSIONS
-- ============================================

ALTER TABLE company_intelligence_sessions
ADD COLUMN IF NOT EXISTS quality_metrics JSONB DEFAULT '{
  "fieldCoverage": 0,
  "contentDepth": 0,
  "dataFreshness": 0,
  "sourceQuality": 0,
  "overallScore": 0,
  "level": "low",
  "missingFields": [],
  "recommendations": []
}'::jsonb;

ALTER TABLE company_intelligence_sessions
ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{
  "total": 0,
  "byScraper": {},
  "byPhase": {},
  "projectedTotal": 0,
  "budgetRemaining": 0,
  "tier": "free"
}'::jsonb;

ALTER TABLE company_intelligence_sessions
ADD COLUMN IF NOT EXISTS session_config JSONB DEFAULT '{
  "maxBudget": 5.0,
  "targetQuality": 85,
  "preferredScrapers": [],
  "excludeScrapers": [],
  "timeout": 300000,
  "maxRetries": 3,
  "parallelLimit": 3
}'::jsonb;

-- ============================================
-- SCRAPING HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scraping_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  scraper_type TEXT NOT NULL CHECK (scraper_type IN ('static', 'dynamic', 'spa', 'api', 'firecrawl')),
  status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'complete', 'failed', 'skipped')),
  pages_scraped INTEGER DEFAULT 0,
  data_points INTEGER DEFAULT 0,
  discovered_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  extracted_data JSONB DEFAULT '{}'::jsonb,
  quality_contribution DECIMAL(5,2) DEFAULT 0.00,
  cost DECIMAL(10,4) DEFAULT 0.0000,
  duration_ms INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraping_history_session ON scraping_history(session_id);
CREATE INDEX IF NOT EXISTS idx_scraping_history_created ON scraping_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_history_scraper ON scraping_history(scraper_type);
CREATE INDEX IF NOT EXISTS idx_scraping_history_status ON scraping_history(status);

-- ============================================
-- QUALITY ASSESSMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS quality_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  assessment_time TIMESTAMPTZ DEFAULT NOW(),
  quality_score DECIMAL(5,2) NOT NULL,
  quality_level TEXT NOT NULL CHECK (quality_level IN ('low', 'medium', 'high', 'excellent')),
  field_coverage DECIMAL(5,2) NOT NULL,
  content_depth DECIMAL(5,2) NOT NULL,
  data_freshness INTEGER NOT NULL, -- hours
  source_quality DECIMAL(5,2) NOT NULL,
  missing_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_assessments_session ON quality_assessments(session_id);
CREATE INDEX IF NOT EXISTS idx_quality_assessments_time ON quality_assessments(assessment_time DESC);
CREATE INDEX IF NOT EXISTS idx_quality_assessments_score ON quality_assessments(quality_score);

-- ============================================
-- ROUTING DECISIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS routing_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  decision_time TIMESTAMPTZ DEFAULT NOW(),
  recommended_scraper TEXT NOT NULL,
  reason TEXT NOT NULL,
  alternative_scrapers TEXT[] DEFAULT ARRAY[]::TEXT[],
  estimated_quality_gain DECIMAL(5,2),
  estimated_cost DECIMAL(10,4),
  confidence TEXT CHECK (confidence IN ('certain', 'probable', 'possible', 'uncertain')),
  was_executed BOOLEAN DEFAULT FALSE,
  actual_quality_gain DECIMAL(5,2),
  actual_cost DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_routing_decisions_session ON routing_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_time ON routing_decisions(decision_time DESC);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_executed ON routing_decisions(was_executed);

-- ============================================
-- MERGED DATA CONFLICTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS data_conflicts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES company_intelligence_sessions(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  conflict_values JSONB NOT NULL,
  resolution_type TEXT CHECK (resolution_type IN ('manual', 'automatic', 'pending')),
  resolved_value JSONB,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_conflicts_session ON data_conflicts(session_id);
CREATE INDEX IF NOT EXISTS idx_data_conflicts_unresolved ON data_conflicts(session_id) WHERE resolution_type = 'pending';
CREATE INDEX IF NOT EXISTS idx_data_conflicts_field ON data_conflicts(field_name);

-- ============================================
-- PERFORMANCE METRICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scraping_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scraper_type TEXT NOT NULL,
  metric_date DATE DEFAULT CURRENT_DATE,
  pages_per_minute DECIMAL(10,2),
  data_points_per_page DECIMAL(10,2),
  error_rate DECIMAL(5,2),
  average_duration_ms INTEGER,
  success_rate DECIMAL(5,2),
  total_runs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for daily metrics per scraper
  UNIQUE(scraper_type, metric_date)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON scraping_performance_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_scraper ON scraping_performance_metrics(scraper_type);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update quality metrics after scraping
CREATE OR REPLACE FUNCTION update_session_quality_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate quality metrics based on scraping history
  UPDATE company_intelligence_sessions
  SET
    quality_metrics = (
      SELECT jsonb_build_object(
        'fieldCoverage', COALESCE(AVG(quality_contribution), 0),
        'overallScore', COALESCE(AVG(quality_contribution), 0),
        'level', CASE
          WHEN AVG(quality_contribution) >= 90 THEN 'excellent'
          WHEN AVG(quality_contribution) >= 70 THEN 'high'
          WHEN AVG(quality_contribution) >= 50 THEN 'medium'
          ELSE 'low'
        END
      )
      FROM scraping_history
      WHERE session_id = NEW.session_id
        AND status = 'complete'
    ),
    updated_at = NOW()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quality metrics
DROP TRIGGER IF EXISTS trigger_update_quality_metrics ON scraping_history;
CREATE TRIGGER trigger_update_quality_metrics
AFTER INSERT OR UPDATE ON scraping_history
FOR EACH ROW
EXECUTE FUNCTION update_session_quality_metrics();

-- Function to calculate cost breakdown
CREATE OR REPLACE FUNCTION update_session_cost_breakdown()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE company_intelligence_sessions
  SET
    cost_breakdown = (
      SELECT jsonb_build_object(
        'total', COALESCE(SUM(cost), 0),
        'byScraper', COALESCE(
          (SELECT jsonb_object_agg(scraper_type, total_cost)
           FROM (
             SELECT scraper_type, SUM(cost) as total_cost
             FROM scraping_history
             WHERE session_id = NEW.session_id
             GROUP BY scraper_type
           ) s
          ), '{}'::jsonb
        ),
        'tier', CASE
          WHEN COALESCE(SUM(cost), 0) = 0 THEN 'free'
          WHEN COALESCE(SUM(cost), 0) < 0.10 THEN 'cheap'
          WHEN COALESCE(SUM(cost), 0) < 1.00 THEN 'moderate'
          ELSE 'expensive'
        END
      )
      FROM scraping_history
      WHERE session_id = NEW.session_id
    ),
    updated_at = NOW()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cost breakdown
DROP TRIGGER IF EXISTS trigger_update_cost_breakdown ON scraping_history;
CREATE TRIGGER trigger_update_cost_breakdown
AFTER INSERT OR UPDATE ON scraping_history
FOR EACH ROW
EXECUTE FUNCTION update_session_cost_breakdown();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS trigger_update_updated_at_scraping_history ON scraping_history;
CREATE TRIGGER trigger_update_updated_at_scraping_history
BEFORE UPDATE ON scraping_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE scraping_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scraping_history
CREATE POLICY "Users can view their own scraping history"
  ON scraping_history FOR SELECT
  USING (session_id IN (
    SELECT id FROM company_intelligence_sessions
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role has full access to scraping history"
  ON scraping_history FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for quality_assessments
CREATE POLICY "Users can view their own quality assessments"
  ON quality_assessments FOR SELECT
  USING (session_id IN (
    SELECT id FROM company_intelligence_sessions
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role has full access to quality assessments"
  ON quality_assessments FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for routing_decisions
CREATE POLICY "Users can view their own routing decisions"
  ON routing_decisions FOR SELECT
  USING (session_id IN (
    SELECT id FROM company_intelligence_sessions
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role has full access to routing decisions"
  ON routing_decisions FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for data_conflicts
CREATE POLICY "Users can view their own data conflicts"
  ON data_conflicts FOR SELECT
  USING (session_id IN (
    SELECT id FROM company_intelligence_sessions
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can resolve their own data conflicts"
  ON data_conflicts FOR UPDATE
  USING (session_id IN (
    SELECT id FROM company_intelligence_sessions
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role has full access to data conflicts"
  ON data_conflicts FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for performance metrics (public read, service write)
CREATE POLICY "Anyone can view performance metrics"
  ON scraping_performance_metrics FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage performance metrics"
  ON scraping_performance_metrics FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sessions_quality_score
  ON company_intelligence_sessions ((quality_metrics->>'overallScore'));

CREATE INDEX IF NOT EXISTS idx_sessions_cost_total
  ON company_intelligence_sessions ((cost_breakdown->>'total'));

CREATE INDEX IF NOT EXISTS idx_sessions_quality_level
  ON company_intelligence_sessions ((quality_metrics->>'level'));

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE scraping_history IS 'Tracks all scraper executions with results and metrics';
COMMENT ON TABLE quality_assessments IS 'Stores quality assessment snapshots for sessions';
COMMENT ON TABLE routing_decisions IS 'Records smart routing decisions and their outcomes';
COMMENT ON TABLE data_conflicts IS 'Tracks conflicts between different data sources';
COMMENT ON TABLE scraping_performance_metrics IS 'Aggregated daily performance metrics per scraper';

COMMENT ON COLUMN scraping_history.quality_contribution IS 'Points added to overall quality score (0-100)';
COMMENT ON COLUMN scraping_history.cost IS 'Cost in USD for this scraping operation';
COMMENT ON COLUMN quality_assessments.data_freshness IS 'Hours since data was last updated';
COMMENT ON COLUMN routing_decisions.confidence IS 'Confidence level of the routing recommendation';
COMMENT ON COLUMN data_conflicts.resolution_type IS 'How the conflict was or will be resolved';