-- Create company_intelligence_logs table for permanent logging
-- This replaces the old research_session_logs table

CREATE TABLE IF NOT EXISTS public.company_intelligence_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  component TEXT NOT NULL,
  event TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_intelligence_logs_timestamp ON public.company_intelligence_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_company_intelligence_logs_level ON public.company_intelligence_logs(level);
CREATE INDEX IF NOT EXISTS idx_company_intelligence_logs_component ON public.company_intelligence_logs(component);
CREATE INDEX IF NOT EXISTS idx_company_intelligence_logs_session ON public.company_intelligence_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_company_intelligence_logs_user ON public.company_intelligence_logs(user_id);

-- Enable RLS
ALTER TABLE public.company_intelligence_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow service role full access
CREATE POLICY "service_role_all" ON public.company_intelligence_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow users to read their own logs
CREATE POLICY "users_read_own" ON public.company_intelligence_logs
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    user_id IS NULL -- Allow reading system logs
  );

-- Allow authenticated users to insert logs
CREATE POLICY "authenticated_insert" ON public.company_intelligence_logs
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.company_intelligence_logs TO service_role;
GRANT SELECT, INSERT ON public.company_intelligence_logs TO authenticated;
GRANT SELECT ON public.company_intelligence_logs TO anon;