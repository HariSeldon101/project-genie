-- Create a function to get all logs without the 1000 row limit
CREATE OR REPLACE FUNCTION get_all_logs(
  p_limit INT DEFAULT 5000,
  p_level TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  session_id UUID,
  timestamp TIMESTAMPTZ,
  level TEXT,
  category TEXT,
  message TEXT,
  data JSONB,
  request_id TEXT,
  breadcrumb JSONB,
  performance JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rsl.id,
    rsl.session_id,
    rsl.timestamp,
    rsl.level,
    rsl.category,
    rsl.message,
    rsl.data,
    rsl.request_id,
    rsl.breadcrumb,
    rsl.performance,
    rsl.user_id,
    rsl.created_at
  FROM research_session_logs rsl
  WHERE 
    (p_level IS NULL OR rsl.level = p_level)
    AND (p_category IS NULL OR rsl.category = p_category)
    AND (p_since IS NULL OR rsl.timestamp >= p_since)
  ORDER BY rsl.timestamp DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_logs TO authenticated;
