-- ============================================
-- AUTO-CAPTURE AUTH CONTEXT IN PERMANENT_LOGS
-- ============================================
-- Date: 2025-01-17
-- Author: System
--
-- Problem: PermanentLogger was failing with RLS violations because
-- user_id was NULL even when users were authenticated.
--
-- Solution: Automatically capture auth.uid() at the database level,
-- similar to how profiles are created with triggers.
--
-- This eliminates the need to manually set user_id in 48+ API routes
-- and follows the DRY principle.
-- ============================================

-- Add DEFAULT auth.uid() to user_id column
-- This will automatically capture the authenticated user's ID when available
-- Returns NULL for unauthenticated requests (server-side logs, etc.)
ALTER TABLE public.permanent_logs
ALTER COLUMN user_id
SET DEFAULT auth.uid();

-- Add comment to document this behavior
COMMENT ON COLUMN public.permanent_logs.user_id IS
'Automatically captures auth.uid() on insert. NULL for unauthenticated/server-side logs.';

-- ============================================
-- VERIFICATION
-- ============================================
-- After this migration:
-- 1. All inserts from authenticated contexts will have user_id populated
-- 2. Server-side logs will have NULL user_id (as expected)
-- 3. RLS policies will work correctly
-- 4. No code changes needed in API routes
-- ============================================