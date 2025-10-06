#!/bin/bash

# Check Activity Log Table Structure
# Date: 2025-02-04

API_URL="https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query"
PAT_TOKEN="sbp_ce8146f94e3403eca0a088896812e9bbbf08929b"

echo "📊 Checking activity_log table structure..."
echo ""

# Query to check if table exists and get its columns
SQL_QUERY="SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'activity_log'
ORDER BY ordinal_position;"

# Create JSON payload
JSON_PAYLOAD=$(jq -n --arg query "$SQL_QUERY" '{"query": $query}')

# Execute the query
RESPONSE=$(curl -X POST "$API_URL" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" \
  -s)

echo "Current activity_log table structure:"
echo "$RESPONSE" | jq .