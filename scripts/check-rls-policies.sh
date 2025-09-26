#!/bin/bash

# Script to check RLS policies on permanent_logs table

echo "🔍 Checking RLS policies on permanent_logs..."
echo "=========================================="

PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

# Query to check all policies on permanent_logs
SQL_QUERY="SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'permanent_logs' ORDER BY policyname;"

# Execute query
echo "📤 Fetching policies..."
curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$SQL_QUERY\"}" | jq '.[]'

echo ""
echo "🔍 Checking if anon role can SELECT from permanent_logs..."
SQL_CHECK="SELECT COUNT(*) as log_count FROM permanent_logs WHERE user_id IS NULL LIMIT 5;"

curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$SQL_CHECK\"}" | jq '.'