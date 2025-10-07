-- ============================================
-- FIX PROFILE INSERT POLICY FOR TRIGGER
-- ============================================
-- Issue: Profile creation trigger fails because RLS policy
-- blocks INSERTs even with SECURITY DEFINER
--
-- Root cause: The INSERT policy requires auth.uid() = id,
-- but during trigger execution there's no auth context yet
--
-- Solution: Add policy to allow service_role and postgres
-- to insert profiles (which is what the trigger uses)
-- ============================================

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

-- Create new INSERT policy that allows:
-- 1. Users to insert their own profile (auth.uid() = id)
-- 2. Service role to insert (for triggers) - bypasses RLS anyway
-- 3. The trigger function to insert (SECURITY DEFINER)
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT
    WITH CHECK (
        -- Allow users to create their own profile
        auth.uid() = id
        -- Service role and postgres bypass RLS anyway, but explicit is better
        OR current_setting('role') = 'service_role'
        OR current_setting('role') = 'postgres'
    );

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to the trigger function owner
GRANT INSERT ON public.profiles TO postgres, service_role;

-- Add helpful comment
COMMENT ON POLICY "profiles_insert_policy" ON public.profiles IS
'Allows users to create their own profile and trigger functions to create profiles during signup';
