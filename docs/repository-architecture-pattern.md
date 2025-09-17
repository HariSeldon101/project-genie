# Repository Architecture Pattern - Universal Database Access Layer

## Executive Summary

This document defines a **universal repository pattern** for Project Genie that provides a centralized, consistent, and DRY approach to all database operations across the entire application. This pattern ensures that database access logic is never scattered throughout the codebase, following the successful pattern already established by `LogsRepository`.

## Core Principles

### 1. Single Responsibility (SOLID)
Each repository class has ONE job: manage database operations for its domain entity.

### 2. DRY (Don't Repeat Yourself)
Database access code exists in ONE place per entity, never duplicated.

### 3. Database-First Architecture
All data flows from the database as the single source of truth.

### 4. No Silent Failures
All errors are caught, logged with `permanentLogger.captureError()`, and properly thrown.

### 5. Consistent Pattern
Every repository follows the same structure for predictability and maintainability.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Components, API Routes, Services, Orchestrators)          │
└─────────────────┬───────────────────────────────────────────┘
                  │ Uses
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │LogsRepository│ │UserRepository│ │ProjectRepo   │  ...    │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────┬───────────────────────────────────────────┘
                  │ Uses
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 Base Repository (Abstract)                   │
│         Common methods, error handling, logging              │
└─────────────────┬───────────────────────────────────────────┘
                  │ Uses
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Client                           │
│              createClient() from /lib/supabase               │
└──────────────────────────────────────────────────────────────┘
```

## Implementation Structure

### 1. Base Repository (Abstract Class)

```typescript
// /lib/repositories/base-repository.ts
import { createClient } from '@/lib/supabase/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { SupabaseClient } from '@supabase/supabase-js'

export abstract class BaseRepository {
  protected logger = permanentLogger

  /**
   * Get Supabase client with proper auth context
   * Handles SSR authentication via cookies
   */
  protected async getClient(): Promise<SupabaseClient> {
    const startTime = performance.now()

    try {
      const client = await createClient()

      this.logger.breadcrumb(
        this.constructor.name,
        'client-created',
        { duration: performance.now() - startTime }
      )

      return client
    } catch (error) {
      this.logger.captureError(
        this.constructor.name,
        error as Error,
        { operation: 'getClient' }
      )
      throw error
    }
  }

  /**
   * Execute a database operation with standard error handling
   */
  protected async execute<T>(
    operation: string,
    fn: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()

    this.logger.breadcrumb(
      this.constructor.name,
      `${operation}-start`,
      { timestamp: new Date().toISOString() }
    )

    try {
      const client = await this.getClient()
      const result = await fn(client)

      this.logger.timing(
        `${this.constructor.name}.${operation}`,
        { duration: performance.now() - startTime }
      )

      return result
    } catch (error) {
      this.logger.captureError(
        this.constructor.name,
        error as Error,
        {
          operation,
          duration: performance.now() - startTime,
          breadcrumbs: this.logger.getBreadcrumbs()
        }
      )
      throw error
    }
  }

  /**
   * Get current authenticated user
   */
  protected async getCurrentUser() {
    return this.execute('getCurrentUser', async (client) => {
      const { data: { user }, error } = await client.auth.getUser()

      if (error || !user) {
        throw new Error('User not authenticated')
      }

      return user
    })
  }
}
```

### 2. Domain-Specific Repositories

#### Company Intelligence Repository

```typescript
// /lib/repositories/company-intelligence-repository.ts
import { BaseRepository } from './base-repository'
import type {
  SessionData,
  DiscoveredPage,
  IntelligenceData
} from '@/lib/types/company-intelligence'

export class CompanyIntelligenceRepository extends BaseRepository {
  private static instance: CompanyIntelligenceRepository

  // Singleton pattern for consistency
  static getInstance(): CompanyIntelligenceRepository {
    if (!this.instance) {
      this.instance = new CompanyIntelligenceRepository()
    }
    return this.instance
  }

