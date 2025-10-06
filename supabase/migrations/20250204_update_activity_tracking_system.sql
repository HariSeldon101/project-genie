-- Migration: Update Activity Tracking System
-- Purpose: Add missing columns and create the user_activity_stats view
-- Author: Project Genie Team
-- Date: 2025-02-04

-- ============================================
-- UPDATE ACTIVITY LOG TABLE
-- ============================================
-- The table already exists, just need to add metadata column if missing
-- and update entity_id to be text (currently uuid)

-- Add metadata column if it doesn't exist (for backwards compatibility)
ALTER TABLE activity_log
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Change entity_id from uuid to text to support various ID types
ALTER TABLE activity_log
ALTER COLUMN entity_id TYPE text USING entity_id::text;

-- Add missing constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'valid_action'
        AND conrelid = 'activity_log'::regclass
    ) THEN
        ALTER TABLE activity_log
        ADD CONSTRAINT valid_action CHECK (action IS NOT NULL AND action != '');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'valid_user'
        AND conrelid = 'activity_log'::regclass
    ) THEN
        ALTER TABLE activity_log
        ADD CONSTRAINT valid_user CHECK (user_id IS NOT NULL);
    END IF;
END $$;

-- Create indexes for performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_metadata ON activity_log USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_activity_log_details ON activity_log USING GIN(details);

-- Enable Row Level Security
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own activity" ON activity_log;
DROP POLICY IF EXISTS "Admins can view all activity" ON activity_log;
DROP POLICY IF EXISTS "System can insert activity" ON activity_log;

-- RLS Policies for activity_log
CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" ON activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "System can insert activity" ON activity_log
  FOR INSERT WITH CHECK (true); -- Service role only

-- ============================================
-- USER ACTIVITY STATS VIEW
-- ============================================
-- Drop the view if it exists and recreate it
DROP VIEW IF EXISTS user_activity_stats;

CREATE OR REPLACE VIEW user_activity_stats AS
WITH scrape_stats AS (
  SELECT
    user_id,
    COUNT(*) as total_scrapes,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_scrapes,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_scrapes,
    MAX(created_at) as last_scrape_at,
    COUNT(DISTINCT domain) as unique_domains
  FROM company_intelligence_sessions
  GROUP BY user_id
),
document_stats AS (
  SELECT
    created_by as user_id,
    COUNT(*) as total_documents,
    COUNT(DISTINCT type) as document_types,
    MAX(created_at) as last_document_at,
    SUM(CASE WHEN version > 1 THEN 1 ELSE 0 END) as revised_documents
  FROM artifacts
  GROUP BY created_by
),
activity_stats AS (
  SELECT
    user_id,
    COUNT(*) as total_activities,
    COUNT(DISTINCT action) as unique_actions,
    MAX(created_at) as last_activity_at,
    COUNT(DISTINCT DATE(created_at)) as active_days
  FROM activity_log
  WHERE created_at > now() - interval '30 days'
  GROUP BY user_id
)
SELECT
  p.*,
  COALESCE(s.total_scrapes, 0) as scrape_count,
  COALESCE(s.completed_scrapes, 0) as completed_scrapes,
  COALESCE(s.failed_scrapes, 0) as failed_scrapes,
  COALESCE(s.unique_domains, 0) as unique_domains,
  s.last_scrape_at,
  COALESCE(d.total_documents, 0) as document_count,
  COALESCE(d.document_types, 0) as document_types_count,
  COALESCE(d.revised_documents, 0) as revised_documents,
  d.last_document_at,
  COALESCE(a.total_activities, 0) as activity_count_30d,
  COALESCE(a.unique_actions, 0) as unique_actions_30d,
  COALESCE(a.active_days, 0) as active_days_30d,
  a.last_activity_at,
  -- Calculate engagement score (0-100)
  LEAST(
    100,
    COALESCE(s.total_scrapes, 0) * 2 +
    COALESCE(d.total_documents, 0) * 5 +
    COALESCE(a.active_days, 0) * 3
  ) as engagement_score
FROM profiles p
LEFT JOIN scrape_stats s ON s.user_id = p.id
LEFT JOIN document_stats d ON d.user_id = p.id
LEFT JOIN activity_stats a ON a.user_id = p.id;

-- Create a comment for documentation
COMMENT ON VIEW user_activity_stats IS 'Comprehensive user statistics including scraping, documents, and activity metrics';

-- ============================================
-- ACTIVITY TRACKING FUNCTION
-- ============================================
-- Function to automatically log activities
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
) RETURNS void AS $$
BEGIN
  INSERT INTO activity_log (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata,
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUTOMATIC ACTIVITY TRIGGERS
-- ============================================
-- Trigger to log scraping activities
CREATE OR REPLACE FUNCTION log_scrape_activity() RETURNS trigger AS $$
BEGIN
  -- Log when a new scraping session starts
  IF TG_OP = 'INSERT' THEN
    PERFORM log_user_activity(
      NEW.user_id,
      'scrape_started',
      'company_intelligence_session',
      NEW.id::text,
      jsonb_build_object(
        'company_name', NEW.company_name,
        'domain', NEW.domain,
        'status', NEW.status
      )
    );
  -- Log when scraping session status changes
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_user_activity(
      NEW.user_id,
      'scrape_' || NEW.status,
      'company_intelligence_session',
      NEW.id::text,
      jsonb_build_object(
        'company_name', NEW.company_name,
        'domain', NEW.domain,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for scraping activities
DROP TRIGGER IF EXISTS trigger_log_scrape_activity ON company_intelligence_sessions;
CREATE TRIGGER trigger_log_scrape_activity
  AFTER INSERT OR UPDATE ON company_intelligence_sessions
  FOR EACH ROW EXECUTE FUNCTION log_scrape_activity();

-- Trigger to log document activities
CREATE OR REPLACE FUNCTION log_document_activity() RETURNS trigger AS $$
BEGIN
  -- Log when a new document is created
  IF TG_OP = 'INSERT' THEN
    PERFORM log_user_activity(
      NEW.created_by,
      'document_created',
      'artifact',
      NEW.id::text,
      jsonb_build_object(
        'title', NEW.title,
        'type', NEW.type,
        'version', NEW.version
      )
    );
  -- Log when document is updated
  ELSIF TG_OP = 'UPDATE' AND OLD.updated_at IS DISTINCT FROM NEW.updated_at THEN
    PERFORM log_user_activity(
      NEW.created_by,
      'document_updated',
      'artifact',
      NEW.id::text,
      jsonb_build_object(
        'title', NEW.title,
        'type', NEW.type,
        'version', NEW.version,
        'changes', CASE
          WHEN OLD.version != NEW.version THEN 'version_change'
          WHEN OLD.title != NEW.title THEN 'title_change'
          ELSE 'content_change'
        END
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document activities
DROP TRIGGER IF EXISTS trigger_log_document_activity ON artifacts;
CREATE TRIGGER trigger_log_document_activity
  AFTER INSERT OR UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION log_document_activity();

-- ============================================
-- MIGRATE EXISTING DATA FROM details TO metadata
-- ============================================
-- If there's existing data in details column, copy it to metadata
UPDATE activity_log
SET metadata = details
WHERE metadata = '{}'
AND details IS NOT NULL
AND details != '{}';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON user_activity_stats TO anon, authenticated;
GRANT SELECT ON activity_log TO authenticated;
GRANT INSERT ON activity_log TO service_role;
GRANT EXECUTE ON FUNCTION log_user_activity TO service_role, authenticated;