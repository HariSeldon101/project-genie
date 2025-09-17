-- Update tier limits for project creation
-- Free: 1 project, all methodologies
-- Basic: 3 projects, all methodologies  
-- Premium: 20 projects, all methodologies

-- First, let's create a function to check project limits
CREATE OR REPLACE FUNCTION check_project_limit(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  project_count INTEGER;
  user_tier TEXT;
  max_projects INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT COALESCE(subscription_tier, 'free') INTO user_tier
  FROM profiles
  WHERE id = user_id;
  
  -- Set max projects based on tier
  CASE user_tier
    WHEN 'free' THEN max_projects := 1;
    WHEN 'basic' THEN max_projects := 3;
    WHEN 'premium' THEN max_projects := 20;
    ELSE max_projects := 1; -- Default to free tier
  END CASE;
  
  -- Count user's current projects
  SELECT COUNT(*) INTO project_count
  FROM projects
  WHERE profile_id = user_id;
  
  -- Return true if under limit
  RETURN project_count < max_projects;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the RLS policy for project creation to enforce limits
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;

CREATE POLICY "Users can create projects within tier limits" ON projects
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id 
    AND check_project_limit(auth.uid())
  );

-- Create a function to get tier limits for UI display
CREATE OR REPLACE FUNCTION get_tier_limits(tier TEXT)
RETURNS JSON AS $$
BEGIN
  CASE tier
    WHEN 'free' THEN 
      RETURN json_build_object(
        'max_projects', 1,
        'max_team_members', 2,
        'methodologies', ARRAY['prince2', 'agile', 'hybrid'],
        'history_days', 7,
        'features', json_build_object(
          'conversational_ai', false,
          'analytics', false,
          'api_access', false,
          'custom_branding', false,
          'white_label', false
        )
      );
    WHEN 'basic' THEN 
      RETURN json_build_object(
        'max_projects', 3,
        'max_team_members', 5,
        'methodologies', ARRAY['prince2', 'agile', 'hybrid'],
        'history_days', 90,
        'features', json_build_object(
          'conversational_ai', true,
          'analytics', 'basic',
          'api_access', true,
          'custom_branding', true,
          'white_label', false
        )
      );
    WHEN 'premium' THEN 
      RETURN json_build_object(
        'max_projects', 20,
        'max_team_members', -1, -- Unlimited
        'methodologies', ARRAY['prince2', 'agile', 'hybrid', 'custom'],
        'history_days', -1, -- Unlimited
        'features', json_build_object(
          'conversational_ai', true,
          'analytics', 'advanced',
          'api_access', true,
          'custom_branding', true,
          'white_label', true
        )
      );
    ELSE
      -- Default to free tier
      RETURN get_tier_limits('free');
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_tier_limits IS 'Returns tier-specific limits and features for free, basic, and premium plans';
COMMENT ON FUNCTION check_project_limit IS 'Checks if a user can create more projects based on their subscription tier';