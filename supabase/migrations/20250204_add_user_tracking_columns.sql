-- Add user tracking columns to profiles table
-- This migration adds auth provider and last sign-in tracking

-- Add auth_provider column to track authentication method
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'email';

-- Add last_sign_in_at column to track last login
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_sign_in_at timestamp with time zone;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON public.profiles(auth_provider);
CREATE INDEX IF NOT EXISTS idx_profiles_last_sign_in ON public.profiles(last_sign_in_at);

-- Update existing profiles trigger to capture auth provider
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
    COALESCE(
      new.raw_app_meta_data->>'provider',
      new.raw_app_meta_data->'providers'->0::text,
      'email'
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    auth_provider = COALESCE(profiles.auth_provider, EXCLUDED.auth_provider),
    updated_at = NOW();
  RETURN new;
END;
$$;

-- Function to update last sign in time
CREATE OR REPLACE FUNCTION public.update_last_sign_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = 'public'
AS $$
BEGIN
  -- Update the last_sign_in_at timestamp in profiles
  UPDATE public.profiles
  SET
    last_sign_in_at = NOW(),
    updated_at = NOW()
  WHERE id = new.id;

  RETURN new;
END;
$$;

-- Note: To track sign-ins, you would need to create a trigger on auth.sessions
-- However, this requires super admin access to the auth schema
-- Instead, we'll update this via the application layer when users access protected routes

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.auth_provider IS 'Authentication provider used (email, google, linkedin_oidc, etc)';
COMMENT ON COLUMN public.profiles.last_sign_in_at IS 'Timestamp of user last sign in';