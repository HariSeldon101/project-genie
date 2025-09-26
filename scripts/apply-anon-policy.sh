#!/bin/bash

# Script to apply the anonymous users RLS policy for permanent_logs
# This fixes the issue where logs API returns empty results when not authenticated

echo "🔧 Applying RLS policy for anonymous users..."
echo "=========================================="

# Use the PAT token directly with the Management API
PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

# SQL query to add the policy
SQL_QUERY="
-- Add RLS policy to allow anonymous users to view public logs (where user_id is NULL)
CREATE POLICY \"Anonymous users can view public logs\"
ON public.permanent_logs
FOR SELECT
TO anon
USING (user_id IS NULL);
"

# Apply via Management API
echo "📤 Sending migration to Supabase..."
RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$SQL_QUERY\"}")

# Check if successful
if echo "$RESPONSE" | grep -q "error"; then
  echo "❌ Error applying policy:"
  echo "$RESPONSE" | jq '.'
  exit 1
else
  echo "✅ RLS policy added successfully!"
  echo ""
  echo "The following policy was added:"
  echo "  - Anonymous users can now view logs where user_id IS NULL"
  echo ""
  echo "🎯 Next step: Test the /api/logs endpoint"
fi