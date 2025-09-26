# Fix for Fragile Auth: Use Supabase Database-First, NOT React State

## Problem Summary
The current Company Intelligence implementation is fragile and overly complex because it violates the database-first principle by managing sessions in React useState. This causes sessions to be lost on page refresh and creates authentication errors.

## Root Causes Identified

### 1. Session Management in React State
- **Problem**: SessionId stored in `useState` is lost on page refresh
- **Location**: `/components/company-intelligence/hooks/use-phase-state.ts`
- **Impact**: Users lose their session, causing 500 errors

### 2. Multiple .single() Bugs
- **Problem**: Using `.single()` instead of `.maybeSingle()` causes crashes when no rows exist
- **Locations**:
  - `/lib/repositories/company-intelligence-repository.ts` line 126
  - `/lib/repositories/company-intelligence-repository.ts` line 182
- **Impact**: 500 errors when session doesn't exist

### 3. Overly Complex Architecture
- **Problem**: Too many orchestration layers between UI and database
- **Components**: DiscoveryOrchestrator, PhaseExecutor, StreamingAdapter, etc.
- **Impact**: Hard to debug, maintain, and understand

### 4. Not Using Supabase Auth Properly
- **Problem**: Sessions not properly tied to authenticated users
- **Current**: Client passes sessionId around
- **Should Be**: Server manages sessions based on auth.getUser()

## Proposed Architecture: Database-First with Supabase

### Core Principles
1. **Database is the single source of truth** - No client-side session state
2. **Server manages all sessions** - Based on authenticated user
3. **Simplify to essentials** - Remove unnecessary orchestration layers
4. **Use Supabase properly** - Auth and RLS handle security

### New Architecture Flow

```
USER ACTION → API ROUTE → REPOSITORY → DATABASE
     ↑            ↓           ↓            ↓
     ←──── Response ←─── Session ←──── Auto-managed
```

## Implementation Plan

### Phase 1: Fix Immediate Bugs

#### Task 1: Fix .single() Bugs in Repository
**File**: `/lib/repositories/company-intelligence-repository.ts`

```typescript
// Fix getSession method (line 176-190)
async getSession(sessionId: string): Promise<SessionData> {
  return this.execute('getSession', async (client) => {
    const { data, error } = await client
      .from('company_intelligence_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()  // Changed from .single()

    if (error) {
      throw new Error(`Failed to retrieve session: ${error.message}`)
    }

    if (!data) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    return data as SessionData
  })
}

// Fix createSession check (line 119-126)
const { data: existing, error: checkError } = await client
  .from('company_intelligence_sessions')
  .select('*')
  .eq('domain', domain)
  .eq('user_id', user.id)
  .eq('status', 'active')
  .maybeSingle()  // Changed from .single()
```

#### Task 2: Add getUserActiveSession Method
**File**: `/lib/repositories/company-intelligence-repository.ts`

