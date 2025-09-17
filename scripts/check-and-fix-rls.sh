#!/bin/bash

API_URL="https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query"
AUTH_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"

echo "Checking current RLS policies..."

# Check current policies
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT policyname, cmd, roles, with_check FROM pg_policies WHERE tablename = '"'"'permanent_logs'"'"' ORDER BY policyname;"}' | python3 -m json.tool

echo -e "\n\nDropping all INSERT policies and recreating..."

# Drop ALL insert policies to ensure clean state
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "DROP POLICY IF EXISTS \"Allow all inserts for system and user logs\" ON permanent_logs; DROP POLICY IF EXISTS \"Allow all inserts for logging\" ON permanent_logs;"}'

echo "Dropped old policies"

# Create new permissive policy for both anon and authenticated
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE POLICY \"Allow all inserts\" ON permanent_logs FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);"}'

echo "Created new permissive policy"

echo -e "\n\nVerifying new policies..."

# Verify the change
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT policyname, cmd, roles, with_check FROM pg_policies WHERE tablename = '"'"'permanent_logs'"'"' AND cmd = '"'"'INSERT'"'"';"}' | python3 -m json.tool