  /**
   * Create a new intelligence session
   */
  async createSession(
    companyName: string,
    domain: string
  ): Promise<SessionData> {
    return this.execute('createSession', async (client) => {
      const user = await this.getCurrentUser()

      // Check for existing active session first
      const { data: existing } = await client
        .from('company_intelligence_sessions')
        .select('*')
        .eq('domain', domain)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (existing) {
        this.logger.info('Found existing session', {
          sessionId: existing.id,
          domain
        })
        return existing
      }

      // Create new session
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

      return data
    })
  }

  /**
   * Update discovered URLs for a session
   */
  async updateDiscoveredUrls(
    sessionId: string,
    urls: string[]
  ): Promise<void> {
    return this.execute('updateDiscoveredUrls', async (client) => {
      const { error } = await client
        .from('company_intelligence_sessions')
        .update({
          discovered_urls: urls,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to update URLs: ${error.message}`)
      }

      this.logger.info('URLs updated', {
        sessionId,
        urlCount: urls.length
      })
    })
  }

  /**
   * Get discovered pages for a session
   */
  async getDiscoveredPages(sessionId: string): Promise<string[]> {
    return this.execute('getDiscoveredPages', async (client) => {
      const { data, error } = await client
        .from('company_intelligence_sessions')
        .select('discovered_urls')
        .eq('id', sessionId)
        .single()

      if (error) {
        throw new Error(`Failed to get pages: ${error.message}`)
      }

      return data?.discovered_urls || []
    })
  }
}
```

#### User Repository

```typescript
// /lib/repositories/user-repository.ts
import { BaseRepository } from './base-repository'

export class UserRepository extends BaseRepository {
  private static instance: UserRepository

  static getInstance(): UserRepository {
    if (!this.instance) {
      this.instance = new UserRepository()
    }
    return this.instance
  }

  async ensureProfile(userId: string) {
    return this.execute('ensureProfile', async (client) => {
      // Check if profile exists
      const { data: existing } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (existing) {
        return existing
      }

      // Create profile if doesn't exist
      const { data, error } = await client
        .from('profiles')
        .insert({ id: userId })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create profile: ${error.message}`)
      }

      return data
    })
  }

