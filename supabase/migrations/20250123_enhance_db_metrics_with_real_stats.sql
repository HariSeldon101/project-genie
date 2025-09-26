-- Enhanced database metrics function with REAL, USEFUL stats
-- These metrics actually help monitor app performance in production

DROP FUNCTION IF EXISTS public.get_db_metrics();

CREATE OR REPLACE FUNCTION public.get_db_metrics()
RETURNS TABLE (
  -- Connection stats (already working)
  active_connections bigint,
  idle_connections bigint,
  total_connections bigint,
  max_connections integer,
  -- NEW REAL METRICS that actually help:
  cache_hit_ratio numeric,
  database_size_mb bigint,
  slow_queries integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  WITH connection_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE state = 'active')::bigint as active_conns,
      COUNT(*) FILTER (WHERE state = 'idle')::bigint as idle_conns,
      COUNT(*)::bigint as total_conns,
      COUNT(*) FILTER (WHERE state = 'active'
        AND query_start < NOW() - INTERVAL '1 second')::integer as slow_query_count
    FROM pg_stat_activity
    WHERE datname = current_database()
  ),
  cache_stats AS (
    SELECT
      CASE
        WHEN blks_hit + blks_read = 0 THEN 100  -- No reads yet, assume perfect cache
        ELSE ROUND((blks_hit::numeric / (blks_hit + blks_read)) * 100, 1)
      END as cache_ratio
    FROM pg_stat_database
    WHERE datname = current_database()
  )
  SELECT
    cs.active_conns,
    cs.idle_conns,
    cs.total_conns,
    (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections'),
    cache.cache_ratio,
    (pg_database_size(current_database()) / 1024 / 1024)::bigint,
    cs.slow_query_count
  FROM connection_stats cs
  CROSS JOIN cache_stats cache;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_db_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_db_metrics() TO anon;

COMMENT ON FUNCTION public.get_db_metrics() IS
'Returns real database performance metrics including cache hit ratio, database size, and slow query count';