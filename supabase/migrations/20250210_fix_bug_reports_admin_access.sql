-- ============================================
-- FIX: Bug Reports Admin Access
-- ============================================
-- Issue: Only "own_only" policy existed
-- Admins could not view bug reports from other users
--
-- Solution: Create policies that allow:
-- 1. Users to see their own bug reports
-- 2. Admins to see ALL bug reports (dev requirement)
-- 3. Users to insert their own bug reports
-- 4. Users/Admins to modify bug reports appropriately
-- ============================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "own_only" ON public.bug_reports;

-- Policy 1: Allow users to see own bugs OR admins to see all
CREATE POLICY "users_own_admins_all" ON public.bug_reports
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy 2: Allow users to insert their own bug reports
CREATE POLICY "users_insert_own" ON public.bug_reports
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Allow users to update/delete their own bugs OR admins to manage all
CREATE POLICY "users_own_admins_all_modify" ON public.bug_reports
  FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Ensure RLS is enabled
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON POLICY "users_own_admins_all" ON public.bug_reports IS
'Users can view their own bug reports. Admins can view ALL bug reports for dev purposes.';

COMMENT ON POLICY "users_insert_own" ON public.bug_reports IS
'Users can submit bug reports tagged with their own user_id.';

COMMENT ON POLICY "users_own_admins_all_modify" ON public.bug_reports IS
'Users can update/delete their own bug reports. Admins can modify ALL bug reports.';
