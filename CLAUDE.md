# Claude Assistant Configuration

## 🚨 CRITICAL RULES - READ FIRST (P0 PRIORITY)

### MANDATORY CHECKLIST FOR EVERY SESSION
1. **Start**: Read PROJECT_MANIFEST.json (`npm run manifest:update`)
2. **Plan Mode Exit**: Write analysis to `[problem]-[date]-[time].md` with full context
3. **Local Dev Only**: NEVER auto-deploy to GitHub/Vercel
4. **No Mock Data**: NEVER use fallback/mock data - let errors happen
5. **Repository Pattern**: ALL database access through repositories
6. **Session Management**: ONLY use getOrCreateUserSession() - NEVER createSession()
7. **Error Logging**: ONLY use captureError() - no .error() method exists!
8. **Supabase Errors**: ALWAYS convert using convertSupabaseError() - See /docs/supabase-nextjs-best-practices.md
9. **UUID Generation**: NEVER generate in code - use PostgreSQL gen_random_uuid()
10. **Unified Events**: ALWAYS use EventFactory from @/lib/realtime-events
11. **Test First**: Script on ONE file before bulk operations
12. **Type Check**: Generate types after EVERY database update

## 📋 DEVELOPMENT WORKFLOW (MANDATORY ORDER)

### 1. Problem Analysis Phase
```bash
# Exit plan mode with analysis file:
[problem-description]-[YYYY-MM-DD]-[HH-MM].md
# Include: Full context, granular TODOs, phases, mermaid diagrams
# Use TodoWrite task manager for complex tasks
```

### 2. Component Creation Checklist
- [ ] Document ALL endpoints with interfaces
- [ ] Document ALL functions with signatures
- [ ] Document database schema changes
- [ ] Create flow diagrams (mermaid) - See /docs/mermaid-diagrams-guide.md
- [ ] Check /lib/utils for existing functions (DRY)
- [ ] Ensure mobile responsive (Tailwind)
- [ ] Add tooltips to ALL UI elements
- [ ] Use semantic HTML (see /docs/semantic-html-guidelines-for-llms.md)

### 3. Database Update Process (REMOTE SUPABASE ONLY)
```bash
# IMPORTANT: No local DB - always working with remote Supabase
1. supabase migration new [descriptive_name]
2. Apply migration to remote: supabase db push
3. supabase gen types typescript --project-id vnuieavheezjxbkyfxea > lib/database.types.ts
```

### 4. Post-Implementation
```bash
npm run manifest:update     # Update project manifest
npm run test:all            # Run all tests
git status                  # Review changes
```

## 🔴 SUPABASE ERROR HANDLING (CRITICAL)

### ⚠️ SUPABASE ERRORS ARE NOT ERROR INSTANCES!

Supabase returns PostgrestError objects, NOT JavaScript Error instances. You MUST convert them properly:

```typescript
// ❌ WRONG - Will log "[object Object]"
if (error) {
  permanentLogger.captureError('CATEGORY', error, context)
}

// ✅ CORRECT - Convert to Error first
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

if (error) {
  permanentLogger.captureError('CATEGORY', convertSupabaseError(error), context)
}
```

### Required Pattern for All Repositories
```typescript
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

// In repository methods:
const { data, error } = await supabase.from('table').select()

if (error) {
  const jsError = convertSupabaseError(error)
  permanentLogger.captureError('REPO_NAME', jsError, { operation: 'methodName' })
  throw jsError
}
```

### Reference Documentation
- **Complete Guide**: `/docs/supabase-nextjs-best-practices.md`
- **Error Helper**: `/lib/utils/supabase-error-helper.ts`
- **Best Practices**: Authentication, RLS, Type Safety, Performance

## 🔴 PERMANENTLOGGER - COMPLETE REFERENCE (CRITICAL)

