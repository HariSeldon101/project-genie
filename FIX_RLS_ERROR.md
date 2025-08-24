# Fix for RLS Infinite Recursion Error

## Quick Fix (Immediate Solution)

The error "infinite recursion detected in policy for relation 'projects'" is caused by circular dependencies in your Row Level Security policies.

### Option 1: Disable RLS Temporarily (Quickest)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Run this SQL:

```sql
-- Disable RLS on affected tables
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
```

4. Try creating a project again - it should work now

### Option 2: Fix RLS Properly (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Run the SQL from `/supabase/emergency-fix-rls.sql`

This will:
- Remove all problematic policies
- Create simple, working policies
- Allow users to manage their own projects

## What Caused This?

The RLS policies were checking:
- Projects table → checking project_members table
- Project_members table → checking projects table
- Creating an infinite loop

## After Fixing

Once RLS is fixed, the app will:
- ✅ Allow users to create projects
- ✅ Show only projects they own
- ✅ Generate documents with AI
- ✅ Export to Excel/CSV

## Need More Help?

If the issue persists:

1. Check the Supabase logs: Dashboard → Logs → Recent Logs
2. Verify your user is authenticated: Check auth.users table
3. Ensure all tables exist: Check Table Editor

## Testing After Fix

1. Create a new project through the wizard
2. Check if it appears in the dashboard
3. Try generating documents
4. Test Excel export

---

**Note**: After disabling RLS, all authenticated users can access all projects. Re-enable RLS with proper policies once the immediate issue is resolved.