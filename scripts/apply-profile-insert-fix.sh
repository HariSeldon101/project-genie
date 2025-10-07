#!/bin/bash

# Apply profile INSERT policy fix via Supabase Management API
# PAT Token from CLAUDE.md: sbp_10122b563ee9bd601c0b31dc799378486acf13d2
# Project Ref: vnuieavheezjxbkyfxea

SQL_QUERY=$(cat <<'EOF'
-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

-- Create new INSERT policy that allows users and triggers to insert
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT
    WITH CHECK (
        auth.uid() = id
        OR current_setting('role', true) = 'service_role'
        OR current_setting('role', true) = 'postgres'
    );

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT INSERT ON public.profiles TO postgres, service_role;
EOF
)

echo "Applying profile INSERT policy fix..."
echo ""

curl -X POST \
  "https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query" \
  -H "Authorization: Bearer sbp_10122b563ee9bd601c0b31dc799378486acf13d2" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}"

echo ""
echo "Migration applied!"
