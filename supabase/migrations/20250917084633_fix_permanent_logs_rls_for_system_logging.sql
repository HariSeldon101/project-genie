-- Fix RLS policy for permanent_logs to allow system logging
-- The issue: INSERT policy requires user_id = auth.uid() OR user_id IS NULL
-- But system logs might have a different user_id causing RLS violations

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON permanent_logs;

-- Create a more permissive INSERT policy for system logging
CREATE POLICY "Allow all inserts for system and user logs"
  ON permanent_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Keep the existing SELECT policies for viewing logs
-- Users can still only view their own logs unless they're admin
-- This maintains read security while allowing all writes

COMMENT ON POLICY "Allow all inserts for system and user logs" ON permanent_logs
  IS 'Allows all authenticated users to insert logs without user_id restrictions. This enables both user-initiated and system-generated logs to be written without RLS violations.';