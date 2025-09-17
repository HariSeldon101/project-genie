-- Fix RLS Performance Issues
-- Performance Advisory: Using auth.uid() directly causes multiple evaluations
-- Wrapping in SELECT ensures single evaluation per query

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create optimized policies
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_select_team" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM project_members 
      WHERE project_id IN (
        SELECT project_id FROM project_members 
        WHERE user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- ============================================
-- PROJECTS TABLE POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Create optimized policies
CREATE POLICY "projects_select_owner" ON projects
  FOR SELECT USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "projects_select_member" ON projects
  FOR SELECT USING (
    id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "projects_update_owner" ON projects
  FOR UPDATE USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "projects_delete_owner" ON projects
  FOR DELETE USING (owner_id = (SELECT auth.uid()));

-- ============================================
-- ARTIFACTS TABLE POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "artifacts_select_policy" ON artifacts;
DROP POLICY IF EXISTS "artifacts_insert_policy" ON artifacts;
DROP POLICY IF EXISTS "artifacts_update_policy" ON artifacts;
DROP POLICY IF EXISTS "artifacts_delete_policy" ON artifacts;
DROP POLICY IF EXISTS "Users can view artifacts of their projects" ON artifacts;
DROP POLICY IF EXISTS "Users can create artifacts in their projects" ON artifacts;
DROP POLICY IF EXISTS "Users can update artifacts in their projects" ON artifacts;
DROP POLICY IF EXISTS "Users can delete artifacts in their projects" ON artifacts;

-- Create optimized policies with subquery caching
CREATE POLICY "artifacts_access" ON artifacts
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================
-- PROJECT_MEMBERS TABLE POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_update_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_delete_policy" ON project_members;

-- Create optimized policies
CREATE POLICY "project_members_select" ON project_members
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "project_members_manage" ON project_members
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (SELECT auth.uid())
    )
  );

-- ============================================
-- BUG_REPORTS TABLE POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "bug_reports_select_policy" ON bug_reports;
DROP POLICY IF EXISTS "bug_reports_insert_policy" ON bug_reports;
DROP POLICY IF EXISTS "bug_reports_update_policy" ON bug_reports;
DROP POLICY IF EXISTS "Users can view bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can create bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can update bug reports" ON bug_reports;

-- Create optimized policies
CREATE POLICY "bug_reports_select_own" ON bug_reports
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "bug_reports_select_admin" ON bug_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND is_admin = true
    )
  );

CREATE POLICY "bug_reports_insert" ON bug_reports
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "bug_reports_update_own" ON bug_reports
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "bug_reports_update_admin" ON bug_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND is_admin = true
    )
  );

-- ============================================
-- GENERATION_ANALYTICS TABLE POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "generation_analytics_insert_policy" ON generation_analytics;
DROP POLICY IF EXISTS "generation_analytics_select_policy" ON generation_analytics;
DROP POLICY IF EXISTS "Users can insert own analytics" ON generation_analytics;
DROP POLICY IF EXISTS "Users can view own analytics" ON generation_analytics;
DROP POLICY IF EXISTS "Admins can view all analytics" ON generation_analytics;

-- Create optimized policies
CREATE POLICY "generation_analytics_insert" ON generation_analytics
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "generation_analytics_select_own" ON generation_analytics
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "generation_analytics_select_admin" ON generation_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND is_admin = true
    )
  );

-- ============================================
-- Add comments for documentation
-- ============================================
COMMENT ON POLICY "profiles_select_own" ON profiles IS 'Optimized: Users can view their own profile';
COMMENT ON POLICY "profiles_select_team" ON profiles IS 'Optimized: Users can view profiles of team members';
COMMENT ON POLICY "projects_select_owner" ON projects IS 'Optimized: Owners can view their projects';
COMMENT ON POLICY "projects_select_member" ON projects IS 'Optimized: Members can view shared projects';
COMMENT ON POLICY "artifacts_access" ON artifacts IS 'Optimized: Combined policy for all artifact operations';
COMMENT ON POLICY "bug_reports_select_own" ON bug_reports IS 'Optimized: Users can view their own bug reports';
COMMENT ON POLICY "bug_reports_select_admin" ON bug_reports IS 'Optimized: Admins can view all bug reports';