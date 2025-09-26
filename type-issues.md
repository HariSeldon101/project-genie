# TypeScript Issues Report
Generated: 2025-01-17

## Executive Summary
- **Total TypeScript Errors**: 3,589 (excluding node_modules and .next)
- **After Excluding Env Vars (TS4111)**: 3,004 errors
- **Critical Issues**: Type mismatches that could cause runtime failures
- **Priority**: Fix critical type safety issues first

## Error Distribution by Type

| Error Code | Count | Description | Priority |
|------------|-------|-------------|----------|
| TS2353 | 510 | Unknown object properties | HIGH |
| TS6133 | 460 | Unused imports/variables | LOW |
| TS2339 | 395 | Missing properties on type | HIGH |
| TS2345 | 388 | Type argument mismatch | HIGH |
| TS2322 | 244 | Type not assignable | HIGH |
| TS2532 | 150 | Object possibly undefined | MEDIUM |
| TS2412 | 116 | Type not assignable (strict) | MEDIUM |
| TS18048 | 99 | Value possibly undefined | MEDIUM |
| TS2304 | 90 | Cannot find name | HIGH |
| TS2375 | 82 | Type mismatch with strict options | MEDIUM |

## Files with Most Errors

1. **lib/documents/formatters/unified-pack-formatter.ts** - 87 errors
2. **lib/company-intelligence/intelligence/structured-data-extractor.ts** - 81 errors
3. **lib/documents/generator.ts** - 67 errors
4. **components/company-intelligence/site-analyzer.tsx** - 63 errors
5. **lib/company-intelligence/core/data-aggregator.ts** - 55 errors

## Critical Issues to Fix First

### 1. TS2353: Unknown Object Properties (510 errors)
These occur when trying to access properties that TypeScript doesn't know about.

**Common Pattern**:
```typescript
// Error: Object literal may only specify known properties
{ contentType: 'application/json' }  // 'contentType' doesn't exist
```

**Fix**: Define proper interfaces or use correct property names.

### 2. TS2339: Missing Properties (395 errors)
Properties being accessed don't exist on the type.

**Common Pattern**:
```typescript
// Error: Property 'reviewData' does not exist on type
result.reviewData  // reviewData not in type definition
```

**Fix**: Add missing properties to interfaces or check if property exists.

### 3. TS2345: Type Argument Mismatches (388 errors)
Arguments passed don't match expected types.

**Common Pattern**:
```typescript
// Error: Argument of type 'string | undefined' not assignable to 'string'
someFunction(maybeUndefinedValue)  // Function expects string, not undefined
```

**Fix**: Add null checks or update function signatures.

### 4. TS2322: Type Assignment Issues (244 errors)
Values being assigned don't match the expected type.

**Common Pattern**:
```typescript
// Error: Type 'string | undefined' not assignable to type 'string'
const value: string = possiblyUndefined;
```

**Fix**: Use type guards or update type definitions.

## Next.js 15 Specific Issues

### Async Params in Route Handlers
Next.js 15 requires params to be awaited in route handlers:

**Before (Error)**:
```typescript
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id; // Error: params is now Promise<{ id: string }>
}
```

**After (Fixed)**:
```typescript
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

## permanentLogger Issues

### Error Method Doesn't Exist
The `permanentLogger.error()` method was removed. Use `captureError()` instead.

**Before (Error)**:
```typescript
permanentLogger.error('CATEGORY', 'message', data)  // TS2339: Property 'error' does not exist
```

**After (Fixed)**:
```typescript
permanentLogger.captureError('CATEGORY', error as Error, { context: data })
```

## Environment Variable Access (TS4111)
571 instances - Currently deprioritized but should be fixed eventually.

**Pattern**:
```typescript
// Error: Property comes from index signature, must use bracket notation
process.env.NEXT_PUBLIC_SUPABASE_URL  // Should be process.env['NEXT_PUBLIC_SUPABASE_URL']
```

## Action Plan

### Phase 1: Critical Type Safety (Week 1)
1. Fix TS2339 (missing properties) - 395 errors
2. Fix TS2345 (type mismatches) - 388 errors
3. Fix TS2322 (assignment issues) - 244 errors
4. Fix TS2304 (cannot find name) - 90 errors

### Phase 2: Object Properties (Week 2)
1. Fix TS2353 (unknown properties) - 510 errors
2. Fix TS2532 (possibly undefined) - 150 errors
3. Fix TS18048 (possibly undefined values) - 99 errors

### Phase 3: Cleanup (Week 3)
1. Remove TS6133 (unused imports) - 460 errors
2. Fix remaining medium priority issues
3. Address environment variable access patterns

### Phase 4: Final Validation
1. Run full type check
2. Ensure no new errors introduced
3. Document any intentional type assertions

## Raw Log Display Issue

### Problem
The `formatLogForLLMAnalysis` function generates markdown-formatted error reports, but they're being displayed as raw text with visible HTML/markdown tags instead of being rendered.

### Location
- Function: `lib/utils/log-ui-helpers.ts:formatLogForLLMAnalysis()`
- Used in: `components/logs/log-entry.tsx:handleCopyForAI()`

### Symptoms
- Markdown headers appear as `# Header` instead of formatted text
- HTML tags like `<h1>`, `<h2>`, `<pre>` visible as plain text
- Error reports unreadable due to formatting tags

### Potential Causes
1. Content being displayed in plain text element instead of markdown renderer
2. Content being escaped twice (HTML entities like `&lt;` instead of `<`)
3. Missing markdown rendering in display component

### Solution
Use the existing `MarkdownRenderer` component at `components/markdown-renderer.tsx` to properly render the error report content instead of displaying it as plain text.

## Recommendations

1. **Start with Critical Issues**: Focus on type mismatches that could cause runtime errors
2. **Manual Fixes Only**: Each fix should be carefully reviewed (no batch replacements)
3. **Test After Each Fix**: Ensure fixes don't introduce new issues
4. **Update Type Definitions**: Add missing properties to interfaces
5. **Use Type Guards**: Add proper null/undefined checks
6. **Fix Route Handlers**: Update to Next.js 15 async params pattern

## Notes

- All errors are in our codebase (excluded node_modules and .next)
- Environment variable errors (TS4111) excluded from priority list
- Focus on type safety issues that could cause runtime failures
- Each fix should be done manually with context consideration