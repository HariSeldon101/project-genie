-- Migration: Add missing credit columns for production compatibility
-- Date: 2025-01-30
-- Issue: Production code expects credit columns that don't exist in database
-- Solution: Add columns with safe defaults to restore functionality

-- Add credit tracking columns to profiles table
-- These are used by the company intelligence features
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credits_balance integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS credits_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_total integer DEFAULT 1000;

-- Add user_id column for backwards compatibility if any code expects it
-- This mirrors the id column to maintain compatibility
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Populate user_id with existing id values
UPDATE profiles
SET user_id = id
WHERE user_id IS NULL;

-- Create index for performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_credits_balance ON profiles(credits_balance);

-- Add comment to document the purpose of these columns
COMMENT ON COLUMN profiles.credits_balance IS 'Current available credits for the user';
COMMENT ON COLUMN profiles.credits_used IS 'Total credits consumed by the user';
COMMENT ON COLUMN profiles.credits_total IS 'Total credits allocated to the user';
COMMENT ON COLUMN profiles.user_id IS 'Backwards compatibility column - mirrors id';

-- Create a trigger to keep user_id in sync with id for new insertions
CREATE OR REPLACE FUNCTION sync_profiles_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set user_id if it's not already set
  IF NEW.user_id IS NULL THEN
    NEW.user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS ensure_profiles_user_id_sync ON profiles;
CREATE TRIGGER ensure_profiles_user_id_sync
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profiles_user_id();

-- Ensure existing users have reasonable credit defaults
-- Only update if credits_balance is NULL (shouldn't be after adding with DEFAULT)
UPDATE profiles
SET credits_balance = 1000
WHERE credits_balance IS NULL;

UPDATE profiles
SET credits_total = credits_balance
WHERE credits_total IS NULL;

UPDATE profiles
SET credits_used = 0
WHERE credits_used IS NULL;

-- Verification query (commented out, for manual verification)
-- SELECT id, email, user_id, credits_balance, credits_used, credits_total
-- FROM profiles
-- LIMIT 5;