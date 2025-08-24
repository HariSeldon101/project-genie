-- ============================================
-- COMPREHENSIVE SCHEMA FIX FOR PROJECT GENIE
-- ============================================
-- This migration:
-- 1. Drops all conflicting RLS policies
-- 2. Creates missing tables per PRD requirements
-- 3. Sets up proper RLS policies
-- 4. Adds indexes for performance
-- 5. Creates helper functions

-- ============================================
-- STEP 1: DROP ALL CONFLICTING POLICIES
-- ============================================

-- Drop all existing policies on projects table to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'projects' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
    END LOOP;
END $$;

-- Drop policies on other tables that might conflict
DO $$ 
DECLARE
    pol record;
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['project_members', 'profiles', 'stakeholders', 'tasks', 'risks', 'artifacts'])
    LOOP
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = tbl 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- STEP 2: CREATE/UPDATE TABLES PER PRD
-- ============================================

-- Ensure profiles table exists with all needed fields
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    company_name TEXT,
    company_website TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update projects table to include all PRD fields
ALTER TABLE public.projects 
    ADD COLUMN IF NOT EXISTS company_info JSONB,
    ADD COLUMN IF NOT EXISTS project_type TEXT,
    ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS target_completion DATE,
    ADD COLUMN IF NOT EXISTS actual_completion DATE,
    ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')),
    ADD COLUMN IF NOT EXISTS prince2_stage TEXT,
    ADD COLUMN IF NOT EXISTS agile_sprint INTEGER,
    ADD COLUMN IF NOT EXISTS hybrid_config JSONB;

-- Create decisions table (from PRD section 5.3)
CREATE TABLE IF NOT EXISTS public.decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    decision_date DATE NOT NULL,
    outcome TEXT,
    impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    decided_by UUID REFERENCES public.profiles(id),
    rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table for generated documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'pid', 'charter', 'backlog', 'risk_register', 'business_case',
        'project_plan', 'end_stage_report', 'highlight_report', 
        'sprint_plan', 'retrospective', 'standup_notes'
    )),
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
    methodology TEXT CHECK (methodology IN ('prince2', 'agile', 'hybrid')),
    ai_generated BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_versions for document history
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content JSONB NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    change_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_interactions table for CCI history
CREATE TABLE IF NOT EXISTS public.ai_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    input_text TEXT NOT NULL,
    output_text TEXT,
    command_type TEXT,
    entities_affected JSONB,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    tokens_used INTEGER,
    model_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sprints table for Agile projects
CREATE TABLE IF NOT EXISTS public.sprints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sprint_number INTEGER NOT NULL,
    name TEXT,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    velocity_planned INTEGER,
    velocity_actual INTEGER,
    retrospective JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, sprint_number)
);

-- Create prince2_stages table for Prince2 projects
CREATE TABLE IF NOT EXISTS public.prince2_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    stage_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'exception')),
    end_stage_report JSONB,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, stage_number)
);

-- Add activity_log if it doesn't exist
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update stakeholders table to match PRD
ALTER TABLE public.stakeholders
    ADD COLUMN IF NOT EXISTS influence_level TEXT CHECK (influence_level IN ('low', 'medium', 'high')),
    ADD COLUMN IF NOT EXISTS interest_level TEXT CHECK (interest_level IN ('low', 'medium', 'high')),
    ADD COLUMN IF NOT EXISTS communication_preference TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update risks table to match PRD
ALTER TABLE public.risks
    ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('technical', 'financial', 'operational', 'strategic', 'compliance', 'external')),
    ADD COLUMN IF NOT EXISTS risk_owner UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS review_date DATE,
    ADD COLUMN IF NOT EXISTS residual_impact TEXT,
    ADD COLUMN IF NOT EXISTS residual_probability TEXT;

-- Update tasks table for better Agile/Kanban support
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS story_points INTEGER,
    ADD COLUMN IF NOT EXISTS priority INTEGER,
    ADD COLUMN IF NOT EXISTS labels TEXT[],
    ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================
-- STEP 3: CREATE PROPER RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prince2_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT USING (true); -- Anyone can view profiles

CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- PROJECTS POLICIES (FIXED!)
-- Critical: Allow users to INSERT projects where they are the owner
CREATE POLICY "projects_insert" ON public.projects
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        owner_id = auth.uid()
    );

-- Allow users to SELECT their own projects or projects they're members of
CREATE POLICY "projects_select" ON public.projects
    FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
        )
    );

