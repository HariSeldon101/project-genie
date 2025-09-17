# Beta Testing Configuration & Feature Flags

## Overview
This document tracks all beta-specific features that need to be modified or removed before production release.

## Beta Testing Features

### 1. Shared Bug Visibility 🐛
**Location**: `lib/repositories/bugs-repository.ts`
**Method**: `getUserBugs(userId: string)`

**Current Behaviour (BETA)**:
- Accepts any userId parameter
- Allows viewing bugs from all users
- Enables collaborative debugging across the beta testing team

**Production Behaviour**:
```typescript
// TODO: Before production, replace with:
async getCurrentUserBugs(): Promise<Bug[]> {
  const user = await this.getCurrentUser()
  return this.getUserBugs(user.id)
}

// Keep getUserBugs as private/admin method
private async getUserBugs(userId: string): Promise<Bug[]> {
  // Existing implementation
}
```

**Benefits During Beta**:
- Testers can see patterns across all bug reports
- Easier to identify duplicate issues
- Facilitates collaborative problem-solving
- Helps prioritise fixes based on frequency

### 2. Enhanced Error Logging
**Location**: Throughout application
**Status**: Verbose logging enabled

**Beta Configuration**:
- All errors logged with full stack traces
- Breadcrumbs capture detailed user journey
- Performance timing on all operations

**Production Changes Required**:
- Reduce logging verbosity
- Remove sensitive data from logs
- Implement log retention policies

### 3. Debug Information in UI
**Components**: Various dashboard components

**Beta Features**:
- Session IDs visible in UI
- Correlation IDs shown in error messages
- Performance metrics displayed

**Production Changes**:
- Hide technical identifiers from users
- Simplify error messages
- Remove performance debug info

## Environment-Based Configuration

### Recommended Implementation (Future):
```typescript
// lib/config/environment.ts
export const config = {
  isBeta: process.env.NEXT_PUBLIC_ENV === 'beta',
  features: {
    sharedBugVisibility: process.env.NEXT_PUBLIC_ENV === 'beta',
    verboseLogging: process.env.NODE_ENV !== 'production',
    debugUI: process.env.NEXT_PUBLIC_ENV === 'beta'
  }
}

// Usage in repository
async getUserBugs(userId?: string): Promise<Bug[]> {
  if (!config.features.sharedBugVisibility) {
    // Production: only current user's bugs
    const user = await this.getCurrentUser()
    userId = user.id
  }
  // Beta: accept any userId
  // ... existing implementation
}
```

## Pre-Production Checklist

### Security & Privacy
- [ ] Remove shared bug visibility
- [ ] Restrict getUserBugs to current user only
- [ ] Remove getUserActivities public access
- [ ] Implement proper RLS policies
- [ ] Remove debug information from responses

### Performance
- [ ] Reduce logging verbosity
- [ ] Remove performance timing from non-critical paths
- [ ] Optimise database queries
- [ ] Enable caching strategies

### User Experience
- [ ] Simplify error messages
- [ ] Remove technical IDs from UI
- [ ] Polish loading states
- [ ] Finalise copy and messaging

### Code Cleanup
- [ ] Remove TODO comments
- [ ] Archive beta-only code
- [ ] Update documentation
- [ ] Remove console.log statements

## Beta Testing Advantages

### Why These Features Help During Beta:

1. **Collaborative Debugging**
   - All testers see the full picture
   - Patterns emerge faster
   - Duplicate issues identified quickly

2. **Faster Issue Resolution**
   - Developers see exact error contexts
   - Performance bottlenecks identified
   - User journeys fully traced

3. **Better Prioritisation**
   - Frequency of issues visible
   - Impact assessment easier
   - Critical paths identified

## Migration Timeline

### Phase 1: Current (Beta Testing)
- All beta features active
- Maximum visibility for debugging
- Collaborative environment

### Phase 2: Beta Exit (2-4 weeks before launch)
- Implement feature flags
- Test production configuration
- Gradual feature restriction

### Phase 3: Production Release
- All beta features disabled
- Security-first configuration
- Performance optimised

## Tracking Beta Feedback

### Bug Patterns Observed:
- Document common issues here
- Track resolution status
- Note any architectural changes needed

### Performance Insights:
- Slow operations identified
- Database optimisation opportunities
- Caching candidates

### UX Improvements:
- Confusing workflows
- Missing features
- UI/UX suggestions

## Notes

- Keep this document updated as new beta features are added
- Review before each release
- Ensure all TODOs are tracked
- Test production configuration in staging first