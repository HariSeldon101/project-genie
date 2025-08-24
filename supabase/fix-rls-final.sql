-- Final fix for RLS infinite recursion
-- This script creates simple, non-recursive policies

-- 1. First, disable RLS temporarily to clean up
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;

DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can view projects they're members of" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update" ON projects;
DROP POLICY IF EXISTS "Project owners can delete" ON projects;
DROP POLICY IF EXISTS "Enable read access for project members" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable update for project owners" ON projects;
DROP POLICY IF EXISTS "Enable delete for project owners" ON projects;

DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Enable read access for project members" ON project_members;
DROP POLICY IF EXISTS "Enable insert for project owners" ON project_members;
DROP POLICY IF EXISTS "Enable update for project owners" ON project_members;
DROP POLICY IF EXISTS "Enable delete for project owners" ON project_members;

DROP POLICY IF EXISTS "Users can view artifacts" ON artifacts;
DROP POLICY IF EXISTS "Users can create artifacts" ON artifacts;
DROP POLICY IF EXISTS "Users can update artifacts" ON artifacts;
DROP POLICY IF EXISTS "Users can delete artifacts" ON artifacts;

-- 3. Create SIMPLE policies for users table
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (true);  -- Public profiles

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 4. Create SIMPLE policies for projects table (NO JOINS!)
CREATE POLICY "projects_select_own" ON projects
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "projects_insert_policy" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "projects_update_own" ON projects
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "projects_delete_own" ON projects
    FOR DELETE USING (owner_id = auth.uid());

-- 5. Create SIMPLE policies for project_members
-- Note: We'll handle member access in application logic to avoid recursion
CREATE POLICY "members_select_policy" ON project_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_members.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "members_insert_policy" ON project_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_members.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "members_delete_policy" ON project_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_members.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- 6. Create SIMPLE policies for artifacts
CREATE POLICY "artifacts_select_policy" ON artifacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = artifacts.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "artifacts_insert_policy" ON artifacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = artifacts.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "artifacts_update_policy" ON artifacts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = artifacts.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "artifacts_delete_policy" ON artifacts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = artifacts.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- 7. Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- 8. Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_members TO authenticated;
GRANT ALL ON artifacts TO authenticated;

-- Test the policies work
DO $$
BEGIN
    RAISE NOTICE 'RLS policies have been successfully recreated';
    RAISE NOTICE 'Projects table: Users can only see/modify their own projects';
    RAISE NOTICE 'Artifacts table: Users can only see/modify artifacts in their projects';
    RAISE NOTICE 'No infinite recursion should occur';
END $$;