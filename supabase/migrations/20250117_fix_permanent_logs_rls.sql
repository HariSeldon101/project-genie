-- Fix RLS policies for permanent_logs to allow logging from all contexts
-- This is a development fix to unblock the logging system

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Allow all inserts for system and user logs" ON permanent_logs;

-- Create new permissive INSERT policy
-- IMPORTANT: This allows both authenticated and anonymous inserts
-- This is necessary because the logger needs to work in all contexts:
-- 1. Server-side (no auth context)
-- 2. Client-side (may or may not have auth)
-- 3. Pre-authentication (error logging before login)
CREATE POLICY "Allow all inserts for logging"
ON permanent_logs
FOR INSERT
WITH CHECK (true);

-- Keep existing SELECT policies for security
-- Users can only see their own logs or system logs (null user_id)
-- Admins can see all logs

COMMENT ON POLICY "Allow all inserts for logging" ON permanent_logs IS
'Permissive insert policy to allow logging from all contexts (server, client, anonymous).
Security is maintained through SELECT policies that restrict who can view logs.';