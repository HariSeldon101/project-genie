# Troubleshooting Guide

## Common Issues and Solutions

### Database Token Optimization

#### Problem: Excessive Token Usage
**Symptom**: Claude's context window fills up quickly with database information

#### Never Use These Token-Heavy Calls:
```typescript
// ❌ FORBIDDEN - Uses 28,000+ tokens
mcp__supabase__list_tables

// ❌ FORBIDDEN - Uses 16,000-33,000 tokens  
mcp__supabase__get_advisors
```

#### Always Use Compact Functions Instead:
```sql
-- ✅ Database overview (~200 tokens vs 28,000)
SELECT * FROM get_compact_db_info();

-- ✅ Security status check (~100 tokens vs 16,000)
SELECT * FROM get_security_summary();

-- ✅ Top tables by size (~300 tokens vs 28,000)
SELECT * FROM get_top_tables_compact(10);
```

#### Token Usage Comparison:
| Query Type | MCP Tokens | Compact SQL | Savings |
|------------|------------|-------------|---------|
| Database Info | 28,000 | 200 | 99.3% |
| Security Check | 16,000 | 100 | 99.4% |
| Table Stats | 28,000 | 300 | 98.9% |

### CORS Errors in Components

#### Problem: URL Validation Fails with CORS
**Symptom**: Browser console shows CORS policy errors

#### Root Cause:
Client-side components trying to validate URLs directly

#### Solution:
```typescript
// ❌ WRONG - Client-side validation causes CORS
import { validateUrls } from '@/lib/utils/url-validator'
const validUrls = await validateUrls(urls)  // Fails with CORS!

// ✅ CORRECT - Server-side validation
// In API route:
import { validateUrls } from '@/lib/utils/url-validator'
const validUrls = await validateUrls(urls)  // Works!

// In client component:
const response = await fetch('/api/validate-urls', {
  method: 'POST',
  body: JSON.stringify({ urls })
})
```

### Empty Logger Responses

#### Problem: PermanentLogger Returns Empty
**Symptom**: Logs show as empty or null

#### Check Authentication Context:
1. Verify SSR vs regular client usage
2. Check if component uses correct Supabase client
3. Ensure auth is stored in cookies (SSR) not localStorage

#### Solution:
See `/docs/authentication-issues.md` for detailed fix

### Supabase MCP Server Issues

#### Problem: MCP Server Shows Read-Only
**Symptom**: Cannot apply migrations via MCP

#### Solutions:
1. **Check Configuration**: `/Users/stuartholmes/Library/Application Support/Claude/claude_desktop_config.json`
2. **Remove read-only flag** if present
3. **Restart Claude Desktop** completely
4. **Use PAT token fallback**:
```bash
curl -X POST \
  "https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query" \
  -H "Authorization: Bearer sbp_10122b563ee9bd601c0b31dc799378486acf13d2" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_SQL_HERE"}'
```

### TypeScript Compilation Errors

#### Problem: Type Errors After DB Changes
**Symptom**: TypeScript errors about missing or incorrect types

#### Solution:
```bash
# Regenerate types from remote database
supabase gen types typescript --project-id vnuieavheezjxbkyfxea > lib/database.types.ts

# Clear TypeScript cache
rm -rf node_modules/.cache
rm -rf .next

# Rebuild
npm run dev
```

### Stream Connection Issues

#### Problem: SSE Streams Disconnect
**Symptom**: Real-time updates stop working

#### Diagnostics:
```typescript
// Add debugging to StreamReader
const reader = new StreamReader({
  url: '/api/stream',
  onEvent: (event) => console.log('Event received:', event),
  onError: (error) => console.error('Stream error:', error),
  onReconnect: (attempt) => console.log('Reconnecting...', attempt),
  reconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5
})
```

#### Common Causes:
1. **Timeout**: Increase server timeout settings
2. **Memory leak**: Ensure cleanup on unmount
3. **Network**: Check proxy/firewall settings
4. **CORS**: Verify headers in API response

### Repository Pattern Violations

#### Problem: Direct DB Access in Components
**Symptom**: Supabase calls in UI components

#### How to Identify:
```bash
# Search for violations
grep -r "from('@/lib/supabase')" components/
grep -r "supabase.from(" components/
```

#### Fix Pattern:
```typescript
// ❌ WRONG - Direct access in component
const { data } = await supabase.from('table').select()

// ✅ CORRECT - Through API and repository
// In component:
const response = await fetch('/api/entities')
const data = await response.json()

// In API route:
const repository = EntityRepository.getInstance()
const data = await repository.findAll()
```

### Build Performance Issues

#### Problem: Slow Build Times
**Symptom**: Build takes >5 minutes

#### Solutions:
1. **Check bundle size**:
```bash
npm run analyze
```

