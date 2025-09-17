# Repository Pattern Implementation Plan
## Fixing All Direct Database Access Violations

### Executive Summary
We have **55+ files** violating the repository pattern by making direct database calls. This document provides a systematic plan to fix ALL violations while maintaining type safety and following security best practices.

## Current Violations Analysis

### 1. UI Components (17 files)
**Problem**: Client components directly accessing database
**Solution**: Call API endpoints instead

#### Auth Pages (4 files)
- `app/(auth)/forgot-password/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/reset-password/page.tsx`
- `app/(auth)/signup/page.tsx`

**Fix Pattern**:
```typescript
// ❌ BEFORE: Direct database access
const { data } = await supabase.from('profiles').select()

// ✅ AFTER: API endpoint call
const response = await fetch('/api/profile')
const data = await response.json()
```

#### Dashboard Pages (5 files)
- `app/(dashboard)/profile/page.tsx`
- `app/(dashboard)/projects/[id]/generate/page.tsx`
- `app/(dashboard)/projects/[id]/page.tsx`
- `app/(dashboard)/projects/new/page.tsx`
- `app/(dashboard)/settings/page.tsx`

#### Component Files (8 files)
- `components/admin/admin-stats.tsx`
- `components/admin/prompt-editor.tsx`
- `components/admin/provider-config.tsx`
- `components/bug-tracker/bug-detail-modal.tsx`
- `components/bug-tracker/bug-list.tsx`
- `components/bug-tracker/bug-report-form.tsx`
- `components/dashboard/user-menu.tsx`
- `components/document-generator.tsx`
- `components/document-generator-stream.tsx`
- `components/documents/document-viewer.tsx`
- `components/navigation.tsx`
- `app/page.tsx` (root page)

### 2. API Routes (21 files)
**Problem**: API routes directly accessing database
**Solution**: Use repository classes

#### Generate Routes (3 files)
- `app/api/generate/route.ts`
- `app/api/generate-stream/route.ts`
- `app/api/generate-retry/route.ts`

**Fix Pattern**:
```typescript
// ❌ BEFORE: Direct database access
const supabase = createClient()
const { data } = await supabase.from('projects').select()

// ✅ AFTER: Repository pattern
const projectsRepo = ProjectsRepository.getInstance()
const data = await projectsRepo.getAllProjects()
```

#### Company Intelligence Routes (7 files)
- `app/api/company-intelligence/analyze-site/route.ts`
- `app/api/company-intelligence/approve/route.ts`
- `app/api/company-intelligence/phase/route.ts`
- `app/api/company-intelligence/phases/enrichment/route.ts`
- `app/api/company-intelligence/phases/extraction/route.ts`
- `app/api/company-intelligence/phases/generation/route.ts`
- `app/api/company-intelligence/scraping/execute/route.ts`
- `app/api/company-intelligence/stage-review/route.ts`

#### Other API Routes (11 files)
- `app/api/analytics/route.ts`
- `app/api/artifacts/route.ts`
- `app/api/auth/callback/route.ts`
- `app/api/auth/user/route.ts`
- `app/api/bugs/route.ts`
- `app/api/export/[format]/route.ts`
- `app/api/fix-profile/route.ts`
- `app/api/logs/stats/route.ts`
- `app/api/pdf/generate/route.ts`
- `app/api/profile/route.ts`
- `app/api/projects/[id]/full/route.ts`
- `app/api/stripe/checkout/route.ts`
- `app/api/team/route.ts`
- `app/api/team/[id]/route.ts`
- `app/auth/callback/route.ts`

### 3. Library Files (6 files)
**Problem**: Utility files directly accessing database
**Solution**: Context-specific fixes

- `lib/admin/auth.ts` - Might be legitimate (auth checks)
- `lib/auth/auth-helpers.ts` - Might be legitimate (auth checks)
- `lib/auth/session-manager.ts` - Might be legitimate (session management)
- `lib/company-intelligence/scrapers/core/scraper-orchestrator.ts` - Use repository
- `lib/company-intelligence/utils/state-synchronizer.ts` - Use repository
- `lib/hooks/use-stripe-checkout.ts` - Should call API endpoint

