# Company Intelligence Auth Migration Plan
## From Client-Side Session Management to Database-First Architecture

**Date Created**: 2025-09-18
**Author**: Claude Assistant
**Status**: Ready for Implementation

---

## Executive Summary

This document outlines the complete migration from the current fragile client-side session management (using React `useState`) to a robust database-first architecture where Supabase manages all authentication and session state.

### Core Problem
- Sessions stored in React `useState` are lost on page refresh
- Multiple `.single()` database queries throw errors when no rows exist
- Client components pass sessionId around, which may be null or invalid
- Violates database-first principle and Next.js best practices

### Solution
- Server automatically manages sessions based on authenticated user
- Client only sends domain, server handles everything else
- Sessions persist in database, not React state
- One session per user per domain

---

## Files Requiring Changes

### Total Files to Modify: 29
- **Component Files**: 10
- **API Route Files**: 19

---

## Phase 1: Repository Layer (✅ PARTIALLY COMPLETE)

### 1.1 `/lib/repositories/company-intelligence-repository.ts`

**Status**: ✅ Partially Complete

**Changes Already Made**:
```typescript
// Line 126 - Changed from .single() to .maybeSingle()
.maybeSingle()

// Line 182 - Changed from .single() to .maybeSingle() in getSession()
.maybeSingle()

// Added new method at line 176
async getOrCreateUserSession(domain: string): Promise<SessionData>
```

**Additional Changes Needed**:

Add method to get user's active sessions:
```typescript
/**
 * Get all active sessions for the current user
 * Used for session recovery and listing
 */
async getUserActiveSessions(): Promise<SessionData[]> {
  return this.execute('getUserActiveSessions', async (client) => {
    const user = await this.getCurrentUser()

    const { data, error } = await client
      .from('company_intelligence_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get user sessions: ${error.message}`)
    }

    return (data || []) as SessionData[]
  })
}

/**
 * Update session status
 */
async updateSessionStatus(sessionId: string, status: string): Promise<void> {
  return this.execute('updateSessionStatus', async (client) => {
    const { error } = await client
      .from('company_intelligence_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to update session status: ${error.message}`)
    }
  })
}
```

---

## Phase 2: API Routes Updates

### 2.1 `/app/api/company-intelligence/fetch-sitemap/route.ts`

**Status**: ✅ Partially Complete

**Changes Already Made**:
```typescript
// Added at line 113-114
const repository = CompanyIntelligenceRepository.getInstance()
const session = await repository.getOrCreateUserSession(body.domain)

