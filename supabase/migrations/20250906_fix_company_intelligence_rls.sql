-- Fix RLS policies for Company Intelligence tables
-- This migration adds missing RLS policies and fixes test authentication issues

-- 1. Enable RLS for llm_call_logs table
ALTER TABLE llm_call_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for llm_call_logs
CREATE POLICY "Users can view their own LLM logs"
  ON llm_call_logs FOR SELECT
  USING (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM research_sessions
      WHERE research_sessions.id = llm_call_logs.session_id
      AND research_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create LLM logs for their sessions"
  ON llm_call_logs FOR INSERT
  WITH CHECK (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM research_sessions
      WHERE research_sessions.id = llm_call_logs.session_id
      AND research_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own LLM logs"
  ON llm_call_logs FOR UPDATE
  USING (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM research_sessions
      WHERE research_sessions.id = llm_call_logs.session_id
      AND research_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM research_sessions
      WHERE research_sessions.id = llm_call_logs.session_id
      AND research_sessions.user_id = auth.uid()
    )
  );

-- 2. Enable RLS for rate_limit_status table
ALTER TABLE rate_limit_status ENABLE ROW LEVEL SECURITY;

-- Rate limit status should be accessible by all authenticated users
CREATE POLICY "Authenticated users can view rate limits"
  ON rate_limit_status FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update rate limits"
  ON rate_limit_status FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can modify rate limits"
  ON rate_limit_status FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Add service role bypass policies for testing
-- These allow service role to bypass RLS for testing

-- For research_session_logs
CREATE POLICY "Service role bypass for logs"
  ON research_session_logs
  USING (auth.jwt()->>'role' = 'service_role');

-- For llm_call_logs  
CREATE POLICY "Service role bypass for llm logs"
  ON llm_call_logs
  USING (auth.jwt()->>'role' = 'service_role');

-- For rate_limit_status
CREATE POLICY "Service role bypass for rate limits"
  ON rate_limit_status
  USING (auth.jwt()->>'role' = 'service_role');

-- 4. Allow operations without session_id for development
-- This helps with testing when session_id might be null

CREATE POLICY "Allow null session_id for research logs"
  ON research_session_logs FOR INSERT
  WITH CHECK (session_id IS NULL AND auth.uid() IS NOT NULL);

-- 5. Fix for test user operations
-- Allow authenticated users to insert logs without session initially

CREATE POLICY "Allow authenticated inserts without session"
  ON research_session_logs FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (session_id IS NULL OR
     EXISTS (
       SELECT 1 FROM research_sessions
       WHERE research_sessions.id = research_session_logs.session_id
       AND research_sessions.user_id = auth.uid()
     ))
  );

-- Add comments for documentation
COMMENT ON POLICY "Service role bypass for logs" ON research_session_logs IS 'Allows service role to bypass RLS for testing and admin operations';
COMMENT ON POLICY "Service role bypass for llm logs" ON llm_call_logs IS 'Allows service role to bypass RLS for testing and admin operations';
COMMENT ON POLICY "Service role bypass for rate limits" ON rate_limit_status IS 'Allows service role to bypass RLS for testing and admin operations';
COMMENT ON POLICY "Allow null session_id for research logs" ON research_session_logs IS 'Allows initial log creation before session is established';
COMMENT ON POLICY "Allow authenticated inserts without session" ON research_session_logs IS 'Allows test users to create logs during testing';