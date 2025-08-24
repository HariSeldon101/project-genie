#!/bin/bash

# Load environment variables
source .env.local

# Extract project ref from URL
PROJECT_REF="vnuieavheezjxbkyfxea"

# SQL to execute
SQL_QUERY="
-- Drop ALL conflicting policies
DROP POLICY IF EXISTS \"projects_owner_all\" ON public.projects;
DROP POLICY IF EXISTS \"projects_select_owner\" ON public.projects;
DROP POLICY IF EXISTS \"projects_select_member\" ON public.projects;
DROP POLICY IF EXISTS \"projects_insert\" ON public.projects;
DROP POLICY IF EXISTS \"projects_update_owner\" ON public.projects;
DROP POLICY IF EXISTS \"projects_delete_owner\" ON public.projects;
DROP POLICY IF EXISTS \"users_own_projects\" ON public.projects;
DROP POLICY IF EXISTS \"simple_projects_policy\" ON public.projects;
DROP POLICY IF EXISTS \"users_select_all\" ON public.projects;
DROP POLICY IF EXISTS \"users_manage_own_projects\" ON public.projects;
DROP POLICY IF EXISTS \"owner_select_projects\" ON public.projects;
DROP POLICY IF EXISTS \"member_select_projects\" ON public.projects;
DROP POLICY IF EXISTS \"user_insert_projects\" ON public.projects;
DROP POLICY IF EXISTS \"owner_update_projects\" ON public.projects;
DROP POLICY IF EXISTS \"owner_delete_projects\" ON public.projects;

-- Add missing columns
ALTER TABLE public.projects 
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning',
    ADD COLUMN IF NOT EXISTS company_info JSONB,
    ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Create ONE simple policy that works
CREATE POLICY \"allow_all_authenticated\" ON public.projects
    FOR ALL 
    TO authenticated
    USING (auth.uid() = owner_id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = owner_id OR auth.uid() IS NOT NULL);

-- Return result
SELECT 'Migration completed!' as status;
"

echo "Attempting to run SQL migration..."
echo "Project: $PROJECT_REF"

# Try using psql if available
if command -v psql &> /dev/null; then
    echo "Using psql to connect..."
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        -h "db.${PROJECT_REF}.supabase.co" \
        -p 5432 \
        -U postgres \
        -d postgres \
        -c "$SQL_QUERY"
else
    echo "psql not found, trying alternative methods..."
    
    # Try using the Supabase CLI with direct connection
    if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
        echo "Using Supabase CLI with access token..."
        supabase db push --db-url "postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
    else
        echo "No access token found. Please set SUPABASE_ACCESS_TOKEN environment variable."
        echo ""
        echo "To get your access token:"
        echo "1. Go to https://supabase.com/dashboard/account/tokens"
        echo "2. Generate a new token"
        echo "3. Run: export SUPABASE_ACCESS_TOKEN='your-token-here'"
        echo "4. Run this script again"
    fi
fi