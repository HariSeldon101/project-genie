-- Create company intelligence packs table
CREATE TABLE IF NOT EXISTS company_intelligence_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  data JSONB NOT NULL,
  summary JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  data_quality TEXT CHECK (data_quality IN ('high', 'medium', 'low')),
  confidence JSONB,
  sources TEXT[],
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  cache_ttl INTEGER DEFAULT 604800,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create research jobs table
CREATE TABLE IF NOT EXISTS research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'researching', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  request JSONB NOT NULL,
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  pages_scraped INTEGER,
  cost_usd NUMERIC(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_company_packs_domain ON company_intelligence_packs(domain);
CREATE INDEX idx_company_packs_project ON company_intelligence_packs(project_id);
CREATE INDEX idx_research_jobs_status ON research_jobs(status);
CREATE INDEX idx_research_jobs_domain ON research_jobs(domain);

-- Add RLS policies
ALTER TABLE company_intelligence_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_jobs ENABLE ROW LEVEL SECURITY;

-- Policy for company_intelligence_packs
CREATE POLICY "Users can view their own company packs" ON company_intelligence_packs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create company packs" ON company_intelligence_packs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own company packs" ON company_intelligence_packs
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy for research_jobs
CREATE POLICY "Users can view all research jobs" ON research_jobs
  FOR SELECT USING (true);

CREATE POLICY "Users can create research jobs" ON research_jobs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update research jobs" ON research_jobs
  FOR UPDATE USING (true);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_packs_updated_at
  BEFORE UPDATE ON company_intelligence_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_research_jobs_updated_at
  BEFORE UPDATE ON research_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add comment for documentation
COMMENT ON TABLE company_intelligence_packs IS 'Stores comprehensive company research data generated from web scraping';
COMMENT ON TABLE research_jobs IS 'Tracks the status and metrics of company research operations';