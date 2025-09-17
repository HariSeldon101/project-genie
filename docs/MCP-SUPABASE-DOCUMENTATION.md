# MCP Supabase Server Documentation

## Status: ✅ CONNECTED AND WORKING

The Supabase MCP server is now fully functional and connected to your project.

## Configuration Details

- **Package**: `@supabase/mcp-server-supabase@latest`
- **Project Reference**: `vnuieavheezjxbkyfxea`
- **PAT Token**: `sbp_10122b563ee9bd601c0b31dc799378486acf13d2`
- **Config Location**: `/Users/stuartholmes/Library/Application Support/Claude/claude_desktop_config.json`

## Available MCP Functions

### 1. Database Query Functions

#### `mcp__supabase__search_docs`
- **Purpose**: Search Supabase documentation using GraphQL
- **Usage**: For finding documentation about Supabase features
- **Status**: Available

#### `mcp__supabase__list_tables`
- **Purpose**: Lists all tables in specified schemas
- **Usage**: View database structure and table information
- **Status**: ✅ Tested and working
- **Example**: Lists tables with columns, data types, foreign keys, and row counts

#### `mcp__supabase__list_extensions`
- **Purpose**: Lists all PostgreSQL extensions in the database
- **Usage**: Check available database extensions
- **Status**: Available

#### `mcp__supabase__list_migrations`
- **Purpose**: Lists all migrations in the database
- **Usage**: View migration history
- **Status**: Available

#### `mcp__supabase__apply_migration`
- **Purpose**: Applies a migration to the database (DDL operations)
- **Usage**: Create/alter tables, add columns, modify schema
- **Status**: Available
- **Important**: Use this for DDL operations, not execute_sql

#### `mcp__supabase__execute_sql`
- **Purpose**: Executes raw SQL in the Postgres database
- **Usage**: Data queries (SELECT, INSERT, UPDATE, DELETE)
- **Status**: Available
- **Warning**: Use apply_migration for DDL operations

### 2. Project Information Functions

#### `mcp__supabase__get_logs`
- **Purpose**: Gets logs for a Supabase project by service type
- **Usage**: Debug issues with your app
- **Status**: Available
- **Services**: api, branch-action, postgres, edge-function, auth, storage, realtime

#### `mcp__supabase__get_advisors`
- **Purpose**: Gets advisory notices for security and performance
- **Usage**: Check for security vulnerabilities or performance improvements
- **Status**: Available
- **Types**: security, performance

#### `mcp__supabase__get_project_url`
- **Purpose**: Gets the API URL for a project
- **Usage**: Get the Supabase project endpoint
- **Status**: Available

#### `mcp__supabase__get_anon_key`
- **Purpose**: Gets the anonymous API key for a project
- **Usage**: Get the public anon key for client-side code
- **Status**: Available

#### `mcp__supabase__generate_typescript_types`
- **Purpose**: Generates TypeScript types for a project
- **Usage**: Auto-generate types from database schema
- **Status**: Available

### 3. Edge Functions

#### `mcp__supabase__list_edge_functions`
- **Purpose**: Lists all Edge Functions in a Supabase project
- **Usage**: View deployed serverless functions
- **Status**: Available

#### `mcp__supabase__get_edge_function`
- **Purpose**: Retrieves file contents for an Edge Function
- **Usage**: Read edge function code
- **Status**: Available

#### `mcp__supabase__deploy_edge_function`
- **Purpose**: Deploys an Edge Function to a Supabase project
- **Usage**: Deploy serverless functions
- **Status**: Available

### 4. Branch Management (Development Branches)

#### `mcp__supabase__create_branch`
- **Purpose**: Creates a development branch on a Supabase project
- **Usage**: Create isolated development environments
- **Status**: Available

#### `mcp__supabase__list_branches`
- **Purpose**: Lists all development branches of a Supabase project
- **Usage**: View existing branches
- **Status**: Available

#### `mcp__supabase__delete_branch`
- **Purpose**: Deletes a development branch
- **Usage**: Remove unused branches
- **Status**: Available

#### `mcp__supabase__merge_branch`
- **Purpose**: Merges migrations and edge functions from branch to production
- **Usage**: Deploy branch changes to production
- **Status**: Available

#### `mcp__supabase__reset_branch`
- **Purpose**: Resets migrations of a development branch
- **Usage**: Reset branch to specific migration version
- **Status**: Available

#### `mcp__supabase__rebase_branch`
- **Purpose**: Rebases a development branch on production
- **Usage**: Update branch with latest production changes
- **Status**: Available

## Current Database Tables (Confirmed Working)

Successfully retrieved the following tables from the public schema:
- projects (11 rows)
- project_members (0 rows)
- artifacts (13 rows)
- tasks (3 rows)
- risks (6 rows)
- decisions (0 rows)
- sprints (0 rows)
- stages (0 rows)
- stakeholders (0 rows)
- activity_log (0 rows)
- profiles (16 rows)
- admin_settings (1 row)
- prompt_templates (1 row)
- generation_analytics (0 rows)
- bug_reports (3 rows)
- company_intelligence_packs (6 rows)
- research_jobs (26 rows)
- research_sessions (30 rows)
- research_session_logs (0 rows)
- llm_call_logs (0 rows)
- rate_limit_status (0 rows)
- page_intelligence (0 rows)
- corporate_entities (0 rows)
- entity_relationships (0 rows)
- entity_brand_assets (0 rows)
- company_financial_data (0 rows)
- company_investor_relations (0 rows)
- company_linkedin_data (0 rows)
- company_social_profiles (0 rows)
- company_google_business (0 rows)
- company_news (0 rows)
- external_intelligence_summary (0 rows)

## Usage Examples

### List Tables
```javascript
// Using MCP
mcp__supabase__list_tables({ schemas: ["public"] })
```

### Apply Migration
```javascript
// Using MCP for DDL operations
mcp__supabase__apply_migration({
  name: "add_new_column",
  query: "ALTER TABLE projects ADD COLUMN new_field TEXT;"
})
```

### Execute Query
```javascript
// Using MCP for data operations
mcp__supabase__execute_sql({
  query: "SELECT * FROM projects WHERE status = 'active' LIMIT 10;"
})
```

### Get Logs
```javascript
// Debug issues
mcp__supabase__get_logs({
  service: "postgres"  // or api, auth, storage, etc.
})
```

### Check Security
```javascript
// Get security advisories
mcp__supabase__get_advisors({
  type: "security"
})
```

## Troubleshooting

If the MCP server disconnects:
1. Check the configuration file at `/Users/stuartholmes/Library/Application Support/Claude/claude_desktop_config.json`
2. Ensure it uses `@supabase/mcp-server-supabase@latest` (not third-party packages)
3. Verify the PAT token and project reference are correct
4. Restart Claude Desktop completely

## Best Practices

1. **Use `apply_migration` for DDL**: Creating/altering tables should use apply_migration
2. **Use `execute_sql` for DML**: Data queries should use execute_sql
3. **Check advisors regularly**: Run security and performance checks after schema changes
4. **Generate types after changes**: Update TypeScript types after schema modifications
5. **Use branches for development**: Create branches for testing major changes

## Notes

- All MCP functions are prefixed with `mcp__supabase__`
- The server runs with full read/write access (no --read-only flag)
- Logs only return data from the last minute
- The project uses RLS (Row Level Security) on most tables