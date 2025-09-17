#!/bin/bash

# Fix remaining function search_path issues
# These functions may have been overloaded or not updated properly

PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

echo "🔒 Fixing remaining function search_path issues..."

# SQL query to fix remaining search_path issues
SQL_QUERY=$(cat <<'EOF'
-- Drop and recreate functions with proper search_path
-- These are the remaining functions flagged by the security advisor

-- First, drop existing functions (with all overloads)
DROP FUNCTION IF EXISTS public.get_all_permanent_logs(integer, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_permanent_log_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_all_permanent_logs_jsonb(integer, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_paginated_permanent_logs(integer, integer, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_logs_paginated_v2(integer, integer, text, text, text, uuid, text, text, timestamp with time zone, timestamp with time zone) CASCADE;

-- Recreate with secure search_path

-- 1. get_all_permanent_logs
CREATE OR REPLACE FUNCTION public.get_all_permanent_logs(
  p_limit integer DEFAULT 1000,
  p_level text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  log_timestamp timestamp with time zone,
  log_level text,
  category text,
  message text,
  data jsonb,
  stack text,
  request_id text,
  user_id uuid,
  session_id text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pl.id,
    pl.log_timestamp,
    pl.log_level,
    pl.category,
    pl.message,
    pl.data,
    pl.stack,
    pl.request_id,
    pl.user_id,
    pl.session_id,
    pl.created_at
  FROM public.permanent_logs pl
  WHERE
    (p_level IS NULL OR pl.log_level = p_level)
    AND (p_category IS NULL OR pl.category = p_category)
    AND (p_search IS NULL OR pl.message ILIKE '%' || p_search || '%')
  ORDER BY pl.log_timestamp DESC
  LIMIT p_limit;
END;
$function$;

-- 2. get_permanent_log_stats
CREATE OR REPLACE FUNCTION public.get_permanent_log_stats()
RETURNS TABLE(
  total_logs bigint,
  error_count bigint,
  warning_count bigint,
  info_count bigint,
  debug_count bigint,
  metric_count bigint,
  last_log_time timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_logs,
    COUNT(*) FILTER (WHERE log_level = 'error')::bigint as error_count,
    COUNT(*) FILTER (WHERE log_level = 'warn')::bigint as warning_count,
    COUNT(*) FILTER (WHERE log_level = 'info')::bigint as info_count,
    COUNT(*) FILTER (WHERE log_level = 'debug')::bigint as debug_count,
    COUNT(*) FILTER (WHERE log_level = 'metric')::bigint as metric_count,
    MAX(log_timestamp) as last_log_time
  FROM public.permanent_logs;
END;
$function$;

-- 3. get_all_permanent_logs_jsonb
CREATE OR REPLACE FUNCTION public.get_all_permanent_logs_jsonb(
  p_limit integer DEFAULT 10000,
  p_level text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'log_timestamp', log_timestamp,
      'log_level', log_level,
      'category', category,
      'message', message,
      'data', data,
      'stack', stack,
      'request_id', request_id,
      'user_id', user_id,
      'session_id', session_id,
      'created_at', created_at
    )
  ) INTO result
  FROM (
    SELECT
      id,
      log_timestamp,
      log_level,
      category,
      message,
      data,
      stack,
      request_id,
      user_id,
      session_id,
      created_at
    FROM public.permanent_logs
    WHERE
      (p_level IS NULL OR log_level = p_level)
      AND (p_category IS NULL OR category = p_category)
      AND (p_search IS NULL OR message ILIKE '%' || p_search || '%')
    ORDER BY log_timestamp DESC
    LIMIT p_limit
  ) logs;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

-- 4. get_paginated_permanent_logs
CREATE OR REPLACE FUNCTION public.get_paginated_permanent_logs(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_level text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  logs jsonb,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_logs jsonb;
  v_total bigint;
BEGIN
  -- Get total count
  SELECT COUNT(*)
  INTO v_total
  FROM public.permanent_logs
  WHERE
    (p_level IS NULL OR log_level = p_level)
    AND (p_category IS NULL OR category = p_category)
    AND (p_search IS NULL OR message ILIKE '%' || p_search || '%');

  -- Get paginated logs
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'log_timestamp', log_timestamp,
      'log_level', log_level,
      'category', category,
      'message', message,
      'data', data,
      'stack', stack,
      'request_id', request_id,
      'user_id', user_id,
      'session_id', session_id,
      'created_at', created_at
    )
  ) INTO v_logs
  FROM (
    SELECT
      id,
      log_timestamp,
      log_level,
      category,
      message,
      data,
      stack,
      request_id,
      user_id,
      session_id,
      created_at
    FROM public.permanent_logs
    WHERE
      (p_level IS NULL OR log_level = p_level)
      AND (p_category IS NULL OR category = p_category)
      AND (p_search IS NULL OR message ILIKE '%' || p_search || '%')
    ORDER BY log_timestamp DESC
    LIMIT p_limit
    OFFSET p_offset
  ) logs;

  RETURN QUERY SELECT COALESCE(v_logs, '[]'::jsonb), v_total;
END;
$function$;

-- 5. get_logs_paginated_v2
CREATE OR REPLACE FUNCTION public.get_logs_paginated_v2(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_level text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  logs jsonb,
  total_count bigint,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_logs jsonb;
  v_total bigint;
  v_metadata jsonb;
BEGIN
  -- Get total count with all filters
  SELECT COUNT(*)
  INTO v_total
  FROM public.permanent_logs
  WHERE
    (p_level IS NULL OR log_level = p_level)
    AND (p_category IS NULL OR category = p_category)
    AND (p_search IS NULL OR message ILIKE '%' || p_search || '%')
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_request_id IS NULL OR request_id = p_request_id)
    AND (p_start_date IS NULL OR log_timestamp >= p_start_date)
    AND (p_end_date IS NULL OR log_timestamp <= p_end_date);

  -- Get paginated logs
  SELECT jsonb_agg(log_entry ORDER BY log_timestamp DESC)
  INTO v_logs
  FROM (
    SELECT
      jsonb_build_object(
        'id', id,
        'log_timestamp', log_timestamp,
        'log_level', log_level,
        'category', category,
        'message', message,
        'data', data,
        'stack', stack,
        'request_id', request_id,
        'breadcrumbs', breadcrumbs,
        'timing', timing,
        'error_details', error_details,
        'environment', environment,
        'user_id', user_id,
        'session_id', session_id,
        'created_at', created_at
      ) as log_entry,
      log_timestamp
    FROM public.permanent_logs
    WHERE
      (p_level IS NULL OR log_level = p_level)
      AND (p_category IS NULL OR category = p_category)
      AND (p_search IS NULL OR message ILIKE '%' || p_search || '%')
      AND (p_user_id IS NULL OR user_id = p_user_id)
      AND (p_session_id IS NULL OR session_id = p_session_id)
      AND (p_request_id IS NULL OR request_id = p_request_id)
      AND (p_start_date IS NULL OR log_timestamp >= p_start_date)
      AND (p_end_date IS NULL OR log_timestamp <= p_end_date)
    ORDER BY log_timestamp DESC
    LIMIT p_limit
    OFFSET p_offset
  ) filtered_logs;

  -- Build metadata
  v_metadata := jsonb_build_object(
    'page', (p_offset / p_limit) + 1,
    'page_size', p_limit,
    'total_pages', CEIL(v_total::numeric / p_limit),
    'has_next', (p_offset + p_limit) < v_total,
    'has_prev', p_offset > 0
  );

  RETURN QUERY SELECT COALESCE(v_logs, '[]'::jsonb), v_total, v_metadata;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_all_permanent_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_permanent_log_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_permanent_logs_jsonb TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paginated_permanent_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_logs_paginated_v2 TO authenticated;

COMMENT ON FUNCTION public.get_all_permanent_logs(integer, text, text, text) IS 'Query function with secure search_path - fixed';
COMMENT ON FUNCTION public.get_permanent_log_stats() IS 'Stats function with secure search_path - fixed';
COMMENT ON FUNCTION public.get_all_permanent_logs_jsonb(integer, text, text, text) IS 'JSONB query function with secure search_path - fixed';
COMMENT ON FUNCTION public.get_paginated_permanent_logs(integer, integer, text, text, text) IS 'Pagination function with secure search_path - fixed';
COMMENT ON FUNCTION public.get_logs_paginated_v2(integer, integer, text, text, text, uuid, text, text, timestamp with time zone, timestamp with time zone) IS 'Advanced pagination with secure search_path - fixed';
EOF
)

# Execute the query
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}" \
  | jq '.'

echo "✅ Remaining function search_path issues fixed!"