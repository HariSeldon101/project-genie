-- Add RLS policy to allow anonymous users to view public logs (where user_id is NULL)
-- This fixes the issue where the logs API returns empty results when not authenticated
--
-- ROOT CAUSE: The existing RLS policies only allow 'authenticated' role to SELECT from permanent_logs.
-- When the API isn't authenticated, it uses the 'anon' role which has no SELECT permissions.
-- This policy allows anon users to view logs that have no user_id (public/system logs).

CREATE POLICY "Anonymous users can view public logs"
ON public.permanent_logs
FOR SELECT
TO anon
USING (user_id IS NULL);

-- Add a comment to document this policy
COMMENT ON POLICY "Anonymous users can view public logs" ON public.permanent_logs IS
'Allows unauthenticated requests to view logs that have no user_id (public logs). This is necessary for development and debugging when authentication is not available. Added 2025-01-17 to fix empty logs API responses.';