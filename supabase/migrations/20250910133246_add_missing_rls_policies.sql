-- Add missing RLS policies for tables that have RLS enabled but no policies

-- activity_log policies
CREATE POLICY "Users can view their own activity logs"
ON public.activity_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
ON public.activity_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- admin_settings policies (admin only)
CREATE POLICY "Only admins can view admin settings"
ON public.admin_settings FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Only admins can modify admin settings"
ON public.admin_settings FOR ALL
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin'));

-- decisions policies (linked to projects)
CREATE POLICY "Users can view decisions for their projects"
ON public.decisions FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage decisions for their projects"
ON public.decisions FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- prompt_templates policies
CREATE POLICY "Users can view all prompt templates"
ON public.prompt_templates FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own prompt templates"
ON public.prompt_templates FOR ALL
USING (auth.uid() = created_by);

-- risks policies (linked to projects)
CREATE POLICY "Users can view risks for their projects"
ON public.risks FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage risks for their projects"
ON public.risks FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- sprints policies (linked to projects)
CREATE POLICY "Users can view sprints for their projects"
ON public.sprints FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage sprints for their projects"
ON public.sprints FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- stages policies (linked to projects)
CREATE POLICY "Users can view stages for their projects"
ON public.stages FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage stages for their projects"
ON public.stages FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- stakeholders policies (linked to projects)
CREATE POLICY "Users can view stakeholders for their projects"
ON public.stakeholders FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage stakeholders for their projects"
ON public.stakeholders FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- tasks policies (linked to projects)
CREATE POLICY "Users can view tasks for their projects"
ON public.tasks FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage tasks for their projects"
ON public.tasks FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);