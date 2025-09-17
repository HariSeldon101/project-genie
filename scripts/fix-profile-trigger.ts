import fetch from 'node-fetch'

const SUPABASE_ACCESS_TOKEN = 'sbp_10122b563ee9bd601c0b31dc799378486acf13d2'
const PROJECT_REF = 'vnuieavheezjxbkyfxea'

async function createProfileTrigger() {
  console.log('Creating automatic profile creation trigger...')
  console.log('=' + '='.repeat(50))
  
  const migrationSQL = `
-- Create a function to automatically create user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      SPLIT_PART(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();
  
  RETURN new;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix any existing users who don't have profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url, updated_at)
SELECT 
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    SPLIT_PART(email, '@', 1)
  ),
  raw_user_meta_data->>'avatar_url',
  now()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Return count of fixed profiles
SELECT COUNT(*) as profiles_created
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
  `

  try {
    // Execute SQL via Supabase Management API
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: migrationSQL
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('API Error:', response.status, error)
      throw new Error('Failed to execute migration')
    }

    const result = await response.json()
    console.log('✅ Profile trigger created successfully!')
    console.log('Result:', result)
    
    console.log('\n' + '='.repeat(50))
    console.log('NEXT STEPS:')
    console.log('=' + '='.repeat(50))
    console.log('\n1. Sign out from the application')
    console.log('2. Sign in again with Google')
    console.log('3. Your profile will be automatically created')
    console.log('4. Try creating a project - it should work now!')
    console.log('\nGo to: https://project-genie-one.vercel.app')
    console.log('=' + '='.repeat(50))
    
  } catch (error) {
    console.error('Error:', error)
    
    console.log('\n' + '='.repeat(50))
    console.log('MANUAL FIX REQUIRED:')
    console.log('=' + '='.repeat(50))
    console.log('\n1. Go to: https://supabase.com/dashboard/project/vnuieavheezjxbkyfxea/sql/new')
    console.log('2. Paste and run the SQL above')
    console.log('3. This will:')
    console.log('   - Create a trigger to auto-create profiles')
    console.log('   - Fix any existing users without profiles')
    console.log('4. Then sign out and sign in again')
    console.log('=' + '='.repeat(50))
  }
}

createProfileTrigger()