### Available Methods - EXACT SIGNATURES
```typescript
import { permanentLogger } from '@/lib/utils/permanent-logger'

// THESE ARE THE ONLY METHODS THAT EXIST:
permanentLogger.info(category: string, message: string, data?: any): void
permanentLogger.warn(category: string, message: string, data?: any): void
permanentLogger.debug(category: string, message: string, data?: any): void
permanentLogger.captureError(category: string, error: Error, context?: any): void
permanentLogger.breadcrumb(action: string, message: string, data?: any): void
permanentLogger.timing(label: string, metadata?: any): TimingHandle

// ❌ THESE DO NOT EXIST - COMPILATION WILL FAIL:
permanentLogger.error()    // NO! Use captureError()
permanentLogger.log()      // NO! Use info()
```

### When to Use Each Method
```typescript
// INFO - Normal operations, successful completions
permanentLogger.info('API_USERS', 'User created successfully', { userId })

// WARN - Recoverable issues, deprecations, unusual conditions
permanentLogger.warn('API_RATE_LIMIT', 'Approaching rate limit', { remaining: 10 })

// DEBUG - Detailed debugging info (dev environment only)
permanentLogger.debug('PARSER', 'Parsing HTML structure', { nodeCount: 42 })

// CAPTURE ERROR - ALL error conditions (with stack traces)
permanentLogger.captureError('API_USERS', error as Error, {
  endpoint: '/api/users',
  method: 'POST',
  userId
})

// BREADCRUMB - Track user journey at interface boundaries
permanentLogger.breadcrumb('nav_click', 'User navigated to dashboard', {
  from: 'home',
  to: 'dashboard'
})

// TIMING - Performance measurement
const timer = permanentLogger.timing('database_query', { query: 'SELECT...' })
// ... perform operation ...
const duration = timer.stop()  // Returns milliseconds
```

### Complete Implementation Pattern
```typescript
export async function POST(req: NextRequest) {
  // Start overall timing
  const totalTimer = permanentLogger.timing('api_total_duration')
  
  // Entry breadcrumb
  permanentLogger.breadcrumb('api_entry', 'Request received', {
    endpoint: '/api/analyze',
    method: 'POST',
    headers: Object.fromEntries(req.headers.entries())
  })

  try {
    // Log start
    permanentLogger.info('API_ANALYZE', 'Starting analysis', {
      timestamp: new Date().toISOString()
    })

    // Parse body
    const body = await req.json()
    permanentLogger.breadcrumb('parse_body', 'Request body parsed', {
      hasData: !!body.data
    })

    // Check for issues
    if (!body.domain) {
      permanentLogger.warn('API_ANALYZE', 'Missing domain in request', { body })
    }

    // Time external call
    permanentLogger.breadcrumb('external_call_start', 'Fetching external data')
    const fetchTimer = permanentLogger.timing('external_fetch')
    
    const response = await fetch(body.domain)
    const fetchDuration = fetchTimer.stop()
    
    permanentLogger.breadcrumb('external_call_end', 'External data fetched', {
      status: response.status,
      duration: fetchDuration
    })

    // Process
    const processTimer = permanentLogger.timing('data_processing')
    const result = await processData(response)
    processTimer.stop()

    // Success
    permanentLogger.info('API_ANALYZE', 'Analysis completed', {
      resultSize: result.length,
      totalDuration: totalTimer.stop()
    })

    return NextResponse.json(result)

  } catch (error) {
    // ALWAYS use captureError for errors
    permanentLogger.captureError('API_ANALYZE', error as Error, {
      endpoint: '/api/analyze',
      stage: 'processing',
      requestBody: req.body
    })
    
    totalTimer.stop()  // Stop timer even on error
    
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}
```

### TimingHandle Interface
```typescript
interface TimingHandle {
  stop(): number        // Stops timer, returns duration in ms
  cancel(): void        // Cancels without recording
  checkpoint(name: string, metadata?: any): void  // Add intermediate checkpoint
}

// Usage with checkpoints
const timer = permanentLogger.timing('multi_step_process')
timer.checkpoint('step1_complete', { items: 10 })
timer.checkpoint('step2_complete', { items: 20 })
const total = timer.stop()  // Returns total time
```

### Categories Convention
Use SCREAMING_SNAKE_CASE for categories:
```typescript
'API_USERS'           // API endpoints
'REPO_USERS'          // Repository operations
'SERVICE_EMAIL'       // Service operations
'SCRAPER_MAIN'        // Scraper operations
'AUTH_FLOW'           // Authentication
'MIGRATION_RUN'       // Database migrations
```

