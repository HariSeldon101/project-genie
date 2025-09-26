-- Create function to safely expose database metrics
-- This function provides read-only access to connection stats

CREATE OR REPLACE FUNCTION public.get_db_metrics()
RETURNS TABLE (
  active_connections bigint,
  idle_connections bigint,
  total_connections bigint,
  max_connections integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE state = 'active')::bigint as active_connections,
    COUNT(*) FILTER (WHERE state = 'idle')::bigint as idle_connections,
    COUNT(*)::bigint as total_connections,
    (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections') as max_connections
  FROM pg_stat_activity
  WHERE datname = current_database();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_db_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_db_metrics() TO anon;

COMMENT ON FUNCTION public.get_db_metrics() IS 'Returns real-time database connection statistics';