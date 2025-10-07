-- ============================================
-- FIX: detect_auth_provider Race Condition
-- ============================================
-- Issue: detect_auth_provider_trigger fires BEFORE handle_new_user
-- This causes UPDATE to fail on non-existent profile
--
-- Root Cause:
-- - Both triggers fire on AFTER INSERT auth.users
-- - detect_auth_provider tries to UPDATE profiles
-- - Profile doesn't exist yet (handle_new_user hasn't run)
-- - Result: "Database error saving new user"
--
-- Solution:
-- - Add EXISTS check before UPDATE
-- - This makes the function idempotent
-- - If profile doesn't exist yet, UPDATE is skipped
-- - handle_new_user will create profile with default values
-- - On next sign-in, detect_auth_provider will update it
-- ============================================

CREATE OR REPLACE FUNCTION public.detect_auth_provider()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if profile exists (avoid race condition with handle_new_user)
  -- The EXISTS check prevents UPDATE failures when profile hasn't been created yet
  UPDATE public.profiles
  SET
    auth_provider = COALESCE(
      NEW.raw_app_meta_data->>'provider',
      NEW.raw_app_meta_data->'providers'->0->>'provider',
      CASE
        WHEN NEW.email IS NOT NULL THEN 'email'
        ELSE 'unknown'
      END
    )::text,
    last_sign_in_at = COALESCE(NEW.last_sign_in_at, NEW.created_at),
    updated_at = NOW()
  WHERE id = NEW.id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id);

  -- Always return NEW to avoid blocking the trigger chain
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure function owner is postgres (bypasses RLS)
ALTER FUNCTION public.detect_auth_provider() OWNER TO postgres;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.detect_auth_provider() IS
'Detects auth provider from Supabase metadata. Uses EXISTS check to handle race condition with handle_new_user trigger. Safe to run even if profile does not exist yet.';
