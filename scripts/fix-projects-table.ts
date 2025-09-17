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

async function fixProjectsTable() {
  try {
    console.log('Checking projects table structure...')
    
    // First, let's see what the current constraint is
    const { data: currentUser } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (currentUser && currentUser.users.length > 0) {
      console.log('Sample user ID:', currentUser.users[0].id)
    }
    
    // Check if we can query the projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(1)
    
    if (projectsError) {
      console.log('Projects table error:', projectsError.message)
      
      // If table doesn't exist, create it
      if (projectsError.message.includes('relation "public.projects" does not exist')) {
        console.log('Projects table does not exist. Creating it now...')
        // This would normally be done via SQL, but since we can't run raw SQL,
        // we'll provide the SQL to run manually
        console.log('\n=== RUN THIS SQL IN SUPABASE DASHBOARD ===\n')
        console.log(`
-- Drop existing table if it exists (be careful with this in production!)
DROP TABLE IF EXISTS public.projects CASCADE;

-- Create projects table with correct foreign key
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  methodology_type TEXT,
  status TEXT DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  company_info JSONB,
  stakeholders JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (owner_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create own projects" ON public.projects
  FOR INSERT WITH CHECK (owner_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (owner_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (owner_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Create indexes
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status);

-- Grant permissions
GRANT ALL ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;
        `)
        console.log('\n=== END OF SQL ===\n')
      }
    } else {
      console.log('Projects table exists and is accessible')
      console.log('Sample project:', projects?.[0])
    }
    
    // Check profiles to ensure they exist
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    } else {
      console.log(`Found ${profiles?.length || 0} profiles`)
      profiles?.forEach(p => console.log(`- ${p.email} (${p.id})`))
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

fixProjectsTable()