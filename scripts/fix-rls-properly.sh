#!/bin/bash

# Script to properly fix RLS policies for permanent_logs
# The issue: API can't read logs because there's no SELECT policy for anon role

echo "🔧 Fixing RLS policies for permanent_logs..."
echo "=========================================="

PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

# First, let's drop any existing policy for anon if it exists
echo "📤 Dropping any existing anon policy..."
DROP_SQL="DROP POLICY IF EXISTS \"Anonymous users can view public logs\" ON public.permanent_logs;"

curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$DROP_SQL\"}" > /dev/null 2>&1

# Now create the correct policy
echo "📤 Creating new RLS policy for anonymous users..."
CREATE_SQL="CREATE POLICY \"Anon can view logs with null user_id\" ON public.permanent_logs FOR SELECT TO anon USING (user_id IS NULL);"

RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$CREATE_SQL\"}")

# Check if successful
if echo "$RESPONSE" | grep -q "error"; then
  echo "❌ Error creating policy:"
  echo "$RESPONSE" | jq '.'
else
  echo "✅ Policy created successfully!"
fi

# Verify the policy was created
echo ""
echo "📋 Verifying RLS policies..."
VERIFY_SQL="SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'permanent_logs' AND roles::text LIKE '%anon%' ORDER BY policyname;"

VERIFY_RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$VERIFY_SQL\"}")

echo "Policies with 'anon' role:"
echo "$VERIFY_RESPONSE" | jq '.[]'

echo ""
echo "🎯 Testing if anon can now SELECT from permanent_logs..."
TEST_SQL="SELECT COUNT(*) as count FROM permanent_logs WHERE user_id IS NULL LIMIT 1;"

TEST_RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$TEST_SQL\"}")

echo "Log count accessible to anon: "
echo "$TEST_RESPONSE" | jq '.[0].count'

echo ""
echo "✅ Done! Test the /api/logs endpoint now."