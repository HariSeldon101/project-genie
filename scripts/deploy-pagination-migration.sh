#!/bin/bash

# Deploy the pagination migration using Supabase Management API
echo "Deploying pagination migration using Management API..."

# Read the SQL file
SQL_CONTENT=$(cat /Users/stuartholmes/Desktop/Udemy\ \&\ Other\ Courses/The\ Complete\ AI\ Coding\ Course\ -\ August\ 2025/project-genie/supabase/migrations/20250912_add_paginated_logs_function.sql)

# Escape the SQL for JSON
SQL_ESCAPED=$(echo "$SQL_CONTENT" | jq -Rs .)

# Create the JSON payload
JSON_PAYLOAD="{\"query\": $SQL_ESCAPED}"

# Execute via Management API
curl -X POST \
  "https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query" \
  -H "Authorization: Bearer sbp_10122b563ee9bd601c0b31dc799378486acf13d2" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD"

echo ""
echo "Migration deployment complete!"