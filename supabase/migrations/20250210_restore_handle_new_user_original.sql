-- ============================================
-- RESTORE handle_new_user to Original Version
-- ============================================
-- Issue: Modified function had JSON parsing error
-- Caused by: Incorrect JSON->text casting syntax
--
-- The function was modified to include auth_provider extraction:
--   (new.raw_app_meta_data->'providers')::jsonb->0::text
-- This syntax is invalid and causes 500 error during signup
--
-- Solution: Restore to original consolidated version
-- Let detect_auth_provider handle auth_provider (that's its job)
-- This function only creates the profile skeleton
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert new profile with basic info only
  -- auth_provider will be set by detect_auth_provider trigger
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
  -- Handle race conditions and updates gracefully
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

-- Ensure proper ownership
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

COMMENT ON FUNCTION public.handle_new_user() IS
'Creates profile skeleton on user signup. Restores to original working version without auth_provider extraction (handled by detect_auth_provider trigger instead).';
