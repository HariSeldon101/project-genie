#!/bin/bash

# Apply robust scraping architecture migration using Management API
PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

# Read the migration SQL
SQL=$(cat supabase/migrations/20250911092347_add_robust_scraping_architecture.sql)

# Escape the SQL for JSON
ESCAPED_SQL=$(echo "$SQL" | jq -Rs .)

# Create the JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "query": $ESCAPED_SQL
}
EOF
)

echo "Applying migration using Management API..."

# Execute the migration
curl -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD"

echo ""
echo "Migration applied successfully!"