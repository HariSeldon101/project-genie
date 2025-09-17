-- Fix execution_locks table to properly reference company_intelligence_sessions
-- First, clean up any orphaned locks
DELETE FROM execution_locks 
WHERE session_id NOT IN (
  SELECT id FROM company_intelligence_sessions
);

-- Add foreign key constraint to ensure referential integrity
ALTER TABLE execution_locks
ADD CONSTRAINT execution_locks_session_id_fkey 
FOREIGN KEY (session_id) 
REFERENCES company_intelligence_sessions(id) 
ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_execution_locks_session_id 
ON execution_locks(session_id);

-- Add index on lock_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_execution_locks_lock_key 
ON execution_locks(lock_key);

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_execution_locks_expires_released 
ON execution_locks(expires_at, released) 
WHERE released = false;

-- Create or replace the cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM execution_locks
  WHERE expires_at < NOW() AND released = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies if not exists
ALTER TABLE execution_locks ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to manage their own locks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'execution_locks' 
    AND policyname = 'Users can manage their session locks'
  ) THEN
    CREATE POLICY "Users can manage their session locks" ON execution_locks
      FOR ALL USING (
        session_id IN (
          SELECT id FROM company_intelligence_sessions 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy for service role to manage all locks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'execution_locks' 
    AND policyname = 'Service role can manage all locks'
  ) THEN
    CREATE POLICY "Service role can manage all locks" ON execution_locks
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;