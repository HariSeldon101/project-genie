# Background Document Generation Implementation Analysis

## Executive Summary
Currently, document generation runs **client-side** and will **abort if users navigate away**. This document analyzes the implementation complexity for converting to a **server-side background job system** that allows users to continue working while documents generate.

**Complexity Rating: MEDIUM-HIGH** (3-5 days of development)
**Risk Level: LOW** (existing queue infrastructure can be leveraged)
**User Impact: HIGH** (significant UX improvement)

---

## Current Architecture Problems

### 1. Client-Side Generation Issues
- **Page Dependency**: Generation stops if user leaves `/projects/[id]/generate`
- **Browser Resource Usage**: Heavy CPU/memory usage on client
- **No Recovery**: If browser crashes, all progress is lost
- **Session Storage Reliance**: Data stored temporarily in browser
- **No Multi-Tab Support**: Can't check progress from another tab/device

### 2. User Experience Problems
- **Forced Waiting**: Users stuck on generation page for 5-10 minutes
- **No Background Work**: Can't use other app features during generation
- **No Progress Persistence**: Refreshing page loses all progress
- **No Notifications**: No way to notify when complete if user navigates away

---

## Proposed Solution Architecture

### High-Level Design
```
User Initiates → API Creates Job → Background Processor → SSE Updates → Notifications
                        ↓                    ↓                 ↓
                  Database Job          Processes Queue    Real-time UI
                    Record               (Server-side)      Updates
```

### Component Changes Required

#### 1. Database Schema (LOW Complexity)
```sql
-- New table: document_generation_jobs
CREATE TABLE document_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES auth.users(id),

  -- Job metadata
  status TEXT CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 0,

  -- Input data
  project_data JSONB NOT NULL,
  company_intelligence_pack JSONB,
  documents_to_generate TEXT[],

  -- Progress tracking
  total_documents INTEGER,
  completed_documents INTEGER DEFAULT 0,
  current_document TEXT,
  progress_percentage INTEGER DEFAULT 0,

  -- Results
  generated_artifacts UUID[], -- References to artifacts table
  error_message TEXT,
  error_details JSONB,

  -- Timing
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,

  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick status queries
CREATE INDEX idx_generation_jobs_status ON document_generation_jobs(status, user_id);
CREATE INDEX idx_generation_jobs_project ON document_generation_jobs(project_id);
```

#### 2. API Endpoints (MEDIUM Complexity)

**New Endpoints Required:**

```typescript
// POST /api/generation/jobs - Create new background job
{
  projectId: string
  projectData: object
  companyIntelligencePack?: object
  priority?: 'high' | 'normal' | 'low'
}

// GET /api/generation/jobs/[jobId] - Get job status
Response: {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  currentDocument: string
  completedDocuments: string[]
  estimatedCompletion: Date
  error?: string
}

// GET /api/generation/jobs/stream/[jobId] - SSE stream for real-time updates
Response: Server-Sent Events stream

// POST /api/generation/jobs/[jobId]/cancel - Cancel job
// POST /api/generation/jobs/[jobId]/retry - Retry failed job
```

#### 3. Background Job Processor (HIGH Complexity)

**Option A: Next.js API Route with Long Polling (Simpler)**
```typescript
// /api/generation/processor/route.ts
// Runs on a cron or triggered by job creation
// Polls database for pending jobs
// Processes sequentially to avoid rate limits
```

**Option B: Separate Worker Service (More Robust)**
```typescript
// Standalone Node.js service
// Could use BullMQ, Agenda, or custom queue
// Better for scale but requires additional infrastructure
```

**Key Processing Logic:**
```typescript
class DocumentGenerationProcessor {
  async processJob(jobId: string) {
    // 1. Fetch job from database
    const job = await getJob(jobId)

    // 2. Update status to 'processing'
    await updateJobStatus(jobId, 'processing')

    // 3. Initialize document queue (reuse existing lib/documents/queue.ts)
    const queue = new DocumentQueue({
      onTaskComplete: async (task) => {
        // Update job progress in database
        await updateJobProgress(jobId, task)
        // Send SSE update
        await sendSSEUpdate(jobId, { progress, currentDocument })
      }
    })

    // 4. Process each document
    for (const docType of job.documents_to_generate) {
      await queue.addTask(
        job.project_id,
        docType,
        () => generateDocument(docType, job.project_data)
      )
    }

    // 5. Wait for completion
    await queue.waitForCompletion()

    // 6. Update job as completed
    await updateJobStatus(jobId, 'completed')

    // 7. Send notification
    await sendCompletionNotification(job.user_id, job.project_id)
  }
}
```

#### 4. Real-time Updates via SSE (MEDIUM Complexity)

