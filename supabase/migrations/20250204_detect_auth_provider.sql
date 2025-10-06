-- Migration: Detect and store auth provider from Supabase auth metadata
-- Description: Automatically updates auth_provider field based on user's actual login method

-- Create function to detect and store auth provider from auth metadata
CREATE OR REPLACE FUNCTION public.detect_auth_provider()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract auth provider from metadata
  -- Priority: app_metadata.provider > app_metadata.providers[0] > 'email'
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
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run on user creation or sign-in
DROP TRIGGER IF EXISTS detect_auth_provider_trigger ON auth.users;
CREATE TRIGGER detect_auth_provider_trigger
  AFTER INSERT OR UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_auth_provider();

-- Update existing users' auth providers by querying auth.users metadata
UPDATE public.profiles p
SET
  auth_provider = COALESCE(
    (SELECT
      COALESCE(
        u.raw_app_meta_data->>'provider',
        u.raw_app_meta_data->'providers'->0->>'provider',
        'email'
      )
    FROM auth.users u WHERE u.id = p.id),
    'email'
  )::text,
  last_sign_in_at = COALESCE(
    (SELECT u.last_sign_in_at FROM auth.users u WHERE u.id = p.id),
    p.updated_at
  ),
  updated_at = NOW()
WHERE auth_provider IS NULL OR auth_provider = 'email';

-- Add index for faster auth provider queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_sign_in_at ON public.profiles(last_sign_in_at);

-- Add comment for documentation
COMMENT ON FUNCTION public.detect_auth_provider() IS 'Automatically detects and updates auth provider from Supabase auth metadata on user sign-in';
COMMENT ON COLUMN public.profiles.auth_provider IS 'Authentication provider used by user (email, google, linkedin, etc)';
COMMENT ON COLUMN public.profiles.last_sign_in_at IS 'Last time the user signed in, automatically updated by trigger';