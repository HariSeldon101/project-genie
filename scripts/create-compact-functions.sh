#!/bin/bash

# Create compact query functions to reduce MCP token usage
# Using Supabase Management API with PAT token

PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

echo "🔧 Creating compact query functions to reduce token usage..."

# SQL to create compact functions
SQL_QUERY=$(cat <<'EOF'
-- Create compact schema info function (returns ~500 tokens instead of 28,000)
CREATE OR REPLACE FUNCTION public.get_compact_db_info()
RETURNS TABLE(
    info_type text,
    value text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
    RETURN QUERY
    -- Database size
    SELECT 'database_size'::text, pg_size_pretty(pg_database_size(current_database()))::text
    UNION ALL
    -- Table count
    SELECT 'table_count'::text, COUNT(*)::text
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    UNION ALL
    -- Total rows (approximate)
    SELECT 'total_rows'::text, SUM(n_live_tup)::text
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    UNION ALL
    -- JSONB columns
    SELECT 'jsonb_columns'::text, COUNT(*)::text
    FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type = 'jsonb'
    UNION ALL
    -- Index count
    SELECT 'total_indexes'::text, COUNT(*)::text
    FROM pg_indexes WHERE schemaname = 'public'
    UNION ALL
    -- GIN indexes
    SELECT 'gin_indexes'::text, COUNT(*)::text
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexdef LIKE '%USING gin%'
    UNION ALL
    -- Empty tables
    SELECT 'empty_tables'::text, COUNT(*)::text
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' AND n_live_tup = 0;
END;
$function$;

-- Create function to get top tables by size (compact)
CREATE OR REPLACE FUNCTION public.get_top_tables_compact(limit_count integer DEFAULT 10)
RETURNS TABLE(
    table_name text,
    rows bigint,
    size text,
    has_gin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        t.tablename::text,
        t.n_live_tup as rows,
        pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename))::text as size,
        EXISTS(
            SELECT 1 FROM pg_indexes i
            WHERE i.schemaname = 'public'
            AND i.tablename = t.tablename
            AND i.indexdef LIKE '%USING gin%'
        ) as has_gin
    FROM pg_stat_user_tables t
    WHERE t.schemaname = 'public'
    ORDER BY t.n_live_tup DESC
    LIMIT limit_count;
END;
$function$;

-- Create function to check for issues (compact advisor replacement)
CREATE OR REPLACE FUNCTION public.get_security_summary()
RETURNS TABLE(
    check_name text,
    status text,
    count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
    RETURN QUERY
    -- Tables without RLS
    SELECT
        'tables_without_rls'::text,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::text,
        COUNT(*)::integer
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname = t.table_name
        AND c.relrowsecurity = true
    )
    UNION ALL
    -- Tables with RLS but no policies
    SELECT
        'rls_without_policies'::text,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::text,
        COUNT(*)::integer
    FROM pg_catalog.pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.tablename = c.relname
    )
    UNION ALL
    -- Functions without search_path
    SELECT
        'functions_without_search_path'::text,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::text,
        COUNT(*)::integer
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND (p.proconfig IS NULL OR NOT (p.proconfig @> ARRAY['search_path=pg_catalog, public']));
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_compact_db_info() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_top_tables_compact(integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_security_summary() TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION public.get_compact_db_info() IS 'Returns database summary in ~200 tokens instead of 28,000 from list_tables';
COMMENT ON FUNCTION public.get_top_tables_compact(integer) IS 'Returns top tables info in minimal tokens';
COMMENT ON FUNCTION public.get_security_summary() IS 'Compact security check replacing verbose advisors (~100 tokens vs 16,000)';
EOF
)

# Execute the query
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}" \
  | jq '.'

echo "✅ Compact functions created for token-efficient queries!"