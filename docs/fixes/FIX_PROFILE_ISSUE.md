# CRITICAL: Fix Profile Creation Issue

## The Problem
The project creation is failing because of a schema mismatch:
- Projects table references `public.users(id)` as foreign key
- But profiles are created in `profiles` table
- This causes a foreign key violation when creating projects

## Manual Fix Required

### Option 1: Run via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste this SQL:

```sql
-- Fix the foreign key constraint
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;

ALTER TABLE projects 
ADD CONSTRAINT projects_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Drop the unused public.users table
DROP TABLE IF EXISTS public.users CASCADE;

-- Ensure all existing users have profiles
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at, subscription_tier)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  created_at,
  now(),
  'free'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

4. Click "Run"

### Option 2: Use Supabase CLI

```bash
# Link to your project (if not already linked)
supabase link --project-ref vnuieavheezjxbkyfxea

# Run the migration
supabase db push
```

## Verify the Fix

After running the migration, test by:
1. Going to http://localhost:3000/projects/new
2. Creating a new project
3. It should work without the "Profile setup required" error

## What We've Done in Code

✅ Updated auth callback to create profiles on OAuth login
✅ Added profile checking to dashboard layout
✅ Made ensureUserProfile more robust
✅ Created migration file

## The Root Cause

The original schema had two conflicting user tables:
- `public.users` (referenced by projects)
- `profiles` (where profiles were actually created)

This migration unifies everything to use the `profiles` table consistently.

## If Still Having Issues

1. Check that profiles table exists:
```sql
SELECT * FROM profiles WHERE id = 'YOUR_USER_ID';
```

2. Check the foreign key constraint:
```sql
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'projects_owner_id_fkey';
```

This should show `profiles` as the referenced table, not `public.users`.

## Contact Support

If the issue persists after applying the migration, the problem may be with the Supabase database permissions or triggers.