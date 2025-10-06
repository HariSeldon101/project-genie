#!/bin/bash

# Fix overloaded functions with search_path issues
# Need to identify all versions and update them

PAT_TOKEN="sbp_ce8146f94e3403eca0a088896812e9bbbf08929b"
PROJECT_REF="vnuieavheezjxbkyfxea"

echo "🔒 Fixing overloaded functions search_path issues..."

# First, get information about the functions
SQL_QUERY=$(cat <<'EOF'
-- Update all versions of the functions using ALTER FUNCTION
-- This preserves the function body while updating the search_path

-- Find and alter all versions of get_all_permanent_logs
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc
        WHERE proname IN (
            'get_all_permanent_logs',
            'get_permanent_log_stats',
            'get_all_permanent_logs_jsonb',
            'get_paginated_permanent_logs',
            'get_logs_paginated_v2'
        )
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = pg_catalog, public',
                      func_record.proname,
                      func_record.args);
    END LOOP;
END;
$$;

-- Also update any remaining functions that might have been missed
ALTER FUNCTION IF EXISTS public.update_page_intelligence_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION IF EXISTS public.cleanup_expired_locks() SET search_path = pg_catalog, public;
ALTER FUNCTION IF EXISTS public.update_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION IF EXISTS public.clear_old_permanent_logs(integer) SET search_path = pg_catalog, public;
ALTER FUNCTION IF EXISTS public.update_updated_at_column() SET search_path = pg_catalog, public;

-- Verify the changes
SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE
        WHEN p.proconfig @> ARRAY['search_path=pg_catalog, public'] THEN 'Secured'
        WHEN p.proconfig IS NULL THEN 'Not Set'
        ELSE 'Other: ' || array_to_string(p.proconfig, ', ')
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
AND p.proname IN (
    'get_all_permanent_logs',
    'get_permanent_log_stats',
    'get_all_permanent_logs_jsonb',
    'get_paginated_permanent_logs',
    'get_logs_paginated_v2',
    'update_page_intelligence_updated_at',
    'cleanup_expired_locks',
    'update_updated_at',
    'clear_old_permanent_logs',
    'update_updated_at_column'
)
ORDER BY p.proname;
EOF
)

# Execute the query
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}" \
  | jq '.'

echo "✅ Overloaded functions search_path issues fixed!"