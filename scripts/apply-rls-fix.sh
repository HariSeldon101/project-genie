#!/bin/bash

# Apply RLS fix using Supabase Management API
curl -X POST \
  "https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query" \
  -H "Authorization: Bearer sbp_ce8146f94e3403eca0a088896812e9bbbf08929b" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "DROP POLICY IF EXISTS \"Allow all inserts for system and user logs\" ON permanent_logs; CREATE POLICY \"Allow all inserts for logging\" ON permanent_logs FOR INSERT WITH CHECK (true);"
  }'