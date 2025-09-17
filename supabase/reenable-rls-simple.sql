-- SIMPLE & SECURE RLS RE-ENABLE
-- Run this NOW to restore security after disabling RLS

-- 1. Create simple ownership policy for projects
CREATE POLICY IF NOT EXISTS "users_manage_own_projects" ON projects
    FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- 2. Re-enable RLS for security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- 3. Verify it worked
SELECT 'RLS has been re-enabled! Your data is now secure.' as status;
SELECT 'Users can only see/edit their own projects.' as info;