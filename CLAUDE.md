# Claude Assistant Configuration

## 🚨 CRITICAL: PROJECT MANIFEST SYSTEM (READ FIRST!)

### MANDATORY: Always Start with PROJECT_MANIFEST.json
**THE SINGLE SOURCE OF TRUTH for the entire project architecture**

```bash
# At session start, ALWAYS run:
npm run manifest:update  # Updates manifest with current state
npm run manifest:check   # Shows quick wins available

# Or read directly:
cat PROJECT_MANIFEST.json
```

### What the Manifest Provides:
- **Complete Architecture Map**: All components, services, pipelines
- **Feature Status**: Which features are enabled/disabled/disconnected
- **Database State**: Which tables are populated vs empty
- **Quick Wins**: Features ready to activate with minimal effort
- **Auto-Discovery**: Automatically finds all enrichers, extractors, scrapers
- **Integration Status**: Shows what's connected vs orphaned
- **Interface Documentation**: Auto-updated API and component interfaces
- **Data Flow Tracking**: Current patterns vs deprecated approaches

### Manifest-Driven Development:
1. **Session Start**: Read PROJECT_MANIFEST.json
2. **Before Coding**: Check `quickWins` section for easy improvements
3. **After Adding Features**: Run `npm run manifest:update`
4. **Pipeline Integration**: Features auto-register from manifest

### Auto-Discovery System:
The manifest enables automatic feature discovery in pipeline phases:
- Enrichers in `/lib/company-intelligence/enrichers/` auto-register
- Extractors in `/lib/company-intelligence/extractors/` auto-register
- Scrapers in `/lib/company-intelligence/scrapers/` auto-register
- Components marked as unused are candidates for integration

**Example from Sept 7, 2025**: Found 40% dormant features that took only 3 hours to activate, resulting in 10x intelligence improvement!

## 📊 Interface Documentation System (MANDATORY)

### ALL API Interfaces Must Be Documented
**CRITICAL**: Every API endpoint and component interface MUST be documented in:
1. `/docs/api-interface-documentation.md` - Primary interface documentation
2. `PROJECT_MANIFEST.json` - Auto-updated interface registry
3. Component files - Inline TypeScript interfaces

### Interface Documentation Standards:
```typescript
// Every API endpoint MUST define:
interface ApiEndpoint {
  endpoint: string       // Full path
  method: string        // HTTP method
  description: string   // What it does
  input: Interface     // Input interface with ALL fields documented
  output: Interface    // Output interface with ALL fields documented
  errors: ErrorTypes[] // Possible error responses
  logging: string[]    // Required logging points
}
```

### Auto-Update Manifest with Interfaces:
```bash
# Run after adding/changing interfaces:
npx tsx scripts/update-manifest-interfaces.ts

# Or as part of manifest update:
npm run manifest:update
```

## 🚨 CRITICAL: Database Query Token Optimization (MANDATORY)

### NEVER Use Token-Heavy MCP Calls for Database Queries
**PROBLEM**: MCP calls like `list_tables` and `get_advisors` consume 16,000-33,000 tokens, quickly exhausting Claude's context window.

### ALWAYS Use Compact Query Functions Instead
**SOLUTION**: We've created optimized functions that return the same information in 99% fewer tokens.

#### ❌ FORBIDDEN - Do NOT Use These:
```typescript
// NEVER use these token-heavy MCP calls:
mcp__supabase__list_tables         // ❌ 28,000 tokens - FORBIDDEN
mcp__supabase__get_advisors        // ❌ 16,000-33,000 tokens - FORBIDDEN
```

#### ✅ MANDATORY - Always Use These Compact Functions:
```sql
-- Database overview (~200 tokens vs 28,000)
SELECT * FROM get_compact_db_info();

-- Security status check (~100 tokens vs 16,000)
SELECT * FROM get_security_summary();

-- Top tables by size (~300 tokens vs 28,000)
SELECT * FROM get_top_tables_compact(10);
```

### Token Usage Comparison:
| Query Type | MCP Tokens | Compact SQL | Savings |
|------------|------------|-------------|---------|
| Database Info | 28,000 | 200 | 99.3% |
| Security Check | 16,000 | 100 | 99.4% |
| Table Stats | 28,000 | 300 | 98.9% |

### Available Compact Functions:
1. **`get_compact_db_info()`** - Returns database size, table count, row count, index stats
2. **`get_security_summary()`** - Returns RLS status, policy counts, function security
3. **`get_top_tables_compact(limit)`** - Returns top N tables with row counts and sizes

### Why This Matters:
- **Context Preservation**: Saves 95% of context window for actual development
- **Faster Responses**: Direct SQL is faster than MCP server calls
- **Same Information**: All essential data in compact format

**Implementation Date**: January 13, 2025
**Scripts Created**: `/scripts/create-compact-functions.sh`

## 🚨 CRITICAL: Supabase SSR Authentication Context (2025-09-14 Discovery)

### The Authentication Storage Mismatch Problem
**If logging or any auth-dependent feature stops working, CHECK THIS FIRST!**

#### The Issue:
- **App uses `@supabase/ssr`** → Stores auth in **COOKIES**
- **Component uses `@supabase/supabase-js`** → Looks in **LOCAL STORAGE**
- **Result:** Component can't see auth, operates as "anon" instead of "authenticated"

#### The Fix:
```typescript
// ✅ CORRECT - For client-side code that needs auth context
import { createBrowserClient } from '@supabase/ssr'

// ❌ WRONG - Won't see cookie-based auth
import { createClient } from '@supabase/supabase-js'
```

#### Environment-Aware Pattern:
```typescript
const isServer = typeof window === 'undefined'

if (!isServer) {
  // CLIENT: Use SSR package to read auth from cookies
  this.supabase = createBrowserClient(url, anonKey)
} else {
  // SERVER: Use service role for bypassing RLS if needed
  this.supabase = createClient(url, serviceRoleKey || anonKey, options)
}
```

#### Key Rule:
**If the app uses @supabase/ssr, ALL components needing auth MUST use @supabase/ssr!**

### Current Architecture Patterns:
- **Scraping**: Uses StrategyManager pattern (NOT scraperFactory)
- **State Storage**: Uses component state (NOT mock/fallback data)
- **Error Handling**: Always throw errors (NEVER return fallback data)
- **Logging**: Use permanentLogger at ALL interface boundaries

