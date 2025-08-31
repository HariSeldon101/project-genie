-- Create bug reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity INTEGER CHECK (severity >= 1 AND severity <= 5) NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')) NOT NULL,
  screenshot_url TEXT,
  screenshot2_url TEXT,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  confirmed_by_user BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bug_reports_project_id ON bug_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON bug_reports(severity);

-- Enable RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can create bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can update their own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Admins can view all bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Admins can update all bug reports" ON bug_reports;

-- Create RLS policies
-- Users can view their own bug reports
CREATE POLICY "Users can view their own bug reports"
  ON bug_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create bug reports
CREATE POLICY "Users can create bug reports"
  ON bug_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bug reports (only certain fields)
CREATE POLICY "Users can update their own bug reports"
  ON bug_reports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all bug reports
CREATE POLICY "Admins can view all bug reports"
  ON bug_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update all bug reports (for resolution)
CREATE POLICY "Admins can update all bug reports"
  ON bug_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bug_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_bug_reports_updated_at ON bug_reports;
CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_bug_report_updated_at();

-- Add comment to the table
COMMENT ON TABLE bug_reports IS 'Tracks bug reports and issues submitted by users';

-- Add column comments
COMMENT ON COLUMN bug_reports.severity IS 'Bug severity rating from 1 (lowest) to 5 (critical)';
COMMENT ON COLUMN bug_reports.status IS 'Current status of the bug report';
COMMENT ON COLUMN bug_reports.confirmed_by_user IS 'Whether the user has confirmed the resolution';