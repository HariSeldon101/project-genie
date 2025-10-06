#!/bin/bash

API_URL="https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query"
AUTH_HEADER="Authorization: Bearer sbp_ce8146f94e3403eca0a088896812e9bbbf08929b"

echo "📍 Applying RLS Performance Fixes..."
echo "===================================="
echo ""

# Function to execute SQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo -n "$description... "
    
    response=$(curl -s -X POST "$API_URL" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$sql\"}")
    
    if [ "$response" = "[]" ]; then
        echo "✅"
    else
        echo "❌"
        echo "  Response: $response"
    fi
}

# Drop all existing policies first
echo "Dropping existing policies..."

execute_sql "DROP POLICY IF EXISTS \"profiles_select_policy\" ON profiles" "Drop profiles_select_policy"
execute_sql "DROP POLICY IF EXISTS \"profiles_update_policy\" ON profiles" "Drop profiles_update_policy"
execute_sql "DROP POLICY IF EXISTS \"Users can view own profile\" ON profiles" "Drop Users can view own profile"
execute_sql "DROP POLICY IF EXISTS \"Users can update own profile\" ON profiles" "Drop Users can update own profile"

execute_sql "DROP POLICY IF EXISTS \"projects_select_policy\" ON projects" "Drop projects_select_policy"
execute_sql "DROP POLICY IF EXISTS \"projects_insert_policy\" ON projects" "Drop projects_insert_policy"
execute_sql "DROP POLICY IF EXISTS \"projects_update_policy\" ON projects" "Drop projects_update_policy"
execute_sql "DROP POLICY IF EXISTS \"projects_delete_policy\" ON projects" "Drop projects_delete_policy"
execute_sql "DROP POLICY IF EXISTS \"Users can view own projects\" ON projects" "Drop Users can view own projects"
execute_sql "DROP POLICY IF EXISTS \"Users can create projects\" ON projects" "Drop Users can create projects"
execute_sql "DROP POLICY IF EXISTS \"Users can update own projects\" ON projects" "Drop Users can update own projects"
execute_sql "DROP POLICY IF EXISTS \"Users can delete own projects\" ON projects" "Drop Users can delete own projects"

execute_sql "DROP POLICY IF EXISTS \"artifacts_select_policy\" ON artifacts" "Drop artifacts_select_policy"
execute_sql "DROP POLICY IF EXISTS \"artifacts_insert_policy\" ON artifacts" "Drop artifacts_insert_policy"
execute_sql "DROP POLICY IF EXISTS \"artifacts_update_policy\" ON artifacts" "Drop artifacts_update_policy"
execute_sql "DROP POLICY IF EXISTS \"artifacts_delete_policy\" ON artifacts" "Drop artifacts_delete_policy"
execute_sql "DROP POLICY IF EXISTS \"Users can view artifacts of their projects\" ON artifacts" "Drop artifacts view policy"
execute_sql "DROP POLICY IF EXISTS \"Users can create artifacts in their projects\" ON artifacts" "Drop artifacts create policy"
execute_sql "DROP POLICY IF EXISTS \"Users can update artifacts in their projects\" ON artifacts" "Drop artifacts update policy"
execute_sql "DROP POLICY IF EXISTS \"Users can delete artifacts in their projects\" ON artifacts" "Drop artifacts delete policy"

execute_sql "DROP POLICY IF EXISTS \"bug_reports_select_policy\" ON bug_reports" "Drop bug_reports_select_policy"
execute_sql "DROP POLICY IF EXISTS \"bug_reports_insert_policy\" ON bug_reports" "Drop bug_reports_insert_policy"
execute_sql "DROP POLICY IF EXISTS \"bug_reports_update_policy\" ON bug_reports" "Drop bug_reports_update_policy"
execute_sql "DROP POLICY IF EXISTS \"Users can view bug reports\" ON bug_reports" "Drop bug reports view policy"
execute_sql "DROP POLICY IF EXISTS \"Users can create bug reports\" ON bug_reports" "Drop bug reports create policy"
execute_sql "DROP POLICY IF EXISTS \"Users can update bug reports\" ON bug_reports" "Drop bug reports update policy"

