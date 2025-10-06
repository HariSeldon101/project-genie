#!/bin/bash

# Apply permanent logs migration using Supabase Management API
# This creates the dedicated permanent_logs table

PROJECT_REF="vnuieavheezjxbkyfxea"
PAT_TOKEN="sbp_ce8146f94e3403eca0a088896812e9bbbf08929b"

echo "Applying permanent_logs table migration..."

# Read the SQL file and escape it properly for JSON
SQL_CONTENT=$(cat supabase/migrations/20250911_create_permanent_logs_table.sql | \
  sed "s/'/\\\'/g" | \
  sed ':a;N;$!ba;s/\n/\\n/g' | \
  sed 's/"/\\"/g')

# Apply the migration
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${SQL_CONTENT}\"}" \
  --silent | jq '.'

echo "Migration applied successfully!"