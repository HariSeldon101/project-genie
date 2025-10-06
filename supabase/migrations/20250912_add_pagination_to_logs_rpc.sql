-- ============================================
-- Add pagination support to permanent logs RPC function
-- ============================================
-- Adds offset parameter for true pagination support
-- This enables fetching logs in smaller chunks
-- ============================================

-- Drop existing function to recreate with new signature
DROP FUNCTION IF EXISTS public.get_all_permanent_logs;

-- Recreate function with offset parameter for pagination
CREATE OR REPLACE FUNCTION public.get_all_permanent_logs(
  p_level TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 500,
  p_offset INT DEFAULT 0,  -- NEW: Add offset for pagination
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
  OFFSET p_offset;  -- Apply offset for pagination
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_permanent_logs TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_all_permanent_logs IS 'Retrieves permanent logs with pagination support. Use offset and limit for efficient data fetching in chunks.';

-- ============================================
-- Create function to get total log count
-- ============================================
-- Needed for pagination UI to show total pages
CREATE OR REPLACE FUNCTION public.get_permanent_logs_count(
  p_level TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count BIGINT;
BEGIN
  -- Count filtered logs
  SELECT COUNT(*)
  INTO total_count
  FROM public.permanent_logs l
  WHERE 
    (p_level IS NULL OR l.log_level = p_level)
    AND (p_category IS NULL OR l.category = p_category)
    AND (p_since IS NULL OR l.log_timestamp >= p_since)
    AND (p_user_id IS NULL OR l.user_id = p_user_id);
  
  RETURN total_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_permanent_logs_count TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_permanent_logs_count IS 'Returns the total count of logs matching the filter criteria. Used for pagination calculations.';