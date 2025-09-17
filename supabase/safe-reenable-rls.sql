-- SAFE RLS RE-ENABLE (Handles existing policies)
-- This script safely re-enables RLS without errors

-- 1. Drop the old problematic policy if it exists
DROP POLICY IF EXISTS "simple_projects_policy" ON projects;
DROP POLICY IF EXISTS "users_manage_own_projects" ON projects;

-- 2. Create a clean ownership policy for projects
CREATE POLICY "users_own_projects" ON projects
    FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- 3. Re-enable RLS on all tables for security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- 4. Create basic policies for related tables (if they don't exist)
-- Stakeholders - users can manage stakeholders in their projects
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stakeholders' 
        AND policyname = 'stakeholders_owner_policy'
    ) THEN
        CREATE POLICY "stakeholders_owner_policy" ON stakeholders
            FOR ALL
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
    END IF;
END $$;

-- Tasks - users can manage tasks in their projects
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND policyname = 'tasks_owner_policy'
    ) THEN
        CREATE POLICY "tasks_owner_policy" ON tasks
            FOR ALL
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
    END IF;
END $$;

-- Risks - users can manage risks in their projects
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'risks' 
        AND policyname = 'risks_owner_policy'
    ) THEN
        CREATE POLICY "risks_owner_policy" ON risks
            FOR ALL
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
    END IF;
END $$;

-- Artifacts - users can manage artifacts in their projects
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'artifacts' 
        AND policyname = 'artifacts_owner_policy'
    ) THEN
        CREATE POLICY "artifacts_owner_policy" ON artifacts
            FOR ALL
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
    END IF;
END $$;

-- Activity log - users can see their own activities
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_log' 
        AND policyname = 'activity_log_user_policy'
    ) THEN
        CREATE POLICY "activity_log_user_policy" ON activity_log
            FOR ALL
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- 5. Verify RLS is enabled
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as security_status
FROM 
    pg_tables
WHERE 
    schemaname = 'public'
    AND tablename IN ('projects', 'project_members', 'stakeholders', 'tasks', 'risks', 'artifacts', 'activity_log')
ORDER BY 
    tablename;

-- 6. Show existing policies
SELECT 
    tablename,
    policyname,
    permissive
FROM 
    pg_policies
WHERE 
    schemaname = 'public'
    AND tablename IN ('projects', 'stakeholders')
ORDER BY 
    tablename, policyname;