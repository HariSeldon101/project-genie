-- Fix critical schema mismatch between users and profiles tables
-- This migration unifies the profile system to use the profiles table consistently

-- Step 1: Drop the old foreign key constraint from projects to public.users
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;

-- Step 2: Add new foreign key constraint to profiles table
ALTER TABLE projects 
ADD CONSTRAINT projects_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 3: Drop any other tables that reference public.users
-- First check and update project_members if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_members' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE project_members 
        DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
        
        ALTER TABLE project_members 
        ADD CONSTRAINT project_members_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END$$;

-- Step 4: Drop the redundant public.users table
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 5: Ensure profiles table has all necessary columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Step 6: Create or replace the trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    created_at, 
    updated_at,
    subscription_tier
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    now(),
    now(),
    'free'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Create profiles for any existing auth users that don't have one
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  created_at,
  updated_at,
  subscription_tier
)
SELECT 
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  ),
  created_at,
  now(),
  'free'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Step 9: Update RLS policies for projects to use profiles
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects within tier limits" ON projects;

-- Recreate with correct references
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = projects.id 
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (owner_id = auth.uid());

-- Step 10: Add helpful comment
COMMENT ON TABLE profiles IS 'Main user profile table - all user references should point here, not to public.users';
COMMENT ON COLUMN projects.owner_id IS 'References profiles(id) - the user who owns this project';

-- Step 11: Verify the fix
DO $$
DECLARE
  orphaned_projects INTEGER;
BEGIN
  -- Check for any projects without a corresponding profile
  SELECT COUNT(*) INTO orphaned_projects
  FROM projects p
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = p.owner_id
  );
  
  IF orphaned_projects > 0 THEN
    RAISE WARNING 'Found % projects with invalid owner_id references', orphaned_projects;
  ELSE
    RAISE NOTICE 'All projects have valid owner references';
  END IF;
END$$;