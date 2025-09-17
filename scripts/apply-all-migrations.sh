#!/bin/bash

# Apply both migrations using Management API
PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

echo "Applying company_intelligence_sessions migration..."

# First migration - create company_intelligence_sessions table
SQL1=$(cat supabase/migrations/20250911_create_company_intelligence_sessions.sql)
ESCAPED_SQL1=$(echo "$SQL1" | jq -Rs .)

curl -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $ESCAPED_SQL1}" \
  -s | jq '.'

echo ""
echo "Applying robust architecture migration..."

# Second migration - robust architecture
SQL2=$(cat supabase/migrations/20250911092347_add_robust_scraping_architecture.sql)
ESCAPED_SQL2=$(echo "$SQL2" | jq -Rs .)

curl -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $ESCAPED_SQL2}" \
  -s | jq '.'

echo ""
echo "All migrations applied!"