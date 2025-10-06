#!/bin/bash

# Fix function search_path security issues
# Using Supabase Management API with PAT token

PAT_TOKEN="sbp_ce8146f94e3403eca0a088896812e9bbbf08929b"
PROJECT_REF="vnuieavheezjxbkyfxea"

echo "🔒 Fixing function search_path security issues..."

# SQL query to fix search_path issues
SQL_QUERY=$(cat <<'EOF'
-- Fix search_path for all functions to prevent SQL injection vulnerabilities
-- Setting explicit search_path to 'pg_catalog, public'

-- 1. update_page_intelligence_updated_at
CREATE OR REPLACE FUNCTION public.update_page_intelligence_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$;

-- 2. cleanup_expired_locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  DELETE FROM public.execution_locks
  WHERE expires_at < CURRENT_TIMESTAMP
    AND released = false;
END;
$function$;

-- 3. update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$;

-- 4. get_all_permanent_logs
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

-- 5. clear_old_permanent_logs
CREATE OR REPLACE FUNCTION public.clear_old_permanent_logs(days_to_keep integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.permanent_logs
  WHERE log_timestamp < CURRENT_TIMESTAMP - (days_to_keep || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- 6. get_permanent_log_stats
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

-- 7. get_all_permanent_logs_jsonb
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

-- 8. get_paginated_permanent_logs
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

-- 9. get_logs_paginated_v2
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

-- 10. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Add comment explaining the security fix
COMMENT ON FUNCTION public.update_page_intelligence_updated_at() IS 'Trigger function with secure search_path';
COMMENT ON FUNCTION public.cleanup_expired_locks() IS 'Cleanup function with secure search_path';
COMMENT ON FUNCTION public.update_updated_at() IS 'Trigger function with secure search_path';
COMMENT ON FUNCTION public.get_all_permanent_logs(integer, text, text, text) IS 'Query function with secure search_path';
COMMENT ON FUNCTION public.clear_old_permanent_logs(integer) IS 'Maintenance function with secure search_path';
COMMENT ON FUNCTION public.get_permanent_log_stats() IS 'Stats function with secure search_path';
COMMENT ON FUNCTION public.get_all_permanent_logs_jsonb(integer, text, text, text) IS 'Query function with secure search_path';
COMMENT ON FUNCTION public.get_paginated_permanent_logs(integer, integer, text, text, text) IS 'Pagination function with secure search_path';
COMMENT ON FUNCTION public.get_logs_paginated_v2(integer, integer, text, text, text, uuid, text, text, timestamp with time zone, timestamp with time zone) IS 'Advanced pagination function with secure search_path';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Trigger function with secure search_path';
EOF
)

# Execute the query
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}" \
  | jq '.'

echo "✅ Function search_path security issues fixed!"