## 🚨 CRITICAL: Unified Event System (MANDATORY as of 2025-01-13)

### ⚠️ MAJOR CHANGE: We now have ONE unified event system!

**OLD SYSTEM (DEPRECATED)**: Two separate event factories
- ❌ `SSEEventFactory` from `@/lib/company-intelligence/utils/sse-event-factory`
- ❌ `EventFactory` from `@/lib/notifications/utils/event-factory`

**NEW UNIFIED SYSTEM**: Single EventFactory for ALL events
- ✅ `EventFactory` from `@/lib/realtime-events`

### ABSOLUTELY REQUIRED for ALL Events:
1. **ALWAYS use the unified EventFactory** - Located at `@/lib/realtime-events`
2. **NEVER create new event factories** - Use the existing unified system
3. **ALWAYS include correlation IDs** - For event tracking and debugging
4. **ALWAYS follow RealtimeEvent structure** - Single interface for all events
5. **NEVER import from old locations** - They're deprecated and will be removed

### Required Event Structure (NEW):
```typescript
// ✅ CORRECT - Use unified EventFactory
import { EventFactory } from '@/lib/realtime-events'

// Creating standardized events:
const progressEvent = EventFactory.progress(50, 100, 'Processing...')
const dataEvent = EventFactory.data(dataItems, { source: 'scraper' })
const errorEvent = EventFactory.error(error, { correlationId: sessionId })
const notificationEvent = EventFactory.notification('Success!', 'success')

// ❌ WRONG - Don't use old factories
import { SSEEventFactory } from '@/lib/company-intelligence/utils/sse-event-factory' // DEPRECATED!
import { EventFactory } from '@/lib/notifications/utils/event-factory' // DEPRECATED!
```

### Migration Status (January 13, 2025):
- **Adapters Active**: Old imports work via adapters (with deprecation warnings)
- **Zero Breaking Changes**: All existing code continues to work
- **Action Required**: Gradually migrate to new imports

### Server-Side Streaming (NEW):
```typescript
// ✅ CORRECT - Use new StreamWriter
import { StreamWriter } from '@/lib/realtime-events'

const streamWriter = new StreamWriter(sessionId, correlationId, request.signal)
const stream = streamWriter.createStream()
await streamWriter.sendEvent(event)

// ❌ WRONG - Don't use old SSEStreamManager
import { SSEStreamManager } from '@/lib/company-intelligence/utils/sse-stream-manager' // DEPRECATED!
```

### Client-Side Streaming (NEW):
```typescript
// ✅ CORRECT - Use new StreamReader
import { StreamReader } from '@/lib/realtime-events'

const reader = new StreamReader({
  url: '/api/stream',
  onEvent: (event) => handleEvent(event),
  reconnect: true // Auto-reconnection built-in!
})

// ❌ WRONG - Don't use old StreamHandler
import { StreamHandler } from '@/lib/notifications/utils/stream-handler' // DEPRECATED!
```

### Why This Is Critical:
- **Single Source of Truth**: One event system for entire application
- **Type Safety**: Events maintain types across boundaries
- **Memory Safe**: No more memory leaks from unclosed streams
- **Auto-Recovery**: Automatic reconnection with exponential backoff
- **DRY/SOLID**: No more duplicate factories

## 🚨 CRITICAL CODING GUIDELINES - ABSOLUTELY NO EXCEPTIONS

### ❌ ABSOLUTELY FORBIDDEN - WILL BREAK THE APPLICATION:
1. **NO MOCK DATA OR MOCK SCRAPERS** - Remove ALL mock implementations immediately
2. **NO FALLBACK DATA** - NEVER provide fallback values that hide errors
3. **NO SILENT FAILURES** - ALL errors must be caught, logged, and properly handled
4. **NO HARDCODED TEST DATA** - We need real errors to test the application
5. **NO TRY-CATCH WITHOUT PROPER ERROR HANDLING** - Never swallow errors silently
6. **NO AD-HOC SSE EVENTS** - Always use SSEEventFactory for streaming
7. **NO UNSTRUCTURED DATA** - All captured data must extend BaseDataItem
8. **ARCHIVE LEGACY CODE WHEN REFACTORING** - When replacing code, ALWAYS move old implementations to `/archive/` folder
9. **UPDATE MANIFEST AFTER ARCHIVING** - Run `npm run manifest:update` to remove legacy code from manifest
10. **NEVER MARK ANYTHING AS "FIXED" UNTIL AUTOMATED UI TESTS PASS** - Always rerun tests to verify fixes actually work
11. **ALWAYS USE captureError FOR ERROR LOGGING** - Never use `logger.error()`, always use `logger.captureError()` to ensure error details are in breadcrumbs (see `/docs/error-logging-best-practices.md`)
12. **ALWAYS USE SUPABASE UUID GENERATION** - NEVER generate UUIDs in application code. Let PostgreSQL's `gen_random_uuid()` handle ALL database ID generation for guaranteed uniqueness and proper UUID type handling
13. **ALWAYS USE REPOSITORY PATTERN FOR DATABASE ACCESS** - NEVER make direct database calls from API routes or UI components. ALL database operations MUST go through repositories
14. **NO AUTOMATED CODE REPLACEMENT SCRIPTS** - NEVER create scripts that automatically replace code patterns. All refactoring must be done manually with careful consideration of context and functionality. Each change needs human review to ensure correctness

### ✅ MANDATORY DATABASE ACCESS PATTERN:
**Rule**: ALL database access MUST follow: UI Component → API Route → Repository → Database

**Full Documentation**: See `/docs/repository-pattern-architecture.md`

#### ❌ FORBIDDEN - Direct Database Access:
```typescript
// NEVER in API routes:
const supabase = createServerClient(...)
const { data } = await supabase.from('table').select()

// NEVER in UI components:
const { data } = await supabase.from('table').select()
```

#### ✅ REQUIRED - Repository Pattern:
```typescript
// In API routes ONLY:
const repository = ProjectsRepository.getInstance()
const data = await repository.getProject(id)

// UI components call API routes:
const response = await fetch('/api/projects')
```

#### Repository Implementation Guidelines:

1. **All repositories extend BaseRepository**
   - Provides common error handling
   - Manages Supabase client
   - Handles authentication

2. **Use generated database types**
   ```typescript
   import type { Database } from '@/lib/database.types'
   type Entity = Database['public']['Tables']['entities']['Row']
   ```

