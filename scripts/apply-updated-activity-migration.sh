#!/bin/bash

# Apply Updated Activity Tracking Migration
# Date: 2025-02-04

API_URL="https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query"
PAT_TOKEN="sbp_ce8146f94e3403eca0a088896812e9bbbf08929b"

echo "📦 Applying Updated Activity Tracking Migration..."
echo ""

# Read the SQL file
SQL_FILE="/Users/stuartholmes/Desktop/Udemy & Other Courses/The Complete AI Coding Course - August 2025/project-genie/supabase/migrations/20250204_update_activity_tracking_system.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Migration file not found: $SQL_FILE"
    exit 1
fi

# Read and escape the SQL content
SQL_CONTENT=$(cat "$SQL_FILE")

# Create JSON payload
JSON_PAYLOAD=$(jq -n --arg query "$SQL_CONTENT" '{"query": $query}')

echo "🚀 Sending migration to Supabase..."

# Execute the migration
RESPONSE=$(curl -X POST "$API_URL" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" \
  -s)

# Check if response contains error
if echo "$RESPONSE" | grep -q '"error"'; then
    echo "❌ Migration failed:"
    echo "$RESPONSE" | jq .
    exit 1
elif echo "$RESPONSE" | grep -q '"message"'; then
    # Check if it's an error message
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message // empty')
    if [ ! -z "$MESSAGE" ] && [[ "$MESSAGE" != "null" ]]; then
        echo "❌ Error: $MESSAGE"
        exit 1
    fi
fi

echo "✅ Migration applied successfully!"
echo ""
echo "Response:"
echo "$RESPONSE" | jq .

echo ""
echo "🎉 Activity tracking system is now updated!"