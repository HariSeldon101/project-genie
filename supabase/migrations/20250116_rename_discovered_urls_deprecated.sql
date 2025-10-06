-- Migration: Rename discovered_urls to deprecated and clear all data
-- Date: 2025-01-16
-- Purpose: Data has been migrated to merged_data.site_analysis.sitemap_pages
-- This column is no longer used but kept for schema history

BEGIN;

-- Step 1: Clear all data from the column
UPDATE company_intelligence_sessions
SET discovered_urls = '[]'::jsonb
WHERE discovered_urls IS NOT NULL;

-- Step 2: Rename the column to clearly indicate it's deprecated
ALTER TABLE company_intelligence_sessions
RENAME COLUMN discovered_urls TO deprecated_discovered_urls_do_not_use;

-- Step 3: Add documentation comments
COMMENT ON COLUMN company_intelligence_sessions.deprecated_discovered_urls_do_not_use IS
'DEPRECATED - DO NOT USE. Column retained for schema history only. All data has been cleared. URLs are now stored in merged_data.site_analysis.sitemap_pages';

-- Step 4: Update table comment
COMMENT ON TABLE company_intelligence_sessions IS
'Company intelligence research sessions. URLs are stored in merged_data.site_analysis.sitemap_pages. The deprecated_discovered_urls_do_not_use column is retained for history but should not be used.';

COMMIT;