import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createProfilesTable() {
  try {
    console.log('Creating profiles table and setting up triggers...')
    
    // Note: We need to run these queries one at a time since Supabase JS client
    // doesn't support running raw SQL directly. We'll use the REST API instead.
    
    const queries = [
      // Create profiles table
      `CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      
      // Enable RLS
      `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY`,
      
      // Create policies
      `CREATE POLICY "Users can view own profile" ON public.profiles
        FOR SELECT USING (auth.uid() = id)`,
      
      `CREATE POLICY "Users can update own profile" ON public.profiles
        FOR UPDATE USING (auth.uid() = id)`,
      
      // Grant permissions
      `GRANT ALL ON public.profiles TO authenticated`,
      `GRANT SELECT ON public.profiles TO anon`,
      
      // Create profiles for existing users
      `INSERT INTO public.profiles (id, email, full_name)
       SELECT 
         id, 
         email, 
         COALESCE(
           raw_user_meta_data->>'full_name', 
           raw_user_meta_data->>'name', 
           split_part(email, '@', 1)
         ) as full_name
       FROM auth.users
       ON CONFLICT (id) DO NOTHING`,
       
      // Create trigger function
      `CREATE OR REPLACE FUNCTION public.handle_new_user()
       RETURNS trigger AS $$
       BEGIN
         INSERT INTO public.profiles (id, email, full_name)
         VALUES (
           new.id,
           new.email,
           COALESCE(
             new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email, '@', 1)
           )
         );
         RETURN new;
       END;
       $$ LANGUAGE plpgsql SECURITY DEFINER`,
       
      // Drop and recreate trigger
      `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`,
      
      `CREATE TRIGGER on_auth_user_created
       AFTER INSERT ON auth.users
       FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`
    ]
    
    // Execute each query using the REST API
    for (const query of queries) {
      console.log('Executing:', query.substring(0, 50) + '...')
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query })
      })
      
      if (!response.ok) {
        // Try alternative approach - direct REST API call
        // Since we can't run raw SQL through the JS client, we'll check if table exists
        // and create profiles through the normal API
        if (query.includes('CREATE TABLE')) {
          console.log('Trying to verify if profiles table exists...')
          const { error } = await supabase.from('profiles').select('count').limit(1)
          if (error && error.message.includes('relation "public.profiles" does not exist')) {
            console.error('Cannot create table via API. Please run the SQL manually in Supabase dashboard.')
            console.log('\n=== COPY AND PASTE THIS SQL IN SUPABASE DASHBOARD ===\n')
            console.log(queries.join(';\n\n'))
            console.log('\n=== END OF SQL ===\n')
            return
          }
        }
      }
    }
    
    console.log('Successfully set up profiles table!')
    
    // Test by fetching profiles
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) {
      console.error('Error fetching profiles:', error)
    } else {
      console.log(`Found ${data?.length || 0} profiles`)
    }
    
  } catch (error) {
    console.error('Error:', error)
    console.log('\nPlease run the following SQL manually in your Supabase dashboard:\n')
    console.log(`
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Create profiles for existing users
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  id, 
  email, 
  COALESCE(
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'name', 
    split_part(email, '@', 1)
  ) as full_name
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Create trigger for future users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `)
  }
}

createProfilesTable()