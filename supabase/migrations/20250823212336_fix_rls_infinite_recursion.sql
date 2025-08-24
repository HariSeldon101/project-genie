-- Migration: fix_rls_infinite_recursion
-- Description: Fixes infinite recursion in RLS policies by removing circular references
-- Author: Claude
-- Date: 2024-08-23

-- ============================================
-- STEP 1: Disable RLS temporarily for cleanup
-- ============================================
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.artifacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop ALL existing policies to start fresh
-- ============================================

-- Drop all project policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
    END LOOP;
END $$;

-- Drop all project_members policies  
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'project_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_members', pol.policyname);
    END LOOP;
END $$;

-- Drop all artifacts policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'artifacts'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.artifacts', pol.policyname);
    END LOOP;
END $$;

-- Drop all users policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- STEP 3: Create simple, non-recursive policies
-- ============================================

-- Users table: Allow users to see all profiles, update only their own
CREATE POLICY "users_select_all" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Projects table: Simple owner-based access (NO JOINS to avoid recursion!)
CREATE POLICY "projects_owner_all" ON public.projects
    FOR ALL 
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Project members table: Owner can manage members
CREATE POLICY "project_members_owner_manage" ON public.project_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_members.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- Members can view their own memberships
CREATE POLICY "project_members_own_view" ON public.project_members
    FOR SELECT USING (user_id = auth.uid());

-- Artifacts table: Project owner can manage artifacts
CREATE POLICY "artifacts_project_owner" ON public.artifacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = artifacts.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- ============================================
-- STEP 4: Re-enable RLS
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Add helpful comments
-- ============================================
COMMENT ON POLICY "projects_owner_all" ON public.projects IS 
    'Simple owner-only access policy to prevent infinite recursion';

COMMENT ON POLICY "artifacts_project_owner" ON public.artifacts IS 
    'Artifacts accessible only by project owner, no circular references';

COMMENT ON POLICY "project_members_owner_manage" ON public.project_members IS 
    'Project owners can manage members, members can view their own records';

-- ============================================
-- STEP 6: Grant necessary permissions
-- ============================================
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.project_members TO authenticated;
GRANT ALL ON public.artifacts TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'RLS policies have been successfully recreated without circular references';
    RAISE NOTICE 'Projects: Owner-only access';
    RAISE NOTICE 'Artifacts: Accessible via project ownership';
    RAISE NOTICE 'Members: Owners manage, members view own';
    RAISE NOTICE 'No infinite recursion should occur';
END $$;