**Leverage Existing SSE Infrastructure:**
```typescript
// Reuse lib/realtime-events/server/stream-writer.ts
import { StreamWriter } from '@/lib/realtime-events'

// In API route
export async function GET(req: Request) {
  const { jobId } = params

  return new Response(
    new ReadableStream({
      async start(controller) {
        const writer = new StreamWriter(controller)

        // Subscribe to job updates
        const unsubscribe = subscribeToJob(jobId, (update) => {
          writer.writeEvent({
            type: 'progress',
            data: {
              progress: update.progress,
              currentDocument: update.currentDocument,
              status: update.status
            }
          })
        })

        // Cleanup on disconnect
        req.signal.addEventListener('abort', () => {
          unsubscribe()
          controller.close()
        })
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    }
  )
}
```

#### 5. UI Changes (MEDIUM Complexity)

**New Components Needed:**

1. **BackgroundGenerationManager Component**
```tsx
// Manages background job lifecycle
function BackgroundGenerationManager({ projectId, projectData }) {
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)

  // Start background job
  const startGeneration = async () => {
    const response = await fetch('/api/generation/jobs', {
      method: 'POST',
      body: JSON.stringify({ projectId, projectData })
    })
    const { jobId } = await response.json()
    setJobId(jobId)

    // Subscribe to SSE updates
    const eventSource = new EventSource(`/api/generation/jobs/stream/${jobId}`)
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data)
      setStatus(update.status)
      setProgress(update.progress)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Generation</CardTitle>
        <CardDescription>
          Generation continues in background - feel free to navigate away
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'idle' && (
          <Button onClick={startGeneration}>
            Start Background Generation
          </Button>
        )}

        {status === 'processing' && (
          <>
            <Progress value={progress} />
            <p>Generating documents... {progress}% complete</p>
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              Continue to Dashboard
            </Button>
          </>
        )}

        {status === 'completed' && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Generation Complete!</AlertTitle>
            <AlertDescription>
              All documents have been generated successfully.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
```

2. **Global Job Status Indicator**
```tsx
// Show in header/sidebar when job is running
function GlobalJobIndicator() {
  const { activeJobs } = useGenerationJobs()

  if (activeJobs.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{activeJobs.length} generation(s) in progress</span>
    </div>
  )
}
```

3. **Notification System**
```tsx
// Browser notifications when complete
function useGenerationNotifications() {
  useEffect(() => {
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const notify = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/badge.png'
      })
    }

    // Also show in-app toast
    toast.success(title)
  }
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (1-2 days)
1. Create database schema
2. Build job creation API
3. Implement basic job processor
4. Add job status endpoint

### Phase 2: Real-time Updates (1 day)
1. Implement SSE streaming
2. Add progress tracking
3. Create subscription system

### Phase 3: UI Integration (1-2 days)
1. Update generation page
2. Add background generation component
3. Implement global status indicator
4. Add notification system

### Phase 4: Polish & Edge Cases (1 day)
1. Add retry logic
2. Handle job cancellation
3. Implement cleanup for old jobs
4. Add error recovery
5. Test with multiple concurrent jobs

---

## Code Changes Summary

### Files to Modify
1. `app/(dashboard)/projects/[id]/generate/page.tsx` - Add background option
2. `components/document-generator.tsx` - Support background mode
3. `lib/documents/queue.ts` - Already suitable, minor updates

### New Files Required
1. `app/api/generation/jobs/route.ts` - Job creation
2. `app/api/generation/jobs/[jobId]/route.ts` - Job status
3. `app/api/generation/jobs/stream/[jobId]/route.ts` - SSE updates
4. `app/api/generation/processor/route.ts` - Background processor
5. `components/background-generation-manager.tsx` - UI component
6. `lib/repositories/generation-jobs-repository.ts` - Database operations
7. `lib/services/generation-processor.ts` - Processing logic
8. `lib/hooks/use-generation-jobs.ts` - React hooks

---

## Alternative: Quick Win Solution (1 day)

If full background processing is too complex, consider this simpler approach:

### Keep Generation Running on Page Navigation
```typescript
// Store generation state in a global context/store
// Use a service worker or shared worker
// Generation continues even when tab is in background
// Show progress badge on all pages
// Redirect back to generation page to see results
```

**Pros:**
- Much simpler implementation
- Reuses existing code
- No backend changes needed

**Cons:**
- Still requires browser tab open
- No multi-device support
- Limited reliability

---

## Recommendations

1. **Start with Phase 1** - Get basic background jobs working
2. **Use existing queue system** - `lib/documents/queue.ts` is already built
3. **Leverage SSE infrastructure** - Real-time events system exists
4. **Consider managed service** - Vercel Functions + Upstash Queue could simplify
5. **Add feature flag** - Roll out gradually with ability to revert

## Estimated Timeline
- **Minimum Viable**: 3 days
- **Full Implementation**: 5 days
- **With Testing & Polish**: 7 days

## Risk Mitigation
- Keep current client-side generation as fallback
- Implement with feature flag for easy rollback
- Start with single-user testing before wide release
- Monitor job queue performance closely

---

## Conclusion

Converting to background generation is a **medium-high complexity** task that would significantly improve user experience. The main complexity comes from coordinating the background processor and real-time updates, but existing infrastructure (queue system, SSE, repositories) can be leveraged to reduce implementation time.

The investment is worthwhile given the user experience improvement, especially for projects with many documents that take 5-10+ minutes to generate.