// Modified at line 130-133
await orchestrator.initialize({
  ...body,
  sessionId: session.id  // Server-managed session
})
```

**Additional Changes Needed**:

Update request schema to make sessionId optional and deprecated:
```typescript
// Line 27-33
const FetchSitemapRequestSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  sessionId: z.string().optional().deprecated(), // Mark as deprecated
  enableIntelligence: z.boolean().optional().default(false),
  maxUrls: z.number().optional().default(200),
  validateUrls: z.boolean().optional().default(false)
})
```

### 2.2 `/app/api/company-intelligence/analyze-site/route.ts`

**Current Code**: Expects sessionId from client

**Required Changes**:
```typescript
export async function POST(request: NextRequest) {
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

    // 2. Parse request - only domain needed
    const { domain, ...otherParams } = await request.json()

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    // 3. Get or create session
    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(domain)

    // 4. Perform site analysis
    const analyzer = new SiteAnalyzer()
    const result = await analyzer.analyze(domain, {
      sessionId: session.id, // Use server-managed session internally
      ...otherParams
    })

    // 5. Update session with analysis results
    await repository.updateSession(session.id, {
      merged_data: {
        ...session.merged_data,
        site_analysis: result
      }
    })

    return NextResponse.json({
      sessionId: session.id, // Return for client reference
      ...result
    })
  } catch (error) {
    permanentLogger.captureError('ANALYZE_SITE', error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
```

### 2.3 `/app/api/company-intelligence/phases/scraping/route.ts`

**Required Changes**:
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Parse request
    const { domain, pages, ...options } = await request.json()

    // 3. Get session
    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(domain)

    // 4. Execute scraping
    const scraper = new ScrapingOrchestrator()
    const results = await scraper.scrapePages(pages, {
      sessionId: session.id,
      ...options
    })

    // 5. Update session
    await repository.updateSession(session.id, {
      merged_data: {
        ...session.merged_data,
        scraped_data: results
      }
    })

    return NextResponse.json({
      sessionId: session.id,
      results
    })
  } catch (error) {
    permanentLogger.captureError('SCRAPING_PHASE', error as Error)
    return NextResponse.json(
      { error: 'Scraping failed' },
      { status: 500 }
    )
  }
}
```

### 2.4 `/app/api/company-intelligence/phases/extraction/route.ts`

**Required Changes**:
```typescript
export async function POST(request: NextRequest) {
  try {
    // Same pattern as above
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { domain, ...params } = await request.json()

    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(domain)

    // Get scraped data from session
    const scrapedData = session.merged_data?.scraped_data
    if (!scrapedData) {
      return NextResponse.json(
        { error: 'No scraped data found. Run scraping phase first.' },
        { status: 400 }
      )
    }

    // Extract insights
    const extractor = new DataExtractor()
    const insights = await extractor.extract(scrapedData, {
      sessionId: session.id,
      ...params
    })

    // Update session
    await repository.updateSession(session.id, {
      merged_data: {
        ...session.merged_data,
        extracted_insights: insights
      }
    })

    return NextResponse.json({
      sessionId: session.id,
      insights
    })
  } catch (error) {
    permanentLogger.captureError('EXTRACTION_PHASE', error as Error)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
```

### 2.5 `/app/api/company-intelligence/phases/enrichment/route.ts`

**Required Changes**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { domain, ...params } = await request.json()

    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(domain)

    // Get extracted insights
    const insights = session.merged_data?.extracted_insights
    if (!insights) {
      return NextResponse.json(
        { error: 'No extracted insights found. Run extraction phase first.' },
        { status: 400 }
      )
    }

    // Enrich data
    const enricher = new DataEnricher()
    const enrichedData = await enricher.enrich(insights, {
      sessionId: session.id,
      ...params
    })

    // Update session
    await repository.updateSession(session.id, {
      merged_data: {
        ...session.merged_data,
        enriched_data: enrichedData
      }
    })

    return NextResponse.json({
      sessionId: session.id,
      enrichedData
    })
  } catch (error) {
    permanentLogger.captureError('ENRICHMENT_PHASE', error as Error)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
```

### 2.6 `/app/api/company-intelligence/phases/generation/route.ts`

**Required Changes**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { domain, documentType, ...params } = await request.json()

    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(domain)

    // Ensure all previous phases completed
    const mergedData = session.merged_data
    if (!mergedData?.enriched_data) {
      return NextResponse.json(
        { error: 'Previous phases not completed' },
        { status: 400 }
      )
    }

    // Generate document
    const generator = new DocumentGenerator()
    const document = await generator.generate(documentType, mergedData, {
      sessionId: session.id,
      ...params
    })

    // Update session
    await repository.updateSession(session.id, {
      merged_data: {
        ...session.merged_data,
        generated_documents: {
          ...session.merged_data?.generated_documents,
          [documentType]: document
        }
      }
    })

    return NextResponse.json({
      sessionId: session.id,
      document
    })
  } catch (error) {
    permanentLogger.captureError('GENERATION_PHASE', error as Error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
```

### 2.7 `/app/api/company-intelligence/sessions/route.ts`

**Status**: Keep for backward compatibility but update

**Required Changes**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { domain, company_name } = await request.json()

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Use repository to ensure consistency
    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(domain)

    return NextResponse.json({
      message: 'Session created/retrieved successfully',
      session
    }, { status: 201 })
  } catch (error) {
    permanentLogger.captureError('SESSIONS_API', error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to manage session' },
      { status: 500 }
    )
  }
}