### 4. Legitimate Exceptions
- `lib/pdf-generation/services/pdf-cache-service.ts` - Uses Storage (not database)
- `check-locks.ts` - Standalone script (OK for direct access)

## Implementation Strategy

### Phase 1: Repository Infrastructure ✅ COMPLETED
- [x] Created `AdminSettingsRepository`
- [x] Created `PromptTemplatesRepository`
- [x] Documented type safety implementation

### Phase 2: Fix API Routes (Highest Priority)
**Why First**: API routes are the security boundary - fixing these blocks direct database access

#### Step-by-Step Process for Each API Route:
1. Import the appropriate repository
2. Replace `createClient()` calls with repository methods
3. Remove all `supabase.from()` calls
4. Ensure proper error handling
5. Test the endpoint

**Example Fix**:
```typescript
// app/api/profile/route.ts

// ❌ BEFORE
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return NextResponse.json(data)
}

// ✅ AFTER
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET() {
  try {
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    permanentLogger.captureError('API_PROFILE', error as Error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### Phase 3: Fix UI Components
**Why Second**: Once API routes are fixed, UI components can safely call them

#### Step-by-Step Process for Each Component:
1. Remove all Supabase imports
2. Replace database calls with fetch() to API endpoints
3. Add proper loading and error states
4. Test the component

**Example Fix**:
```typescript
// components/profile/profile-form.tsx

// ❌ BEFORE
import { createBrowserClient } from '@supabase/ssr'

function ProfileForm() {
  const supabase = createBrowserClient(...)

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .single()
    setProfile(data)
  }
}

// ✅ AFTER
function ProfileForm() {
  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (!response.ok) throw new Error('Failed to load profile')
      const data = await response.json()
      setProfile(data)
    } catch (error) {
      toast.error('Failed to load profile')
    }
  }
}
```

### Phase 4: Fix Library Files
**Why Last**: These are internal utilities that may have special requirements

#### Analysis Required:
- Auth utilities might need direct Supabase Auth access
- State synchronizers should use repositories
- Hooks should call API endpoints

## Priority Order

### Critical (Fix First)
1. Payment/Stripe routes - Financial data security
2. Admin routes - Privileged operations
3. Auth routes - User security

### High Priority
1. Project generation routes - Core functionality
2. Company intelligence routes - Main feature
3. Profile/team routes - User data

### Medium Priority
1. Dashboard components - User experience
2. Bug tracking - Support functionality
3. Analytics - Metrics

### Low Priority
1. Navigation components - Read-only operations
2. Export functionality - One-way data flow

## Testing Strategy

### After Each Fix:
1. **Unit Test**: Test the specific functionality
2. **Integration Test**: Test with connected components
3. **Type Check**: Run `npm run type-check`
4. **Manual Test**: Test in browser at localhost:3006

### Final Validation:
```bash
# Run all tests
npm run test:all

# Check for any remaining violations
grep -r "supabase.from(" app/ components/ --include="*.tsx" --include="*.ts"

# Update manifest
npm run manifest:update
```

## Success Criteria

### All Fixes Complete When:
- [ ] Zero direct `supabase.from()` calls in UI components
- [ ] Zero direct `supabase.from()` calls in API routes (except auth)
- [ ] All repositories have typed signatures
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Manifest updated

## Rollback Plan

If issues arise:
1. Git history preserves all original code
2. Archive folder contains replaced implementations
3. Can selectively revert specific files
4. Test coverage ensures no regressions

## Timeline Estimate

- **Phase 1**: ✅ Complete (2 repositories created)
- **Phase 2**: 4-6 hours (21 API routes)
- **Phase 3**: 3-4 hours (17 UI components)
- **Phase 4**: 2 hours (6 library files)
- **Testing**: 2 hours

**Total**: ~12-14 hours of focused work

## Next Steps

1. Start with critical API routes (payment, admin, auth)
2. Fix one file at a time with testing
3. Commit after each successful fix
4. Update this document with progress
5. Run final validation suite

## Notes

- Always preserve error handling patterns
- Maintain existing logging
- Keep response formats identical
- Document any edge cases discovered