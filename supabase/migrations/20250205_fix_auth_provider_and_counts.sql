-- Fix Auth Provider Sync and User Activity Counts
-- This migration:
-- 1. Updates existing users' auth_provider from Supabase Auth metadata
-- 2. Improves the trigger to properly capture auth providers
-- 3. Adds helper views for accurate activity counts

-- Step 1: Update existing users' auth_provider from auth.users metadata
UPDATE public.profiles p
SET
  auth_provider = COALESCE(
    u.raw_app_metadata->>'provider',
    u.raw_app_metadata->'providers'->0::text,
    CASE
      WHEN u.email LIKE '%gmail.com' AND u.raw_app_metadata->>'iss' LIKE '%google%' THEN 'google'
      WHEN u.raw_app_metadata->>'iss' LIKE '%linkedin%' THEN 'linkedin_oidc'
      ELSE 'email'
    END
  ),
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND (p.auth_provider IS NULL OR p.auth_provider = 'email');

-- Step 2: Update the handle_new_user function to better capture auth provider
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    auth_provider,
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
    -- Improved auth provider detection
    COALESCE(
      new.raw_app_metadata->>'provider',
      new.raw_app_metadata->'providers'->0::text,
      CASE
        WHEN new.email LIKE '%gmail.com' AND new.raw_app_metadata->>'iss' LIKE '%google%' THEN 'google'
        WHEN new.raw_app_metadata->>'iss' LIKE '%linkedin%' THEN 'linkedin_oidc'
        WHEN new.raw_app_metadata->>'provider_id' IS NOT NULL THEN new.raw_app_metadata->>'provider_id'
        ELSE 'email'
      END
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    auth_provider = COALESCE(EXCLUDED.auth_provider, profiles.auth_provider),
    updated_at = NOW();

  RETURN new;
END;
$$;

-- Step 3: Create a function to update auth provider on sign in
-- This will capture provider info that might be missed during initial signup
CREATE OR REPLACE FUNCTION public.update_user_auth_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = 'public'
AS $$
BEGIN
  -- Update the auth_provider if we have better information
  UPDATE public.profiles
  SET
    auth_provider = COALESCE(
      new.raw_app_metadata->>'provider',
      new.raw_app_metadata->'providers'->0::text,
      CASE
        WHEN new.email LIKE '%gmail.com' AND new.raw_app_metadata->>'iss' LIKE '%google%' THEN 'google'
        WHEN new.raw_app_metadata->>'iss' LIKE '%linkedin%' THEN 'linkedin_oidc'
        WHEN new.raw_app_metadata->>'provider_id' IS NOT NULL THEN new.raw_app_metadata->>'provider_id'
        ELSE auth_provider
      END
    ),
    last_sign_in_at = NOW(),
    updated_at = NOW()
  WHERE id = new.id
    AND (auth_provider IS NULL OR auth_provider = 'email');

  RETURN new;
END;
$$;

-- Step 4: Create trigger for auth updates (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_updated'
  ) THEN
    CREATE TRIGGER on_auth_user_updated
      AFTER UPDATE ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.update_user_auth_provider();
  END IF;
END $$;

-- Step 5: Create a view for user scraping statistics
-- This will make it easier to get accurate counts
CREATE OR REPLACE VIEW public.user_scraping_stats AS
SELECT
  user_id,
  COUNT(DISTINCT id) as total_scrapes,
  COUNT(DISTINCT domain) as unique_domains,
  MAX(created_at) as last_scrape_at,
  SUM(COALESCE((metadata->>'page_count')::int, 0)) as total_pages_scraped
FROM public.company_intelligence_sessions
WHERE status IN ('completed', 'processing', 'active')
GROUP BY user_id;

-- Step 6: Create a view for user document statistics
-- Count documents from various sources
CREATE OR REPLACE VIEW public.user_document_stats AS
SELECT
  created_by as user_id,
  COUNT(DISTINCT id) as total_documents,
  COUNT(DISTINCT project_id) as unique_projects,
  MAX(created_at) as last_document_at,
  SUM(COALESCE(generation_tokens, 0)) as total_tokens_used
FROM public.artifacts
WHERE type IN ('document', 'report', 'analysis', 'summary')
GROUP BY created_by;

-- Step 7: Create a comprehensive user stats view
CREATE OR REPLACE VIEW public.user_activity_stats AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.auth_provider,
  p.is_admin,
  p.is_active,
  p.subscription_tier,
  p.created_at,
  p.last_sign_in_at,
  COALESCE(s.total_scrapes, 0) as scrape_count,
  COALESCE(s.unique_domains, 0) as unique_domains_scraped,
  COALESCE(d.total_documents, 0) as document_count,
  COALESCE(d.unique_projects, 0) as unique_projects,
  s.last_scrape_at,
  d.last_document_at
FROM public.profiles p
LEFT JOIN public.user_scraping_stats s ON p.id = s.user_id
LEFT JOIN public.user_document_stats d ON p.id = d.user_id;

-- Step 8: Grant appropriate permissions
GRANT SELECT ON public.user_scraping_stats TO authenticated;
GRANT SELECT ON public.user_document_stats TO authenticated;
GRANT SELECT ON public.user_activity_stats TO authenticated;

-- Step 9: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_intelligence_sessions_user_id
  ON public.company_intelligence_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_artifacts_created_by
  ON public.artifacts(created_by);

-- Step 10: Add comments for documentation
COMMENT ON VIEW public.user_scraping_stats IS 'Aggregated scraping statistics per user';
COMMENT ON VIEW public.user_document_stats IS 'Aggregated document generation statistics per user';
COMMENT ON VIEW public.user_activity_stats IS 'Comprehensive user activity statistics combining all sources';