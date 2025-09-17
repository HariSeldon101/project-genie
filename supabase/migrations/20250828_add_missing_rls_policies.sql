-- Migration: Add missing RLS policies
-- Description: Creates policies for tables with RLS enabled but no policies defined
-- Author: Claude  
-- Date: 2025-08-28

-- Policies for activity_log table
CREATE POLICY "Users can view their own activity logs" ON public.activity_log
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs" ON public.activity_log
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies for decisions table
CREATE POLICY "Project members can view decisions" ON public.decisions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = decisions.project_id
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can manage decisions" ON public.decisions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = decisions.project_id
            AND projects.owner_id = auth.uid()
        )
    );

-- Policies for risks table
CREATE POLICY "Project members can view risks" ON public.risks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = risks.project_id
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can manage risks" ON public.risks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = risks.project_id
            AND projects.owner_id = auth.uid()
        )
    );

-- Policies for sprints table
CREATE POLICY "Project members can view sprints" ON public.sprints
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = sprints.project_id
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can manage sprints" ON public.sprints
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = sprints.project_id
            AND projects.owner_id = auth.uid()
        )
    );

-- Policies for stages table
CREATE POLICY "Project members can view stages" ON public.stages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = stages.project_id
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can manage stages" ON public.stages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = stages.project_id
            AND projects.owner_id = auth.uid()
        )
    );

-- Policies for stakeholders table
CREATE POLICY "Project members can view stakeholders" ON public.stakeholders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = stakeholders.project_id
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can manage stakeholders" ON public.stakeholders
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = stakeholders.project_id
            AND projects.owner_id = auth.uid()
        )
    );