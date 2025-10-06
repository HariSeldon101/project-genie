# Architecture Lessons Learned: BaseRepository Pattern
**Date:** 2025-09-29
**Issue:** bigfluffy.ai runtime failure due to client/server boundary violations

## Executive Summary
Attempted to implement a DRY BaseRepository pattern with centralized authentication. While theoretically correct, this violated Next.js's fundamental client/server boundary constraints, causing complete page failures for client-side routes.

## The Problem
- **Symptom:** "TypeError: _server__WEBPACK_IMPORTED_MODULE_8__.createClient is not a function"
- **Root Cause:** BaseRepository imported server-only code (`cookies()`, `createClient` from `@/lib/supabase/server`)
- **Impact:** Complete failure of client-rendered pages, particularly Company Intelligence feature

## Architecture Attempted (FAILED)
```
BaseRepository (server-only, centralized auth)
    ↑
CompanyIntelligenceRepositoryV4 (inherits server code)
    ↑
API Routes (server context - works)
    AND
Client Components (client context - BREAKS!)
```

### Why It Failed
1. **Mixed Contexts:** BaseRepository was server-only but was imported by both server and client code
2. **Next.js Constraint:** Server-only modules (using `cookies()`, `headers()`) cannot be imported in client components
3. **Inheritance Problem:** Child classes inherit ALL imports from parent, including server-only ones

## Solution: Isomorphic Repository Pattern
```
Repository (accepts SupabaseClient in constructor)
    ↑
API Route (creates server client, handles auth)
    ↑
Client Component (creates browser client, handles auth)
```

### Key Principles
1. **Repository is "dumb":** Accepts a SupabaseClient, doesn't create one
2. **Context-aware clients:** Server creates server client, browser creates browser client
3. **Distributed auth:** Each layer handles its own authentication
4. **No server imports:** Repository has zero server-only dependencies

## Code Examples

### ❌ WRONG: BaseRepository Pattern
```typescript
// BaseRepository with server-only code
export class BaseRepository {
  protected supabase: SupabaseClient

  constructor() {
    // BREAKS IN CLIENT CONTEXT!
    this.supabase = createClient() // from @/lib/supabase/server
  }

  async getCurrentUser() {
    // BREAKS IN CLIENT CONTEXT!
    const { cookies } = await import('next/headers')
    // ... auth logic
  }
}
```

### ✅ CORRECT: Isomorphic Pattern
```typescript
// Repository accepts client
export class CompanyIntelligenceRepositoryV4 {
  constructor(private supabase: SupabaseClient) {
    // No server imports!
  }

  // Methods use provided client
  async getSession(sessionId: string) {
    return this.supabase.from('sessions').select()
  }
}

// API Route creates server client
export async function GET() {
  const supabase = createClient() // server version
  const repo = new Repository(supabase)
}

// Client component creates browser client
function Component() {
  const supabase = createBrowserClient() // browser version
  const repo = new Repository(supabase)
}
```

## Framework Constraints vs Best Practices

### Theoretical Best Practice (DRY)
- Single source of truth for auth
- No code duplication
- Centralized error handling
- Inheritance for shared behavior

### Next.js Reality
- **Hard boundary** between client and server
- Server modules cannot be imported by client
- Each context needs its own client creation
- Duplication is acceptable for boundary safety

## Key Takeaways

1. **Framework > Theory:** Next.js constraints override theoretical best practices
2. **Test imports early:** Check if a module can be imported in both contexts
3. **Isomorphic by default:** Design repositories to work in any context
4. **Accept duplication:** Some auth code duplication is acceptable for safety
5. **Document context:** Clearly mark server-only vs isomorphic code

## Warning Signs to Watch For
- Importing from `next/headers`, `next/cookies`
- Using `createClient` from `@/lib/supabase/server`
- Any "server-only" directive
- Runtime errors mentioning webpack modules
- "X is not a function" errors in browser

## Recommendation
For Next.js projects, prefer the isomorphic repository pattern over inheritance-based patterns. Accept some code duplication in exchange for clear, working boundaries between client and server contexts.

## Impact on CLAUDE.md
Consider updating CLAUDE.md to clarify:
1. Repositories should accept SupabaseClient in constructor
2. API routes handle their own auth
3. BaseRepository pattern is not compatible with Next.js
4. Document which modules are server-only vs isomorphic

## Files Affected by Revert
- `/lib/repositories/base-repository-v4.ts` - Deleted
- `/lib/repositories/intelligence-repository-v4.ts` - Reverted to standalone
- `/app/api/company-intelligence/v4/analyze/route.ts` - Auth restored
- `/app/api/company-intelligence/v4/credits/route.ts` - Auth restored
- `/app/api/company-intelligence/v4/intelligence/route.ts` - Auth restored

## Testing Confirmation
✅ Company Intelligence page loads without errors
✅ API routes return proper auth errors
✅ No webpack import errors
✅ Both server and client contexts work

---

**Lesson:** Sometimes the "wrong" pattern (duplication) is the right pattern when working within framework constraints.