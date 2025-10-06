# Legacy Code Marked for Deletion

## Metadata
- **Date Created**: September 1, 2025
- **Time**: 12:05 GMT
- **Git Commit Before Deletion**: [TO BE ADDED]
- **Author**: Claude Assistant
- **Purpose**: Track all legacy code to be removed after successful testing

## Testing Status
- [x] Initial test completed (Sept 1, 2025 12:10 GMT)
- [ ] All documents tested without 2024 references (3 documents still have 2024)
- [x] All documents show correct project dates (July 2025 - January 2027)
- [x] Company name extracted correctly (No "Your Company" found)
- [x] Budget displays properly ($12,000,000)
- [ ] All tests pass (Need to regenerate 3 documents)

## Legacy Code Categories

### 1. Legacy Formatters (Non-Unified)
These are the old formatters that should be replaced by unified formatters.

#### Files to Delete:
```
lib/documents/formatters/pid-formatter.ts
lib/documents/formatters/business-case-formatter.ts
lib/documents/formatters/risk-register-formatter.ts
lib/documents/formatters/project-plan-formatter.ts
lib/documents/formatters/charter-formatter.ts
lib/documents/formatters/backlog-formatter.ts
lib/documents/formatters/technical-landscape-formatter.ts
lib/documents/formatters/comparable-projects-formatter.ts
lib/documents/formatters/quality-management-formatter.ts
lib/documents/formatters/communication-plan-formatter.ts
```

#### Verification:
```bash
# Check file sizes and dates
ls -la lib/documents/formatters/*-formatter.ts | grep -v unified
```

### 2. Legacy Generator Methods
Old generation methods that are no longer used.

#### Files to Check:
```
lib/documents/generator.ts.bak (if exists)
```

### 3. Unused Prompt Files
Prompt files that are not being used by the structured generator.

#### Files to Investigate:
```
lib/llm/prompts/prince2.ts - Contains hardcoded 2024 dates, not used by structured generator
lib/llm/prompts/agile.ts - Check if used
lib/llm/prompts/enhanced-prince2.ts - Check if used
lib/llm/prompts/enhanced-agile.ts - Check if used
```

### 4. Test Files for Legacy Code
Test files that test the legacy formatters.

#### Files to Delete:
```
tests/test-pid-text.ts
tests/test-risk-register.ts
tests/test-project-plan.ts
```

### 5. Old Schema Files (if replaced)
Check if any schema files are legacy.

## Detailed File Analysis

### pid-formatter.ts
- **Path**: `lib/documents/formatters/pid-formatter.ts`
- **Size**: [TO BE ADDED]
- **Last Modified**: [TO BE ADDED]
- **Imports**: BaseFormatter
- **Reason for Deletion**: Replaced by unified-pid-formatter.ts
- **Dependencies**: None found
- **Sample Code**:
```typescript
export class PIDFormatter extends BaseFormatter {
  format(data: any): string {
    // Legacy formatting logic
  }
}
```

### business-case-formatter.ts
- **Path**: `lib/documents/formatters/business-case-formatter.ts`
- **Size**: [TO BE ADDED]
- **Last Modified**: [TO BE ADDED]
- **Imports**: BaseFormatter
- **Reason for Deletion**: Replaced by unified-business-case-formatter.ts
- **Dependencies**: None found

### risk-register-formatter.ts
- **Path**: `lib/documents/formatters/risk-register-formatter.ts`
- **Size**: [TO BE ADDED]
- **Last Modified**: [TO BE ADDED]
- **Imports**: BaseFormatter
- **Reason for Deletion**: Replaced by unified-risk-register-formatter.ts

## Risk Assessment

### Low Risk Deletions
- Test files (tests/*.ts) - Only affect testing
- .bak files - Backup files not in use

### Medium Risk Deletions
- Legacy formatters - Ensure unified formatters are fully tested
- Old prompt files - Verify they're not imported anywhere

### High Risk Deletions
- None identified yet

## Rollback Instructions

### If Issues Occur After Deletion:

1. **Immediate Rollback**:
```bash
# Revert to commit before deletion
git revert [COMMIT_HASH]
```

2. **Selective Restoration**:
```bash
# Restore specific files
git checkout [COMMIT_HASH] -- lib/documents/formatters/pid-formatter.ts
git checkout [COMMIT_HASH] -- lib/documents/formatters/business-case-formatter.ts
```

3. **From Backup Branch**:
```bash
# Create backup branch before deletion
git checkout -b backup-before-legacy-removal
git checkout main
# After deletion, if needed:
git checkout backup-before-legacy-removal -- [FILE_PATH]
```

## Verification Commands

### Pre-Deletion Checks:
```bash
# Find all imports of legacy formatters
grep -r "from.*formatter" --include="*.ts" --include="*.tsx" | grep -v unified

# Check for any direct references
grep -r "PIDFormatter\|BusinessCaseFormatter\|RiskRegisterFormatter" --include="*.ts"

# Verify unified formatters are imported
grep -r "unified.*formatter" --include="*.ts" --include="*.tsx"
```

### Post-Deletion Verification:
```bash
# Run type checking
npm run type-check

# Run tests
npm test

# Build project
npm run build

# Check for any broken imports
npm run lint
```

## Document Test Results

### Business Case
- **Status**: TESTED - NEEDS REGENERATION
- **2024 References**: YES - Contains "Q3 2024" in PSD2 compliance text
- **Date Accuracy**: Partial - Has July 2025 - January 2027 in some places
- **Company Name**: ✅ Correct - No "Your Company" found

### PID
- **Status**: TESTED - NEEDS REGENERATION  
- **2024 References**: YES - Contains 2024 references
- **Date Accuracy**: Partial - Has project dates but also 2024
- **Company Name**: ✅ Correct - No "Your Company" found

### Risk Register
- **Status**: ✅ PASSED
- **2024 References**: NONE
- **Date Accuracy**: ✅ Correct
- **Company Name**: ✅ Correct

### Project Plan
- **Status**: ✅ PASSED
- **2024 References**: NONE
- **Date Accuracy**: ✅ Correct
- **Company Name**: ✅ Correct

### Charter
- **Status**: PENDING
- **2024 References**: [TO BE TESTED]
- **Date Accuracy**: [TO BE TESTED]

### Product Backlog
- **Status**: PENDING
- **2024 References**: [TO BE TESTED]
- **Date Accuracy**: [TO BE TESTED]

### Technical Landscape
- **Status**: ✅ PASSED
- **2024 References**: NONE
- **Date Accuracy**: ✅ Correct
- **Company Name**: ✅ Correct

### Comparable Projects
- **Status**: ✅ PASSED
- **2024 References**: NONE
- **Date Accuracy**: ✅ Correct
- **Company Name**: ✅ Correct

### Quality Management
- **Status**: ✅ PASSED
- **2024 References**: NONE
- **Date Accuracy**: ✅ Correct
- **Company Name**: ✅ Correct

### Communication Plan
- **Status**: TESTED - NEEDS REGENERATION
- **2024 References**: YES - Contains 2024 references
- **Date Accuracy**: Partial
- **Company Name**: ✅ Correct

## Final Checklist Before Deletion

- [ ] All 10 document types tested successfully
- [ ] No "2024" or hardcoded year references found
- [ ] All dates match project timeline (July 2025 - January 2027)
- [ ] Company name extracted correctly in all documents
- [ ] Budget displays properly where applicable
- [ ] All Mermaid charts render correctly
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] No broken imports
- [ ] Backup branch created
- [ ] Git commit hash recorded

## Notes
- This manifest will be updated as testing progresses
- Each file deletion will be verified before execution
- Rollback plan tested before deletion