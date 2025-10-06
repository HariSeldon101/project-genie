# Repository Deduplication Analysis & Guidelines

## Critical Issues Found

### 1. DUPLICATE REPOSITORIES ⚠️

#### Subscription Repositories (2 files - MUST MERGE)
- `subscription-repository.ts` (older, 7996 bytes)
- `subscriptions-repository.ts` (newer, 9050 bytes)

**Problem**: Two repositories for the same domain violates DRY principle
**Solution**: Merge into single `SubscriptionsRepository` and archive the duplicate

### 2. USER DATA ACCESS PATTERN

#### Current Good Pattern ✅
- `BaseRepository` has `getCurrentUser()` method
- All repositories inherit this method
- Single source of truth for authentication

#### Potential Issues Found:
Multiple repositories accept `userId` as parameter instead of using `getCurrentUser()`:
- `getUserSubscription(userId: string)` - Should get current user internally
- `getUserActivities(userId: string)` - Should get current user internally
- `getUserBugs(userId: string)` - **BETA EXCEPTION: Intentionally allows all bugs for collaborative debugging**

**Why This Is Usually Bad** (except during beta):
- Allows potential security issues (accessing other users' data)
- Duplicates user fetching logic
- Inconsistent patterns across repositories

**BETA TESTING EXCEPTION**:
The `getUserBugs(userId)` method intentionally accepts any userId during beta to:
- Enable collaborative bug tracking
- Help identify patterns across all users
- Facilitate team debugging sessions
- **TODO: Change to `getCurrentUserBugs()` before production release**

## Composition Over Duplication Pattern

### ❌ ANTI-PATTERN: Each Repository Fetches User Data
```typescript
// BAD - Each repository gets user independently
class ProjectsRepository {
  async getUserProjects() {
    const user = await this.getCurrentUser() // Duplication
    // fetch projects
  }
}

class BugsRepository {
  async getUserBugs() {
    const user = await this.getCurrentUser() // Duplication
    // fetch bugs
  }
}
```

### ✅ CORRECT PATTERN: Composition & Single Responsibility
```typescript
// GOOD - ProfilesRepository is the single source for user data
class ProfilesRepository {
  async getCurrentUserProfile() {
    const user = await this.getCurrentUser()
    return this.getProfile(user.id)
  }

  async getCurrentUserId(): Promise<string> {
    const user = await this.getCurrentUser()
    return user.id
  }
}

// Other repositories use ProfilesRepository when needed
class ProjectsRepository {
  async getCurrentUserProjects() {
    const profilesRepo = ProfilesRepository.getInstance()
    const userId = await profilesRepo.getCurrentUserId()
    return this.getProjectsByUserId(userId)
  }

  // Admin method that accepts userId
  async getProjectsByUserId(userId: string) {
    // Used for admin features
  }
}
```

## Repository Responsibility Matrix

| Repository | Primary Responsibility | User Data Access | Dependencies |
|-----------|------------------------|------------------|--------------|
| **ProfilesRepository** | User profiles & auth | ✅ Source of truth | None |
| **ProjectsRepository** | Project CRUD | Via ProfilesRepository | ProfilesRepository |
| **TeamRepository** | Team management | Via ProfilesRepository | ProfilesRepository |
| **BugsRepository** | Bug tracking | Via ProfilesRepository | ProfilesRepository |
| **SubscriptionsRepository** | Subscription management | Via ProfilesRepository | ProfilesRepository |
| **ArtifactsRepository** | Document storage | Project-scoped | ProjectsRepository |
| **CompanyIntelligenceRepository** | Scraping sessions | Session-based | None |
| **LogsRepository** | System logging | System-wide | None |
| **AdminSettingsRepository** | Admin config | Admin-only | None |
| **PromptTemplatesRepository** | Template management | Admin-only | None |

## Functional Duplication Audit Results

### 1. User Authentication (getCurrentUser)
- **Location**: BaseRepository
- **Status**: ✅ GOOD - Centralized in base class
- **Used By**: All repositories via inheritance

### 2. Profile Operations
- **Location**: ProfilesRepository
- **Status**: ✅ GOOD - Single repository
- **Issue**: Other repositories should use this instead of direct user fetching

### 3. Subscription Management
- **Location**: DUPLICATE FILES
- **Status**: ❌ BAD - Two repositories exist
- **Fix Required**: Merge and archive duplicate

### 4. Project Ownership Checks
- **Pattern**: Multiple repositories check project ownership
- **Status**: ⚠️ NEEDS REFACTOR
- **Solution**: Create `OwnershipValidator` service

## Recommended Refactoring

### Step 1: Merge Duplicate Repositories
```bash
# 1. Compare the two subscription repositories
diff subscription-repository.ts subscriptions-repository.ts

# 2. Merge best of both into subscriptions-repository.ts
# 3. Archive the old one
mv subscription-repository.ts ../../archive/

# 4. Update all imports
```

### Step 2: Create Ownership Validator
```typescript
// lib/repositories/validators/ownership-validator.ts
export class OwnershipValidator {
  static async validateProjectOwnership(projectId: string, userId: string): Promise<boolean> {
    const projectsRepo = ProjectsRepository.getInstance()
    const project = await projectsRepo.getProject(projectId)
    return project?.user_id === userId
  }

  static async validateTeamMembership(projectId: string, userId: string): Promise<boolean> {
    const teamRepo = TeamRepository.getInstance()
    const members = await teamRepo.getProjectTeamMembers(projectId)
    return members.some(m => m.user_id === userId)
  }
}
```

### Step 3: Refactor User-Scoped Methods
```typescript
// BEFORE - Accepts userId (security risk)
async getUserBugs(userId: string) { }

// AFTER - Two methods with clear purposes
async getCurrentUserBugs() {
  const profilesRepo = ProfilesRepository.getInstance()
  const userId = await profilesRepo.getCurrentUserId()
  return this.getBugsByUserId(userId)
}

async getBugsByUserId(userId: string) {
  // Admin method - requires admin check in API route
}
```

## Implementation Priority

### Critical (Fix Immediately)
1. **Merge duplicate subscription repositories** - Data inconsistency risk
2. **Fix user data access patterns** - Security risk

### High Priority
1. **Create OwnershipValidator** - Reduce duplication
2. **Refactor user-scoped methods** - Consistency

### Medium Priority
1. **Document composition patterns** - Team knowledge
2. **Add repository dependency injection** - Testability

## DRY Principles for Repositories

### 1. Single Source of Truth
- **User Data**: ProfilesRepository only
- **Auth Checks**: BaseRepository.getCurrentUser()
- **Ownership**: OwnershipValidator service
- **Timestamps**: Database defaults (created_at, updated_at)

### 2. Composition Over Duplication
- Repositories should compose, not duplicate
- Use dependency injection for repository dependencies
- Share validators and utilities

### 3. Clear Boundaries
- Each repository owns ONE domain
- Cross-domain operations use composition
- No circular dependencies

## Testing for Duplication

### Automated Checks
```bash
# Find duplicate method names across repositories
grep -h "async [a-zA-Z]*(" lib/repositories/*.ts | sort | uniq -d

# Find similar file names
ls lib/repositories/*.ts | sed 's/-repository\.ts//' | sort | uniq -d

# Check for direct user fetching outside ProfilesRepository
grep -l "auth.getUser" lib/repositories/*.ts | grep -v base-repository
```

### Code Review Checklist
- [ ] No duplicate repositories for same domain
- [ ] User data accessed only via ProfilesRepository
- [ ] No duplicate validation logic
- [ ] Clear single responsibility per repository
- [ ] Composition used for cross-domain operations

## Next Steps

1. **Immediate**: Merge duplicate subscription repositories
2. **Today**: Audit all getUserX methods for security
3. **This Week**: Implement OwnershipValidator
4. **Ongoing**: Refactor to composition pattern

## Success Metrics

- Zero duplicate repositories
- All user data access via ProfilesRepository
- No security vulnerabilities from userId parameters
- 100% test coverage for repositories
- Clear dependency graph with no cycles