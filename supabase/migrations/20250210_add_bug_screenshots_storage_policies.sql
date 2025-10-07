-- ============================================
-- ADD STORAGE POLICIES FOR BUG SCREENSHOTS
-- ============================================
-- Issue: bug-screenshots bucket had NO policies
-- Screenshot uploads were failing silently
--
-- Bucket exists: bug-screenshots (public)
-- Problem: No RLS policies allowing INSERT/SELECT/UPDATE/DELETE
--
-- Solution: Create 4 policies:
-- 1. INSERT - Users upload to their own folder (user_id/)
-- 2. SELECT - Public can view (bucket is public)
-- 3. UPDATE - Users can update their own screenshots
-- 4. DELETE - Users can delete their own screenshots
-- ============================================

-- Policy 1: Allow authenticated users to upload screenshots to their own folder
-- File path format: {user_id}/{timestamp}-{filename}
CREATE POLICY "Users can upload bug screenshots" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bug-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 2: Allow public read access to bug screenshots
-- The bucket is marked as public, so anyone can view screenshots
CREATE POLICY "Public can view bug screenshots" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'bug-screenshots');

-- Policy 3: Allow users to update their own screenshots
CREATE POLICY "Users can update their own bug screenshots" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bug-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 4: Allow users to delete their own screenshots
CREATE POLICY "Users can delete their own bug screenshots" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bug-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can upload bug screenshots" ON storage.objects IS
'Allows authenticated users to upload bug report screenshots to their own user folder in the bug-screenshots bucket.';

COMMENT ON POLICY "Public can view bug screenshots" ON storage.objects IS
'Allows public read access to all bug screenshots since the bucket is marked as public.';

COMMENT ON POLICY "Users can update their own bug screenshots" ON storage.objects IS
'Allows users to update screenshots they uploaded (in their own folder).';

COMMENT ON POLICY "Users can delete their own bug screenshots" ON storage.objects IS
'Allows users to delete screenshots they uploaded (in their own folder).';
