-- ============================================
-- PERMANENT LOGGER v2.0 - Dedicated Table Schema
-- ============================================
-- This creates a bulletproof logging system with:
-- - Structured logging with 6 levels
-- - Request correlation tracking
-- - Breadcrumb trails for debugging
-- - Performance timing waterfall
-- - Error similarity detection
-- - Automatic rotation and cleanup
-- ============================================

-- Create permanent_logs table with comprehensive logging fields
CREATE TABLE IF NOT EXISTS public.permanent_logs (
  -- Core Fields (MANDATORY)
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  log_level TEXT NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'fatal', 'metric')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Extended Data Fields
  data JSONB,                    -- Structured context data (sanitized)
  stack TEXT,                     -- Error stack traces
  request_id TEXT,                -- Correlation ID for distributed tracing
  
  -- Advanced Debugging Features
  breadcrumbs JSONB,              -- Navigation trail [{timestamp, category, message, data}]
  timing JSONB,                   -- Performance metrics {duration_ms, operations}
  error_details JSONB,            -- Detailed error information with similarity scores
  
  -- Metadata Fields
  environment TEXT DEFAULT 'development',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,                -- Optional session tracking (not FK to avoid dependencies)
  
  -- Tracking Fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================
-- Critical for fast queries and log retrieval

CREATE INDEX idx_permanent_logs_timestamp ON public.permanent_logs(log_timestamp DESC);
CREATE INDEX idx_permanent_logs_level ON public.permanent_logs(log_level);
CREATE INDEX idx_permanent_logs_category ON public.permanent_logs(category);
CREATE INDEX idx_permanent_logs_request_id ON public.permanent_logs(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_permanent_logs_user_id ON public.permanent_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_permanent_logs_created_at ON public.permanent_logs(created_at DESC);
CREATE INDEX idx_permanent_logs_error_level ON public.permanent_logs(log_timestamp DESC) WHERE log_level IN ('error', 'fatal');

-- Add table comment for documentation
COMMENT ON TABLE public.permanent_logs IS 'Permanent logger v2.0 - Comprehensive logging system with structured data, error tracking, breadcrumbs, and performance metrics';
COMMENT ON COLUMN public.permanent_logs.log_level IS 'Log level: debug, info, warn, error, fatal, metric';
COMMENT ON COLUMN public.permanent_logs.category IS 'Log category for grouping (e.g., API, DATABASE, AUTH, SCRAPER)';
COMMENT ON COLUMN public.permanent_logs.breadcrumbs IS 'Trail of user actions and system events for debugging';
COMMENT ON COLUMN public.permanent_logs.timing IS 'Performance waterfall with operation timings';
COMMENT ON COLUMN public.permanent_logs.error_details IS 'Comprehensive error details with similarity detection';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS for security
ALTER TABLE public.permanent_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access (for backend logging)
CREATE POLICY "Service role has full access to permanent_logs" ON public.permanent_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can insert logs (for client-side logging)
CREATE POLICY "Authenticated users can insert logs" ON public.permanent_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Authenticated users can view their own logs
CREATE POLICY "Users can view their own logs" ON public.permanent_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all logs" ON public.permanent_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- RPC FUNCTIONS
-- ============================================
-- Bypass Supabase 1000 row limit for log retrieval

-- Function: Get all logs with filtering (bypasses row limit)
CREATE OR REPLACE FUNCTION public.get_all_permanent_logs(
  p_level TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 5000,
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
  -- Return filtered logs
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
  LIMIT p_limit;
END;
$$;

-- Function: Clear old logs (for automatic rotation)
CREATE OR REPLACE FUNCTION public.clear_old_permanent_logs(
  days_to_keep INT DEFAULT 7
)
RETURNS INT 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  -- Delete logs older than specified days
  DELETE FROM public.permanent_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  INSERT INTO public.permanent_logs (
    log_level, 
    category, 
    message, 
    data
  ) VALUES (
    'info',
    'SYSTEM',
    'Automatic log rotation completed',
    jsonb_build_object(
      'deleted_count', deleted_count,
      'days_kept', days_to_keep,
      'operation', 'clear_old_logs'
    )
  );
  
  RETURN deleted_count;
END;
$$;

-- Function: Get log statistics
CREATE OR REPLACE FUNCTION public.get_permanent_log_stats(
  p_since TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '24 hours')
)
RETURNS TABLE (
  total_logs BIGINT,
  error_count BIGINT,
  warn_count BIGINT,
  categories JSONB,
  hourly_distribution JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE log_level = 'error' OR log_level = 'fatal') as errors,
      COUNT(*) FILTER (WHERE log_level = 'warn') as warnings
    FROM public.permanent_logs
    WHERE log_timestamp >= p_since
  ),
  categories AS (
    SELECT jsonb_object_agg(category, count) as cat_counts
    FROM (
      SELECT category, COUNT(*) as count
      FROM public.permanent_logs
      WHERE log_timestamp >= p_since
      GROUP BY category
      ORDER BY count DESC
      LIMIT 20
    ) c
  ),
  hourly AS (
    SELECT jsonb_object_agg(
      to_char(hour, 'YYYY-MM-DD HH24:00'),
      count
    ) as hourly_data
    FROM (
      SELECT 
        date_trunc('hour', log_timestamp) as hour,
        COUNT(*) as count
      FROM public.permanent_logs
      WHERE log_timestamp >= p_since
      GROUP BY hour
      ORDER BY hour
    ) h
  )
  SELECT 
    stats.total,
    stats.errors,
    stats.warnings,
    categories.cat_counts,
    hourly.hourly_data
  FROM stats, categories, hourly;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_all_permanent_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_old_permanent_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_permanent_log_stats TO authenticated;

-- ============================================
-- AUTOMATIC CLEANUP (Optional)
-- ============================================
-- Create a scheduled job to clean up old logs (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('clear-old-logs', '0 3 * * *', 'SELECT public.clear_old_permanent_logs(7);');