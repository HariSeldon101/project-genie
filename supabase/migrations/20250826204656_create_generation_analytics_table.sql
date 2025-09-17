-- Create generation_analytics table for tracking document generation metrics
CREATE TABLE IF NOT EXISTS public.generation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_generation_analytics_project_id ON public.generation_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_analytics_user_id ON public.generation_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_analytics_created_at ON public.generation_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_analytics_document_type ON public.generation_analytics(document_type);

-- Enable RLS
ALTER TABLE public.generation_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analytics" ON public.generation_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON public.generation_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.generation_analytics TO authenticated;

-- Add comment
COMMENT ON TABLE public.generation_analytics IS 'Tracks document generation metrics and analytics for cost and performance monitoring';