### Breadcrumb Best Practices
Add breadcrumbs at ALL interface boundaries:
- API route entry/exit
- External service calls
- Database operations start/end
- User interactions (clicks, navigations)
- State transitions
- Queue operations
- File I/O operations

## 🔴 SESSION MANAGEMENT (CRITICAL - PREVENTS LOCKING)

### ⚠️ COMPANY INTELLIGENCE SESSIONS - USE ONLY getOrCreateUserSession()

The company_intelligence_sessions table has a UNIQUE constraint on (user_id, domain). You MUST use the correct method to handle this constraint.

### ❌ NEVER USE - Causes Constraint Violations:
```typescript
// WRONG - Will cause duplicate key violations
await repository.createSession(userId, companyName, domain)
```

### ✅ ALWAYS USE - Handles All Cases:
```typescript
// CORRECT - Handles existing sessions, reactivation, and race conditions
await repository.getOrCreateUserSession(userId, domain)
```

### Why getOrCreateUserSession() is MANDATORY:
1. **Checks for ANY existing session** (not just active ones)
2. **Reactivates inactive sessions** automatically
3. **Returns existing active sessions** without error
4. **Handles race conditions** (concurrent requests)
5. **Respects unique constraints** on user_id + domain
6. **Creates new sessions** only when truly needed

### The Algorithm:
```
1. Check for existing session (any status)
2. If found and inactive → reactivate it
3. If found and active → return it
4. If not found → create new session
5. If creation fails with duplicate key → fetch and return existing (race condition)
```

### Error Pattern to Watch For:
```
Error: duplicate key value violates unique constraint "unique_user_domain"
```
This error means createSession() was used instead of getOrCreateUserSession().

## 🔴 MERMAID DIAGRAMS - MANDATORY COMPONENT USAGE

### ✅ CORRECT: Always Use MermaidDiagram Component
```typescript
import { MermaidDiagram } from '@/components/mermaid-diagram'

// ALWAYS use the reusable React component
<MermaidDiagram
  definition={mermaidCode}
  type="flowchart"
  title="Process Flow"
  showControls={true}  // Enables SVG/PNG export + copy buttons
  lazy={true}          // Performance: lazy load when visible
  cache={true}         // Cache rendered SVGs
/>
```

### ❌ FORBIDDEN: Direct mermaidService Usage
```typescript
// NEVER do this - violates DRY principles
import { mermaidService } from '@/lib/services/mermaid-service'
await mermaidService.initialize({...})  // NO!
await mermaidService.render(...)         // NO!
```

### Why MermaidDiagram Component is MANDATORY:
1. **Error Boundaries**: Automatic error handling with fallbacks
2. **Loading States**: Built-in spinner, no manual implementation
3. **Export Features**: SVG/PNG export buttons included
4. **Lazy Loading**: IntersectionObserver for performance
5. **Caching**: Automatic caching of rendered diagrams
6. **Copy to Clipboard**: Built-in copy functionality
7. **Consistent Theming**: Single initialization point

## 🔴 PDF EXPORT - MANDATORY COMPONENT USAGE

### ✅ CORRECT: Always Use DirectPDFDownloadButton
```typescript
import { DirectPDFDownloadButton } from '@/components/documents/pdf-download-button'

// ALWAYS use the component for PDF downloads
<DirectPDFDownloadButton
  document={document}
  buttonText="Download PDF"
  showIcon={true}
  whiteLabel={false}
  showDraft={false}
  classification="PUBLIC"
  forceRegenerate={false}
/>
```

### ❌ FORBIDDEN: Direct API Calls
```typescript
// NEVER do this - violates DRY principles
const response = await fetch('/api/pdf/generate', {
  method: 'POST',
  body: JSON.stringify(requestBody)
})  // NO! Use component
```

### Critical PDF Features Preserved:
- PDF generation via `/api/pdf/generate` endpoint
- Document formatting with unified formatters
- Watermarking and classification options
- Force regenerate capability
- White label support
- Draft watermarks

