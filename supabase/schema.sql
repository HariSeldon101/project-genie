-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE methodology_type AS ENUM ('agile', 'prince2', 'hybrid');
CREATE TYPE project_role AS ENUM ('owner', 'manager', 'member', 'viewer');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked');
CREATE TYPE rag_status AS ENUM ('green', 'amber', 'red');
CREATE TYPE risk_impact AS ENUM ('very_low', 'low', 'medium', 'high', 'very_high');
CREATE TYPE risk_probability AS ENUM ('very_low', 'low', 'medium', 'high', 'very_high');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    vision TEXT,
    business_case TEXT,
    methodology_type methodology_type NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rag_status rag_status DEFAULT 'green',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members table
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role project_role NOT NULL DEFAULT 'member',
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Artifacts table (stores generated documents)
CREATE TABLE public.artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- 'charter', 'pid', 'backlog', 'risk_register', etc.
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    artifact_id UUID REFERENCES public.artifacts(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reporter_id UUID NOT NULL REFERENCES public.users(id),
    priority INTEGER DEFAULT 3, -- 1 (highest) to 5 (lowest)
    story_points INTEGER,
    sprint_id UUID,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    position INTEGER, -- For ordering in kanban/backlog
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risks table
CREATE TABLE public.risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    impact risk_impact NOT NULL,
    probability risk_probability NOT NULL,
    risk_score INTEGER GENERATED ALWAYS AS (
        CASE impact
            WHEN 'very_low' THEN 1
            WHEN 'low' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'high' THEN 4
            WHEN 'very_high' THEN 5
        END *
        CASE probability
            WHEN 'very_low' THEN 1
            WHEN 'low' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'high' THEN 4
            WHEN 'very_high' THEN 5
        END
    ) STORED,
    mitigation_plan TEXT,
    owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'mitigated', 'closed', 'occurred'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions table
CREATE TABLE public.decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    decision_date DATE NOT NULL,
    outcome TEXT,
    rationale TEXT,
    made_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sprints table (for Agile projects)
CREATE TABLE public.sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'active', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stages table (for Prince2 projects)
CREATE TABLE public.stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sequence INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'active', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stakeholders table
CREATE TABLE public.stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    interest_level VARCHAR(50), -- 'high', 'medium', 'low'
    influence_level VARCHAR(50), -- 'high', 'medium', 'low'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project activity log
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'task', 'risk', 'document', etc.
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_user ON public.project_members(user_id);
CREATE INDEX idx_artifacts_project ON public.artifacts(project_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_risks_project ON public.risks(project_id);
CREATE INDEX idx_sprints_project ON public.sprints(project_id);
CREATE INDEX idx_stages_project ON public.stages(project_id);
CREATE INDEX idx_activity_log_project ON public.activity_log(project_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Project access policies
CREATE POLICY "Project members can view project" ON public.projects
    FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can update project" ON public.projects
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create projects" ON public.projects
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners can delete project" ON public.projects
    FOR DELETE USING (owner_id = auth.uid());

-- Project members policies
CREATE POLICY "Project members can view members" ON public.project_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_members.project_id
            AND (
                projects.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members pm
                    WHERE pm.project_id = projects.id
                    AND pm.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Project owners can manage members" ON public.project_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_members.project_id
            AND projects.owner_id = auth.uid()
        )
    );

-- Tasks policies
CREATE POLICY "Project members can view tasks" ON public.tasks
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

CREATE POLICY "Project members can manage tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = tasks.project_id
            AND project_members.user_id = auth.uid()
        )
    );

-- Similar policies for other tables (artifacts, risks, decisions, etc.)
-- Following the same pattern: project members can view, project members/owners can manage

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artifacts_updated_at BEFORE UPDATE ON public.artifacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON public.risks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON public.decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON public.sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stages_updated_at BEFORE UPDATE ON public.stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stakeholders_updated_at BEFORE UPDATE ON public.stakeholders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();