3. **Singleton pattern for repositories**
   ```typescript
   static getInstance(): EntityRepository {
     if (!this.instance) {
       this.instance = new EntityRepository()
     }
     return this.instance
   }
   ```

4. **Method naming conventions**
   - `create()` - Create new record
   - `findById()` or `getById()` - Get single record
   - `findAll()` or `getAll()` - Get all records
   - `update()` - Update record
   - `delete()` - Delete record
   - `findBy[Field]()` - Find by specific field

5. **Error handling in repositories**
   ```typescript
   async operation(): Promise<Result> {
     return this.execute('operation', async (client) => {
       try {
         // Database operation
       } catch (error) {
         permanentLogger.captureError('REPO_NAME', error, context)
         throw error // Always re-throw after logging
       }
     })
   }
   ```

#### Special Cases:

1. **PermanentLogger DB Layer**
   - Has its own DB layer (`permanent-logger-db.ts`)
   - This is NOT a violation - it's required to avoid circular dependencies
   - Logger → Repository → Logger would create infinite loop

2. **Bug Tracker (Beta Feature)**
   - Uses `getAllBugs()` for global visibility
   - All users see all bugs (no user filtering)
   - This is intentional for collaborative debugging

3. **Storage Operations**
   - File uploads handled directly in API routes
   - Metadata updates go through repositories
   - Example: Avatar upload → Storage API, URL update → ProfilesRepository

### ✅ MANDATORY UUID GENERATION:
**Rule**: NEVER generate database IDs in application code

#### ❌ FORBIDDEN for Database IDs:
```typescript
// NEVER do this for database records:
const id = crypto.randomUUID()
const id = nanoid()
const id = uuidv4()
```

#### ✅ REQUIRED - PostgreSQL Generation:
```typescript
// In migrations:
id UUID DEFAULT gen_random_uuid() PRIMARY KEY

// In application - NO ID field:
await repository.create({
  name: 'example',  // No ID! Let DB generate
  data: {...}
})
```

#### Exception: Correlation IDs Only
```typescript
// OK for non-database tracking:
const correlationId = nanoid() // For SSE events only
const trackingId = nanoid() // For logging only
```

### ✅ MANDATORY ERROR HANDLING:
**Rule**: Always log and throw errors properly - NEVER return fallback/mock data

### Why This Matters:
- **Testing requires real failures** - We can't fix what we can't see
- **Mock data hides bugs** - Production will fail where development "worked"
- **Silent failures are debugging nightmares** - Errors must be visible
- **Fallbacks create false confidence** - The app appears to work when it doesn't

### 📝 Additional Development Guidelines

#### 14. **Always Document Schema and Interface Changes**
**MANDATORY**: Document all changes in:
- Migration files with detailed comments
- `/docs/api-interface-documentation.md`
- Component files with inline documentation
- PROJECT_MANIFEST.json (auto-updated)

#### 15. **Process Flow Documentation**
**REQUIRED**: Document all process flows using:
- Mermaid diagrams in markdown files
- Clear step-by-step descriptions
- Input/output specifications for each step
- Error handling paths

#### 16. **Flag Redundant Code for Archiving**
When code becomes redundant:
- Add comment: `// TODO: Archive - [reason] - [date]`
- Move to `/archive/` folder before removing
- Update all imports
- Run `npm run manifest:update`

#### 17. **Mobile Responsiveness**
All UI components must:
- Use Tailwind responsive classes (`sm:`, `md:`, `lg:`)
- Test on mobile viewports (375px minimum)
- Ensure touch targets are 44x44px minimum
- Use responsive images with proper srcset

#### 18. **Always Check Shared Utils First**
Before creating any utility:
1. Check `/lib/utils/` folder
2. Check `/lib/company-intelligence/utils/`
3. Check shared component utilities
4. Only create new if genuinely unique need

#### 19. **Database-First Architecture**
URLs and data sources must ALWAYS come from database:
- Never pass URLs directly from UI to scrapers
- Always validate against discovered_urls in database
- Use session data as single source of truth
- Follow: UI → API → Repository → Database

#### 20. **Script Testing Protocol**
When using fix scripts:
1. Test on single file first
2. Verify output is correct
3. Create backup of files
4. Run on full file set
5. Verify no compilation errors

#### 21. **Comments for Technical PMs**
Write comments assuming reader is a technical project manager with limited dev skills:
- Explain WHY, not just WHAT
- Use business terminology where applicable
- Include examples for complex logic
- Add diagrams for architectural decisions

#### 22. **500-Line File Soft Limit**
Files exceeding 500 lines need review:
- Check if file follows SOLID principles
- Consider splitting into services
- Document why file needs to be larger if kept
- Add to technical debt log if not refactored

#### 23. **Isomorphic Best Practices**
Look for solutions that work both server and client-side:
- Use isomorphic fetch over axios
- Prefer universal libraries
- Document environment-specific code clearly
- Use feature detection over environment checks

#### 24. **Data Contract Enforcement**
All data passed between services must have:
- TypeScript interfaces defined
- Runtime validation at boundaries
- Clear error messages for contract violations
- Version compatibility checks

#### 25. **TodoWrite Task Manager Usage**
Use TodoWrite for:
- Any task with 3+ steps
- Complex refactoring work
- Multi-file changes
- Tasks spanning multiple sessions

#### 26. **Supabase PAT Token Fallback**
For direct database operations when MCP fails:
- PAT Token: `sbp_10122b563ee9bd601c0b31dc799378486acf13d2`
- Project Reference: `vnuieavheezjxbkyfxea`
- Always try MCP first, PAT as fallback

#### 27. **Semantic HTML Requirements**
Follow semantic HTML guidelines:
- Use proper heading hierarchy (h1 → h2 → h3)
- Semantic elements over divs (`<article>`, `<section>`, `<nav>`)
- Proper ARIA labels for accessibility
- Form labels for all inputs
- Time elements with datetime attribute

#### 28. **Always Use Shared Functions**
Before creating any function:
1. Check `/lib/utils/` folder
2. Check component shared utilities
3. Check if similar function exists elsewhere
4. Document why new function is needed if creating

#### 29. **No Graceful Degradation That Hides Errors**
NEVER implement fallbacks that hide failures:
- ❌ Returning empty array when fetch fails
- ❌ Using default values for missing required data
- ❌ Catching errors without logging
- ✅ Throw errors with clear messages
- ✅ Log all errors with context
- ✅ Show error states in UI

