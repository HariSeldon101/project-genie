-- Create optimized pagination function for logs
-- Uses cursor-based pagination for performance
-- Returns 50 logs per page by default
CREATE OR REPLACE FUNCTION get_paginated_logs(
  p_cursor TIMESTAMPTZ DEFAULT NULL,  -- Cursor for pagination (last timestamp from previous page)
  p_page_size INT DEFAULT 50,         -- Number of logs per page (max 100)
  p_level TEXT DEFAULT NULL,          -- Optional: filter by log level
  p_category TEXT DEFAULT NULL,       -- Optional: filter by category
  p_search TEXT DEFAULT NULL          -- Optional: search in message
)
RETURNS TABLE (
  logs JSONB,
  next_cursor TIMESTAMPTZ,
  has_more BOOLEAN,
  total_count BIGINT,
  page_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
  v_logs JSONB;
  v_next_cursor TIMESTAMPTZ;
  v_has_more BOOLEAN := FALSE;
  v_total_count BIGINT;
  v_page_size INT;
BEGIN
  -- Cap page size at 100 for performance
  v_page_size := LEAST(p_page_size, 100);
  
  -- Get total count (cached for performance)
  SELECT COUNT(*) INTO v_total_count
  FROM permanent_logs
  WHERE (p_level IS NULL OR log_level = p_level)
    AND (p_category IS NULL OR category = p_category)
    AND (p_search IS NULL OR message ILIKE '%' || p_search || '%');
  
  -- Get paginated logs
  WITH paginated_data AS (
    SELECT 
      id,
      log_timestamp,
      log_level,
      category,
      message,
      data,
      stack,
      request_id,
      session_id,
      breadcrumbs,
      timing,
      error_details,
      environment,
      user_id
    FROM permanent_logs
    WHERE (p_cursor IS NULL OR log_timestamp < p_cursor)
      AND (p_level IS NULL OR log_level = p_level)
      AND (p_category IS NULL OR category = p_category)
      AND (p_search IS NULL OR message ILIKE '%' || p_search || '%')
    ORDER BY log_timestamp DESC
    LIMIT v_page_size + 1  -- Get one extra to check if there are more
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'log_timestamp', log_timestamp,
        'log_level', log_level,
        'category', category,
        'message', message,
        'data', data,
        'stack', stack,
        'request_id', request_id,
        'session_id', session_id,
        'breadcrumbs', breadcrumbs,
        'timing', timing,
        'error_details', error_details,
        'environment', environment,
        'user_id', user_id
      )
    ) FILTER (WHERE row_number <= v_page_size),
    MIN(log_timestamp) FILTER (WHERE row_number = v_page_size),
    COUNT(*) > v_page_size
  INTO v_logs, v_next_cursor, v_has_more
  FROM (
    SELECT *, ROW_NUMBER() OVER () AS row_number
    FROM paginated_data
  ) numbered_data;
  
  -- Return results
  RETURN QUERY SELECT 
    COALESCE(v_logs, '[]'::jsonb) AS logs,
    v_next_cursor AS next_cursor,
    v_has_more AS has_more,
    v_total_count AS total_count,
    jsonb_build_object(
      'page_size', v_page_size,
      'returned_count', jsonb_array_length(COALESCE(v_logs, '[]'::jsonb)),
      'cursor', p_cursor,
      'filters', jsonb_build_object(
        'level', p_level,
        'category', p_category,
        'search', p_search
      )
    ) AS page_info;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_paginated_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_paginated_logs TO anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_permanent_logs_timestamp_desc 
  ON permanent_logs(log_timestamp DESC);
  
CREATE INDEX IF NOT EXISTS idx_permanent_logs_level 
  ON permanent_logs(log_level) 
  WHERE log_level IS NOT NULL;
  
CREATE INDEX IF NOT EXISTS idx_permanent_logs_category 
  ON permanent_logs(category) 
  WHERE category IS NOT NULL;

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_permanent_logs_composite 
  ON permanent_logs(log_timestamp DESC, log_level, category);

-- Index for text search
CREATE INDEX IF NOT EXISTS idx_permanent_logs_message_gin 
  ON permanent_logs USING gin(to_tsvector('english', message));