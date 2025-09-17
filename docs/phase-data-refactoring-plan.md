# Phase Data Refactoring Plan

## Current Duplication Issue
The phase data functionality is duplicated between:
1. **PhaseDataRepository** - The dedicated repository for phase data (should be single source of truth)
2. **CompanyIntelligenceRepository** - Has duplicate implementations of the same methods

## Refactoring Strategy

### Step 1: Update CompanyIntelligenceRepository to Delegate
All phase data methods in CompanyIntelligenceRepository should delegate to PhaseDataRepository:

```typescript
// BEFORE: Duplicate implementation
async savePhaseData(sessionId: string, stage: string, data: any): Promise<void> {
  // 40+ lines of duplicate code
}

// AFTER: Proper delegation
async savePhaseData(sessionId: string, stage: string, data: any): Promise<void> {
  return this.phaseDataRepo.savePhaseData(sessionId, stage, data)
}
```

### Step 2: Methods to Refactor
1. ✅ `cleanupOldPhaseData` - Already delegates correctly
2. ❌ `savePhaseData` - Needs delegation
3. ❌ `getPhaseData` - Needs delegation
4. ❌ `getAllPhaseData` - Needs delegation
5. ❌ `deletePhaseData` - Needs delegation

### Step 3: Remove OLD Methods
- Delete `cleanupOldPhaseData_OLD` method (line 847)

### Step 4: Update All Consumers
Currently, the API route uses CompanyIntelligenceRepository, which is fine since it will delegate to PhaseDataRepository internally.

## Benefits of This Refactoring

1. **Single Source of Truth**: PhaseDataRepository becomes the authoritative source for phase data operations
2. **DRY Principle**: Eliminates ~200 lines of duplicate code
3. **Easier Maintenance**: Changes to phase data logic only need to be made in one place
4. **Better Testing**: Can mock/test phase data operations independently
5. **Clear Responsibilities**: Each repository has a clear, single responsibility

## Implementation Code

Replace the duplicate methods in CompanyIntelligenceRepository with:

```typescript
/**
 * Phase data methods - all delegate to PhaseDataRepository
 * Following SOLID principles: Single Responsibility
 */

async savePhaseData(sessionId: string, stage: string, data: any): Promise<void> {
  return this.phaseDataRepo.savePhaseData(sessionId, stage, data)
}

async getPhaseData(sessionId: string, stage: string): Promise<any> {
  return this.phaseDataRepo.getPhaseData(sessionId, stage)
}

async getAllPhaseData(sessionId: string): Promise<Record<string, any>> {
  return this.phaseDataRepo.getAllPhaseData(sessionId)
}

async deletePhaseData(sessionId: string, stage: string): Promise<void> {
  return this.phaseDataRepo.deletePhaseData(sessionId, stage)
}

async cleanupOldPhaseData(sessionId: string, keepStages: number = 2): Promise<void> {
  return this.phaseDataRepo.cleanupOldPhaseData(sessionId, keepStages)
}
```

## Testing Impact
No functional changes - all methods will work exactly the same way, just with proper delegation.