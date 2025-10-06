-- Migration: add_page_intelligence_table
-- Description: Creates table for storing page intelligence classification results
-- Author: Claude
-- Date: 2025-09-06

-- Create page_intelligence table for storing page classification results
CREATE TABLE page_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN (
    'homepage', 'about', 'team', 'contact', 'blog', 'blog_post', 'product', 
    'product_listing', 'service', 'pricing', 'faq', 'support', 'careers', 
    'news', 'press', 'legal', 'privacy', 'terms', 'case_study', 'testimonial', 
    'portfolio', 'documentation', 'download', 'login', 'signup', 'unknown'
  )),
  confidence_score NUMERIC(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Classification evidence
  classification_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Extracted data
  structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Analysis metadata
  processing_time_ms INTEGER NOT NULL DEFAULT 0,
  analysis_errors TEXT[],
  analysis_warnings TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_page_intelligence_session_id ON page_intelligence(session_id);
CREATE INDEX idx_page_intelligence_url ON page_intelligence(url);
CREATE INDEX idx_page_intelligence_page_type ON page_intelligence(page_type);
CREATE INDEX idx_page_intelligence_confidence ON page_intelligence(confidence_score DESC);
CREATE INDEX idx_page_intelligence_created_at ON page_intelligence(created_at DESC);

-- Create composite index for common queries
CREATE INDEX idx_page_intelligence_session_type ON page_intelligence(session_id, page_type);

-- GIN index for JSON data searches
CREATE INDEX idx_page_intelligence_classification_data ON page_intelligence USING GIN(classification_data);
CREATE INDEX idx_page_intelligence_structured_data ON page_intelligence USING GIN(structured_data);
CREATE INDEX idx_page_intelligence_meta_data ON page_intelligence USING GIN(meta_data);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_page_intelligence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_page_intelligence_updated_at
  BEFORE UPDATE ON page_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION update_page_intelligence_updated_at();

-- Add RLS (Row Level Security)
ALTER TABLE page_intelligence ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see page intelligence data from their own research sessions
CREATE POLICY "Users can view own page intelligence data" ON page_intelligence
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM research_sessions WHERE user_id = auth.uid()
    )
  );

-- Users can insert page intelligence data for their own sessions
CREATE POLICY "Users can insert own page intelligence data" ON page_intelligence
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM research_sessions WHERE user_id = auth.uid()
    )
  );

-- Users can update page intelligence data for their own sessions
CREATE POLICY "Users can update own page intelligence data" ON page_intelligence
  FOR UPDATE USING (
    session_id IN (
      SELECT id FROM research_sessions WHERE user_id = auth.uid()
    )
  );

-- Users can delete page intelligence data for their own sessions
CREATE POLICY "Users can delete own page intelligence data" ON page_intelligence
  FOR DELETE USING (
    session_id IN (
      SELECT id FROM research_sessions WHERE user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE page_intelligence IS 'Stores page intelligence classification results and extracted data from web pages';
COMMENT ON COLUMN page_intelligence.page_type IS 'Classification type of the page (homepage, blog, product, etc.)';
COMMENT ON COLUMN page_intelligence.confidence_score IS 'Confidence score for the classification (0.0 to 1.0)';
COMMENT ON COLUMN page_intelligence.classification_data IS 'Evidence used for classification including URL patterns and content signals';
COMMENT ON COLUMN page_intelligence.structured_data IS 'Extracted structured data (JSON-LD, microdata, etc.)';
COMMENT ON COLUMN page_intelligence.meta_data IS 'Extracted meta tag data (title, description, OpenGraph, etc.)';
COMMENT ON COLUMN page_intelligence.processing_time_ms IS 'Time taken to analyze the page in milliseconds';

-- Add a view for easy querying with session details
CREATE VIEW page_intelligence_with_session AS
SELECT 
  pi.id,
  pi.url,
  pi.page_type,
  pi.confidence_score,
  pi.classification_data,
  pi.structured_data,
  pi.meta_data,
  pi.processing_time_ms,
  pi.analysis_errors,
  pi.analysis_warnings,
  pi.created_at,
  pi.updated_at,
  rs.domain,
  rs.session_name,
  rs.user_id
FROM page_intelligence pi
JOIN research_sessions rs ON pi.session_id = rs.id;

-- Add RLS to the view
ALTER VIEW page_intelligence_with_session SET (security_invoker = on);

-- Grant necessary permissions
GRANT SELECT ON page_intelligence TO authenticated;
GRANT INSERT ON page_intelligence TO authenticated;
GRANT UPDATE ON page_intelligence TO authenticated;
GRANT DELETE ON page_intelligence TO authenticated;
GRANT SELECT ON page_intelligence_with_session TO authenticated;