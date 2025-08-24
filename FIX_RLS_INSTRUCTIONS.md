# 🚨 URGENT: Fix RLS Infinite Recursion

## The Problem
You're getting "infinite recursion detected in policy for relation 'projects'" because the RLS policies are referencing each other in a circular way.

## Quick Fix - Run this SQL in Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste this entire SQL script:

```sql
-- QUICK FIX: Disable RLS temporarily
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts DISABLE ROW LEVEL SECURITY;

-- Drop problematic policies
DROP POLICY IF EXISTS "Enable read access for project members" ON projects;
DROP POLICY IF EXISTS "Users can view projects they're members of" ON projects;

-- Create simple, non-recursive policies for projects
CREATE POLICY IF NOT EXISTS "projects_owner_all" ON projects
    FOR ALL USING (owner_id = auth.uid());

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
```

4. Click "Run" 

## Alternative: Disable RLS for Testing

If you just want to test the document generation, run this:

```sql
-- Disable RLS for testing
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts DISABLE ROW LEVEL SECURITY;
```

⚠️ **Warning**: This disables security! Only use for testing, then re-enable:

```sql
-- Re-enable RLS after testing
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
```

## Why This Happens

The infinite recursion occurs when:
1. Projects policy checks if user is in project_members
2. Project_members policy checks if project exists in projects
3. This creates a circular reference

## The Solution

Use simple policies that only check direct ownership:
- Projects: Only owner can see/edit
- Artifacts: Check project ownership directly
- No circular references between tables

## After Fixing

The test page at `/test-generation` should work and show:
- Document list with progress indicators
- Green checkmarks as documents complete
- No database errors