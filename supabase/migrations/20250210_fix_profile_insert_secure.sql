-- ============================================
-- SECURE FIX: Profile Creation Trigger Permissions
-- ============================================
-- Issue: Profile creation trigger fails because RLS blocks inserts
--
-- SECURITY ANALYSIS:
-- - Service role and postgres ALREADY bypass RLS
-- - We don't need to modify the RLS policy
-- - We just need to ensure the trigger function owner has proper permissions
--
-- SECURE SOLUTION:
-- - Ensure function owner is postgres (bypasses RLS)
-- - Grant explicit table permissions
-- - Keep existing RLS policy intact (user-only inserts)
-- ============================================

-- Ensure the trigger function is owned by postgres
-- postgres role bypasses RLS automatically
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Grant explicit table permissions to postgres
-- This ensures the function can insert regardless of RLS
GRANT INSERT ON public.profiles TO postgres;
GRANT UPDATE ON public.profiles TO postgres;
GRANT SELECT ON public.profiles TO postgres;

-- Also grant to service_role for good measure
GRANT INSERT ON public.profiles TO service_role;
GRANT UPDATE ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO service_role;

-- Verify RLS is enabled (security best practice)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- KEEP existing user-only INSERT policy
-- This policy is secure and should remain unchanged
-- It prevents users from creating profiles for other users
DO $$
BEGIN
    -- Only create if doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles'
        AND policyname = 'profiles_insert'
    ) THEN
        CREATE POLICY "profiles_insert" ON public.profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION public.handle_new_user() IS
'SECURITY DEFINER function owned by postgres - bypasses RLS to create profiles during signup.
This is secure because:
1. Function only inserts with NEW.id (from auth.users trigger)
2. Users cannot call this function directly
3. Function owner (postgres) bypasses RLS
4. Regular users still restricted by RLS policy';
