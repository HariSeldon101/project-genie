-- Add Missing Indexes for Performance Optimization
-- Performance Advisory: Missing indexes on foreign keys cause slow queries

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projects_owner_id 
  ON projects(owner_id);

COMMENT ON INDEX idx_projects_owner_id IS 'Index for faster owner-based project lookups';

-- ============================================
-- ARTIFACTS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_artifacts_project_id 
  ON artifacts(project_id);

CREATE INDEX IF NOT EXISTS idx_artifacts_created_by 
  ON artifacts(created_by);

CREATE INDEX IF NOT EXISTS idx_artifacts_project_type 
  ON artifacts(project_id, type);

COMMENT ON INDEX idx_artifacts_project_id IS 'Index for faster project-based artifact lookups';
COMMENT ON INDEX idx_artifacts_created_by IS 'Index for creator-based queries';
COMMENT ON INDEX idx_artifacts_project_type IS 'Composite index for project and type filtering';

-- ============================================
-- PROJECT_MEMBERS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_members_project_id 
  ON project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user_id 
  ON project_members(user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user_project 
  ON project_members(user_id, project_id);

COMMENT ON INDEX idx_project_members_project_id IS 'Index for finding all members of a project';
COMMENT ON INDEX idx_project_members_user_id IS 'Index for finding all projects of a user';
COMMENT ON INDEX idx_project_members_user_project IS 'Composite index for membership checks';

-- ============================================
-- BUG_REPORTS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id 
  ON bug_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_bug_reports_project_id 
  ON bug_reports(project_id) 
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bug_reports_status 
  ON bug_reports(status);

CREATE INDEX IF NOT EXISTS idx_bug_reports_severity 
  ON bug_reports(severity);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status_severity 
  ON bug_reports(status, severity);

COMMENT ON INDEX idx_bug_reports_user_id IS 'Index for user-specific bug reports';
COMMENT ON INDEX idx_bug_reports_project_id IS 'Partial index for project-specific bugs';
COMMENT ON INDEX idx_bug_reports_status IS 'Index for status filtering';
COMMENT ON INDEX idx_bug_reports_severity IS 'Index for severity filtering';
COMMENT ON INDEX idx_bug_reports_status_severity IS 'Composite index for status and severity filtering';

-- ============================================
-- GENERATION_ANALYTICS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_generation_analytics_user_id 
  ON generation_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_generation_analytics_project_id 
  ON generation_analytics(project_id);

CREATE INDEX IF NOT EXISTS idx_generation_analytics_document_type 
  ON generation_analytics(document_type);

CREATE INDEX IF NOT EXISTS idx_generation_analytics_created_at 
  ON generation_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_analytics_user_date 
  ON generation_analytics(user_id, created_at DESC);

COMMENT ON INDEX idx_generation_analytics_user_id IS 'Index for user analytics queries';
COMMENT ON INDEX idx_generation_analytics_project_id IS 'Index for project analytics';
COMMENT ON INDEX idx_generation_analytics_document_type IS 'Index for document type analytics';
COMMENT ON INDEX idx_generation_analytics_created_at IS 'Index for time-based analytics';
COMMENT ON INDEX idx_generation_analytics_user_date IS 'Composite index for user timeline queries';

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier 
  ON profiles(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin 
  ON profiles(is_admin) 
  WHERE is_admin = true;

COMMENT ON INDEX idx_profiles_subscription_tier IS 'Index for tier-based queries';
COMMENT ON INDEX idx_profiles_is_admin IS 'Partial index for admin user lookups';

-- ============================================
-- Clean up any unused or redundant indexes
-- ============================================

-- Drop redundant indexes (if they exist and are covered by composite indexes)
DROP INDEX IF EXISTS artifacts_project_id_idx;  -- Covered by idx_artifacts_project_id
DROP INDEX IF EXISTS project_members_project_id_idx;  -- Covered by idx_project_members_project_id
DROP INDEX IF EXISTS project_members_user_id_idx;  -- Covered by idx_project_members_user_id
DROP INDEX IF EXISTS bug_reports_user_id_idx;  -- Covered by idx_bug_reports_user_id
DROP INDEX IF EXISTS generation_analytics_user_id_idx;  -- Covered by idx_generation_analytics_user_id
DROP INDEX IF EXISTS generation_analytics_project_id_idx;  -- Covered by idx_generation_analytics_project_id

-- ============================================
-- Analyze tables to update statistics
-- ============================================
ANALYZE profiles;
ANALYZE projects;
ANALYZE artifacts;
ANALYZE project_members;
ANALYZE bug_reports;
ANALYZE generation_analytics;