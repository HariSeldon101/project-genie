# Discovered URLs Code Removal Guide

## Summary
The `discovered_urls` column has been deprecated and renamed to `deprecated_discovered_urls_do_not_use` in the database. All references need to be removed from the codebase and data should be stored in `merged_data.sitemap` instead.

## Files Requiring Updates

### 🔴 CRITICAL - Active Code Files (Must Fix)

#### 1. **lib/company-intelligence/orchestrators/discovery-orchestrator.ts**
- **Line 792**: Calls `updateDiscoveredUrls()` method that no longer exists
- **Line 819**: Updates session with `discovered_urls` field
- **Action**: Remove both references, ensure URLs are stored in `merged_data.sitemap`

#### 2. **lib/repositories/company-intelligence-repository.ts**
- **Line ~66**: SessionData interface comment mentions discovered_urls
- **Line ~241**: Creates session with `discovered_urls: []`
- **Action**: Remove from interface and session creation

#### 3. **lib/company-intelligence/core/session-manager.ts**
- **Contains**: References to discovered_urls field
- **Action**: Update to use merged_data structure

#### 4. **app/api/company-intelligence/phases/scraping/route.ts**
- **Contains**: May reference discovered_urls for URL extraction
- **Action**: Update to read from merged_data.site_analysis.sitemap_pages

#### 5. **lib/company-intelligence/scrapers/core/scraper-orchestrator.ts**
- **Contains**: May reference discovered_urls for scraping
- **Action**: Update to read URLs from merged_data

#### 6. **components/company-intelligence/hooks/use-stage-navigation.ts**
- **Contains**: May reference discovered_urls for navigation logic
- **Action**: Update to check merged_data for URLs

### 🟡 DOCUMENTATION FILES (Should Update)

#### 7. **docs/repository-type-safety-guide.md**
- **Contains**: Documentation about discovered_urls
- **Action**: Update documentation to reflect new structure

#### 8. **docs/discovered-urls-removal-and-repository-audit.md**
- **Contains**: Audit report about the removal
- **Action**: Keep as historical record, add completion notes

#### 9. **docs/repository-architecture-pattern.md**
- **Contains**: May reference discovered_urls in examples
- **Action**: Update examples to use merged_data

#### 10. **docs/scraper-architecture-refactor-15-sept-2025-final-code-review.md**
- **Contains**: References to discovered_urls in architecture
- **Action**: Update to reflect current architecture

#### 11. **docs/scraper-refactoring-migration-guide.md**
- **Contains**: Migration guide mentioning discovered_urls
- **Action**: Update migration guide

### 🟢 MIGRATION/SCRIPT FILES (For Reference)

#### 12. **supabase/migrations/20250116_rename_discovered_urls_deprecated.sql**
- **Status**: ✅ Already executed migration
- **Action**: No action needed - historical record

#### 13. **supabase/migrations/20250911_clean_company_intelligence_schema.sql**
- **Contains**: Original schema with discovered_urls
- **Action**: No action needed - historical record

#### 14. **scripts/add-gin-indexes.sh**
- **Contains**: May reference discovered_urls column
- **Action**: Update if script is still used

### ⚪ ARCHIVE/BACKUP FILES (No Action Needed)

These files are in archive or backup folders and don't need updating:
- archive/unified-scraper-executor-old-1456-lines.ts
- archive/company-intelligence/storage/pack-store.ts
- archive/company-intelligence/storage/client-pack-store.ts
- archive/scrapers/executors/static-executor.old.ts
- archive/scrapers/executors/static-executor.ts
- archive/scrapers/executors/static-executor.ts.backup-*
- archive/api/company-intelligence/fetch-sitemap/route-legacy-2025-09-14.ts
- .logger-fix-backups/* (all backup files)
- components/company-intelligence/hooks/use-stage-navigation.ts.bak

## Code Patterns to Search and Replace

### Pattern 1: Direct Field Reference
```typescript
// OLD
discovered_urls: discoveredUrls

// NEW
// Remove entirely or store in merged_data.sitemap
```

### Pattern 2: Method Calls
```typescript
// OLD
await this.repository.updateDiscoveredUrls(sessionId, urls)

// NEW
// Remove this call, URLs are stored via updateMergedData
```

### Pattern 3: Session Updates
```typescript
// OLD
{
  discovered_urls: [...],
  merged_data: {...}
}

// NEW
{
  merged_data: {
    sitemap: {
      pages: [...] // URLs stored here
    }
  }
}
```

### Pattern 4: URL Extraction
```typescript
// OLD
const urls = session.discovered_urls || []

// NEW
const urls = session.merged_data?.sitemap?.pages?.map(p => p.url) || []
```

## Verification Steps

1. **Run TypeScript Compiler**
   ```bash
   npx tsc --noEmit
   ```
   Should show errors for any remaining discovered_urls references

2. **Search for Remaining References**
   ```bash
   grep -r "discovered_urls" --include="*.ts" --include="*.tsx" --exclude-dir="archive" --exclude-dir="node_modules"
   ```

3. **Test Discovery Flow**
   - Start a new Company Intelligence session
   - Run discovery phase
   - Verify URLs are stored in merged_data.sitemap
   - Run scraping phase
   - Verify scraper can read URLs from merged_data

## Data Structure Reference

### Old Structure (DEPRECATED)
```json
{
  "discovered_urls": ["url1", "url2", "url3"]
}
```

### New Structure (CURRENT)
```json
{
  "merged_data": {
    "sitemap": {
      "pages": [
        {
          "url": "https://example.com/page1",
          "title": "Page 1",
          "priority": 0.8,
          "source": "sitemap"
        }
      ]
    },
    "site_analysis": {
      "sitemap_pages": [
        {
          "url": "https://example.com/page1",
          "title": "Page 1",
          "description": "...",
          "category": "critical"
        }
      ]
    }
  }
}
```

## Priority Order

1. **Fix discovery-orchestrator.ts** - Stop writing to discovered_urls
2. **Fix repository** - Remove from session creation
3. **Fix scraper-orchestrator** - Read from correct location
4. **Update documentation** - Reflect current state
5. **Clean up remaining references** - Archive files can be ignored

## Notes

- The column still exists in the database as `deprecated_discovered_urls_do_not_use`
- It's been cleared of all data and should not be used
- All URL data should be stored in `merged_data` going forward
- The generated database types now enforce this at compile time