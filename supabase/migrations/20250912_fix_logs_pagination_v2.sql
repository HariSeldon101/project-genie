-- Fix for pagination parameter order issue
-- Supabase passes RPC parameters in alphabetical order, not definition order
-- This new function uses parameter names that work alphabetically

CREATE OR REPLACE FUNCTION get_logs_paginated_v2(
  cursor_ts timestamp with time zone DEFAULT NULL,     -- The timestamp cursor for pagination (like a bookmark)
  filter_category text DEFAULT NULL,                   -- Category to filter by (e.g., 'logs-ui', 'api')
  filter_level text DEFAULT NULL,                      -- Log level to filter by (e.g., 'error', 'info')
  filter_search text DEFAULT NULL,                     -- Text to search for in log messages
  page_offset integer DEFAULT 0,                       -- Offset for pagination (backup method)
  page_size integer DEFAULT 50                         -- Number of logs to return per page
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_logs jsonb;                                       -- Will hold our log entries
  v_total_count integer;                              -- Total number of logs matching filters
  v_has_more boolean;                                 -- Whether there are more pages
  v_next_cursor timestamp with time zone;             -- Cursor for next page
  v_actual_limit integer;                             -- We fetch one extra to check for more
BEGIN
  -- We fetch one extra log to know if there are more pages
  v_actual_limit := page_size + 1;
  
  -- First, count ALL logs that match our filters (for the total count display)
  SELECT COUNT(*) INTO v_total_count
  FROM permanent_logs
  WHERE (filter_level IS NULL OR log_level = filter_level)
    AND (filter_category IS NULL OR category = filter_category)
    AND (filter_search IS NULL OR message ILIKE '%' || filter_search || '%');
  
  -- Now fetch the actual page of logs
  IF cursor_ts IS NOT NULL THEN
    -- If we have a cursor, use it for efficient pagination
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
      WHERE log_timestamp < cursor_ts  -- Get logs before the cursor
        AND (filter_level IS NULL OR log_level = filter_level)
        AND (filter_category IS NULL OR category = filter_category)
        AND (filter_search IS NULL OR message ILIKE '%' || filter_search || '%')
      ORDER BY log_timestamp DESC
      LIMIT v_actual_limit
    ) t;
  ELSE
    -- No cursor, so this is the first page or we're using offset
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
      WHERE (filter_level IS NULL OR log_level = filter_level)
        AND (filter_category IS NULL OR category = filter_category)
        AND (filter_search IS NULL OR message ILIKE '%' || filter_search || '%')
      ORDER BY log_timestamp DESC
      LIMIT v_actual_limit
      OFFSET page_offset
    ) t;
  END IF;
  
  -- Check if we have more results (we fetched one extra)
  IF v_logs IS NOT NULL AND jsonb_array_length(v_logs) > page_size THEN
    v_has_more := true;
    -- Remove the extra item we used for checking
    v_logs := v_logs - -1;  -- Removes last element
  ELSE
    v_has_more := false;
  END IF;
  
  -- Get the cursor for the last item (for next page navigation)
  IF v_logs IS NOT NULL AND jsonb_array_length(v_logs) > 0 THEN
    v_next_cursor := (v_logs->-1->>'log_timestamp')::timestamp with time zone;
  END IF;
  
  -- Return everything in a nice JSON package
  RETURN jsonb_build_object(
    'logs', COALESCE(v_logs, '[]'::jsonb),  -- The actual log entries
    'totalCount', v_total_count,             -- Total logs matching filters
    'hasMore', v_has_more,                   -- Whether there's a next page
    'nextCursor', v_next_cursor              -- Cursor for getting next page
  );
END;
$$;

-- Grant permission so our app can use this function
GRANT EXECUTE ON FUNCTION get_logs_paginated_v2 TO authenticated;

-- Add a helpful comment about this function
COMMENT ON FUNCTION get_logs_paginated_v2 IS 'Fixed version of pagination function with alphabetically-ordered parameters to work with Supabase RPC parameter passing';