execute_sql "DROP POLICY IF EXISTS \"generation_analytics_insert_policy\" ON generation_analytics" "Drop analytics insert policy"
execute_sql "DROP POLICY IF EXISTS \"generation_analytics_select_policy\" ON generation_analytics" "Drop analytics select policy"
execute_sql "DROP POLICY IF EXISTS \"Users can insert own analytics\" ON generation_analytics" "Drop user analytics insert"
execute_sql "DROP POLICY IF EXISTS \"Users can view own analytics\" ON generation_analytics" "Drop user analytics view"
execute_sql "DROP POLICY IF EXISTS \"Admins can view all analytics\" ON generation_analytics" "Drop admin analytics view"

echo ""
echo "Creating optimized policies..."

# Create new optimized policies
execute_sql "CREATE POLICY \"profiles_select_own\" ON profiles FOR SELECT USING (id = (SELECT auth.uid()))" "Create profiles_select_own"
execute_sql "CREATE POLICY \"profiles_select_team\" ON profiles FOR SELECT USING (id IN (SELECT user_id FROM project_members WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid()))))" "Create profiles_select_team"
execute_sql "CREATE POLICY \"profiles_update_own\" ON profiles FOR UPDATE USING (id = (SELECT auth.uid()))" "Create profiles_update_own"

execute_sql "CREATE POLICY \"projects_select_owner\" ON projects FOR SELECT USING (owner_id = (SELECT auth.uid()))" "Create projects_select_owner"
execute_sql "CREATE POLICY \"projects_select_member\" ON projects FOR SELECT USING (id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())))" "Create projects_select_member"
execute_sql "CREATE POLICY \"projects_insert\" ON projects FOR INSERT WITH CHECK (owner_id = (SELECT auth.uid()))" "Create projects_insert"
execute_sql "CREATE POLICY \"projects_update_owner\" ON projects FOR UPDATE USING (owner_id = (SELECT auth.uid()))" "Create projects_update_owner"
execute_sql "CREATE POLICY \"projects_delete_owner\" ON projects FOR DELETE USING (owner_id = (SELECT auth.uid()))" "Create projects_delete_owner"

execute_sql "CREATE POLICY \"artifacts_access\" ON artifacts FOR ALL USING (project_id IN (SELECT id FROM projects WHERE owner_id = (SELECT auth.uid()) UNION SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())))" "Create artifacts_access"

execute_sql "CREATE POLICY \"bug_reports_select_own\" ON bug_reports FOR SELECT USING (user_id = (SELECT auth.uid()))" "Create bug_reports_select_own"
execute_sql "CREATE POLICY \"bug_reports_select_admin\" ON bug_reports FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true))" "Create bug_reports_select_admin"
execute_sql "CREATE POLICY \"bug_reports_insert\" ON bug_reports FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()))" "Create bug_reports_insert"
execute_sql "CREATE POLICY \"bug_reports_update_own\" ON bug_reports FOR UPDATE USING (user_id = (SELECT auth.uid()))" "Create bug_reports_update_own"
execute_sql "CREATE POLICY \"bug_reports_update_admin\" ON bug_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true))" "Create bug_reports_update_admin"

execute_sql "CREATE POLICY \"generation_analytics_insert\" ON generation_analytics FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()))" "Create analytics_insert"
execute_sql "CREATE POLICY \"generation_analytics_select_own\" ON generation_analytics FOR SELECT USING (user_id = (SELECT auth.uid()))" "Create analytics_select_own"
execute_sql "CREATE POLICY \"generation_analytics_select_admin\" ON generation_analytics FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true))" "Create analytics_select_admin"

echo ""
echo "✨ RLS Performance fixes applied!"