#!/bin/bash

# Apply RLS security fixes for unprotected tables
# Using Supabase Management API with PAT token

PAT_TOKEN="sbp_ce8146f94e3403eca0a088896812e9bbbf08929b"
PROJECT_REF="vnuieavheezjxbkyfxea"

echo "🔒 Applying RLS security fixes..."

# SQL query for security fixes
SQL_QUERY=$(cat <<'EOF'
-- Enable RLS on unprotected public tables
-- These tables were flagged as ERROR level security issues

-- 1. Enable RLS on content_sync_log
ALTER TABLE public.content_sync_log ENABLE ROW LEVEL SECURITY;

-- Create policy for content_sync_log (admin only for now)
CREATE POLICY "Admin users can manage content sync logs"
ON public.content_sync_log
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 2. Enable RLS on media_assets
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Create policy for media_assets (admin only for now)
CREATE POLICY "Admin users can manage media assets"
ON public.media_assets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 3. Enable RLS on website_pages
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

-- Create policy for website_pages (admin only for now)
CREATE POLICY "Admin users can manage website pages"
ON public.website_pages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 4. Enable RLS on webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policy for webhook_events (admin only for now)
CREATE POLICY "Admin users can manage webhook events"
ON public.webhook_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Add comment explaining the security fix
COMMENT ON TABLE public.content_sync_log IS 'Tracks content synchronization between services. RLS enabled for security.';
COMMENT ON TABLE public.media_assets IS 'Stores media asset references. RLS enabled for security.';
COMMENT ON TABLE public.website_pages IS 'Tracks website page information. RLS enabled for security.';
COMMENT ON TABLE public.webhook_events IS 'Logs webhook events from external services. RLS enabled for security.';
EOF
)

# Execute the query
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}" \
  | jq '.'

echo "✅ RLS security fixes applied!"