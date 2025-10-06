# Company Intelligence V3→V4 Migration Archive

**Archive Date:** 2025-01-28
**Migration Lead:** Claude AI Assistant
**Project:** Project Genie - Company Intelligence Module
**Review Date:** 2025-03-01 (60 days validation period)

## Executive Summary

This archive contains all legacy V3 Company Intelligence code that was replaced during the comprehensive V4 migration. The migration moved from a mixed-pattern architecture to a clean, repository-based V4 implementation with unified event streaming.

## Migration Overview

### V3 Architecture (Archived)
- **Pattern:** Mixed patterns with direct database access
- **Sessions:** Managed via `/api/company-intelligence/sessions/` endpoints
- **Streaming:** Direct SSE implementation
- **Scrapers:** Multiple versions with inconsistent interfaces
- **Components:** Stage-based workflow with multiple component versions

### V4 Architecture (Current)
- **Pattern:** Repository pattern with CompanyIntelligenceRepositoryV4
- **Sessions:** Managed through repository with getOrCreateUserSession()
- **Streaming:** Unified StreamWriter/StreamReader pattern
- **Scrapers:** Enhanced scrapers with factory functions
- **Components:** Clean component separation (SiteAnalyzer, SchemaBuilder, ExecutionMonitor, IntelligenceKanban)

## Archive Structure

```
archived-2025-01-28/
├── api-routes/
│   ├── sessions/               # V3 session management API
│   ├── analyze-site-old/       # Legacy analysis endpoint
│   ├── fetch-sitemap/          # Standalone sitemap fetcher
│   ├── validate-domain/        # Separate validation endpoint
│   ├── credits/                # V3 credits implementation
│   ├── research/               # Old research endpoint
│   ├── research-stream/        # Old streaming endpoint
│   └── route-old.ts            # Early V4 scrape attempt
├── components/
│   ├── index.tsx.old           # Old execution monitor
│   ├── scraper-controls.tsx.backup
│   ├── site-analysis-panel.tsx # V3 panel component
│   ├── site-analysis-stage.tsx # V3 stage system
│   └── company-intelligence.module.css # Unused CSS module
├── lib/
│   ├── company-intelligence-old/ # Complete V3 library (~50 files)
│   ├── index-old.ts            # Old realtime events
│   ├── stream-writer-old.ts
│   └── stream-writer-v4.ts    # Transitional version
└── page-backups/
    ├── page.tsx.old
    ├── page.tsx.backup-20250928-181553
    └── page.tsx.backup-$(date)
```

## Critical Changes Made

### 1. Factory Functions Created
- **File:** `/lib/company-intelligence/scrapers/factories.ts`
- **Purpose:** Bridge between class-based scrapers and factory pattern
- **Exports:** `createFirecrawlScraper()`, `createPlaywrightScraper()`

### 2. Import Paths Fixed
- **File:** `/app/api/company-intelligence/v4/scrape/route.ts`
- **Changed:** Lines 14-15 to import from factories.ts
- **Impact:** Resolves missing scraper function errors

### 3. Debug Mode Disabled
- **File:** `/app/(dashboard)/company-intelligence/page.tsx`
- **Changed:** Line 109 - `DEBUG_MODE = false`
- **Removed:** Line 14 - Unused CSS module import

## File Inventory

### API Routes (7 directories, ~25 files)
| Directory | Files | Reason for Archival |
|-----------|-------|-------------------|
| sessions/ | 7 | Replaced by V4 repository pattern |
| analyze-site-old/ | 1 | Superseded by V4 analyze |
| fetch-sitemap/ | 1 | Integrated into V4 scrapers |
| validate-domain/ | 1 | Moved to V4 analyze route |
| credits/ | 1 | V4 has own implementation |
| research/ | 1 | Deprecated feature |
| research-stream/ | 1 | Replaced by StreamWriter |

### Components (8 files)
| File | Type | Replacement |
|------|------|------------|
| execution-monitor/index.tsx.old | Backup | Current V4 version |
| scraping-dashboard/index.tsx.old | Backup | V4 dashboard |
| scraper-controls.tsx.backup | Backup | V4 controls |
| site-analysis-panel.tsx | V3 Component | V4 SiteAnalyzer |
| site-analysis-stage.tsx | V3 Component | V4 workflow |
| company-intelligence.module.css | Unused | Not needed |

### Libraries (~55 files)
| Directory | Contents | Status |
|-----------|----------|---------|
| company-intelligence-old/ | Complete V3 implementation | Can reference for logic |
| realtime-events/*-old | Old event system | Replaced by unified events |

## Validation Checklist

### Pre-Archive Verification ✅
- [x] All files have deprecation headers where applicable
- [x] No active code references archived files
- [x] Factory functions created for scrapers
- [x] Import paths updated in V4 routes
- [x] Debug mode disabled for production

### Post-Archive Testing Required
- [ ] Company Intelligence page loads without errors
- [ ] Domain analysis completes successfully
- [ ] Schema builder configures properly
- [ ] Execution monitor tracks progress
- [ ] Intelligence kanban displays results
- [ ] SSE streaming works correctly
- [ ] Credits system functions properly

## Deletion Timeline

| Category | Can Delete After | Reason |
|----------|------------------|--------|
| API Routes | 2025-03-01 | 60-day validation period |
| Components | 2025-03-01 | 60-day validation period |
| Libraries | 2025-03-01 | 60-day validation period |
| Page Backups | 2025-02-15 | 30-day safety period |
| CSS Module | 2025-02-15 | Not used in V4 |

## Rollback Instructions

If V4 has critical issues and rollback is needed:

1. **Restore API Routes:**
   ```bash
   cp -r archive/.../api-routes/sessions app/api/company-intelligence/
   ```

2. **Update Imports:**
   - Revert factory imports to direct class usage
   - Re-enable old repository imports

3. **Component Restoration:**
   - Copy back required V3 components
   - Update page.tsx to use V3 components

## Migration Lessons Learned

1. **Factory Pattern:** Essential for bridging architectural differences
2. **Deprecation Headers:** Valuable for tracking migration timeline
3. **Archive vs Delete:** Archiving provides safety net during validation
4. **Import Management:** Critical to verify all imports after restructuring
5. **Debug Flags:** Must be managed carefully for production

## Contact for Questions

- **Technical Lead:** Development Team
- **Migration Date:** January 28, 2025
- **Documentation:** See CLAUDE.md for V4 patterns

## Final Notes

This archive represents a significant architectural improvement from V3 to V4. The migration consolidates multiple patterns into a clean, maintainable structure using:

- Repository pattern for data access
- Unified event streaming
- Factory functions for object creation
- Clear component separation
- Improved error handling with convertSupabaseError()

Keep this archive until March 1, 2025, to ensure V4 stability is fully validated in production.

---

*Generated during Company Intelligence V3→V4 Migration*
*Archive preserved for rollback capability and historical reference*