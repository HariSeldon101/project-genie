#!/bin/bash

# Add GIN indexes for JSONB columns to improve query performance
# Using Supabase Management API with PAT token

PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

echo "🚀 Adding GIN indexes for JSONB columns..."

# SQL query for adding GIN indexes
SQL_QUERY=$(cat <<'EOF'
-- Add GIN indexes for JSONB columns to improve query performance
-- GIN indexes allow efficient searches within JSON structures

-- 1. Projects table - company_info column
CREATE INDEX IF NOT EXISTS idx_projects_company_info_gin
ON public.projects USING gin (company_info);

-- 2. Artifacts table - content and generation_metadata columns
CREATE INDEX IF NOT EXISTS idx_artifacts_content_gin
ON public.artifacts USING gin (content);

CREATE INDEX IF NOT EXISTS idx_artifacts_generation_metadata_gin
ON public.artifacts USING gin (generation_metadata);

-- 3. Activity log - details column
CREATE INDEX IF NOT EXISTS idx_activity_log_details_gin
ON public.activity_log USING gin (details);

-- 4. Corporate entities - brand_assets and social_profiles columns
CREATE INDEX IF NOT EXISTS idx_corporate_entities_brand_assets_gin
ON public.corporate_entities USING gin (brand_assets);

CREATE INDEX IF NOT EXISTS idx_corporate_entities_social_profiles_gin
ON public.corporate_entities USING gin (social_profiles);

-- 5. Entity brand assets - asset_data column
CREATE INDEX IF NOT EXISTS idx_entity_brand_assets_asset_data_gin
ON public.entity_brand_assets USING gin (asset_data);

-- 6. Company intelligence sessions - discovered_urls and merged_data columns
CREATE INDEX IF NOT EXISTS idx_company_intelligence_sessions_discovered_urls_gin
ON public.company_intelligence_sessions USING gin (discovered_urls);

CREATE INDEX IF NOT EXISTS idx_company_intelligence_sessions_merged_data_gin
ON public.company_intelligence_sessions USING gin (merged_data);

CREATE INDEX IF NOT EXISTS idx_company_intelligence_sessions_execution_history_gin
ON public.company_intelligence_sessions USING gin (execution_history);

-- 7. Permanent logs - data, breadcrumbs, timing, and error_details columns
CREATE INDEX IF NOT EXISTS idx_permanent_logs_data_gin
ON public.permanent_logs USING gin (data);

CREATE INDEX IF NOT EXISTS idx_permanent_logs_breadcrumbs_gin
ON public.permanent_logs USING gin (breadcrumbs);

CREATE INDEX IF NOT EXISTS idx_permanent_logs_timing_gin
ON public.permanent_logs USING gin (timing);

CREATE INDEX IF NOT EXISTS idx_permanent_logs_error_details_gin
ON public.permanent_logs USING gin (error_details);

-- 8. Company financial data - metadata column
CREATE INDEX IF NOT EXISTS idx_company_financial_data_metadata_gin
ON public.company_financial_data USING gin (metadata);

-- 9. Company investor relations - multiple JSONB columns
CREATE INDEX IF NOT EXISTS idx_company_investor_relations_annual_reports_gin
ON public.company_investor_relations USING gin (annual_reports);

CREATE INDEX IF NOT EXISTS idx_company_investor_relations_quarterly_reports_gin
ON public.company_investor_relations USING gin (quarterly_reports);

CREATE INDEX IF NOT EXISTS idx_company_investor_relations_press_releases_gin
ON public.company_investor_relations USING gin (press_releases);

-- 10. Company LinkedIn data - headquarters, recent_posts, locations columns
CREATE INDEX IF NOT EXISTS idx_company_linkedin_data_headquarters_gin
ON public.company_linkedin_data USING gin (headquarters);

CREATE INDEX IF NOT EXISTS idx_company_linkedin_data_recent_posts_gin
ON public.company_linkedin_data USING gin (recent_posts);

CREATE INDEX IF NOT EXISTS idx_company_linkedin_data_locations_gin
ON public.company_linkedin_data USING gin (locations);

-- 11. Company social profiles - engagement_metrics and recent_activity columns
CREATE INDEX IF NOT EXISTS idx_company_social_profiles_engagement_metrics_gin
ON public.company_social_profiles USING gin (engagement_metrics);

CREATE INDEX IF NOT EXISTS idx_company_social_profiles_recent_activity_gin
ON public.company_social_profiles USING gin (recent_activity);

-- 12. Page intelligence - classification_data, structured_data, meta_data columns
CREATE INDEX IF NOT EXISTS idx_page_intelligence_classification_data_gin
ON public.page_intelligence USING gin (classification_data);

CREATE INDEX IF NOT EXISTS idx_page_intelligence_structured_data_gin
ON public.page_intelligence USING gin (structured_data);

CREATE INDEX IF NOT EXISTS idx_page_intelligence_meta_data_gin
ON public.page_intelligence USING gin (meta_data);

-- 13. Webhook events - payload column
CREATE INDEX IF NOT EXISTS idx_webhook_events_payload_gin
ON public.webhook_events USING gin (payload);

-- Add regular indexes for frequently queried columns
-- These are B-tree indexes for exact matches and range queries

-- Session IDs (for joining)
CREATE INDEX IF NOT EXISTS idx_company_financial_data_session_id
ON public.company_financial_data (session_id);

CREATE INDEX IF NOT EXISTS idx_company_investor_relations_session_id
ON public.company_investor_relations (session_id);

CREATE INDEX IF NOT EXISTS idx_company_linkedin_data_session_id
ON public.company_linkedin_data (session_id);

CREATE INDEX IF NOT EXISTS idx_company_social_profiles_session_id
ON public.company_social_profiles (session_id);

CREATE INDEX IF NOT EXISTS idx_company_google_business_session_id
ON public.company_google_business (session_id);

CREATE INDEX IF NOT EXISTS idx_company_news_session_id
ON public.company_news (session_id);

CREATE INDEX IF NOT EXISTS idx_page_intelligence_session_id
ON public.page_intelligence (session_id);

-- Timestamp indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_permanent_logs_log_timestamp
ON public.permanent_logs (log_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_permanent_logs_log_level
ON public.permanent_logs (log_level);

CREATE INDEX IF NOT EXISTS idx_permanent_logs_category
ON public.permanent_logs (category);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_permanent_logs_level_category_timestamp
ON public.permanent_logs (log_level, category, log_timestamp DESC);

-- Company intelligence sessions status and user
CREATE INDEX IF NOT EXISTS idx_company_intelligence_sessions_user_status
ON public.company_intelligence_sessions (user_id, status);

-- Execution metrics for performance monitoring
CREATE INDEX IF NOT EXISTS idx_execution_metrics_session_scraper
ON public.execution_metrics (session_id, scraper_id);

-- Add comment explaining the indexes
COMMENT ON INDEX idx_projects_company_info_gin IS 'GIN index for efficient JSONB searches in company_info';
COMMENT ON INDEX idx_permanent_logs_data_gin IS 'GIN index for searching within log data';
COMMENT ON INDEX idx_permanent_logs_log_timestamp IS 'B-tree index for time-based log queries';

-- Analyze tables to update statistics after adding indexes
ANALYZE public.projects;
ANALYZE public.artifacts;
ANALYZE public.corporate_entities;
ANALYZE public.company_intelligence_sessions;
ANALYZE public.permanent_logs;
ANALYZE public.company_financial_data;
ANALYZE public.company_investor_relations;
ANALYZE public.company_linkedin_data;
ANALYZE public.company_social_profiles;
ANALYZE public.page_intelligence;
EOF
)

# Execute the query
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}" \
  | jq '.'

echo "✅ GIN indexes added successfully!"