// Node 18+ has built-in fetch

const SUPABASE_PAT = 'sbp_10122b563ee9bd601c0b31dc799378486acf13d2';
const PROJECT_REF = 'vnuieavheezjxbkyfxea';
const USER_EMAIL = 'stusandboxacc@gmail.com';

async function clearUserData() {
  try {
    // Create the migration SQL
    const migrationSQL = `
-- Clear all test data for stusandboxacc@gmail.com for clean testing
DO $$
DECLARE
    user_id UUID;
    deleted_artifacts INTEGER;
    deleted_projects INTEGER;
BEGIN
    -- Get user ID
    SELECT id INTO user_id FROM auth.users WHERE email = '${USER_EMAIL}';
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'User not found: ${USER_EMAIL}';
        RETURN;
    END IF;
    
    -- Delete all artifacts for user's projects
    DELETE FROM artifacts 
    WHERE project_id IN (
        SELECT id FROM projects 
        WHERE owner_id = user_id
    );
    GET DIAGNOSTICS deleted_artifacts = ROW_COUNT;
    
    -- Delete all projects for the user
    DELETE FROM projects 
    WHERE owner_id = user_id;
    GET DIAGNOSTICS deleted_projects = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % artifacts and % projects for user %', deleted_artifacts, deleted_projects, user_id;
END $$;
`;

    // Apply the migration using Management API
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/migrations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `clear_user_data_${Date.now()}`,
        query: migrationSQL
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to apply migration: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('✅ Successfully cleared user data');
    console.log('Migration result:', result);
    
  } catch (error) {
    console.error('❌ Error clearing user data:', error);
  }
}

clearUserData();