-- NUCLEAR OPTION: Complete RLS Reset
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- PART 1: COMPLETELY DISABLE RLS (for testing)
-- ============================================

-- Disable RLS on ALL tables
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS artifacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS risks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: DROP EVERY SINGLE POLICY
-- ============================================

-- Drop ALL policies on projects table
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
        EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on project_members table
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
        EXECUTE format('DROP POLICY IF EXISTS %I ON project_members', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on artifacts table
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
        EXECUTE format('DROP POLICY IF EXISTS %I ON artifacts', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on users table
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
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- VERIFICATION: Check all policies are gone
-- ============================================

-- This should return 0 rows
SELECT COUNT(*) as remaining_policies 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_members', 'artifacts', 'users');

-- ============================================
-- DONE! RLS is now completely disabled
-- ============================================

-- Your app should now work without any RLS errors
-- To test: Go to /test-generation and it should work

-- ============================================
-- OPTIONAL: Minimal secure policies (run later)
-- ============================================
-- After testing, if you want to re-enable basic security:

/*
-- Enable RLS with minimal policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_owner" ON projects FOR ALL USING (owner_id = auth.uid());

ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_project_owner" ON artifacts FOR ALL 
USING (
    project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
    )
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_select" ON users FOR SELECT USING (true);
CREATE POLICY "allow_self_update" ON users FOR UPDATE USING (auth.uid() = id);
*/