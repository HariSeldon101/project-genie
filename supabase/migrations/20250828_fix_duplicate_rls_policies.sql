-- Migration: Fix duplicate RLS policies
-- Description: Removes duplicate RLS policies that are causing conflicts
-- Author: Claude
-- Date: 2025-08-28

-- Drop the duplicate policies on projects table
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

-- Keep the more specific authenticated-only policies:
-- enable_delete_for_owners
-- enable_insert_for_authenticated_users
-- enable_select_for_owners
-- enable_update_for_owners

-- These remaining policies are properly scoped to authenticated users only