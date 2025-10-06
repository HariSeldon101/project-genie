#!/bin/bash

# Deploy the logs pagination fix using Supabase Management API
echo "🚀 Deploying logs pagination fix v2..."

# Read the SQL file
SQL_CONTENT=$(cat /Users/stuartholmes/Desktop/Udemy\ \&\ Other\ Courses/The\ Complete\ AI\ Coding\ Course\ -\ August\ 2025/project-genie/supabase/migrations/20250912_fix_logs_pagination_v2.sql)

# Escape the SQL for JSON
SQL_ESCAPED=$(echo "$SQL_CONTENT" | jq -Rs .)

# Create the JSON payload
JSON_PAYLOAD="{\"query\": $SQL_ESCAPED}"

# Execute via Management API
echo "📡 Sending to Supabase Management API..."
curl -X POST \
  "https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query" \
  -H "Authorization: Bearer sbp_ce8146f94e3403eca0a088896812e9bbbf08929b" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD"

echo ""
echo "✅ Migration deployment complete!"