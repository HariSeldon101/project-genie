-- Migration: Enable RLS on critical tables
-- Description: Fixes security vulnerabilities where RLS policies exist but RLS is not enabled
-- Author: Claude
-- Date: 2025-08-28

-- Enable RLS on projects table (has policies but RLS disabled)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on project_members table (has policies but RLS disabled)
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin_settings table (no RLS at all - security risk)
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_settings - only authenticated users can view their settings
CREATE POLICY "Users can view their own admin settings" ON public.admin_settings
    FOR SELECT
    USING (auth.uid() = updated_by);

CREATE POLICY "Users can insert their own admin settings" ON public.admin_settings
    FOR INSERT
    WITH CHECK (auth.uid() = updated_by);

CREATE POLICY "Users can update their own admin settings" ON public.admin_settings
    FOR UPDATE
    USING (auth.uid() = updated_by)
    WITH CHECK (auth.uid() = updated_by);

-- Enable RLS on prompt_templates table (no RLS at all - security risk)
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for prompt_templates - authenticated users can manage their own
CREATE POLICY "Users can view their own prompt templates" ON public.prompt_templates
    FOR SELECT
    USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own prompt templates" ON public.prompt_templates
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own prompt templates" ON public.prompt_templates
    FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own prompt templates" ON public.prompt_templates
    FOR DELETE
    USING (auth.uid() = created_by);