# Development Patterns

## Unified Event System

### Migration from Legacy System (MANDATORY as of 2025-01-13)

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

### Server-Side Streaming (NEW):
```typescript
// ✅ CORRECT - Use new StreamWriter
import { StreamWriter } from '@/lib/realtime-events'

export async function POST(req: NextRequest) {
  const sessionId = nanoid()
  const correlationId = nanoid()
  
  const streamWriter = new StreamWriter(sessionId, correlationId, req.signal)
  const stream = streamWriter.createStream()
  
  // Send events
  await streamWriter.sendEvent(EventFactory.progress(0, 100, 'Starting...'))
  await streamWriter.sendEvent(EventFactory.data(results))
  
  // Clean up
  streamWriter.cleanup()
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ❌ WRONG - Don't use old SSEStreamManager
import { SSEStreamManager } from '@/lib/company-intelligence/utils/sse-stream-manager' // DEPRECATED!
```

### Client-Side Streaming (NEW):
```typescript
// ✅ CORRECT - Use new StreamReader
import { StreamReader } from '@/lib/realtime-events'

const reader = new StreamReader({
  url: '/api/stream',
  onEvent: (event) => {
    switch (event.type) {
      case 'progress':
        setProgress(event.progress)
        break
      case 'data':
        setData(prev => [...prev, ...event.data])
        break
      case 'error':
        toast.error(event.error.message)
        break
    }
  },
  onError: (error) => {
    permanentLogger.captureError('STREAM_ERROR', error)
  },
  reconnect: true, // Auto-reconnection built-in!
  reconnectDelay: 1000,
  maxReconnectAttempts: 5
})

// Start streaming
reader.start()

// Clean up on unmount
useEffect(() => {
  return () => reader.close()
}, [reader])

// ❌ WRONG - Don't use old StreamHandler
import { StreamHandler } from '@/lib/notifications/utils/stream-handler' // DEPRECATED!
```

### Why This Is Critical:
- **Single Source of Truth**: One event system for entire application
- **Type Safety**: Events maintain types across boundaries
- **Memory Safe**: No more memory leaks from unclosed streams
- **Auto-Recovery**: Automatic reconnection with exponential backoff
- **DRY/SOLID**: No more duplicate factories

## Repository Pattern Implementation

### Base Repository Template
```typescript
import { BaseRepository } from '@/lib/repositories/base-repository'
import type { Database } from '@/lib/database.types'
import { permanentLogger } from '@/lib/utils/permanent-logger'

type Entity = Database['public']['Tables']['entities']['Row']
type EntityInsert = Database['public']['Tables']['entities']['Insert']
type EntityUpdate = Database['public']['Tables']['entities']['Update']

export class EntityRepository extends BaseRepository<Entity> {
  protected tableName = 'entities'
  
  private static instance: EntityRepository
  
  static getInstance(): EntityRepository {
    if (!this.instance) {
      this.instance = new EntityRepository()
    }
    return this.instance
  }
  
  async create(data: EntityInsert): Promise<Entity> {
    return this.execute('create', async (client) => {
      permanentLogger.breadcrumb('repo_create', 'Creating entity', { data })
      
      const { data: entity, error } = await client
        .from(this.tableName)
        .insert(data)
        .select()
        .single()
      
      if (error) {
        permanentLogger.captureError('REPO_ENTITY', error, { operation: 'create' })
        throw error
      }
      
      permanentLogger.info('REPO_ENTITY', 'Entity created', { id: entity.id })
      return entity
    })
  }
  
  async findById(id: string): Promise<Entity | null> {
    return this.execute('findById', async (client) => {
      const timer = permanentLogger.timing('repo_findById')
      
      const { data, error } = await client
        .from(this.tableName)
        .select()
        .eq('id', id)
        .single()
      
      timer.stop()
      
      if (error && error.code !== 'PGRST116') {
        permanentLogger.captureError('REPO_ENTITY', error, { operation: 'findById', id })
        throw error
      }
      
      return data
    })
  }
  
  async update(id: string, data: EntityUpdate): Promise<Entity> {
    return this.execute('update', async (client) => {
      permanentLogger.breadcrumb('repo_update', 'Updating entity', { id, data })
      
      const { data: entity, error } = await client
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        permanentLogger.captureError('REPO_ENTITY', error, { operation: 'update', id })
        throw error
      }
      
      permanentLogger.info('REPO_ENTITY', 'Entity updated', { id })
      return entity
    })
  }
  
  async delete(id: string): Promise<void> {
    return this.execute('delete', async (client) => {
      const { error } = await client
        .from(this.tableName)
        .delete()
        .eq('id', id)
      
      if (error) {
        permanentLogger.captureError('REPO_ENTITY', error, { operation: 'delete', id })
        throw error
      }
      
      permanentLogger.info('REPO_ENTITY', 'Entity deleted', { id })
    })
  }
}
```