## 🛠️ CORE PRINCIPLES (NO EXCEPTIONS)

### Architecture Rules
1. **Stability > Performance** - Optimize only after profiling
2. **DRY/SOLID** - No duplicate code, separation of concerns
3. **Repository Pattern** - UI → API → Repository → Database
4. **Database-First** - URLs from DB, never from UI
5. **No Graceful Degradation** - Let errors happen and fix
6. **500-Line Soft Limit** - Review files >500 lines for refactoring
7. **Extensibility** - Make features easy to add
8. **Remove Legacy Code** - Archive to /archive/ folder

### Event System (UNIFIED ONLY)
```typescript
// ✅ CORRECT - Unified system
import { EventFactory } from '@/lib/realtime-events'
import { StreamReader } from '@/lib/realtime-events'
import { StreamWriter } from '@/lib/realtime-events'

// ❌ FORBIDDEN - Old systems
import from '@/lib/company-intelligence/utils/sse-event-factory'  // NO!
import from '@/lib/notifications/utils/event-factory'  // NO!
```

### Database Access
```typescript
// ✅ CORRECT - Repository pattern
const repository = EntityRepository.getInstance()
const data = await repository.findById(id)

// ❌ FORBIDDEN - Direct access
const { data } = await supabase.from('table').select()
```

## 🔧 QUICK REFERENCE

### Local Development Commands
```bash
npm run dev                 # Start dev server (port 3000)
lsof -ti:3000 | xargs kill -9 && npm run dev  # Rebuild
npm run validate            # Type-check and lint
npm run manifest:update     # Update PROJECT_MANIFEST.json
npx tsx test-company-intelligence-comprehensive.ts  # Test
```

### Viewing Mermaid Diagrams
```bash
# Cursor IDE Setup (IDE in use for this project)
# Note: Cursor is a VS Code-based IDE with AI features
cursor --install-extension bierner.markdown-mermaid  # Core support
cursor --install-extension bpruitt-goddard.mermaid-markdown-syntax-highlighting  # Syntax

# Quick Preview Options
- **GitHub**: Push to repo - automatic rendering
- **Cursor**: Cmd+Shift+V for preview with extensions
- **Online**: https://mermaid.live for testing
- **Full Guide**: /docs/mermaid-diagrams-guide.md#editor-support--setup
```

### Supabase Management (REMOTE ONLY)
```bash
# PAT Token: sbp_10122b563ee9bd601c0b31dc799378486acf13d2
# Project Ref: vnuieavheezjxbkyfxea

# Apply migrations to remote:
supabase db push

# Generate types from remote:
supabase gen types typescript --project-id vnuieavheezjxbkyfxea > lib/database.types.ts

# Use Management API when MCP fails:
curl -X POST \
  "https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query" \
  -H "Authorization: Bearer sbp_10122b563ee9bd601c0b31dc799378486acf13d2" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_SQL_HERE"}'
```

### Type Signatures & Enums
```typescript
// ALWAYS check exact signatures - NO guessing
// Use TypeScript strict mode
// Use enums for fixed lists:
enum Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETE = 'complete'
}
```

## 📊 DOCUMENTATION REQUIREMENTS

### Every Component Must Document:
1. **Interfaces**: Full TypeScript definitions
2. **Endpoints**: Method, path, input/output schemas
3. **Flow**: Mermaid diagrams for complex processes
4. **Schema**: Database changes with migration comments
5. **Context**: Comments for technical PMs (limited dev skills)

### Data Contract Enforcement
- TypeScript interfaces for ALL data
- Runtime validation at boundaries
- Clear error messages for violations
- Version compatibility checks

## 🎯 UI/UX STANDARDS

### UI Libraries
- **Primary**: shadcn/ui + Tailwind CSS
- **Icons**: lucide-react (consistent set)

### Tooltips (MANDATORY)
```tsx
// ✅ ALWAYS use TooltipWrapper
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'

<TooltipWrapper content="Action description">
  <Button>Click Me</Button>
</TooltipWrapper>

// ❌ NEVER use other tooltip implementations
```

