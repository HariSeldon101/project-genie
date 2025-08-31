-- Fix search_path vulnerabilities in functions
-- Security Advisory: Functions without explicit search_path are vulnerable to SQL injection
-- This migration secures all identified functions

-- 1. Fix update_bug_report_updated_at function
ALTER FUNCTION update_bug_report_updated_at() SET search_path = public;

-- 2. Fix handle_new_user function  
ALTER FUNCTION handle_new_user() SET search_path = public;

-- 3. Fix update_updated_at_column function
ALTER FUNCTION update_updated_at_column() SET search_path = public;

-- Add documentation comments
COMMENT ON FUNCTION update_bug_report_updated_at() IS 'Updates updated_at timestamp for bug_reports table. Search path secured against SQL injection.';
COMMENT ON FUNCTION handle_new_user() IS 'Creates profile for new auth users. Search path secured against SQL injection.';
COMMENT ON FUNCTION update_updated_at_column() IS 'Generic updated_at trigger function. Search path secured against SQL injection.';