-- Allow project owners to UPDATE their projects
CREATE POLICY "projects_update" ON public.projects
    FOR UPDATE USING (owner_id = auth.uid());

-- Allow project owners to DELETE their projects
CREATE POLICY "projects_delete" ON public.projects
    FOR DELETE USING (owner_id = auth.uid());

-- PROJECT_MEMBERS POLICIES
CREATE POLICY "project_members_select" ON public.project_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_members.project_id
            AND (projects.owner_id = auth.uid() OR project_members.user_id = auth.uid())
        )
    );

CREATE POLICY "project_members_insert" ON public.project_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_members.project_id
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "project_members_update" ON public.project_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_members.project_id
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "project_members_delete" ON public.project_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_members.project_id
            AND projects.owner_id = auth.uid()
        )
    );

-- TASKS POLICIES
CREATE POLICY "tasks_select" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = tasks.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "tasks_insert" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = tasks.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "tasks_update" ON public.tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = tasks.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "tasks_delete" ON public.tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = tasks.project_id
            AND projects.owner_id = auth.uid()
        )
    );

-- Similar policies for other tables (simplified for brevity)
-- RISKS POLICIES
CREATE POLICY "risks_all" ON public.risks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = risks.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

-- STAKEHOLDERS POLICIES
CREATE POLICY "stakeholders_all" ON public.stakeholders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = stakeholders.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

-- ARTIFACTS POLICIES
CREATE POLICY "artifacts_all" ON public.artifacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = artifacts.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

-- DOCUMENTS POLICIES
CREATE POLICY "documents_all" ON public.documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = documents.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

-- DECISIONS POLICIES
CREATE POLICY "decisions_all" ON public.decisions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = decisions.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

-- SPRINTS POLICIES
CREATE POLICY "sprints_all" ON public.sprints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = sprints.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

-- PRINCE2_STAGES POLICIES
CREATE POLICY "prince2_stages_all" ON public.prince2_stages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = prince2_stages.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

-- AI_INTERACTIONS POLICIES
CREATE POLICY "ai_interactions_own" ON public.ai_interactions
    FOR ALL USING (user_id = auth.uid());

-- ACTIVITY_LOG POLICIES
CREATE POLICY "activity_log_select" ON public.activity_log
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = activity_log.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id
                    AND project_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "activity_log_insert" ON public.activity_log
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_methodology_type ON public.projects(methodology_type);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_rag_status ON public.projects(rag_status);

-- Project members indexes
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique ON public.project_members(project_id, user_id);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON public.tasks(sprint_id);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- Risks indexes
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON public.risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_impact_probability ON public.risks(impact, probability);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON public.activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- ============================================
-- STEP 5: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to get user's project role
CREATE OR REPLACE FUNCTION get_user_project_role(p_project_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
    -- Check if owner
    IF EXISTS (
        SELECT 1 FROM public.projects 
        WHERE id = p_project_id AND owner_id = p_user_id
    ) THEN
        RETURN 'owner';
    END IF;
    
    -- Check if member
    IF EXISTS (
        SELECT 1 FROM public.project_members 
        WHERE project_id = p_project_id AND user_id = p_user_id
    ) THEN
        RETURN (
            SELECT role FROM public.project_members 
            WHERE project_id = p_project_id AND user_id = p_user_id
        );
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate project progress based on tasks
CREATE OR REPLACE FUNCTION calculate_project_progress(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_tasks
    FROM public.tasks
    WHERE project_id = p_project_id;
    
    IF total_tasks = 0 THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*) INTO completed_tasks
    FROM public.tasks
    WHERE project_id = p_project_id
    AND status = 'done';
    
    RETURN ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: CREATE TRIGGERS
-- ============================================

-- Trigger to auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I;
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON public.%I 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- Trigger to ensure profile exists for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        )
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 7: GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant read permissions to anon users (for public data if needed)
GRANT SELECT ON public.profiles TO anon;

-- ============================================
-- FINAL: LOG THE MIGRATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Comprehensive schema fix completed successfully!';
    RAISE NOTICE 'Tables created/updated: profiles, projects, decisions, documents, sprints, prince2_stages, etc.';
    RAISE NOTICE 'RLS policies: Created clean, non-conflicting policies for all tables';
    RAISE NOTICE 'Indexes: Added performance indexes on foreign keys and commonly queried fields';
    RAISE NOTICE 'Functions: Added helper functions for role checking and progress calculation';
    RAISE NOTICE 'Triggers: Added auto-update triggers for timestamps and profile creation';
END $$;