### API Route Using Repository
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { EntityRepository } from '@/lib/repositories/entity-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = permanentLogger.timing('api_entity_get')
  permanentLogger.breadcrumb('api_entry', 'GET entity request', { id: params.id })
  
  try {
    const repository = EntityRepository.getInstance()
    const entity = await repository.findById(params.id)
    
    if (!entity) {
      timer.stop()
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      )
    }
    
    timer.stop()
    return NextResponse.json(entity)
    
  } catch (error) {
    permanentLogger.captureError('API_ENTITY', error as Error, {
      method: 'GET',
      id: params.id
    })
    timer.stop()
    return NextResponse.json(
      { error: 'Failed to fetch entity' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = permanentLogger.timing('api_entity_update')
  
  try {
    const body = await req.json()
    permanentLogger.breadcrumb('api_body_parsed', 'Request body parsed', { id: params.id })
    
    const repository = EntityRepository.getInstance()
    const updated = await repository.update(params.id, body)
    
    timer.stop()
    return NextResponse.json(updated)
    
  } catch (error) {
    permanentLogger.captureError('API_ENTITY', error as Error, {
      method: 'PUT',
      id: params.id
    })
    timer.stop()
    return NextResponse.json(
      { error: 'Failed to update entity' },
      { status: 500 }
    )
  }
}
```

## Data Contract Enforcement

### Interface Definition
```typescript
// Define strict interfaces for all data
export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// Runtime validation using Zod
import { z } from 'zod'

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Validate at boundaries
export function validateUserProfile(data: unknown): UserProfile {
  try {
    return UserProfileSchema.parse(data)
  } catch (error) {
    permanentLogger.captureError('VALIDATION', error as Error, { data })
    throw new Error('Invalid user profile data')
  }
}
```

### API Boundary Validation
```typescript
export async function POST(req: NextRequest) {
  permanentLogger.breadcrumb('api_entry', 'POST request received')
  
  try {
    const body = await req.json()
    
    // Validate input at API boundary
    const validated = validateUserProfile(body)
    
    // Process with validated data
    const result = await processUserProfile(validated)
    
    return NextResponse.json(result)
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      permanentLogger.warn('API_VALIDATION', 'Invalid input', { errors: error.errors })
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    permanentLogger.captureError('API_PROFILE', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Component State Management Pattern

### State Management with Proper Error Handling
```typescript
'use client'

import { useState, useEffect } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export function DataComponent() {
  const [data, setData] = useState<Data[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const timer = permanentLogger.timing('component_data_fetch')
    
    async function fetchData() {
      permanentLogger.breadcrumb('fetch_start', 'Fetching data')
      
      try {
        const response = await fetch('/api/data')
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const result = await response.json()
        setData(result)
        permanentLogger.info('COMPONENT_DATA', 'Data fetched successfully', { 
          count: result.length 
        })
        
      } catch (err) {
        permanentLogger.captureError('COMPONENT_DATA', err as Error)
        setError('Failed to load data')
        // NO FALLBACK DATA - show error state
      } finally {
        setLoading(false)
        timer.stop()
      }
    }
    
    fetchData()
  }, [])
  
  // NO MOCK DATA - show real states
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />
  if (data.length === 0) return <EmptyState />
  
  return <DataList data={data} />
}
```

## Scraping Strategy Manager Pattern

### Strategy Manager Implementation
```typescript
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface ScraperStrategy {
  name: string
  canHandle: (url: string) => boolean
  scrape: (url: string) => Promise<ScrapedData>
}

export class StrategyManager {
  private strategies: ScraperStrategy[] = []
  
  register(strategy: ScraperStrategy): void {
    this.strategies.push(strategy)
    permanentLogger.info('STRATEGY_MANAGER', 'Strategy registered', { 
      name: strategy.name 
    })
  }
  
  async scrape(url: string): Promise<ScrapedData> {
    const timer = permanentLogger.timing('scraping', { url })
    
    const strategy = this.strategies.find(s => s.canHandle(url))
    
    if (!strategy) {
      timer.cancel()
      throw new Error(`No strategy available for URL: ${url}`)
    }
    
    permanentLogger.breadcrumb('strategy_selected', 'Using scraper strategy', { 
      strategy: strategy.name,
      url 
    })
    
    try {
      const result = await strategy.scrape(url)
      timer.stop()
      return result
    } catch (error) {
      permanentLogger.captureError('SCRAPER', error as Error, { 
        strategy: strategy.name,
        url 
      })
      timer.stop()
      throw error  // NO FALLBACK - propagate error
    }
  }
}
```

## HTML Parsing (MANDATORY - Added 2025-09-17)

### ❌ DEPRECATED - Never Use Regex for HTML
```typescript
// NEVER use regex for HTML parsing:
html.replace(/<[^>]+>/g, '')  // ❌ WRONG - unreliable
html.replace(/&lt;/g, '<')    // ❌ WRONG - incomplete
decodeHtmlEntities(html)      // ❌ DEPRECATED - uses regex
```

### ✅ REQUIRED - Use Proper Libraries

#### HTML Entity Decoding
```typescript
import he from 'he'

const decoded = he.decode(html)           // Decode entities
const encoded = he.encode(text)           // Encode entities
const escaped = he.escape(userInput)      // Escape for safety
```

#### HTML Parsing and Text Extraction
```typescript
// Client-side (browser)
if (typeof window !== 'undefined' && window.DOMParser) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const textContent = doc.body?.textContent || ''
}

// Server-side
import * as cheerio from 'cheerio'
const $ = cheerio.load(html)
const text = $.text()
```

#### HTML Sanitization (Security)
```typescript
import sanitizeHtml from 'sanitize-html'

const clean = sanitizeHtml(dirty, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a'],
  allowedAttributes: { 'a': ['href'] }
})
```

## Clean Code Conventions

### Table Naming
```sql
-- GOOD ✅: Singular, lowercase, underscores
CREATE TABLE project (...);
CREATE TABLE project_member (...);

-- BAD ❌: Plural, camelCase, unclear
CREATE TABLE Projects (...);
CREATE TABLE projectMembers (...);
```

### RLS Best Practices
- Avoid circular policy references
- Create simple, non-recursive policies
- Always test migrations locally first
- Document policy purposes with COMMENT