```typescript
/**
 * Get or create active session for current user and domain
 * This is the PRIMARY method that should be used
 */
async getOrCreateUserSession(domain: string): Promise<SessionData> {
  return this.execute('getOrCreateUserSession', async (client) => {
    // Get authenticated user
    const user = await this.getCurrentUser()

    // Check for existing active session
    const { data: existing } = await client
      .from('company_intelligence_sessions')
      .select('*')
      .eq('domain', domain)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existing) {
      this.logger.info('Found existing session', {
        sessionId: existing.id,
        domain
      })
      return existing as SessionData
    }

    // Create new session
    const companyName = domain.split('.')[0]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())

    const { data, error } = await client
      .from('company_intelligence_sessions')
      .insert({
        user_id: user.id,
        company_name: companyName,
        domain,
        status: 'active',
        phase: 1,
        version: 0,
        merged_data: {},
        execution_history: []
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`)
    }

    this.logger.info('Created new session', {
      sessionId: data.id,
      domain
    })

    return data as SessionData
  })
}
```

### Phase 2: Simplify API Routes

#### Task 3: Update fetch-sitemap Route
**File**: `/app/api/company-intelligence/fetch-sitemap/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const routeCategory = 'FETCH_SITEMAP_ROUTE'

  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    permanentLogger.setUserId(user.id)

    // 2. Parse request
    const { domain } = await request.json()

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    // 3. Get or create session automatically
    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(domain)

    permanentLogger.info(routeCategory, 'Processing discovery request', {
      sessionId: session.id,
      domain,
      userId: user.id
    })

    // 4. Execute discovery with session
    const orchestrator = new DiscoveryOrchestrator()
    await orchestrator.initialize({
      domain,
      sessionId: session.id,  // Server-managed session
      enableIntelligence: false,
      maxUrls: 200
    })

    // 5. Return results
    const acceptHeader = request.headers.get('accept')
    if (acceptHeader?.includes('text/event-stream')) {
      const stream = await orchestrator.executeWithStream(request.signal)
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    const result = await orchestrator.execute()
    return NextResponse.json({
      sessionId: session.id,  // Return for client reference
      domain: result.domain,
      pages: result.merged_data?.sitemap?.pages || [],
      success: result.success
    })

  } catch (error) {
    permanentLogger.captureError(routeCategory, error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
```

### Phase 3: Simplify Client Components

#### Task 4: Remove Session State Management
**File**: `/components/company-intelligence/hooks/use-phase-state.ts`

```typescript
/**
 * Simplified phase state - no session management
 * Sessions are managed server-side based on auth
 */
export function usePhaseState() {
  const [stageData, setStageData] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentDomain, setCurrentDomain] = useState<string>('')

  /**
   * Initialize discovery for a domain
   * Server will handle session management
   */
  const startDiscovery = useCallback(async (domain: string) => {
    setCurrentDomain(domain)
    setIsProcessing(true)

    try {
      const response = await fetch('/api/company-intelligence/fetch-sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Discovery failed')
      }

      const result = await response.json()

      // Store result in stage data
      setStageData(prev => ({
        ...prev,
        discovery: result
      }))

      return result

    } catch (error) {
      permanentLogger.captureError('PHASE_STATE', error as Error, { domain })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return {
    currentDomain,
    stageData,
    isProcessing,
    startDiscovery,
    setStageData,
    clearStageData: () => setStageData({})
  }
}
```

#### Task 5: Simplify Phase Controls
**File**: `/components/company-intelligence/phase-controls.tsx`

```typescript
export function PhaseControls({ domain, onComplete }: PhaseControlsProps) {
  const {
    stageData,
    isProcessing,
    startDiscovery
  } = usePhaseState()

  // No session management needed!
  // Server handles everything based on auth

  const handleStartDiscovery = async () => {
    try {
      const result = await startDiscovery(domain)
      showToast(`Found ${result.pages?.length || 0} pages`)
    } catch (error) {
      showToast('Discovery failed', 'error')
    }
  }

  return (
    <div>
      {/* Simplified UI without session management */}
      <Button onClick={handleStartDiscovery} disabled={isProcessing}>
        Start Discovery
      </Button>
    </div>
  )
}
```

### Phase 4: Remove Unnecessary Complexity

#### Task 6: Components to Delete/Simplify
1. **DELETE**: Complex orchestration layers that add no value
   - `/lib/company-intelligence/orchestrators/discovery-phase-executor.ts`
   - `/lib/company-intelligence/orchestrators/discovery-streaming-adapter.ts`
   - `/lib/company-intelligence/orchestrators/discovery-persistence.ts`

2. **SIMPLIFY**: `/lib/company-intelligence/orchestrators/discovery-orchestrator.ts`
   - Remove session validation complexity
   - Always use server-provided session

3. **SIMPLIFY**: Client hooks
   - Remove session tracking
   - Remove complex state management
   - Let server handle persistence

## Benefits of New Architecture

### 1. Robustness
- ✅ Sessions survive page refresh (database-persisted)
- ✅ No more 500 errors from missing sessions
- ✅ Proper error handling with .maybeSingle()

### 2. Simplicity
- ✅ No client-side session management
- ✅ Server automatically handles sessions
- ✅ Fewer layers of abstraction

### 3. Security
- ✅ Sessions always tied to authenticated users
- ✅ RLS policies enforced at database level
- ✅ No session ID manipulation possible

### 4. Best Practices
- ✅ Follows Next.js server-side patterns
- ✅ Uses Supabase auth properly
- ✅ Database-first architecture
- ✅ Repository pattern maintained

## TodoWrite Agent Tasks

```typescript
const tasks = [
  {
    content: "Fix .single() to .maybeSingle() in CompanyIntelligenceRepository",
    status: "pending",
    activeForm: "Fixing database query bugs",
    file: "/lib/repositories/company-intelligence-repository.ts",
    lines: [126, 182]
  },
  {
    content: "Add getOrCreateUserSession method to repository",
    status: "pending",
    activeForm: "Adding automatic session management",
    file: "/lib/repositories/company-intelligence-repository.ts"
  },
  {
    content: "Update fetch-sitemap route to auto-manage sessions",
    status: "pending",
    activeForm: "Updating API route for server-side sessions",
    file: "/app/api/company-intelligence/fetch-sitemap/route.ts"
  },
  {
    content: "Simplify use-phase-state hook - remove session management",
    status: "pending",
    activeForm: "Simplifying client-side state management",
    file: "/components/company-intelligence/hooks/use-phase-state.ts"
  },
  {
    content: "Update phase-controls to remove session tracking",
    status: "pending",
    activeForm: "Updating phase controls component",
    file: "/components/company-intelligence/phase-controls.tsx"
  },
  {
    content: "Test authentication flow end-to-end",
    status: "pending",
    activeForm: "Testing authentication flow"
  },
  {
    content: "Test page refresh maintains session",
    status: "pending",
    activeForm: "Testing session persistence"
  },
  {
    content: "Remove unnecessary orchestration layers",
    status: "pending",
    activeForm: "Removing complex orchestration files"
  }
]
```

## Testing Plan

### 1. Authentication Tests
- Login as user
- Start discovery
- Verify session created with correct user_id

### 2. Persistence Tests
- Start discovery
- Refresh page
- Verify can continue without error

### 3. Error Handling Tests
- Test with invalid domain
- Test with unauthenticated user
- Verify proper error messages

### 4. Database Tests
- Verify one session per user per domain
- Verify sessions marked active/inactive correctly
- Verify RLS policies work

## Migration Steps

1. **Backup current code** to `/archive/` folder
2. **Apply fixes** in order listed above
3. **Test thoroughly** before deploying
4. **Monitor logs** for any edge cases
5. **Document** any additional changes needed

## Conclusion

This refactor moves from a fragile client-managed session system to a robust server-managed database-first architecture. It follows Next.js and Supabase best practices while significantly reducing complexity and improving reliability.