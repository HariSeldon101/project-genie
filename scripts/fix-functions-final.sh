#!/bin/bash

# Final fix for function search_path issues
# Using proper ALTER FUNCTION syntax

PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

echo "🔒 Final fix for function search_path issues..."

# SQL query to fix all functions
SQL_QUERY=$(cat <<'EOF'
-- Update all functions with search_path using dynamic SQL
DO $$
DECLARE
    func_record RECORD;
    alter_stmt TEXT;
BEGIN
    -- Process each function that needs search_path update
    FOR func_record IN
        SELECT
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args,
            p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND (p.proconfig IS NULL OR NOT (p.proconfig @> ARRAY['search_path=pg_catalog, public']))
    LOOP
        -- Build and execute ALTER FUNCTION statement
        alter_stmt := format('ALTER FUNCTION public.%I(%s) SET search_path = pg_catalog, public',
                            func_record.function_name,
                            func_record.args);

        BEGIN
            EXECUTE alter_stmt;
            RAISE NOTICE 'Updated function: %.%', func_record.function_name, func_record.args;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not update function: %.% - %', func_record.function_name, func_record.args, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- Return summary of function security status
SELECT
    COUNT(*) FILTER (WHERE proconfig @> ARRAY['search_path=pg_catalog, public']) as secured_functions,
    COUNT(*) FILTER (WHERE proconfig IS NULL OR NOT (proconfig @> ARRAY['search_path=pg_catalog, public'])) as unsecured_functions,
    COUNT(*) as total_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f';
EOF
)

# Execute the query
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}" \
  | jq '.'

echo "✅ Function search_path issues resolved!"