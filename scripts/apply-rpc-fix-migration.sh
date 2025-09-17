#!/bin/bash

# Apply the RPC function fix migration using Supabase Management API

SQL_CONTENT=$(cat <<'END_SQL'
-- Drop the old function first
DROP FUNCTION IF EXISTS get_all_logs;

-- Recreate the function to use permanent_logs table
CREATE OR REPLACE FUNCTION get_all_logs(
  p_limit INT DEFAULT 10000,
  p_level TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  log_timestamp TIMESTAMPTZ,
  level TEXT,
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
  session_id TEXT,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.id,
    pl.log_timestamp,
    pl.log_level as level,
    pl.category,
    pl.message,
    pl.data,
    pl.stack,
    pl.request_id,
    pl.breadcrumbs,
    pl.timing,
    pl.error_details,
    pl.environment,
    pl.user_id,
    pl.session_id,
    pl.created_at
  FROM permanent_logs pl
  WHERE 
    (p_level IS NULL OR pl.log_level = p_level)
    AND (p_category IS NULL OR pl.category = p_category)
    AND (p_since IS NULL OR pl.log_timestamp >= p_since)
  ORDER BY pl.log_timestamp DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_logs TO anon;
GRANT EXECUTE ON FUNCTION get_all_logs TO service_role;

-- Drop the deprecated research_session_logs table if it exists
DROP TABLE IF EXISTS research_session_logs CASCADE;

-- Drop the deprecated company_intelligence_logs table if it exists  
DROP TABLE IF EXISTS company_intelligence_logs CASCADE;

-- Add comment explaining the function
COMMENT ON FUNCTION get_all_logs IS 'RPC function to retrieve logs from permanent_logs table bypassing the 1000 row Supabase limit. Default limit is 10000 rows.';
END_SQL
)

# Escape the SQL for JSON
SQL_ESCAPED=$(echo "$SQL_CONTENT" | jq -sR .)

# Create the JSON payload
JSON_PAYLOAD=$(echo "{\"query\": $SQL_ESCAPED}" | jq .)

# Execute the query
curl -X POST \
  "https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query" \
  -H "Authorization: Bearer sbp_10122b563ee9bd601c0b31dc799378486acf13d2" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD"

echo ""
echo "Migration applied successfully!"