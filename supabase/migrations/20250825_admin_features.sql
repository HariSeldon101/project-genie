-- Add admin features to the database

-- Add is_admin flag to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create admin_settings table for storing LLM configurations
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prompt_templates table for managing system prompts
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT UNIQUE NOT NULL,
  prompt_name TEXT NOT NULL,
  system_prompt TEXT,
  user_prompt TEXT,
  variables JSONB, -- Store expected variables like {{projectName}}, {{vision}}, etc.
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prompt_history table for version tracking
CREATE TABLE IF NOT EXISTS prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_template_id UUID REFERENCES prompt_templates(id) ON DELETE CASCADE,
  system_prompt TEXT,
  user_prompt TEXT,
  version INTEGER NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_reason TEXT
);

-- Create audit_log table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL, -- 'llm_config_change', 'prompt_update', 'user_admin_grant', etc.
  action_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_settings (admin only)
CREATE POLICY "Only admins can view admin_settings" ON admin_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can insert admin_settings" ON admin_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update admin_settings" ON admin_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete admin_settings" ON admin_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for prompt_templates (admin write, all authenticated read)
CREATE POLICY "Authenticated users can view prompt_templates" ON prompt_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert prompt_templates" ON prompt_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update prompt_templates" ON prompt_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete prompt_templates" ON prompt_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for prompt_history (admin only)
CREATE POLICY "Only admins can view prompt_history" ON prompt_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can insert prompt_history" ON prompt_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for admin_audit_log (admin read only, system write)
CREATE POLICY "Only admins can view audit_log" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Allow service role to write to audit log
CREATE POLICY "Service role can insert audit_log" ON admin_audit_log
  FOR INSERT WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default LLM configuration
INSERT INTO admin_settings (setting_key, setting_value)
VALUES ('llm_config', '{
  "provider": "vercel-ai",
  "model": "gpt-5-nano",
  "temperature": 0.7,
  "maxTokens": 4000,
  "ollama": {
    "baseUrl": "http://localhost:11434",
    "enabled": false
  }
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default prompt templates
INSERT INTO prompt_templates (prompt_key, prompt_name, system_prompt, user_prompt, variables, is_active)
VALUES 
  ('prince2_pid', 'PRINCE2 Project Initiation Document', 
   'You are a certified Prince2 Practitioner creating a Project Initiation Document (PID).
You have extensive experience with Prince2 governance, management products, and best practices.
Generate formal, comprehensive documentation that adheres to Prince2 methodology.
IMPORTANT: Use placeholder tokens for people names (e.g., [EXECUTIVE], [SENIOR_USER], [SENIOR_SUPPLIER]).',
   'Create a comprehensive Prince2 Project Initiation Document (PID) for:

Project Name: {{projectName}}
Vision: {{vision}}
Business Case: {{businessCase}}
Description: {{description}}
Company Website: {{companyWebsite}}
Industry Sector: {{sector}}

Key Roles:
- Executive: [EXECUTIVE]
- Senior User: [SENIOR_USER]  
- Senior Supplier: [SENIOR_SUPPLIER]

Additional Stakeholders:
{{stakeholders}}',
   '["projectName", "vision", "businessCase", "description", "companyWebsite", "sector", "stakeholders"]'::jsonb,
   true),
   
  ('prince2_business_case', 'PRINCE2 Business Case',
   'You are a Prince2 Business Analyst creating detailed Business Cases.
You understand financial analysis, benefit realization, and investment appraisal.
Generate data-driven, compelling business justifications with proper JSON structure.',
   'Create a detailed Prince2 Business Case for:

Project Name: {{projectName}}
Business Case Summary: {{businessCase}}
Industry: {{sector}}
Company: {{companyWebsite}}',
   '["projectName", "businessCase", "sector", "companyWebsite"]'::jsonb,
   true),
   
  ('prince2_risk_register', 'PRINCE2 Risk Register',
   'You are a Prince2 Risk Manager creating comprehensive risk assessments.
You understand risk identification, analysis, and response planning.
Generate realistic, industry-specific risks with proper JSON structure.',
   'Create a Prince2 Risk Register for:

Project Name: {{projectName}}
Industry: {{sector}}
Project Description: {{description}}',
   '["projectName", "sector", "description"]'::jsonb,
   true)
ON CONFLICT (prompt_key) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_key ON prompt_templates(prompt_key);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

-- Set the admin user (will be done via Supabase Management API after this migration)
-- UPDATE profiles SET is_admin = true WHERE email = 'stu@bigfluffy.ai';