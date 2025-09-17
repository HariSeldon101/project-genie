-- ============================================
-- CONSOLIDATED PROFILE TRIGGER MIGRATION
-- ============================================
-- SINGLE SOURCE OF TRUTH for automatic profile creation
-- This consolidates all previous profile trigger migrations into one
--
-- Previous migrations being consolidated:
-- - 20240824_auto_create_profile.sql
-- - 20240824_create_profile_trigger.sql
-- - 20240824_comprehensive_schema_fix.sql (profile trigger portion)
-- - 20250825_fix_profile_creation.sql
-- - 20250826_fix_profile_schema_mismatch.sql (profile trigger portion)
--
-- Author: System Architecture Team
-- Date: 2025-01-17
-- ============================================

-- Clean up any existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the profile creation function
-- This function automatically creates a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert new profile, using user metadata for full name
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  -- If profile already exists (race condition), update it instead
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now()
  WHERE
    -- Only update if there are actual changes
    profiles.email IS DISTINCT FROM EXCLUDED.email OR
    profiles.full_name IS DISTINCT FROM EXCLUDED.full_name OR
    profiles.avatar_url IS DISTINCT FROM EXCLUDED.avatar_url;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates to user metadata
-- This ensures profile stays in sync when users update their auth metadata
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data, email ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data OR
    OLD.email IS DISTINCT FROM NEW.email
  )
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- BACKFILL EXISTING USERS
-- ============================================
-- Ensure any existing users without profiles get one created
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  au.raw_user_meta_data->>'avatar_url',
  COALESCE(au.created_at, now()),
  now()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Ensure the trigger function can be executed
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS
'Automatically creates or updates a user profile when auth.users is modified.
This is the SINGLE source of truth for profile creation - no client-side profile creation needed.';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
'Ensures every new user gets a profile automatically created.';

COMMENT ON TRIGGER on_auth_user_updated ON auth.users IS
'Keeps profile in sync when user updates their auth metadata.';