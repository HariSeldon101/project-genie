-- CORRECTED SQL - Run this in Supabase SQL Editor
-- This fixes the infinite recursion error

-- Step 1: Disable RLS temporarily
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for project members" ON projects;
DROP POLICY IF EXISTS "Users can view projects they're members of" ON projects;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update" ON projects;
DROP POLICY IF EXISTS "Project owners can delete" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable update for project owners" ON projects;
DROP POLICY IF EXISTS "Enable delete for project owners" ON projects;
DROP POLICY IF EXISTS "projects_owner_all" ON projects;
DROP POLICY IF EXISTS "projects_select_own" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_own" ON projects;
DROP POLICY IF EXISTS "projects_delete_own" ON projects;

-- Step 3: Create ONE simple policy for projects (owner can do everything)
CREATE POLICY "projects_owner_all" ON projects
    FOR ALL 
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Step 4: Create simple policies for users table
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

CREATE POLICY "users_can_view_all" ON users
    FOR SELECT USING (true);

CREATE POLICY "users_can_insert_self" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_update_self" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Step 5: Create simple policies for artifacts
DROP POLICY IF EXISTS "artifacts_select_policy" ON artifacts;
DROP POLICY IF EXISTS "artifacts_insert_policy" ON artifacts;
DROP POLICY IF EXISTS "artifacts_update_policy" ON artifacts;
DROP POLICY IF EXISTS "artifacts_delete_policy" ON artifacts;

CREATE POLICY "artifacts_owner_all" ON artifacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = artifacts.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- Step 6: Create simple policies for project_members
DROP POLICY IF EXISTS "members_select_policy" ON project_members;
DROP POLICY IF EXISTS "members_insert_policy" ON project_members;
DROP POLICY IF EXISTS "members_delete_policy" ON project_members;

CREATE POLICY "members_owner_all" ON project_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_members.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- Step 7: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- Step 8: Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_members TO authenticated;
GRANT ALL ON artifacts TO authenticated;

-- Done! This should fix the infinite recursion error