### Semantic HTML
- Use proper elements (`<article>`, `<section>`, `<nav>`)
- Maintain heading hierarchy (one h1, sequential h2-h6)
- Form labels for ALL inputs
- See: `/docs/semantic-html-guidelines-for-llms.md`

### Mobile Responsiveness
- Tailwind responsive classes (`sm:`, `md:`, `lg:`)
- 375px minimum viewport
- 44x44px minimum touch targets
- Responsive images with srcset

### UK English (Documentation Only)
- organisation (not organization)
- optimise (not optimize)  
- analyse (not analyze)
- Code variables keep US spelling for consistency

## 🔍 TESTING REQUIREMENTS

### Mandatory Before Every Commit
```bash
npm run test:all
# Company Intelligence: test-company-intelligence-comprehensive.ts
# E2E: npm run test:e2e
```

### Rules
- NEVER create new test files
- ENHANCE existing tests when UI changes
- Maintain 100% coverage for UI components
- Test accounts in Supabase:
  - stusandboxacc@gmail.com
  - test@project-genie.com
  - test@bigfluffy.ai
  - test@projectgenie.dev

## 🔒 MANDATORY CODE AUDIT (FINAL DEVELOPMENT STEP)

### ⚠️ REQUIRED: Comprehensive Audit Before Any Component is Used

Every refactored or new component MUST undergo a comprehensive audit before integration. This audit ensures CLAUDE.md compliance, prevents runtime errors, and documents breaking changes.

### Audit Structure (7 Phases):

#### Phase 1: CLAUDE.md Compliance Check
- [ ] PermanentLogger usage (correct signatures, no .error() or .log())
- [ ] Repository pattern (no direct DB access)
- [ ] Session management (getOrCreateUserSession only)
- [ ] Error handling (convertSupabaseError for Supabase errors)
- [ ] No mock data or hardcoded fallbacks
- [ ] UUID generation (PostgreSQL only)
- [ ] Event system (unified EventFactory only)
- [ ] Cost display (credits/tokens only, never dollars)

#### Phase 2: Interface & Type Verification
- [ ] All interfaces properly typed (no `any` unless justified)
- [ ] Enums match expected values
- [ ] Props interface complete and accurate
- [ ] Return types explicitly defined

#### Phase 3: Function Signature Verification
- [ ] permanentLogger methods match exact signatures
- [ ] Imported utilities exist with correct signatures
- [ ] Callbacks match parent expectations
- [ ] All async functions properly handled

#### Phase 4: Dependency Verification
- [ ] All import paths resolve
- [ ] No circular dependencies
- [ ] All components/utilities exist at imported paths
- [ ] Version compatibility checked

#### Phase 5: Architecture Compliance
- [ ] Repository pattern maintained
- [ ] Single responsibility principle preserved
- [ ] SSE delegation correct (if applicable)
- [ ] Database access through repositories only

#### Phase 6: Breaking Changes Analysis
**Upstream Impact (Components using this):**
- [ ] Interface changes documented
- [ ] Method signature changes noted
- [ ] Required prop changes listed
- [ ] Migration steps provided

**Downstream Impact (Dependencies):**
- [ ] API compatibility maintained
- [ ] Type exports still valid
- [ ] Enum values unchanged (or changes documented)
- [ ] Database schema compatible

#### Phase 7: Runtime Risk Assessment
- [ ] Null/undefined handling verified
- [ ] Type assertions safe
- [ ] Optional chaining used appropriately
- [ ] Error boundaries in place (for components)
- [ ] Loading states handled
- [ ] Edge cases considered

### Audit Report Template
```markdown
# Audit Report: [Component Name]
**Date:** [YYYY-MM-DD]
**Component:** [File Path]
**Lines:** [Line Count]
**Audit Type:** Comprehensive Code Compliance Review

## CLAUDE.md Compliance Score: X/10

### ✅ Compliant Areas:
- [List all guidelines followed correctly]

### ⚠️ Issues Found:
- **[SEVERITY]** [Issue description] - Line [X]
  - Current: [What's wrong]
  - Should Be: [Correct implementation]
  - Impact: [What breaks]

### 📦 Breaking Changes:
#### Upstream:
- [Components affected and how]

#### Downstream:
- [Dependencies affected and how]

### 🔧 Required Fixes (Priority):
1. **[P0 - BUILD BLOCKER]** [Critical fixes]
2. **[P1 - HIGH]** [Important fixes]
3. **[P2 - MEDIUM]** [Should fix]

### ✅ Verification Checklist:
- [ ] All P0 issues resolved
- [ ] All P1 issues resolved or documented
- [ ] Breaking changes communicated
- [ ] Tests updated if needed
```

