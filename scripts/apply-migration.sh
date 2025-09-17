#!/bin/bash

# Read the SQL file and escape it for JSON
SQL_CONTENT=$(cat supabase/migrations/20250905160532_add_company_intelligence_sessions.sql | \
  sed 's/\\/\\\\/g' | \
  sed 's/"/\\"/g' | \
  sed ':a;N;$!ba;s/\n/\\n/g')

# Create the JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "query": "$SQL_CONTENT"
}
EOF
)

# Execute the migration
curl -X POST \
  "https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query" \
  -H "Authorization: Bearer sbp_10122b563ee9bd601c0b31dc799378486acf13d2" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD"