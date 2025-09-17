-- Create an improved paginated logs function with proper cursor support
CREATE OR REPLACE FUNCTION get_paginated_permanent_logs(
  p_cursor timestamp with time zone DEFAULT NULL,
  p_page_size integer DEFAULT 50,
  p_level text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_logs jsonb;
  v_total_count integer;
  v_has_more boolean;
  v_next_cursor timestamp with time zone;
  v_actual_limit integer;
BEGIN
  -- Set actual limit to page_size + 1 to check for more pages
  v_actual_limit := p_page_size + 1;
  
  -- Get total count for the filtered results
  SELECT COUNT(*) INTO v_total_count
  FROM permanent_logs
  WHERE (p_level IS NULL OR log_level = p_level)
    AND (p_category IS NULL OR category = p_category)
    AND (p_search IS NULL OR message ILIKE '%' || p_search || '%');
  
  -- Get paginated logs using cursor or offset
  IF p_cursor IS NOT NULL THEN
    -- Cursor-based pagination (more efficient)
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
        'session_id', session_id,
        'breadcrumbs', breadcrumbs,
        'timing', timing,
        'error_details', error_details,
        'environment', environment,
        'user_id', user_id
      ) ORDER BY log_timestamp DESC
    )
    INTO v_logs
    FROM (
      SELECT *
      FROM permanent_logs
      WHERE log_timestamp < p_cursor
        AND (p_level IS NULL OR log_level = p_level)
        AND (p_category IS NULL OR category = p_category)
        AND (p_search IS NULL OR message ILIKE '%' || p_search || '%')
      ORDER BY log_timestamp DESC
      LIMIT v_actual_limit
    ) t;
  ELSE
    -- Offset-based pagination (fallback)
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
        'session_id', session_id,
        'breadcrumbs', breadcrumbs,
        'timing', timing,
        'error_details', error_details,
        'environment', environment,
        'user_id', user_id
      ) ORDER BY log_timestamp DESC
    )
    INTO v_logs
    FROM (
      SELECT *
      FROM permanent_logs
      WHERE (p_level IS NULL OR log_level = p_level)
        AND (p_category IS NULL OR category = p_category)
        AND (p_search IS NULL OR message ILIKE '%' || p_search || '%')
      ORDER BY log_timestamp DESC
      LIMIT v_actual_limit
      OFFSET p_offset
    ) t;
  END IF;
  
  -- Check if there are more results
  IF v_logs IS NOT NULL AND jsonb_array_length(v_logs) > p_page_size THEN
    v_has_more := true;
    -- Remove the extra item used for checking
    v_logs := v_logs - -1;
  ELSE
    v_has_more := false;
  END IF;
  
  -- Get the cursor for the last item if we have logs
  IF v_logs IS NOT NULL AND jsonb_array_length(v_logs) > 0 THEN
    v_next_cursor := (v_logs->-1->>'log_timestamp')::timestamp with time zone;
  END IF;
  
  -- Return the result
  RETURN jsonb_build_object(
    'logs', COALESCE(v_logs, '[]'::jsonb),
    'totalCount', v_total_count,
    'hasMore', v_has_more,
    'nextCursor', v_next_cursor
  );
END;
$$;

-- Add index for efficient cursor-based pagination if not exists
CREATE INDEX IF NOT EXISTS idx_permanent_logs_timestamp_desc 
ON permanent_logs(log_timestamp DESC);

-- Add composite indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_permanent_logs_level_timestamp 
ON permanent_logs(log_level, log_timestamp DESC) 
WHERE log_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_permanent_logs_category_timestamp 
ON permanent_logs(category, log_timestamp DESC) 
WHERE category IS NOT NULL;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_paginated_permanent_logs TO authenticated;

COMMENT ON FUNCTION get_paginated_permanent_logs IS 'Retrieves paginated logs with cursor-based pagination support for efficient scrolling through large datasets';