2. **Optimize imports**:
```typescript
// ❌ BAD - Imports entire library
import * as Icons from 'lucide-react'

// ✅ GOOD - Specific imports
import { Home, Search, Menu } from 'lucide-react'
```

3. **Enable SWC**:
```javascript
// next.config.js
module.exports = {
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}
```

### Memory Leaks

#### Problem: Application Slows Over Time
**Symptom**: Performance degrades, memory usage increases

#### Common Causes and Fixes:

1. **Uncleaned Event Listeners**:
```typescript
useEffect(() => {
  const handler = () => {}
  window.addEventListener('resize', handler)
  
  // ✅ ALWAYS clean up
  return () => window.removeEventListener('resize', handler)
}, [])
```

2. **Unclosed Streams**:
```typescript
useEffect(() => {
  const reader = new StreamReader({...})
  reader.start()
  
  // ✅ ALWAYS close streams
  return () => reader.close()
}, [])
```

3. **Infinite State Updates**:
```typescript
// ❌ BAD - Missing dependency causes infinite loop
useEffect(() => {
  setData(processData(data))
}, []) // Missing 'data' dependency

// ✅ GOOD - Proper dependencies
useEffect(() => {
  setData(processData(data))
}, [data])
```

### Authentication Failures

#### Problem: User Logged In But Actions Fail
**Symptom**: 401/403 errors despite being logged in

#### Diagnostic Steps:
1. **Check auth storage location** (cookies vs localStorage)
2. **Verify RLS policies** in Supabase
3. **Check session expiry**
4. **Verify service role key** not exposed client-side

#### Quick Debug:
```typescript
// Add to component to debug auth state
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    console.log('Auth session:', session)
    console.log('User:', session?.user)
  }
  checkAuth()
}, [])
```

### Hot Reload Not Working

#### Problem: Changes Not Reflecting
**Symptom**: Code changes don't appear in browser

#### Solutions:
1. **Clear Next.js cache**:
```bash
rm -rf .next
npm run dev
```

2. **Check for syntax errors** in terminal
3. **Verify file watching**:
```javascript
// next.config.js
module.exports = {
  watchOptions: {
    poll: 1000,
    aggregateTimeout: 300,
  }
}
```

4. **Restart dev server**:
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Environment Variable Issues

#### Problem: Env Vars Not Loading
**Symptom**: undefined environment variables

#### Checklist:
1. **Prefix client vars** with `NEXT_PUBLIC_`
2. **Restart server** after .env changes
3. **Check .env.local** exists and formatted correctly
4. **No quotes** in .env file (unless part of value)
5. **No spaces** around = in .env

#### Debug Helper:
```typescript
// Debug env vars (remove in production!)
console.log('Env check:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
})
```

### Deployment Failures

#### Problem: Vercel Build Fails
**Symptom**: Works locally but fails on Vercel

#### Common Causes:
1. **Missing env vars** in Vercel settings
2. **Case sensitivity** (works on Mac, fails on Linux)
3. **Incompatible Node version**
4. **Missing dependencies** in package.json

#### Debugging:
```bash
# Test production build locally
npm run build
npm run start

# Check for case issues
find . -name "*.ts" -o -name "*.tsx" | xargs grep -E "from ['\"].*['\"]" | grep -v node_modules
```

### Database Migration Errors

#### Problem: Migration Fails to Apply
**Symptom**: SQL errors when running migrations

#### Solutions:
1. **Check for conflicts**:
```bash
supabase db diff
```

2. **Verify migration order**:
```bash
ls -la supabase/migrations/
```

3. **Test on fresh database**:
```sql
-- Be careful! This drops everything
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

4. **Apply migrations one by one**:
```bash
supabase db push --include=20250101_initial.sql
supabase db push --include=20250102_add_table.sql
```

## Quick Reference Debugging Commands

```bash
# Check what's running on ports
lsof -i :3000
lsof -i :54321  # Supabase local

# Clear all caches
rm -rf .next node_modules/.cache

# Check for TypeScript errors
npx tsc --noEmit

# Find large files
find . -type f -size +1M | grep -v node_modules | grep -v .git

# Check for console.logs in production code
grep -r "console.log" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules

# Verify all imports resolve
npx madge --circular --extensions ts,tsx .

# Check bundle size
npx next-bundle-analyzer

# Database connection test
npx tsx scripts/test-db-connection.ts
```

## When All Else Fails

1. **Clear everything**:
```bash
rm -rf node_modules .next
npm install
npm run dev
```

2. **Check Discord/GitHub Issues** for similar problems
3. **Enable verbose logging** in affected components
4. **Binary search** - comment out half the code to isolate issue
5. **Fresh clone** - clone repo to new location and test
6. **Ask for help** with specific error messages and steps to reproduce
