-- ============================================
-- Increase the default limit for logs RPC function to 10000
-- ============================================
-- This allows fetching more logs at once to show full history
-- ============================================

-- Drop and recreate the function with higher default limit
DROP FUNCTION IF EXISTS public.get_all_permanent_logs;

CREATE OR REPLACE FUNCTION public.get_all_permanent_logs(
  p_level TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10000,  -- INCREASED from 500 to 10000
  p_offset INT DEFAULT 0,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  log_timestamp TIMESTAMPTZ,
  log_level TEXT,
  category TEXT,
  message TEXT,
  data JSONB,
  stack TEXT,
  request_id TEXT,
  breadcrumbs JSONB,
  timing JSONB,
  error_details JSONB,
  environment TEXT,
  user_id UUID,
  session_id TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return filtered logs with pagination
  RETURN QUERY
  SELECT 
    l.id, 
    l.log_timestamp, 
    l.log_level, 
    l.category, 
    l.message,
    l.data, 
    l.stack, 
    l.request_id, 
    l.breadcrumbs, 
    l.timing, 
    l.error_details,
    l.environment,
    l.user_id,
    l.session_id
  FROM public.permanent_logs l
  WHERE 
    (p_level IS NULL OR l.log_level = p_level)
    AND (p_category IS NULL OR l.category = p_category)
    AND (p_since IS NULL OR l.log_timestamp >= p_since)
    AND (p_user_id IS NULL OR l.user_id = p_user_id)
  ORDER BY l.log_timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_permanent_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_permanent_logs TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_permanent_logs TO service_role;

-- Update comment for documentation
COMMENT ON FUNCTION public.get_all_permanent_logs IS 'Retrieves permanent logs with pagination support. Default limit increased to 10000 to show more logs at once. Use offset and limit for efficient data fetching in chunks.';