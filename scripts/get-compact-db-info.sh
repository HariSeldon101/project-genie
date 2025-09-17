#!/bin/bash

# Get compact database information to avoid large MCP responses
# This returns essential info in <1000 tokens instead of 28,000

PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

echo "📊 Fetching compact database info..."

# Compact query for essential information
SQL_QUERY=$(cat <<'EOF'
-- Compact database summary (minimal tokens)
WITH table_stats AS (
    SELECT
        schemaname,
        tablename,
        n_live_tup as rows,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
),
jsonb_tables AS (
    SELECT
        table_name,
        COUNT(*) as jsonb_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND data_type = 'jsonb'
    GROUP BY table_name
),
index_counts AS (
    SELECT
        tablename,
        COUNT(*) as index_count,
        COUNT(*) FILTER (WHERE indexdef LIKE '%gin%') as gin_indexes
    FROM pg_indexes
    WHERE schemaname = 'public'
    GROUP BY tablename
)
SELECT
    t.tablename as table,
    t.rows,
    t.size,
    COALESCE(j.jsonb_columns, 0) as jsonb_cols,
    COALESCE(i.index_count, 0) as indexes,
    COALESCE(i.gin_indexes, 0) as gin_idx
FROM table_stats t
LEFT JOIN jsonb_tables j ON t.tablename = j.table_name
LEFT JOIN index_counts i ON t.tablename = i.tablename
ORDER BY t.rows DESC;
EOF
)

# Execute and format as markdown table
result=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}")

# Parse and display as table
echo "$result" | jq -r '
  ["Table", "Rows", "Size", "JSONB", "Indexes", "GIN"],
  ["-----", "----", "----", "-----", "-------", "---"],
  (.[] | [.table, .rows, .size, .jsonb_cols, .indexes, .gin_idx])
  | @tsv' | column -t -s $'\t'

echo ""
echo "✅ Compact info retrieved (~500 tokens vs 28,000 tokens)"