### When to Run Audit:
1. **ALWAYS after refactoring** (>30% code change)
2. **ALWAYS when creating new components**
3. **ALWAYS when changing interfaces/APIs**
4. **Before marking TODO items complete**
5. **Before creating PRs**

### Audit Output:
- Create `[component-name]-audit-[YYYY-MM-DD].md` file
- Include in PR description
- Reference in TodoWrite completion notes

### Time Investment:
- Simple component: ~5-10 minutes
- Complex component: ~15-20 minutes
- Critical system: ~30 minutes

**NO CODE SHIPS WITHOUT AUDIT**

## 📚 EXTERNAL DOCUMENTATION

### Troubleshooting Guides
- Authentication: `/docs/authentication-issues.md`
- API Integration: `/docs/api-integration-guide.md`
- Repository Pattern: `/docs/repository-pattern-architecture.md`

### Development Patterns
- Event System: `/docs/development-patterns.md`
- Error Logging: `/docs/error-logging-best-practices.md`
- Testing: `/docs/testing-guidelines.md`

### Architecture
- PDF Generation: `/docs/pdf-architecture-and-styling.md`
- Semantic HTML: `/docs/semantic-html-guidelines-for-llms.md`

## 🛡️ SECURITY

### Never Expose
- API keys in client code
- Service role keys anywhere
- Sensitive data in logs

### Always Implement
- Input validation/sanitization
- Supabase RLS policies
- Rate limiting on APIs
- HTTPS everywhere
- CSP headers

## 🔑 ENVIRONMENT

### Tech Stack
- IDE: Cursor (VS Code-based IDE with AI features)
- Framework: Next.js App Router
- UI: shadcn/ui + Tailwind CSS
- Database: Supabase (REMOTE ONLY - no local DB)
- AI: GPT-5 (default) via Vercel AI Gateway
- Testing: Vitest + Testing Library + Playwright (E2E)
- PDF Generation: Playwright (server-side HTML to PDF)
- PDF Viewing: Native browser PDF display

### Environment Variables
```bash
# Supabase (remote access only)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Available CLIs
- `gh` - GitHub CLI
- `vercel` - Vercel CLI  
- `supabase` - Supabase CLI
- `stripe` - Stripe CLI
- `npm`/`npx` - Package managers

## ⚠️ COMMON PITFALLS TO AVOID

1. **Creating mock data** - Let real errors surface
2. **Direct DB access** - Use repositories
3. **Generating UUIDs** - Let PostgreSQL handle
4. **Using old event systems** - Use unified EventFactory
5. **Skipping tests** - Test before every commit
6. **Creating ad-hoc test files** - Enhance existing
7. **Silent error handling** - Log and throw
8. **Token-heavy MCP calls** - Use compact functions
9. **Forgetting manifest update** - Run after changes
10. **Missing tooltips** - Every UI element needs one
11. **Local DB commands** - No local DB, always use remote
12. **Wrong logger methods** - No .error() or .log(), use exact signatures

## 🚀 SESSION CHECKLIST

- [ ] Read PROJECT_MANIFEST.json
- [ ] Check quickWins section
- [ ] Use TodoWrite for complex tasks
- [ ] Test scripts on single file first
- [ ] Update manifest after changes
- [ ] Run tests before commits
- [ ] **Run mandatory code audit on new/refactored components**
- [ ] Archive redundant code
- [ ] Document in UK English
- [ ] Write problem analysis on exit
- [ ] Generate types from remote DB after schema changes
- [ ] Add breadcrumbs at all interface boundaries
- [ ] Include timing for performance-critical operations