// GET endpoint to list user's sessions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const repository = CompanyIntelligenceRepository.getInstance()
    const sessions = await repository.getUserActiveSessions()

    return NextResponse.json({ sessions })
  } catch (error) {
    permanentLogger.captureError('SESSIONS_API', error as Error)
    return NextResponse.json({ error: 'Failed to get sessions' }, { status: 500 })
  }
}
```

### 2.8 Other API Routes Pattern

All other API routes should follow the same pattern:
1. Authenticate user
2. Get domain from request body
3. Call `repository.getOrCreateUserSession(domain)`
4. Use session internally for all operations
5. Return results with sessionId for reference

---

## Phase 3: Component Updates

### 3.1 `/components/company-intelligence/hooks/use-phase-state.ts`

**Major Refactor Required**

**Current Code**: Manages sessionId in useState

**New Code**:
```typescript
import { useState, useCallback, useRef } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface PhaseData {
  domain: string
  siteAnalysis?: any
  discoveredUrls?: any[]
  scrapedData?: any
  extractedInsights?: any
  enrichedData?: any
  generatedDocuments?: Record<string, any>
}

/**
 * Simplified phase state - no session management
 * Server handles all session logic
 */
export function usePhaseState() {
  const [domain, setDomain] = useState<string>('')
  const [phaseData, setPhaseData] = useState<PhaseData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<string>('discovery')

  /**
   * Initialize with domain
   */
  const initializeDomain = useCallback((newDomain: string) => {
    permanentLogger.info('PHASE_STATE', 'Initializing domain', { domain: newDomain })
    setDomain(newDomain)
    setPhaseData({ domain: newDomain })
  }, [])

  /**
   * Fetch phase data from server
   * Server automatically manages session
   */
  const fetchPhaseData = useCallback(async () => {
    if (!domain) return

    try {
      setIsProcessing(true)

      // Server will find/create session automatically
      const response = await fetch('/api/company-intelligence/phase-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch phase data')
      }

      const data = await response.json()
      setPhaseData(data.phaseData)

    } catch (error) {
      permanentLogger.captureError('PHASE_STATE', error as Error, { domain })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [domain])

  /**
   * Execute a phase
   */
  const executePhase = useCallback(async (phase: string, params: any = {}) => {
    if (!domain) {
      throw new Error('Domain not initialized')
    }

    try {
      setIsProcessing(true)

      const response = await fetch(`/api/company-intelligence/phases/${phase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain, // Only send domain
          ...params
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `${phase} phase failed`)
      }

      const result = await response.json()

      // Update local phase data
      setPhaseData(prev => ({
        ...prev!,
        [phase]: result.data
      }))

      return result

    } catch (error) {
      permanentLogger.captureError('PHASE_STATE', error as Error, { phase, domain })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [domain])

  /**
   * Clear all data
   */
  const clearData = useCallback(() => {
    setDomain('')
    setPhaseData(null)
    setCurrentPhase('discovery')
  }, [])

  return {
    // State
    domain,
    phaseData,
    isProcessing,
    currentPhase,

    // Actions
    initializeDomain,
    fetchPhaseData,
    executePhase,
    setCurrentPhase,
    clearData
  }
}
```

### 3.2 `/components/company-intelligence/phase-controls.tsx`

**Major Changes Required**

**Key Changes**:
- Remove all sessionId tracking
- Only pass domain to child components
- Let server manage sessions

```typescript
export function PhaseControls({
  domain: initialDomain,
  onComplete,
  onSessionCreated // Remove this
}: PhaseControlsProps) {
  const {
    domain,
    phaseData,
    isProcessing,
    currentPhase,
    initializeDomain,
    executePhase,
    setCurrentPhase
  } = usePhaseState()

  // Initialize domain on mount or change
  useEffect(() => {
    if (initialDomain && initialDomain !== domain) {
      initializeDomain(initialDomain)
    }
  }, [initialDomain, domain, initializeDomain])

  // Handle site analysis
  const handleSiteAnalysis = async () => {
    try {
      const result = await executePhase('analyze-site')
      showToast('Site analysis complete')
    } catch (error) {
      showToast('Site analysis failed', 'error')
    }
  }

  // Handle discovery
  const handleDiscovery = async () => {
    try {
      const result = await executePhase('fetch-sitemap')
      showToast(`Found ${result.pages?.length || 0} pages`)
    } catch (error) {
      showToast('Discovery failed', 'error')
    }
  }

  // Remove all sessionId props from child components
  return (
    <div>
      {currentPhase === 'discovery' && (
        <SitemapSelector
          domain={domain} // Only pass domain
          onComplete={handleDiscoveryComplete}
          onError={handleError}
        />
      )}

      {currentPhase === 'scraping' && (
        <ScrapingControl
          domain={domain} // Only pass domain
          pages={phaseData?.discoveredUrls || []}
          onComplete={handleScrapingComplete}
        />
      )}

      {/* Other phases... */}
    </div>
  )
}
```

### 3.3 `/components/company-intelligence/sitemap-selector/index.tsx`

**Remove sessionId prop**

```typescript
// Update interface
export interface SitemapSelectorProps {
  domain: string  // Changed from companyId
  // sessionId: string  // REMOVE
  onComplete?: (pages: PageInfo[]) => void
  onError?: (error: Error) => void
  className?: string
}

export const SitemapSelector: React.FC<SitemapSelectorProps> = ({
  domain,
  // sessionId, // REMOVE
  onComplete,
  onError,
  className
}) => {
  // ... existing code ...

  // Update hook call
  const { pages, state } = useDiscoveryStream(domain) // Remove sessionId

  // ... rest of component
}
```

### 3.4 `/components/company-intelligence/sitemap-selector/hooks/use-discovery-stream.ts`

**Remove sessionId parameter**

```typescript
/**
 * Hook for managing the discovery stream
 * @param domain - Company domain
 * @returns pages array and discovery state
 */
export function useDiscoveryStream(domain: string) { // Remove sessionId parameter
  // State management
  const [pages, setPages] = useState<PageInfo[]>([])
  const [state, setState] = useState<DiscoveryState>({
    phase: 'idle',
    progress: 0,
    total: 0,
    error: null,
    startTime: performance.now()
  })

  useEffect(() => {
    if (!domain) return

    const initializeStream = async () => {
      try {
        setState(prev => ({ ...prev, phase: 'connecting' }))

        // Make POST request - server handles session
        const response = await fetch('/api/company-intelligence/fetch-sitemap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify({
            domain,  // Only send domain
            validateUrls: false
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Process streaming response...
        // ... existing stream processing code ...

      } catch (error) {
        permanentLogger.captureError('DISCOVERY_STREAM', error as Error, { domain })
        setState(prev => ({
          ...prev,
          phase: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
        onError?.(error as Error)
      }
    }

    initializeStream()

  }, [domain]) // Only depend on domain

  return { pages, state }
}
```

### 3.5 `/components/company-intelligence/sitemap-selector/types.ts`

**Update type definitions**

```typescript
// Remove sessionId from all interfaces
export interface SitemapSelectorProps {
  domain: string
  // sessionId: string  // REMOVE
  onComplete?: (pages: PageInfo[]) => void
  onError?: (error: Error) => void
  className?: string
}

export interface DiscoveryRequest {
  domain: string
  // sessionId?: string  // REMOVE or mark deprecated
  validateUrls?: boolean
  maxUrls?: number
  enableIntelligence?: boolean
}
```

### 3.6 `/components/company-intelligence/hooks/use-phase-handlers.ts`

**Update to remove sessionId dependency**

```typescript
interface UsePhaseHandlersProps {
  domain: string  // Changed from sessionId
  stageData: Record<string, any>
  setIsProcessing: (processing: boolean) => void
  onStageComplete: (stage: string, data: any) => void
}

export function usePhaseHandlers({
  domain,
  stageData,
  setIsProcessing,
  onStageComplete
}: UsePhaseHandlersProps) {

  const handleScraping = useCallback(async (pages: any[]) => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/company-intelligence/phases/scraping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,  // Only send domain
          pages
        })
      })

      if (!response.ok) throw new Error('Scraping failed')

      const result = await response.json()
      onStageComplete('scraping', result)
      return result

    } catch (error) {
      permanentLogger.captureError('PHASE_HANDLERS', error as Error, { phase: 'scraping', domain })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [domain, onStageComplete, setIsProcessing])

  // Similar updates for other handlers...

  return {
    handleScraping,
    handleExtraction,
    handleEnrichment,
    handleGeneration
  }
}
```

### 3.7 `/components/company-intelligence/additive/scraping-control.tsx`

**Update to use domain instead of sessionId**

```typescript
interface ScrapingControlProps {
  domain: string  // Changed from sessionId
  pages: PageInfo[]
  onComplete: (data: any) => void
  className?: string
}

export function ScrapingControl({
  domain,
  pages,
  onComplete,
  className
}: ScrapingControlProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const startScraping = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/company-intelligence/phases/scraping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,  // Only send domain
          pages: pages.map(p => p.url)
        })
      })

      if (!response.ok) throw new Error('Scraping failed')

      const result = await response.json()
      onComplete(result)

    } catch (error) {
      permanentLogger.captureError('SCRAPING_CONTROL', error as Error, { domain })
      showToast('Scraping failed', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // ... rest of component
}
```

### 3.8 `/components/company-intelligence/session-selector.tsx`

**Consider removing entirely or refactoring**

This component may no longer be needed if sessions are managed server-side. If kept for listing user's sessions:

```typescript
export function SessionSelector({ onSelectDomain }: { onSelectDomain: (domain: string) => void }) {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserSessions()
  }, [])

  const fetchUserSessions = async () => {
    try {
      const response = await fetch('/api/company-intelligence/sessions')
      if (!response.ok) throw new Error('Failed to fetch sessions')

      const { sessions } = await response.json()
      setSessions(sessions)
    } catch (error) {
      permanentLogger.captureError('SESSION_SELECTOR', error as Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3>Your Active Sessions</h3>
      {sessions.map(session => (
        <button
          key={session.id}
          onClick={() => onSelectDomain(session.domain)}
        >
          {session.company_name} ({session.domain})
        </button>
      ))}
    </div>
  )
}
```

### 3.9 `/components/company-intelligence/debug-data-viewer.tsx`

**Update to fetch data by domain**

```typescript
interface DebugDataViewerProps {
  domain: string  // Changed from sessionId
}

export function DebugDataViewer({ domain }: DebugDataViewerProps) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!domain) return

    const fetchData = async () => {
      try {
        const response = await fetch('/api/company-intelligence/debug-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain })
        })

        const result = await response.json()
        setData(result)
      } catch (error) {
        permanentLogger.captureError('DEBUG_VIEWER', error as Error, { domain })
      }
    }

    fetchData()
  }, [domain])

  return (
    <div>
      <h3>Debug Data for {domain}</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
```

### 3.10 `/components/company-intelligence/cost-accumulator.tsx`

**Update to track by domain**

```typescript
interface CostAccumulatorProps {
  domain: string  // Changed from sessionId
}

export function CostAccumulator({ domain }: CostAccumulatorProps) {
  const [costs, setCosts] = useState({
    scraping: 0,
    extraction: 0,
    enrichment: 0,
    generation: 0,
    total: 0
  })

  useEffect(() => {
    if (!domain) return

    const fetchCosts = async () => {
      try {
        const response = await fetch('/api/company-intelligence/costs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain })
        })

        const result = await response.json()
        setCosts(result.costs)
      } catch (error) {
        permanentLogger.captureError('COST_ACCUMULATOR', error as Error, { domain })
      }
    }

    // Poll for updates
    const interval = setInterval(fetchCosts, 5000)
    fetchCosts()

    return () => clearInterval(interval)
  }, [domain])

  return (
    <div>
      <h3>Cost Tracking</h3>
      <div>Total: ${costs.total.toFixed(4)}</div>
      {/* ... breakdown by phase ... */}
    </div>
  )
}
```

---

## Phase 4: Database Schema Verification

### Ensure these columns exist in `company_intelligence_sessions` table:

```sql
-- Sessions must have these columns
CREATE TABLE IF NOT EXISTS company_intelligence_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  phase INTEGER DEFAULT 1,
  version INTEGER DEFAULT 0,
  merged_data JSONB DEFAULT '{}',
  execution_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one active session per user per domain
  UNIQUE(user_id, domain, status) WHERE status = 'active'
);

-- Index for performance
CREATE INDEX idx_sessions_user_domain ON company_intelligence_sessions(user_id, domain);
CREATE INDEX idx_sessions_status ON company_intelligence_sessions(status);
```

---

## Phase 5: Testing Checklist

### Unit Tests
- [ ] Repository methods work correctly
- [ ] getOrCreateUserSession creates new or returns existing
- [ ] Sessions properly tied to authenticated users

### Integration Tests
- [ ] API routes require authentication
- [ ] Sessions auto-created on first request
- [ ] Sessions persist across requests
- [ ] One session per user per domain

### End-to-End Tests
- [ ] User can start discovery without sessionId
- [ ] Page refresh maintains session
- [ ] All phases work with domain-only requests
- [ ] No 500 errors from missing sessions

### Manual Testing
1. Clear browser storage
2. Login as test user
3. Enter domain and start discovery
4. Refresh page - should continue working
5. Check database - one session exists
6. Try different domain - new session created
7. Return to first domain - existing session used

---

## Migration Steps

### Step 1: Backend First (Safe)
1. Update repository with new methods ✅
2. Update fetch-sitemap route ✅
3. Test with existing client (backward compatible)

### Step 2: Update Other API Routes
4. Update all phase routes to auto-manage sessions
5. Keep sessionId optional for backward compatibility
6. Test each route individually

### Step 3: Update Components (Breaking Changes)
7. Update use-discovery-stream to not send sessionId
8. Update SitemapSelector to not require sessionId
9. Update phase-controls to only track domain
10. Update use-phase-state to remove session management

### Step 4: Cleanup
11. Remove session-selector component (if unused)
12. Remove sessionId from all type definitions
13. Mark sessionId as deprecated in API schemas
14. Update documentation

---

## Rollback Plan

If issues occur during migration:

### Phase 1 Rollback (Repository)
```bash
git revert [commit-hash]  # Revert repository changes
```

### Phase 2 Rollback (API Routes)
Keep sessionId optional - existing code continues working

### Phase 3 Rollback (Components)
Use feature flag to toggle between old and new behavior:
```typescript
const USE_SERVER_SESSIONS = process.env.NEXT_PUBLIC_USE_SERVER_SESSIONS === 'true'

if (USE_SERVER_SESSIONS) {
  // New code - domain only
} else {
  // Old code - with sessionId
}
```

---

## Success Metrics

### Technical Metrics
- Zero 500 errors related to sessions
- Sessions persist across page refreshes
- API response times remain under 2 seconds
- Database queries optimized with proper indexes

### User Experience Metrics
- No lost work on page refresh
- Seamless navigation between phases
- Clear error messages when issues occur
- Consistent state across all components

---

## Timeline

### Week 1
- Day 1-2: Update repository and core API routes
- Day 3-4: Update all phase API routes
- Day 5: Testing and bug fixes

### Week 2
- Day 1-2: Update React components
- Day 3-4: Update types and remove deprecated code
- Day 5: Final testing and documentation

---

## Documentation Updates Required

1. Update API documentation to show domain-only requests
2. Update component documentation to remove sessionId props
3. Add migration guide for other developers
4. Update README with new architecture

---

## Appendix: Helper Scripts

### Script to Find All SessionId References
```bash
#!/bin/bash
echo "Files with sessionId references:"
grep -r "sessionId" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir="node_modules" \
  --exclude-dir=".next" \
  --exclude-dir="archive" \
  components/company-intelligence \
  app/api/company-intelligence
```

### Script to Test API Endpoints
```bash
#!/bin/bash
DOMAIN="test.example.com"

# Test each endpoint
curl -X POST http://localhost:3000/api/company-intelligence/fetch-sitemap \
  -H "Content-Type: application/json" \
  -d "{\"domain\": \"$DOMAIN\"}" \
  -b cookies.txt

curl -X POST http://localhost:3000/api/company-intelligence/analyze-site \
  -H "Content-Type: application/json" \
  -d "{\"domain\": \"$DOMAIN\"}" \
  -b cookies.txt

# ... test other endpoints
```

---

## Conclusion

This migration plan moves the Company Intelligence feature from a fragile client-side session management system to a robust database-first architecture. The key principle is simple: **clients send domain, server manages everything else**.

The migration can be done incrementally with backward compatibility, reducing risk. The end result will be a more maintainable, reliable, and user-friendly system that follows Next.js and Supabase best practices.