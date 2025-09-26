-- ============================================================================
-- SYSTEM LOGS TABLE - FALLBACK FOR PERMANENT LOGGER
-- ============================================================================
--
-- Purpose: Create a duplicate of permanent_logs table WITHOUT RLS for reliable
-- server-side logging. This ensures logging never breaks critical API operations.
--
-- Security:
-- - Only accessible via service role key (server-side only)
-- - NO RLS = service role only access
-- - Never exposed to client-side code
-- - Used as fallback when permanent_logs RLS fails
--
-- CLAUDE.md Compliance:
-- - Direct DB access allowed for PermanentLogger (exception to repository pattern)
-- - Never use fallback/mock data (we need real errors)
-- - This ensures errors are always captured
-- ============================================================================

-- Create system_logs table as exact copy of permanent_logs structure
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    log_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    log_level TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    stack TEXT,
    request_id TEXT,
    breadcrumbs JSONB,
    timing JSONB,
    error_details JSONB,
    environment TEXT DEFAULT 'development',
    user_id UUID DEFAULT auth.uid(),
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRITICAL: Disable RLS on this table
-- This ensures service role can always write logs
ALTER TABLE public.system_logs DISABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp
    ON public.system_logs(log_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_level
    ON public.system_logs(log_level);

CREATE INDEX IF NOT EXISTS idx_system_logs_category
    ON public.system_logs(category);

CREATE INDEX IF NOT EXISTS idx_system_logs_user_id
    ON public.system_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_system_logs_request_id
    ON public.system_logs(request_id);

-- Add comment explaining the table's purpose
COMMENT ON TABLE public.system_logs IS
'Fallback logging table without RLS. Used when permanent_logs fails due to RLS violations.
Only accessible via service role key (server-side only).
This ensures logging never breaks API operations per CLAUDE.md guidelines.';

-- Grant minimal permissions (service role already has full access)
-- Explicitly revoke access from other roles for security
REVOKE ALL ON public.system_logs FROM anon;
REVOKE ALL ON public.system_logs FROM authenticated;

-- Add a helper function to check if we should use fallback
CREATE OR REPLACE FUNCTION public.should_use_system_logs()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    -- Use system_logs if:
    -- 1. No authenticated user (auth.uid() is null)
    -- 2. Running as service role
    SELECT auth.uid() IS NULL OR auth.role() = 'service_role';
$$;

COMMENT ON FUNCTION public.should_use_system_logs() IS
'Determines whether to use system_logs table based on auth context.
Returns true for service role or no auth context.';