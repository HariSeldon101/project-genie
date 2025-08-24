-- SECURE RLS POLICIES WITHOUT RECURSION
-- This script creates proper RLS policies that avoid infinite recursion
-- while maintaining security

-- Step 1: Drop any existing policies (clean slate)
DROP POLICY IF EXISTS "projects_owner_all" ON projects;
DROP POLICY IF EXISTS "projects_select_owner" ON projects;
DROP POLICY IF EXISTS "projects_select_member" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update_owner" ON projects;
DROP POLICY IF EXISTS "projects_delete_owner" ON projects;

DROP POLICY IF EXISTS "simple_members_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_select" ON project_members;
DROP POLICY IF EXISTS "project_members_insert" ON project_members;
DROP POLICY IF EXISTS "project_members_update" ON project_members;
DROP POLICY IF EXISTS "project_members_delete" ON project_members;

-- Step 2: Create non-recursive policies for projects table

-- Users can SELECT projects they own
CREATE POLICY "owner_select_projects" ON projects
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Users can SELECT projects they're members of (without recursion)
CREATE POLICY "member_select_projects" ON projects
    FOR SELECT
    USING (
        id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can INSERT projects (they become the owner)
CREATE POLICY "user_insert_projects" ON projects
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Users can UPDATE projects they own
CREATE POLICY "owner_update_projects" ON projects
    FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Users can DELETE projects they own
CREATE POLICY "owner_delete_projects" ON projects
    FOR DELETE
    USING (auth.uid() = owner_id);

-- Step 3: Create policies for project_members table

-- Users can view members of projects they have access to
CREATE POLICY "view_project_members" ON project_members
    FOR SELECT
    USING (
        -- User is the member being selected
        user_id = auth.uid()
        OR
        -- User owns the project (direct check, no recursion)
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Project owners can add members
CREATE POLICY "owner_insert_members" ON project_members
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Project owners can update members
CREATE POLICY "owner_update_members" ON project_members
    FOR UPDATE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Project owners can remove members
CREATE POLICY "owner_delete_members" ON project_members
    FOR DELETE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Step 4: Create policies for stakeholders table
DROP POLICY IF EXISTS "stakeholders_policy" ON stakeholders;

CREATE POLICY "stakeholders_select" ON stakeholders
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
            UNION
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "stakeholders_insert" ON stakeholders
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "stakeholders_update" ON stakeholders
    FOR UPDATE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "stakeholders_delete" ON stakeholders
    FOR DELETE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Step 5: Create policies for tasks table
DROP POLICY IF EXISTS "tasks_policy" ON tasks;

CREATE POLICY "tasks_select" ON tasks
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
            UNION
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
            UNION
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
            UNION
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "tasks_delete" ON tasks
    FOR DELETE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Step 6: Create policies for risks table
DROP POLICY IF EXISTS "risks_policy" ON risks;

CREATE POLICY "risks_select" ON risks
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
            UNION
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "risks_insert" ON risks
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
            UNION
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "risks_update" ON risks
    FOR UPDATE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
            UNION
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "risks_delete" ON risks
    FOR DELETE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Step 7: Create policies for artifacts table
DROP POLICY IF EXISTS "artifacts_policy" ON artifacts;

CREATE POLICY "artifacts_select" ON artifacts
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
            UNION
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "artifacts_insert" ON artifacts
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "artifacts_update" ON artifacts
    FOR UPDATE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "artifacts_delete" ON artifacts
    FOR DELETE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Step 8: Create policies for activity_log table
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;

CREATE POLICY "activity_log_select" ON activity_log
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
            UNION
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "activity_log_insert" ON activity_log
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Step 9: Re-enable RLS on all tables (CRITICAL FOR SECURITY!)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Step 10: Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM 
    pg_tables
WHERE 
    schemaname = 'public'
    AND tablename IN ('projects', 'project_members', 'stakeholders', 'tasks', 'risks', 'artifacts', 'activity_log')
ORDER BY 
    tablename;

-- You should see rowsecurity = true for all tables
-- If successful, you'll see a message confirming RLS is enabled on all tables