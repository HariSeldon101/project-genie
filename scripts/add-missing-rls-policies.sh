#!/bin/bash

# Add RLS policies for tables that have RLS enabled but no policies
# Using Supabase Management API with PAT token

PAT_TOKEN="sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
PROJECT_REF="vnuieavheezjxbkyfxea"

echo "🔒 Adding missing RLS policies..."

# SQL query for adding policies
SQL_QUERY=$(cat <<'EOF'
-- Add RLS policies for company intelligence tables that have RLS but no policies

-- 1. company_financial_data - Users can only see their own session data
CREATE POLICY "Users can view their own financial data"
ON public.company_financial_data
FOR SELECT
TO authenticated
USING (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own financial data"
ON public.company_financial_data
FOR INSERT
TO authenticated
WITH CHECK (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

-- 2. company_investor_relations - Users can only see their own session data
CREATE POLICY "Users can view their own investor relations data"
ON public.company_investor_relations
FOR SELECT
TO authenticated
USING (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own investor relations data"
ON public.company_investor_relations
FOR INSERT
TO authenticated
WITH CHECK (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

-- 3. company_linkedin_data - Users can only see their own session data
CREATE POLICY "Users can view their own LinkedIn data"
ON public.company_linkedin_data
FOR SELECT
TO authenticated
USING (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own LinkedIn data"
ON public.company_linkedin_data
FOR INSERT
TO authenticated
WITH CHECK (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

-- 4. company_social_profiles - Users can only see their own session data
CREATE POLICY "Users can view their own social profiles data"
ON public.company_social_profiles
FOR SELECT
TO authenticated
USING (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own social profiles data"
ON public.company_social_profiles
FOR INSERT
TO authenticated
WITH CHECK (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

-- 5. company_google_business - Users can only see their own session data
CREATE POLICY "Users can view their own Google Business data"
ON public.company_google_business
FOR SELECT
TO authenticated
USING (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own Google Business data"
ON public.company_google_business
FOR INSERT
TO authenticated
WITH CHECK (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

-- 6. company_news - Users can only see their own session data
CREATE POLICY "Users can view their own news data"
ON public.company_news
FOR SELECT
TO authenticated
USING (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own news data"
ON public.company_news
FOR INSERT
TO authenticated
WITH CHECK (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

-- 7. external_intelligence_summary - Users can only see their own session data
CREATE POLICY "Users can view their own intelligence summary"
ON public.external_intelligence_summary
FOR SELECT
TO authenticated
USING (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own intelligence summary"
ON public.external_intelligence_summary
FOR INSERT
TO authenticated
WITH CHECK (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

-- 8. llm_call_logs - Users can only see their own logs (based on session_id)
CREATE POLICY "Users can view their own LLM call logs"
ON public.llm_call_logs
FOR SELECT
TO authenticated
USING (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own LLM call logs"
ON public.llm_call_logs
FOR INSERT
TO authenticated
WITH CHECK (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

-- 9. page_intelligence - Users can only see their own session data
CREATE POLICY "Users can view their own page intelligence"
ON public.page_intelligence
FOR SELECT
TO authenticated
USING (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own page intelligence"
ON public.page_intelligence
FOR INSERT
TO authenticated
WITH CHECK (session_id IN (
  SELECT id FROM public.company_intelligence_sessions
  WHERE user_id = auth.uid()
));

-- Add service role access for all tables (for backend operations)
CREATE POLICY "Service role has full access to financial data"
ON public.company_financial_data
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to investor relations"
ON public.company_investor_relations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to LinkedIn data"
ON public.company_linkedin_data
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to social profiles"
ON public.company_social_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to Google Business"
ON public.company_google_business
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to news"
ON public.company_news
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to intelligence summary"
ON public.external_intelligence_summary
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to LLM logs"
ON public.llm_call_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to page intelligence"
ON public.page_intelligence
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
EOF
)

# Execute the query
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}" \
  | jq '.'

echo "✅ Missing RLS policies added!"