-- JUST ENABLE RLS (Since policies already exist)

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Verify it's enabled
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ SECURE - RLS Enabled'
        ELSE '⚠️  INSECURE - RLS Disabled'
    END as security_status
FROM 
    pg_tables
WHERE 
    schemaname = 'public'
    AND tablename IN ('projects', 'project_members', 'stakeholders', 'tasks', 'risks', 'artifacts', 'activity_log')
ORDER BY 
    CASE WHEN rowsecurity = false THEN 0 ELSE 1 END,
    tablename;