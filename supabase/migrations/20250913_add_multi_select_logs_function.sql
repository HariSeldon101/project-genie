-- Create get_logs_paginated_v3 function for multi-select filters
-- Accepts arrays for level and category filters
CREATE OR REPLACE FUNCTION get_logs_paginated_v3(
  cursor_ts timestamp with time zone DEFAULT NULL,
  filter_categories text[] DEFAULT NULL,  -- Array of categories for multi-select
  filter_levels text[] DEFAULT NULL,      -- Array of levels for multi-select
  filter_search text DEFAULT NULL,
  page_offset integer DEFAULT 0,
  page_size integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
  WHERE (filter_levels IS NULL OR log_level = ANY(filter_levels))  -- Multi-select levels
    AND (filter_categories IS NULL OR category = ANY(filter_categories))  -- Multi-select categories
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
        AND (filter_levels IS NULL OR log_level = ANY(filter_levels))
        AND (filter_categories IS NULL OR category = ANY(filter_categories))
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
      WHERE (filter_levels IS NULL OR log_level = ANY(filter_levels))
        AND (filter_categories IS NULL OR category = ANY(filter_categories))
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

-- Add comment explaining the function
COMMENT ON FUNCTION get_logs_paginated_v3(timestamp with time zone, text[], text[], text, integer, integer) IS
'Fetches paginated logs with multi-select support for levels and categories. Uses arrays for filtering multiple values simultaneously.';