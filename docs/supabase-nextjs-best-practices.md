# Supabase + Next.js Best Practices & Guidelines

> **Last Updated**: 2025-09-20
> **Status**: Official Guidelines
> **Priority**: P0 - Critical for all Supabase implementations

## Table of Contents
1. [Authentication & Session Management](#1-authentication--session-management)
2. [Data Fetching Patterns](#2-data-fetching-patterns)
3. [Row Level Security (RLS)](#3-row-level-security-rls)
4. [Type Safety](#4-type-safety)
5. [Error Handling](#5-error-handling)
6. [Real-time Subscriptions](#6-real-time-subscriptions)
7. [File Storage](#7-file-storage)
8. [Environment Variables](#8-environment-variables)
9. [Caching Strategies](#9-caching-strategies)
10. [Performance Optimization](#10-performance-optimization)
11. [Repository Pattern](#11-repository-pattern-recommended)
12. [Testing](#12-testing)
13. [Common Pitfalls](#13-common-pitfalls)

## 1. Authentication & Session Management

### Server-Side Authentication (Recommended)
```typescript
// ✅ BEST PRACTICE: Server-side auth check in Server Components
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getServerSession() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ❌ AVOID: Don't rely on client-side auth for security
// Client auth is only for UI state, not for protecting data
```

### Middleware Authentication
```typescript
// middleware.ts - Protect routes at edge
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if accessing protected route without auth
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*']
}
```

## 2. Data Fetching Patterns

### Server Components (Recommended)
```typescript
// ✅ BEST: Fetch data in Server Components
async function ProjectsPage() {
  const supabase = createServerClient(...)

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // Handle error appropriately - see Error Handling section
    console.error('Failed to fetch projects:', error)
    return <ErrorState />
  }

  return <ProjectsList projects={projects} />
}
```

### Client Components with React Query/SWR
```typescript
// ✅ GOOD: Use React Query for client-side data fetching
import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'

function useProjects() {
  const supabase = createBrowserClient(...)

  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')

      if (error) throw error
      return data
    },
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

## 3. Row Level Security (RLS)

### Always Enable RLS
```sql
-- ✅ ALWAYS enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
```

### Service Role vs Anon Key
```typescript
// ✅ Use service role ONLY on server, NEVER expose to client
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Server-only!
  {
    auth: { persistSession: false }
  }
)

// ✅ Use anon key for client-side operations
const clientSupabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Safe for client
)
```

## 4. Type Safety

### Generate TypeScript Types
```bash
# Generate types from your database schema
npx supabase gen types typescript --project-ref YOUR_PROJECT_REF > types/database.types.ts

# For this project specifically:
supabase gen types typescript --project-id vnuieavheezjxbkyfxea > lib/database.types.ts
```

### Use Generated Types
```typescript
import type { Database } from '@/types/database.types'

// Create typed client
const supabase = createServerClient<Database>(...)

// Now you get full type safety
const { data } = await supabase
  .from('projects')
  .select('id, name, created_at') // TypeScript knows these columns!
  .single()

// data is fully typed based on your schema
```

## 5. Error Handling

### ⚠️ CRITICAL: Supabase Errors Are NOT Error Instances!

```typescript
// ✅ CORRECT: Handle Supabase errors properly
import { PostgrestError } from '@supabase/supabase-js'

async function fetchData() {
  const { data, error } = await supabase
    .from('table')
    .select('*')

  if (error) {
    // Supabase errors are PostgrestError objects, NOT Error instances!
    const jsError = convertSupabaseError(error)
    throw jsError
  }

  return data
}

// Helper function to convert PostgrestError to Error
export function convertSupabaseError(error: PostgrestError): Error {
  const jsError = new Error(error.message)
  jsError.name = 'DatabaseError'

  // Preserve all Supabase error details
  ;(jsError as any).code = error.code
  ;(jsError as any).details = error.details
  ;(jsError as any).hint = error.hint

  return jsError
}

// For logging with permanentLogger
function handleSupabaseError(error: PostgrestError, context: any) {
  // Convert to Error instance for permanentLogger
  const jsError = convertSupabaseError(error)
  permanentLogger.captureError('DATABASE', jsError, context)
}
```

### Error Properties Reference
```typescript
interface PostgrestError {
  message: string    // Human-readable error message
  code: string      // PostgreSQL error code (e.g., '23505' for unique violation)
  details: string   // Detailed error information
  hint: string      // Suggestion for fixing the error
}
```

## 6. Real-time Subscriptions

### Manage Subscriptions Properly
```typescript
// ✅ CORRECT: Clean up subscriptions
'use client'
import { useEffect } from 'react'

function RealtimeComponent() {
  const supabase = createBrowserClient(...)

  useEffect(() => {
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          console.log('Change received!', payload)
        }
      )
      .subscribe()

    // ✅ CRITICAL: Always clean up!
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])
}
```

## 7. File Storage

### Secure File Uploads
```typescript
// ✅ Generate unique file names to prevent collisions
import { v4 as uuidv4 } from 'uuid'

async function uploadFile(file: File, bucket: string, userId: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${uuidv4()}.${fileExt}`
  const filePath = `${userId}/${fileName}` // Organize by user

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false // Prevent overwriting
    })

  if (error) {
    const jsError = new Error(error.message)
    jsError.name = 'StorageError'
    throw jsError
  }

  // Get public URL if needed
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return data.publicUrl
}
```

## 8. Environment Variables

### Proper Setup
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url        # OK to expose
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key     # OK to expose
SUPABASE_SERVICE_ROLE_KEY=your-service-key      # NEVER expose!
SUPABASE_JWT_SECRET=your-jwt-secret             # NEVER expose!
```

### Security Checklist
- ✅ Service role key only in server-side code
- ✅ Never log or expose service role key
- ✅ Use anon key for client-side operations
- ✅ Add `.env.local` to `.gitignore`

## 9. Caching Strategies

### Next.js App Router Caching
```typescript
// ✅ Control caching with fetch options
async function getData() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/projects`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${session.access_token}`
    },
    next: {
      revalidate: 60, // Revalidate every 60 seconds
      tags: ['projects'] // For on-demand revalidation
    }
  })

  return res.json()
}

// On-demand revalidation
import { revalidateTag } from 'next/cache'

export async function POST() {
  revalidateTag('projects')
  return Response.json({ revalidated: true })
}
```

## 10. Performance Optimization

### Query Optimization
```typescript
// ✅ GOOD: Select only needed columns
const { data } = await supabase
  .from('projects')
  .select('id, name, created_at')
  .range(0, 9) // Paginate

// ❌ BAD: Selecting everything
const { data } = await supabase
  .from('projects')
  .select('*') // Fetches all columns
```

### Use Database Functions
```sql
-- Create efficient database functions
CREATE OR REPLACE FUNCTION get_project_stats(project_uuid UUID)
RETURNS TABLE (
  total_tasks INT,
  completed_tasks INT,
  completion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT as total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed')::INT as completed_tasks,
    ROUND(COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*), 2) as completion_rate
  FROM tasks
  WHERE project_id = project_uuid;
END;
$$ LANGUAGE plpgsql;
```

## 11. Repository Pattern (Recommended)

### Implementation Example
```typescript
// ✅ BEST PRACTICE: Centralize data access
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

class ProjectRepository extends BaseRepository {
  protected tableName = 'projects'

  async findById(id: string) {
    return this.execute(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        permanentLogger.captureError('REPO_PROJECTS', convertSupabaseError(error), {
          operation: 'findById',
          id
        })
        throw convertSupabaseError(error)
      }

      return data
    })
  }

  async create(project: InsertProject) {
    return this.execute(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .insert(project)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('REPO_PROJECTS', convertSupabaseError(error), {
          operation: 'create',
          project
        })
        throw convertSupabaseError(error)
      }

      return data
    })
  }
}
```

## 12. Testing

### Mock Supabase for Tests
```typescript
// __tests__/setup.ts
import { createClient } from '@supabase/supabase-js'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        data: [],
        error: null
      }))
    })),
    auth: {
      getSession: jest.fn(() => ({
        data: { session: null },
        error: null
      }))
    }
  }))
}))
```

## 13. Common Pitfalls

### ❌ Pitfalls to Avoid
1. **Using client-side auth for security** - Always validate on server
2. **Exposing service role keys** - Keep them server-only
3. **Not enabling RLS** - Always enable Row Level Security
4. **Selecting all columns** - Only select what you need
5. **Not cleaning up subscriptions** - Always remove channels
6. **Using Error() for Supabase errors** - Convert PostgrestError first
7. **Hardcoding IDs** - Use gen_random_uuid() in database
8. **Not typing your database** - Always generate types
9. **Ignoring error hints** - Supabase provides helpful hints
10. **Client-side data mutations without server validation**

### ✅ Best Practices Checklist
- [ ] RLS enabled on all tables
- [ ] Types generated from database
- [ ] Service keys only on server
- [ ] Errors properly converted
- [ ] Subscriptions cleaned up
- [ ] Repository pattern implemented
- [ ] Queries optimized (specific columns)
- [ ] Middleware protecting routes
- [ ] Environment variables secure
- [ ] Tests mocking Supabase correctly

## Quick Reference

### Error Conversion
```typescript
// Always convert PostgrestError to Error
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

if (error) {
  throw convertSupabaseError(error)
}
```

### Type Generation Command
```bash
# Project-specific command
supabase gen types typescript --project-id vnuieavheezjxbkyfxea > lib/database.types.ts
```

### Repository Pattern
```typescript
// All database access through repositories
const repository = ProjectRepository.getInstance()
const project = await repository.findById(id)
```

## Related Documentation
- [Repository Pattern Architecture](/docs/repository-pattern-architecture.md)
- [Error Logging Best Practices](/docs/error-logging-best-practices.md)
- [Testing Guidelines](/docs/testing-guidelines.md)
- [CLAUDE.md](/CLAUDE.md) - Main configuration reference

---
*This document is mandatory reading for all Supabase implementations in this project.*