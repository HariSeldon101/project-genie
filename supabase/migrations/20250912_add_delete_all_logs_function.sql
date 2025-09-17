-- ============================================
-- DELETE ALL LOGS RPC FUNCTION
-- ============================================
-- This creates a bulletproof function to delete all logs
-- Uses SECURITY DEFINER to bypass RLS policies
-- Returns detailed metrics for UI feedback
-- ============================================

-- Drop function if it exists (for idempotency)
DROP FUNCTION IF EXISTS public.delete_all_permanent_logs();

-- Create the delete all logs function
CREATE OR REPLACE FUNCTION public.delete_all_permanent_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
  before_count INT;
  after_count INT;
BEGIN
  -- Get count before deletion for audit trail
  SELECT COUNT(*) INTO before_count FROM permanent_logs;
  
  -- Delete ALL logs (bypasses RLS as SECURITY DEFINER runs with creator's privileges)
  DELETE FROM permanent_logs;
  
  -- Get the actual number of rows deleted
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Verify deletion by checking count after
  SELECT COUNT(*) INTO after_count FROM permanent_logs;
  
  -- Return detailed result for UI feedback
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'before_count', before_count,
    'after_count', after_count,
    'timestamp', NOW(),
    'message', format('Successfully deleted %s logs', deleted_count)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details if something goes wrong
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'before_count', before_count,
      'deleted_count', 0,
      'timestamp', NOW()
    );
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.delete_all_permanent_logs() IS 
'Deletes all logs from permanent_logs table. Uses SECURITY DEFINER to bypass RLS. Returns detailed metrics.';

-- Grant execute permission to authenticated and anon roles
-- This allows the function to be called from the application
GRANT EXECUTE ON FUNCTION public.delete_all_permanent_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_all_permanent_logs TO anon;
GRANT EXECUTE ON FUNCTION public.delete_all_permanent_logs TO service_role;

-- ============================================
-- OPTIONAL: Create a user-specific delete function
-- ============================================
-- This function deletes only the current user's logs
DROP FUNCTION IF EXISTS public.delete_my_logs();

CREATE OR REPLACE FUNCTION public.delete_my_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER -- Uses caller's permissions
AS $$
DECLARE
  deleted_count INT;
  user_id_val UUID;
BEGIN
  -- Get the current user's ID
  user_id_val := auth.uid();
  
  -- Delete only logs for this user (including NULL user_id for anonymous logs)
  DELETE FROM permanent_logs 
  WHERE user_id = user_id_val OR user_id IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'user_id', user_id_val,
    'timestamp', NOW()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', user_id_val
    );
END;
$$;

-- Grant permission for authenticated users to delete their own logs
GRANT EXECUTE ON FUNCTION public.delete_my_logs TO authenticated;

-- ============================================
-- SUCCESS: Functions created
-- ============================================
-- Usage examples:
-- SELECT * FROM delete_all_permanent_logs();  -- Deletes ALL logs
-- SELECT * FROM delete_my_logs();             -- Deletes current user's logs