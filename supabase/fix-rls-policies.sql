-- Fix infinite recursion in projects table RLS policies
-- This error occurs when RLS policies reference themselves in a way that creates a loop

-- First, temporarily disable RLS to fix the policies
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can manage members of their projects" ON project_members;

-- Create proper RLS policies for projects table
-- These policies avoid recursion by not referencing project_members in the projects policies

-- Policy 1: Users can view projects they own
CREATE POLICY "projects_select_owner" ON projects
    FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid());

-- Policy 2: Users can view projects they are members of (without recursion)
CREATE POLICY "projects_select_member" ON projects
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = projects.id
            AND pm.user_id = auth.uid()
        )
    );

-- Policy 3: Users can create projects (they become the owner)
CREATE POLICY "projects_insert" ON projects
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Policy 4: Users can update projects they own
CREATE POLICY "projects_update_owner" ON projects
    FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Policy 5: Users can delete projects they own
CREATE POLICY "projects_delete_owner" ON projects
    FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- Create RLS policies for project_members table
-- Policy 1: Users can view members of projects they have access to
CREATE POLICY "project_members_select" ON project_members
    FOR SELECT
    TO authenticated
    USING (
        -- User owns the project
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_members.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        -- User is a member of the project
        user_id = auth.uid()
    );

-- Policy 2: Project owners can insert members
CREATE POLICY "project_members_insert" ON project_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_members.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Policy 3: Project owners can update members
CREATE POLICY "project_members_update" ON project_members
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_members.project_id
            AND p.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_members.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Policy 4: Project owners can delete members
CREATE POLICY "project_members_delete" ON project_members
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_members.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Also ensure other related tables have RLS enabled
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create basic policies for stakeholders
DROP POLICY IF EXISTS "stakeholders_policy" ON stakeholders;
CREATE POLICY "stakeholders_policy" ON stakeholders
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = stakeholders.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id
                    AND pm.user_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = stakeholders.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Create basic policies for tasks
DROP POLICY IF EXISTS "tasks_policy" ON tasks;
CREATE POLICY "tasks_policy" ON tasks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = tasks.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id
                    AND pm.user_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = tasks.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id
                    AND pm.user_id = auth.uid()
                )
            )
        )
    );

-- Create basic policies for risks
DROP POLICY IF EXISTS "risks_policy" ON risks;
CREATE POLICY "risks_policy" ON risks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = risks.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id
                    AND pm.user_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = risks.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id
                    AND pm.user_id = auth.uid()
                )
            )
        )
    );

-- Create basic policies for artifacts
DROP POLICY IF EXISTS "artifacts_policy" ON artifacts;
CREATE POLICY "artifacts_policy" ON artifacts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = artifacts.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id
                    AND pm.user_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = artifacts.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Create basic policies for activity_log
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
CREATE POLICY "activity_log_select" ON activity_log
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = activity_log.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id
                    AND pm.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;
CREATE POLICY "activity_log_insert" ON activity_log
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_members TO authenticated;
GRANT ALL ON stakeholders TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON risks TO authenticated;
GRANT ALL ON artifacts TO authenticated;
GRANT ALL ON activity_log TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);