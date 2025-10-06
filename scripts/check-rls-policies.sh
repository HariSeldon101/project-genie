#!/bin/bash

# Script to check RLS policies on permanent_logs table

echo "🔍 Checking RLS policies on permanent_logs..."
echo "=========================================="

PAT_TOKEN="sbp_ce8146f94e3403eca0a088896812e9bbbf08929b"
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