  async updateProfile(userId: string, updates: any) {
    return this.execute('updateProfile', async (client) => {
      const { data, error } = await client
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`)
      }

      return data
    })
  }
}
```

#### Project Repository

```typescript
// /lib/repositories/project-repository.ts
import { BaseRepository } from './base-repository'

export class ProjectRepository extends BaseRepository {
  private static instance: ProjectRepository

  static getInstance(): ProjectRepository {
    if (!this.instance) {
      this.instance = new ProjectRepository()
    }
    return this.instance
  }

  async createProject(projectData: any) {
    return this.execute('createProject', async (client) => {
      const user = await this.getCurrentUser()

      const { data, error } = await client
        .from('projects')
        .insert({
          ...projectData,
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create project: ${error.message}`)
      }

      return data
    })
  }

  async getProjects() {
    return this.execute('getProjects', async (client) => {
      const user = await this.getCurrentUser()

      const { data, error } = await client
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get projects: ${error.message}`)
      }

      return data
    })
  }
}
```

## Session Management Layer - Best Practice Analysis

### Should We Add a Session Management Layer?

**RECOMMENDATION: YES, but keep it thin and focused.**

### Why We Need It

1. **Business Logic Separation**: Repositories handle CRUD, Session Managers handle business logic
2. **State Coordination**: Managing complex multi-step workflows (like discovery phases)
3. **Caching Strategy**: Session managers can implement smart caching without polluting repositories
4. **Transaction Coordination**: Orchestrating multiple repository calls in a single transaction

### Recommended Architecture

```typescript
// /lib/services/session-manager.ts
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export class SessionManager {
  private repository = CompanyIntelligenceRepository.getInstance()
  private cache = new Map<string, any>()
  private cacheTTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get or create session with caching
   */
  async getOrCreateSession(companyName: string, domain: string) {
    const cacheKey = `session:${domain}`

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      permanentLogger.breadcrumb('SessionManager', 'cache-hit', { domain })
      return cached.data
    }

    // Get from repository
    const session = await this.repository.createSession(companyName, domain)

    // Update cache
    this.cache.set(cacheKey, {
      data: session,
      expires: Date.now() + this.cacheTTL
    })

    return session
  }

  /**
   * Complex business operation involving multiple repositories
   */
  async completeDiscoveryPhase(sessionId: string, pages: string[]) {
    // Start transaction-like operation
    permanentLogger.breadcrumb('SessionManager', 'phase-complete-start', { sessionId })

    try {
      // Update discovered URLs
      await this.repository.updateDiscoveredUrls(sessionId, pages)

      // Update session phase
      await this.repository.updateSessionPhase(sessionId, 2)

      // Clear cache for this session
      this.invalidateCache(sessionId)

      permanentLogger.info('Discovery phase completed', {
        sessionId,
        pageCount: pages.length
      })

      return true
    } catch (error) {
      permanentLogger.captureError('SessionManager', error as Error, {
        operation: 'completeDiscoveryPhase',
        sessionId
      })
      throw error
    }
  }

  private invalidateCache(sessionId: string) {
    // Remove all cache entries for this session
    for (const [key] of this.cache) {
      if (key.includes(sessionId)) {
        this.cache.delete(key)
      }
    }
  }
}
```

## Migration Strategy

### Phase 1: Create Base Infrastructure
1. Create `/lib/repositories/base-repository.ts`
2. Create repository instances for each domain
3. Add comprehensive tests

### Phase 2: Gradual Migration
1. Start with new features using repositories
2. Migrate existing code one component at a time
3. Use feature flags if needed

### Phase 3: Remove Old Patterns
1. Search for direct `createClient()` calls
2. Replace with repository methods
3. Archive old code in `/archive/`

## Usage Examples

### In API Routes

```typescript
// /app/api/company-intelligence/sessions/route.ts
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const repository = CompanyIntelligenceRepository.getInstance()

  try {
    const { companyName, domain } = await request.json()
    const session = await repository.createSession(companyName, domain)

    return NextResponse.json(session)
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### In React Components

```typescript
// /components/company-intelligence/session-viewer.tsx
'use client'

import { useEffect, useState } from 'react'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'

export function SessionViewer({ sessionId }: { sessionId: string }) {
  const [pages, setPages] = useState<string[]>([])

  useEffect(() => {
    const repository = CompanyIntelligenceRepository.getInstance()

    repository.getDiscoveredPages(sessionId)
      .then(setPages)
      .catch(console.error)
  }, [sessionId])

  return <div>{/* Render pages */}</div>
}
```

## Benefits

### 1. Testability
```typescript
// Easy to mock for testing
jest.mock('@/lib/repositories/company-intelligence-repository')
```

### 2. Maintainability
- Schema changes only require updates in one place
- Consistent error handling across the app
- Clear separation of concerns

### 3. Performance
- Centralized place for query optimization
- Easy to add caching layer
- Connection pooling managed in one place

### 4. Security
- RLS policies enforced consistently
- User authentication handled uniformly
- SQL injection prevention in one place

## Anti-Patterns to Avoid

### ❌ DON'T: Direct Database Access
```typescript
// BAD - Scattered database logic
const supabase = await createClient()
const { data, error } = await supabase.from('table').select()
```

### ✅ DO: Use Repository
```typescript
// GOOD - Centralized database logic
const repository = MyRepository.getInstance()
const data = await repository.getData()
```

### ❌ DON'T: Business Logic in Repository
```typescript
// BAD - Repository doing too much
class UserRepository {
  async registerUserAndSendEmail() { /* ... */ }
}
```

### ✅ DO: Keep Repositories Focused
```typescript
// GOOD - Repository just does data access
class UserRepository {
  async createUser() { /* ... */ }
}

// Business logic in service layer
class UserService {
  async registerUser() {
    const user = await userRepository.createUser()
    await emailService.sendWelcome(user)
  }
}
```

## Monitoring and Logging

All repositories automatically:
1. Log operation start/end with `breadcrumb()`
2. Track timing with `timing()`
3. Capture errors with `captureError()`
4. Include context in all logs

## Conclusion

This repository pattern provides:
- **Consistency**: Same pattern everywhere
- **Maintainability**: Changes in one place
- **Testability**: Easy to mock and test
- **Performance**: Centralized optimization
- **Security**: Uniform authentication and authorization

The pattern scales from simple CRUD operations to complex business workflows while maintaining clean separation of concerns and following SOLID principles.