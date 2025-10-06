-- ============================================
-- Create JSONB RPC function to bypass 1000 row limit
-- ============================================
-- Returns logs as JSONB to avoid Supabase's 1000 row limit on RPC functions
-- ============================================

DROP FUNCTION IF EXISTS public.get_all_permanent_logs_jsonb;

CREATE OR REPLACE FUNCTION public.get_all_permanent_logs_jsonb(
  p_level TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10000,
  p_offset INT DEFAULT 0,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_count INT;
BEGIN
  -- Get total count first
  SELECT COUNT(*)
  INTO total_count
  FROM public.permanent_logs l
  WHERE 
    (p_level IS NULL OR l.log_level = p_level)
    AND (p_category IS NULL OR l.category = p_category)
    AND (p_since IS NULL OR l.log_timestamp >= p_since)
    AND (p_user_id IS NULL OR l.user_id = p_user_id);

  -- Build result with logs array and count
  SELECT jsonb_build_object(
    'logs', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'log_timestamp', l.log_timestamp,
        'log_level', l.log_level,
        'category', l.category,
        'message', l.message,
        'data', l.data,
        'stack', l.stack,
        'request_id', l.request_id,
        'breadcrumbs', l.breadcrumbs,
        'timing', l.timing,
        'error_details', l.error_details,
        'environment', l.environment,
        'user_id', l.user_id,
        'session_id', l.session_id
      )
    ), '[]'::jsonb),
    'count', total_count
  )
  INTO result
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
      breadcrumbs,
      timing,
      error_details,
      environment,
      user_id,
      session_id
    FROM public.permanent_logs l
    WHERE 
      (p_level IS NULL OR l.log_level = p_level)
      AND (p_category IS NULL OR l.category = p_category)
      AND (p_since IS NULL OR l.log_timestamp >= p_since)
      AND (p_user_id IS NULL OR l.user_id = p_user_id)
    ORDER BY l.log_timestamp DESC
    LIMIT p_limit
    OFFSET p_offset
  ) l;

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_all_permanent_logs_jsonb TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_permanent_logs_jsonb TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_permanent_logs_jsonb TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_all_permanent_logs_jsonb IS 'Returns logs as JSONB to bypass Supabase 1000 row RPC limit. Returns object with logs array and total count.';