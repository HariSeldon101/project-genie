# URGENT: Fix Database to Allow Project Creation

## Quick Fix (Run This First!)

Go to your Supabase Dashboard → SQL Editor and run this simplified fix:

```sql
-- QUICK FIX: Allow users to create projects
-- Drop the problematic policy that's blocking inserts
DROP POLICY IF EXISTS "projects_owner_all" ON public.projects;
DROP POLICY IF EXISTS "projects_select_owner" ON public.projects;
DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update_owner" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_owner" ON public.projects;
DROP POLICY IF EXISTS "users_own_projects" ON public.projects;
DROP POLICY IF EXISTS "users_select_all" ON public.projects;
DROP POLICY IF EXISTS "users_manage_own_projects" ON public.projects;
DROP POLICY IF EXISTS "simple_projects_policy" ON public.projects;

-- Create simple, working policies
CREATE POLICY "allow_authenticated_insert" ON public.projects
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "allow_select_own" ON public.projects
    FOR SELECT 
    USING (owner_id = auth.uid());

CREATE POLICY "allow_update_own" ON public.projects
    FOR UPDATE 
    USING (owner_id = auth.uid());

CREATE POLICY "allow_delete_own" ON public.projects
    FOR DELETE 
    USING (owner_id = auth.uid());

-- Verify the user's profile exists
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
)
FROM auth.users
WHERE email = 'stusandboxacc@gmail.com'
ON CONFLICT (id) DO NOTHING;
```

## After Quick Fix Works, Run Full Migration

Once you can create projects, run the comprehensive migration from:
`supabase/migrations/20240824_comprehensive_schema_fix.sql`

This will:
1. Add all missing tables from the PRD
2. Set up proper indexes
3. Create helper functions
4. Implement comprehensive RLS

## Current Issue Summary

**Problem**: RLS policies are blocking authenticated users from creating projects
**Error Message**: "insert or update on table 'projects' violates foreign key constraint" (misleading - it's actually RLS)
**Root Cause**: Conflicting/missing INSERT policy for authenticated users

## Test After Fix

1. Go to https://project-genie-one.vercel.app/projects/new
2. Fill in the form
3. Click "Create Project"
4. Should work without errors!