#### 30. **Clean, Documented Code**
All code must be:
- Self-documenting with clear variable names
- Documented with JSDoc for public APIs
- Include examples in complex functions
- Add inline comments for business logic
- Reference ticket numbers for bug fixes

#### 31. **Stability Over Performance**
Always prioritize in this order:
1. **Stability** - No crashes, proper error handling
2. **Simplicity** - Clear, maintainable code
3. **Robustness** - Handle edge cases
4. **Performance** - Optimize only after profiling

## 🎯 UI/UX Standards (MANDATORY as of January 2025)

### 🏗️ Semantic HTML Requirements (CRITICAL)
**MANDATORY**: All generated HTML must follow semantic best practices for accessibility, SEO, and AI readability.

📖 **See full guidelines**: [`semantic-html-guidelines-for-llms.md`](./semantic-html-guidelines-for-llms.md)

#### Key Rules:
1. **Use semantic elements** (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`)
2. **Maintain heading hierarchy** (only ONE `<h1>` per page, no skipped levels)
3. **Proper form labels** (every input needs a `<label>`)
4. **Buttons vs Links** (buttons for actions, links for navigation)
5. **Machine-readable time** (use `<time datetime="">`)

#### Quick Reference:
```html
<!-- ✅ CORRECT: Semantic HTML -->
<article>
  <header>
    <h2>Title</h2>
    <time datetime="2025-01-13">January 13, 2025</time>
  </header>
  <section>Content...</section>
</article>

<!-- ❌ WRONG: Div soup -->
<div class="article">
  <div class="header">
    <div class="title">Title</div>
  </div>
</div>
```

### Tooltip Requirement - ALL UI ELEMENTS MUST HAVE TOOLTIPS
**CRITICAL**: This is a PERMANENT requirement for ALL interactive UI elements

#### 🚨 STANDARD TOOLTIP COMPONENT
**ALWAYS USE TooltipWrapper** - Never use other tooltip libraries

```tsx
// ✅ CORRECT - Always use TooltipWrapper
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'

<TooltipWrapper content="Helpful explanation of this element">
  <Badge>Frontend</Badge>
</TooltipWrapper>

// ❌ WRONG - Never use these
import { Tooltip, TooltipContent, TooltipProvider } from '@/components/ui/tooltip' // NO!
import { TooltipComponent } from '@syncfusion/ej2-react-popups' // NO!
```

#### Implementation Guidelines:
1. **Buttons**: Describe the action that will occur
   - Example: "Approve selection and proceed to web scraping phase"
   - Bad: "Click here" or "Submit"
   
2. **Icons**: Explain what the icon represents
   - Example: "Website technology stack successfully detected"
   - Bad: Just showing the icon with no context
   
3. **Badges**: Provide additional context about the value
   - Example: "18 unique pages found: 12 from sitemap.xml, 6 from homepage crawling"
   - Bad: Just showing "18"
   
4. **Input Fields**: Offer help text and validation hints
   - Example: "Enter the company domain (e.g., example.com) without http:// or www"
   - Bad: No guidance on format
   
5. **Complex UI Elements**: Give usage instructions
   - Example: "Select pages to include in research. Use checkboxes for individual selection or bulk tools for groups."
   - Bad: Assuming user knows how to interact

#### Testing Checklist for Tooltips:
- [ ] Every button has an action description tooltip
- [ ] Every icon has a meaning explanation tooltip
- [ ] Every badge has a context tooltip
- [ ] Every input has a help tooltip
- [ ] Complex components have usage guide tooltips
- [ ] Tooltips are helpful, not redundant
- [ ] Tooltips work on mobile/touch devices

**Note**: This requirement was added due to user confusion with the UI. Going forward, NO UI element should be added without a descriptive tooltip.

### Toast Notification Standards - DRY PRINCIPLE

#### Centralized Toast Function Requirement
**ALL toast notifications MUST use a centralized function to prevent duplicates and ensure consistency.**

##### The Problem We're Solving:
- Multiple components triggering duplicate toasts for the same event
- Inconsistent messaging across the application  
- Poor user experience with toast spam

##### The Solution:
**Use a centralized toast function with deduplication (2-second window)**

##### Usage Guidelines:
1. **NEVER call toast directly in multiple places** for the same event
2. **ALWAYS use the centralized toast function** in your component
3. **Include deduplication logic** to prevent spam (2-second window)
4. **Use consistent messaging** for similar events

##### Toast Message Templates:
- **Stage Completion**: `[Stage] complete! [Details]`
- **Errors**: `[Action] failed: [Reason]`
- **Actions**: `[Action verb] [count] [items]`
- **Status Updates**: `[Status change] - [Context]`

##### Implementation Checklist:
- [ ] Create centralized toast function in parent component
- [ ] Include deduplication logic (2-second window)
- [ ] Remove all direct toast calls from child components
- [ ] Use consistent message templates
- [ ] Test that no duplicate toasts appear
- [ ] Ensure error toasts are always shown (no deduplication for errors)

**Note**: This standard was implemented to fix the "too many toast notifications" issue reported by users. The DRY (Don't Repeat Yourself) principle ensures maintainability and consistency.

## 🔗 URL Validation Standards (MANDATORY - DRY/SOLID)

### ALWAYS Use Centralized URL Validation
**CRITICAL**: URL validation must ONLY be performed through the centralized validation service to maintain DRY/SOLID principles.

#### ✅ CORRECT Approach:
1. **Server-side validation**: Use `/lib/utils/url-validator.ts` in API routes
2. **Pass validation flags**: Set `validateUrls: true` in API requests
3. **Let the server handle it**: Never make HTTP requests from client components

#### ❌ FORBIDDEN - Violations of DRY/SOLID:
1. **Client-side URL validation** - Causes CORS errors and duplicates logic
2. **Direct HTTP requests from components** - Violates single responsibility
3. **Duplicate validation logic** - Must use central `/lib/utils/url-validator.ts`
4. **Component-level fetch/HEAD requests** - Always delegate to server

#### Implementation Pattern:
```typescript
// ✅ CORRECT - In API route
import { validateUrls } from '@/lib/utils/url-validator'
const validUrls = await validateUrls(urls) // Server-side only

// ❌ WRONG - In client component
import { validateUrls } from '@/lib/utils/url-validator'
const validUrls = await validateUrls(urls) // Will fail with CORS
```

#### Why This Matters:
- **DRY**: Single source of truth for URL validation logic
- **SOLID**: Each component has single responsibility
- **Security**: Server handles external requests safely
- **Performance**: Validation happens once, centrally
- **CORS-free**: No browser restrictions on server

## 🚨 CRITICAL: Correct PermanentLogger Usage (MANDATORY)

### ⛔ CRITICAL WARNING: NO error() METHOD EXISTS!
**THE `permanentLogger.error()` METHOD DOES NOT EXIST AND WILL CAUSE COMPILATION FAILURES!**

```typescript
// ❌ COMPILATION FAILURE - This method DOES NOT EXIST!
permanentLogger.error('CATEGORY', 'message')  // TypeScript Error: Property 'error' does not exist

// ✅ CORRECT - Use captureError() for ALL error logging
permanentLogger.captureError('CATEGORY', error as Error, { context: 'description' })
```

**WHY THIS MATTERS:**
- `error()` method was intentionally REMOVED to enforce best practices
- `captureError()` properly captures stack traces and error details
- `captureError()` ensures errors are preserved in breadcrumbs for debugging
- TypeScript will FAIL compilation if you try to use `.error()`
- A runtime trap will throw a helpful error if TypeScript checking is bypassed

### Complete Example with Breadcrumbs and Timing

**IMPORTANT**: The permanentLogger is the ONLY logging system. It has specific method signatures that MUST be followed exactly.

#### Available Methods:
```typescript
permanentLogger.info(category: string, message: string, data?: any)
permanentLogger.warn(category: string, message: string, data?: any)
permanentLogger.debug(category: string, message: string, data?: any)
permanentLogger.captureError(category: string, error: Error, context?: any)
permanentLogger.breadcrumb(action: string, message: string, data?: any)
permanentLogger.timing(label: string, metadata?: any): TimingHandle
```

#### ✅ CORRECT - Complete API Route Example with All Features:
```typescript
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function POST(req: NextRequest) {
  // Start overall timing
  const totalTimer = permanentLogger.timing('api_request_total')

  // Add breadcrumb at entry point
  permanentLogger.breadcrumb('api_entry', 'Request received', {
    endpoint: '/api/analyze',
    method: 'POST'
  })

  try {
    const body = await req.json()

    // Log the start of processing
    permanentLogger.info('API_ANALYZE', 'Starting analysis', {
      domain: body.domain,
      requestId: req.headers.get('x-request-id')
    })

    // Breadcrumb before external call
    permanentLogger.breadcrumb('fetch_start', 'Fetching external data', {
      url: body.domain
    })

    // Time specific operation
    const fetchTimer = permanentLogger.timing('external_fetch', { url: body.domain })

    const response = await fetch(body.domain)

    // Stop the timer - use stop() NOT end()!
    const fetchDuration = fetchTimer.stop()

    permanentLogger.breadcrumb('fetch_complete', 'External data fetched', {
      status: response.status,
      duration: fetchDuration
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    // Process the data
    const processTimer = permanentLogger.timing('data_processing')
    const result = await processData(response)
    processTimer.stop()

    // Log success
    permanentLogger.info('API_ANALYZE', 'Analysis completed successfully', {
      domain: body.domain,
      resultSize: result.length
    })

    // Stop overall timer
    const totalDuration = totalTimer.stop()

    permanentLogger.breadcrumb('api_success', 'Request completed', {
      totalDuration
    })

    return NextResponse.json(result)

  } catch (error) {
    // Capture errors properly - NOT .error()!
    permanentLogger.captureError('API_ANALYZE', error as Error, {
      endpoint: '/api/analyze',
      stage: 'processing'
    })

    // Stop timer even on error
    totalTimer.stop()

    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}
```

#### ❌ WRONG - Common Mistakes to Avoid:
```typescript
// ❌ WRONG - No .error() method exists!
permanentLogger.error('CATEGORY', 'message', data)

// ❌ WRONG - No .log() method exists!
permanentLogger.log('CATEGORY', 'message', data)

// ❌ WRONG - Wrong parameter order (message before category)
permanentLogger.info('Message here', { category: 'CATEGORY' })

// ❌ WRONG - Timer has .stop() not .end()!
const timer = permanentLogger.timing('operation')
timer.end() // This will throw TypeError!

// ❌ WRONG - Importing wrong name
import { logger } from '@/lib/utils/permanent-logger'
```

#### Key Rules:
1. **Category ALWAYS comes first** in info/warn/debug/captureError calls
2. **Use captureError() for errors** - there is NO error() method
3. **Timers use .stop()** not .end() to finish timing
4. **Add breadcrumbs at interface boundaries** - API entry, external calls, key operations
5. **Import as permanentLogger** not logger

#### Timer Handle Methods:
```typescript
interface TimingHandle {
  stop(): number        // Stops timer and returns duration
  cancel(): void        // Cancels timer without recording
  checkpoint(name: string, metadata?: any): void  // Add checkpoint
}
```

#### When to Use Each Method:
- **info()**: Normal operations, successful completions
- **warn()**: Recoverable issues, deprecation notices
- **debug()**: Detailed debugging information (dev only)
- **captureError()**: All error conditions with stack traces
- **breadcrumb()**: User journey tracking, operation flow
- **timing()**: Performance measurement of operations

## Profile Creation (Automatic via Database Trigger)

### How It Works
User profiles are **automatically created** by a PostgreSQL trigger when users sign up. No client-side profile creation is needed.

**Location**: `supabase/migrations/20250117_consolidated_profile_trigger.sql`
**Architecture Doc**: See `/docs/repository-pattern-architecture.md` for complete auth flow

**Process**:
1. User signs up via Supabase Auth
2. Database trigger `on_auth_user_created` fires automatically
3. Profile is created with data from auth metadata
4. Updates are synced via `on_auth_user_updated` trigger

**Key Points**:
- ✅ No client-side `ensureProfile()` calls needed
- ✅ No race conditions
- ✅ Works with all auth methods (OAuth, email, etc.)
- ✅ Profile guaranteed to exist after signup
- ✅ Single source of truth for profile creation

## Tech Stack Preferences

### Core Stack
- **Framework**: Next.js (App Router preferred)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Database/Auth**: Supabase
- **Language**: TypeScript (strict mode)
- **AI/LLM**: OpenAI via Vercel AI Gateway (for GPT-5 models)
- **PDF Viewer**: Syncfusion PDF Viewer (@syncfusion/ej2-react-pdfviewer)

### Project Documentation
- **PDF Architecture**: See `docs/pdf-architecture-and-styling.md` for comprehensive PDF generation guidelines

### Available CLIs (Pre-installed)
You can use these commands without asking:
- `gh` - GitHub CLI
- `vercel` - Vercel CLI
- `supabase` - Supabase CLI (CRITICAL - see Supabase CLI Guidelines below)
- `stripe` - Stripe CLI (installed and configured - see Stripe Integration section)
- `brew` - Homebrew package manager
- `npm` / `npx` - Node package managers
- `git` - Version control

## 🚨 CRITICAL: Supabase CLI Guidelines (ALWAYS FOLLOW)

### MANDATORY: CLI-First Development
**NEVER suggest manual database changes in Supabase Dashboard. ALWAYS use CLI commands.**

### Supabase MCP Server Usage
**IMPORTANT: Use the following approach for Supabase operations:**
1. **First Choice**: Use the Supabase MCP server with the `apply_migration` function
2. **If that fails**: Use the Management API directly with PAT token
3. **PAT Token**: `sbp_10122b563ee9bd601c0b31dc799378486acf13d2`
4. **Project Reference**: `vnuieavheezjxbkyfxea`

### Claude MCP Configuration Location
**Configuration File**: `/Users/stuartholmes/Library/Application Support/Claude/claude_desktop_config.json`

This file contains all MCP server configurations for Claude Desktop. To modify MCP server settings:
1. Edit the configuration file directly
2. Restart Claude Desktop to apply changes
3. Ensure NO `--read-only` flag is present for write access

Example configuration:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=vnuieavheezjxbkyfxea"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_10122b563ee9bd601c0b31dc799378486acf13d2"
      }
    }
  }
}
```

**Note**: If MCP server shows read-only errors despite correct config, restart Claude Desktop completely.

Example using Management API:
```bash
curl -X POST \
  "https://api.supabase.com/v1/projects/vnuieavheezjxbkyfxea/database/query" \
  -H "Authorization: Bearer sbp_10122b563ee9bd601c0b31dc799378486acf13d2" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_SQL_HERE"}'
```

### Core Workflow (MUST FOLLOW IN ORDER)
1. **Create migration** → 2. **Test locally** → 3. **Generate types** → 4. **Deploy**

### Essential Supabase CLI Commands

#### Initial Setup
```bash
supabase init                              # Initialize Supabase project
supabase link --project-ref <project-ref>  # Link to existing project  
supabase db pull                          # Pull remote schema to local
```

#### Migration Workflow (ALWAYS USE THIS)
```bash
# 1. Create a new migration with descriptive name
supabase migration new fix_rls_infinite_recursion  # GOOD ✅
# NOT: supabase migration new update               # BAD ❌

# 2. Edit the migration file in supabase/migrations/
# 3. Test locally
supabase db reset        # Reset local database and apply all migrations
supabase test db        # Run database tests

# 4. Generate TypeScript types
supabase gen types typescript --local > lib/database.types.ts

# 5. Deploy to production
supabase db push
```

#### Database Operations
```bash
supabase db diff                          # Show differences between local and remote
supabase db lint                          # Check for issues
supabase db dump -f supabase/seed.sql     # Create seed file
supabase db reset --debug                 # Reset with debug info
```

#### Local Development
```bash
supabase start                             # Start local Supabase
supabase stop                              # Stop local Supabase
supabase status                            # Check service status
supabase db remote commit                 # Commit remote changes to migration
```

### Clean Code Conventions

#### Table Naming
```sql
-- GOOD ✅: Singular, lowercase, underscores
CREATE TABLE project (...);
CREATE TABLE project_member (...);

-- BAD ❌: Plural, camelCase, unclear
CREATE TABLE Projects (...);
CREATE TABLE projectMembers (...);
```

#### RLS Best Practices
- Avoid circular policy references
- Create simple, non-recursive policies
- Always test migrations locally first
- Document policy purposes with COMMENT

### Anti-Patterns to AVOID ❌
1. **Manual SQL in Dashboard**: Never fix schema issues via Dashboard
2. **Circular RLS policies**: Policies that reference each other
3. **Generic migration names**: `update.sql`, `fix.sql`
4. **Skipping local testing**: Always test with `supabase db reset`
5. **Not generating types**: Always run `supabase gen types` after changes

## Vercel AI Gateway & GPT-5 Models

### 🚨 CRITICAL: GPT-5 API Bug - MUST USE RESPONSES API
**GPT-5 models have a KNOWN BUG with the Chat Completions API that causes empty responses!**

#### The Problem (Discovered 2025-08-26):
When GPT-5 models (gpt-5, gpt-5-mini, gpt-5-nano) are used with `chat.completions.create()`:
- ALL tokens are allocated to internal `reasoning_tokens`
- The actual response content is EMPTY
- This happens even with simple prompts
- The API call succeeds but returns no usable content

#### The Solution: Use Responses API
GPT-5 models MUST use the `client.responses.create()` API instead:

```javascript
// ❌ WRONG - Returns empty responses with GPT-5
const response = await client.chat.completions.create({
  model: 'gpt-5-mini',
  messages: [...],
  temperature: 1,
  max_completion_tokens: 200
})
// Result: response.choices[0].message.content = "" (empty!)

// ✅ CORRECT - Works perfectly with GPT-5
const response = await client.responses.create({
  model: 'gpt-5-mini',
  input: 'Your prompt here',
  text: { verbosity: 'high' },
  reasoning: { effort: 'minimal' },
  max_output_tokens: 200
})
// Result: response.output_text contains the actual response
```

#### Test Results:
- Chat Completions API: Empty responses, all tokens go to reasoning
- Responses API: Works perfectly, 2-3 second response times
- GPT-4 models: Work fine with both APIs

### Important: GPT-5 Models via Vercel AI Gateway
GPT-5 models (gpt-5, gpt-5-mini, gpt-5-nano) are available **exclusively through Vercel AI Gateway**, not directly via OpenAI API.

#### Key Points:
- **DO NOT change models without permission** - Always ask before switching models
- GPT-5 nano is the most cost-efficient option ($0.025 input, $0.20 output per 1M tokens)
- GPT-5 models work locally with OpenAI SDK but require Vercel AI Gateway for Vercel deployments
- Reference: https://vercel.com/changelog/gpt-5-gpt-5-mini-and-gpt-5-nano-are-now-available-in-vercel-ai-gateway

#### Using GPT-5 Models with Vercel AI SDK (Required for Vercel deployments):
```javascript
// Via Vercel AI SDK v5
import { streamText } from 'ai'

const result = streamText({
  model: "openai/gpt-5-nano", // or openai/gpt-5-mini, openai/gpt-5
  prompt: "Your prompt here"
})
```

### 🚨 CRITICAL: Structured Outputs Requirements

When using OpenAI's Structured Outputs feature for reliable JSON generation:

#### MUST DO:
1. **Use `zodResponseFormat` helper** from `openai/helpers/zod` for proper schema enforcement
2. **Set `strict: true`** in the schema configuration for guaranteed adherence
3. **Set `additionalProperties: false`** on ALL object schemas
4. **Define proper types for EVERY field** - NEVER use `z.any()`
5. **Make all fields required** - use union with `null` for optional fields

#### Key Requirements:
- Use `zodResponseFormat` for GPT-4.1 structured outputs
- Set `strict: true` and `additionalProperties: false`
- Never use `z.any()` - define proper types for every field
- Make all fields required (use union with null for optional)

## GPT-5 (DEFAULT) vs GPT-4.1 Model Selection Guide

### 🚨 IMPORTANT: GPT-5 is ALWAYS the DEFAULT choice

### 🎯 When to Use Each Model Family

#### Use GPT-5 Models (DEFAULT - gpt-5-nano, gpt-5-mini, gpt-5) for:
- **ALL general tasks** (this is the default choice)
- **Narrative Documents** (Risk Register, Project Plans, Communication Plans)
- **Creative content** requiring nuanced writing
- **Analysis and insights** with detailed explanations
- **Long-form content** with flowing narrative structure
- **Strategic recommendations** requiring reasoning
- **Web Search Tasks** - GPT-5 models have native web search support
- **Company Intelligence** and market research

**Why:** GPT-5 is the primary model family with superior reasoning and web search capabilities. Always use GPT-5 unless you specifically need structured data output.

#### Use GPT-4.1 Models (ONLY for specific cases - gpt-4.1-nano, gpt-4.1-mini) for:
- **Structured Documents ONLY** with complex schemas (PID, Business Case)
- **Form-like outputs** requiring strict field validation
- **JSON generation** with guaranteed schema adherence via `zodResponseFormat`
- **Data transformation** tasks requiring consistent structure
- **API responses** that must conform to specific formats

**Why:** GPT-4.1 models support `chat.completions.parse` with `zodResponseFormat` for guaranteed structured outputs. ONLY use when structured data is critical.

### 💰 Cost Optimization Strategy

#### Model Pricing Comparison (per 1M tokens):
| Model | Input | Output | Best For |
|-------|--------|---------|----------|
| gpt-5-nano | $0.025 | $0.20 | DEFAULT for dev/testing |
| gpt-5-mini | $0.25 | $2.00 | DEFAULT for production |
| gpt-5 | $0.50 | $4.00 | Premium features |
| gpt-4.1-nano | $0.075 | $0.30 | Structured data only (dev) |
| gpt-4.1-mini | $0.15 | $0.60 | Structured data only (prod) |

**Recommendation:** Always use GPT-5 nano for development/testing, GPT-5 mini for production. Only use GPT-4.1 when structured data output is critical.

### 📋 Document-to-Model Mapping

| Document Type | Recommended Model | Reasoning |
|--------------|-------------------|-----------|
| PID | gpt-4.1-nano/mini | Complex nested schema, needs zodResponseFormat |
| Business Case | gpt-4.1-nano/mini | Structured financial data, strict validation |
| Risk Register | gpt-5-nano/mini | Narrative risk descriptions and analysis |
| Project Plan | gpt-5-nano/mini | Strategic planning and timeline narrative |
| Communication Plan | gpt-5-nano/mini | Stakeholder analysis and engagement strategies |
| Quality Management | gpt-5-nano/mini | Process descriptions and standards |
| Technical Landscape | gpt-5-nano/mini | Technical analysis and architecture description |
| Comparable Projects | gpt-5-nano/mini | Case studies and comparative analysis |

### ⚠️ Known Issues and Solutions

#### Issue: PID/Business Case Generation Failures with GPT-5
**Symptom:** JSON parsing errors, truncated responses, `[object Object]` in output
**Cause:** GPT-5's `responses.create` API returns plain text that gets truncated for large schemas
**Solution:** Use GPT-4.1 models with `zodResponseFormat` for these structured documents ONLY

#### Issue: Empty Responses from GPT-5 with Chat Completions
**Symptom:** All tokens allocated to reasoning_tokens, empty content
**Cause:** Known bug with GPT-5 models using chat.completions.create
**Solution:** Always use `responses.create` API for GPT-5 models

#### Web Search with GPT-5 Models
**Format:** Use `{ type: 'web_search' }` tool definition
**Response:** Returns array with `web_search_call` and `message` items
**Citations:** Available in message annotations

## Testing Setup

### 🚨 CRITICAL: MANDATORY TESTING REQUIREMENTS
**TESTING IS NOT OPTIONAL - IT IS MANDATORY FOR ALL DEVELOPMENT**

#### ⛔ ABSOLUTELY FORBIDDEN:
1. **NEVER CREATE AD-HOC TEST FILES** - Only enhance existing test files
2. **NEVER CREATE NEW TEST FILES** - Update existing ones to match UI evolution
3. **NEVER SKIP TESTING** - Tests must run before EVERY commit
4. **NEVER DECREASE COVERAGE** - Only increase or maintain

#### ✅ MANDATORY TESTING RULES:
1. **ONLY USE test-company-intelligence-comprehensive.ts** for Company Intelligence testing
2. **ENHANCE EXISTING TESTS** when UI changes - don't create new test files
3. **RUN TESTS BEFORE COMMITS** - Configure pre-commit hooks
4. **MAINTAIN 100% COVERAGE** for all UI components

#### Testing Commands:
- Company Intelligence: `npx tsx test-company-intelligence-comprehensive.ts`
- E2E Tests: `npm run test:e2e`
- All Tests: `npm run test:all`
- Default test domain: bigfluffy.ai
- Test accounts available in Supabase:
  - stusandboxacc@gmail.com (Google OAuth)
  - test@project-genie.com
  - test@bigfluffy.ai
  - test@projectgenie.dev


## UI Standards

### Stack
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS  
- **Animations**: Framer Motion

### 🎨 Icon Standards (MANDATORY)

#### Preferred Icons from lucide-react:
Use these specific icons for consistency across the entire UI:

| Purpose | Icon Component | Usage Context |
|---------|---------------|---------------|
| Home/Main | `<Home />` | Homepage, main navigation |
| Blog/Articles | `<Newspaper />` | Blog posts, news, articles |
| Services/Products | `<ShoppingBag />` | Services, products, offerings |
| About/Team | `<Users />` | About pages, team sections |
| Contact | `<Mail />` | Contact information, email |
| Phone | `<Phone />` | Phone numbers |
| Navigation/Sitemap | `<Navigation />` | Site structure, navigation menus |
| Pages/Documents | `<FileText />` | Generic pages, documents |
| Global/Website | `<Globe />` | External links, websites |
| Success/Complete | `<CheckCircle2 />` | Success states, completions |
| Error/Stop | `<XCircle />` | Errors, rejections |
| Warning/Alert | `<AlertCircle />` | Warnings, important notices |
| Refresh/Retry | `<RefreshCw />` | Refresh, retry actions |
| Search | `<Search />` | Search functionality |
| Social/Share | `<Share2 />` | Social media, sharing |

#### Icon Styling Rules:
1. **Consistent Size**: Use `w-4 h-4` for standard icons, `w-3 h-3` for small
2. **Consistent Color**: Use `text-muted-foreground` for neutral icons
3. **No Mixed Sets**: Don't mix different icon libraries
4. **Semantic Colors**: Only use colors when semantically meaningful (e.g., green for success)

#### Example Implementation:
```tsx
import { Home, Newspaper, ShoppingBag, Users, Mail } from 'lucide-react'

// Consistent icon usage
<Home className="w-4 h-4 text-muted-foreground" />
<Newspaper className="w-4 h-4 text-muted-foreground" />
<ShoppingBag className="w-4 h-4 text-muted-foreground" />
```


## Development Progress Tracking

### IMPORTANT: Implementation Log
**ALL projects MUST maintain a `development-progress-implementation-log.md` file in the project root.**

This file tracks all significant implementations with:
- Version numbers (v1.0, v2.0, etc.)
- Date and timestamp
- Features implemented
- Files created/modified
- Key improvements and metrics

#### Format Example:
```markdown
### v1.0 - Initial Setup
**Date: 2025-01-25**
**Timestamp: 10:00 GMT**

#### Features Implemented:
- Project initialization
- Core functionality
- Database schema

### v2.0 - Feature Enhancement
**Date: 2025-01-25**
**Timestamp: 15:30 GMT**

#### Features Implemented:
- New feature description
- Files modified
- Performance improvements
```

**When to Update:**
- After completing any significant feature
- When creating new architectural components
- After major refactoring
- When implementing integrations
- At the end of each development session

**Auto-create this file** when starting work on any project that doesn't have one.

## Coding Standards

### Best Practices
1. **Always use TypeScript** with strict mode enabled
2. **Prefer server components** in Next.js App Router (default)
3. **Use 'use client' directive** only when necessary
4. **Implement proper error boundaries** for robust error handling
5. **Use environment variables** for all sensitive data
6. **Follow atomic design principles** for components
7. **Implement proper loading and error states**
8. **Use React.Suspense** for async components

### Security Best Practices
1. **Never expose API keys** in client-side code
2. **Always validate and sanitize** user input
3. **Use Supabase RLS** (Row Level Security) policies
4. **Implement rate limiting** on API routes
5. **Use HTTPS everywhere** in production
6. **Enable CSP headers** for XSS protection
7. **Keep dependencies updated** regularly
8. **Use secrets management** for sensitive data

### Code Style
- Use functional components with hooks
- Implement proper TypeScript types (avoid `any`)
- Follow ESLint and Prettier configurations
- Use semantic HTML elements
- Implement accessible components (ARIA labels)
- Write self-documenting code (clear naming)
- Keep components small and focused
- Use custom hooks for reusable logic

## 🇬🇧 UK English Language Standards

### MANDATORY: Use UK English Spelling
All documentation, comments, and user-facing text MUST use UK English spelling conventions.

#### Common UK Spellings to Use:
- organisation (not organization)
- standardisation (not standardization)
- optimise/optimisation (not optimize/optimization)
- analyse (not analyze)
- recognise (not recognize)
- categorise (not categorize)
- synchronise (not synchronize)
- customise (not customize)
- realise (not realize)
- specialise (not specialize)
- centralised (not centralized)
- normalised (not normalized)
- unauthorised (not unauthorized)
- modelling (not modeling)
- behaviour (not behavior)
- centre (not center)
- colour (not color)
- favour (not favor)
- licence (noun) / license (verb)
- practise (verb) / practice (noun)

#### Exceptions:
- Technical terms that are trademarked or standardised in US spelling
- Code variables and function names (maintain consistency with existing codebase)
- Direct quotes from US sources
- API/SDK documentation that follows US conventions

#### Grammar Preferences:
- Use "whilst" instead of "while" where appropriate
- Use "amongst" instead of "among" where appropriate
- Date format: DD/MM/YYYY (not MM/DD/YYYY)
- Use "at the weekend" (not "on the weekend")

## Key Commands

### Supabase Database Workflow (ALWAYS USE CLI)
```bash
# Development workflow
supabase migration new descriptive_change_name    # Create migration
supabase db reset                                # Test migration locally
supabase gen types typescript --local > lib/database.types.ts  # Generate types
supabase db push                                 # Deploy to production
```

## Stripe Integration

**Status**: Fully configured with Basic ($19/mo) and Premium ($49/mo) plans
**Webhook Testing**: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
**Environment Variables**: Already set in .env.local (publishable key, secret key, webhook secret, price IDs)

## Notes

- Always prefer editing existing files over creating new ones
- Run linting and type checking before commits
- Use semantic commit messages
- Write tests for critical functionality
- Document complex logic with comments
- Keep bundle size optimized
- Monitor Core Web Vitals
- #DO NOT switch LLM models without approval.
- DO NOT CHANGE LLM MODEL WITHOUT USER PERMISSION!
- INCREASING TIMEOUTS IS NOT USUALLY A SOLUTION. IT IS A SYMPTOM OF AN UNDERLYING CODE ISSUE. ADJUST TIMEOUTS AS A LAST RESORT