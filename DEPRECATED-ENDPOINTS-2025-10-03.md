# Deprecated Endpoints & Files - October 3, 2025

## Summary
This document tracks deprecated endpoints and files that should be archived after verification.

**Created:** 2025-10-03
**Reason:** Removing mock data and consolidating to working V4 endpoints

---

## 🔴 Endpoints for Immediate Archival

### 1. `/api/company-intelligence/credits` - Mock Credits Endpoint
**File:** `app/api/company-intelligence/credits/route.ts`
**Status:** ⚠️ DEPRECATED - Returns hardcoded mock data
**Last Used:** Removed from `scraper-controls-refactored.tsx` on 2025-10-03

**Reason for Deprecation:**
- Violates CLAUDE.md: "NO MOCK DATA OR FALLBACKS"
- Returns hardcoded `{remaining: 500, used: 150, limit: 1000}`
- Real working endpoint exists at `/api/company-intelligence/v4/firecrawl-credits`

**Migration Path:**
```typescript
// OLD (mock data):
fetch('/api/company-intelligence/credits')
  .then(res => res.json())
  .then(data => setCreditBalance(data.remaining))

// NEW (real Firecrawl API data):
fetch('/api/company-intelligence/v4/firecrawl-credits')
  .then(res => res.json())
  .then(data => setCreditBalance(data.credits))
```

**Active Imports:** None (verified via grep)
**Safe to Archive:** ✅ Yes
**Archive Location:** `archive/deprecated-2025-10-03/api-routes/credits/`

---

## 📋 Verification Checklist

Before archiving any file:
- [ ] Verify zero active imports using `grep -r "path/to/endpoint"`
- [ ] Check PROJECT_MANIFEST.json (update after archival)
- [ ] Add deprecation notice to file header
- [ ] Document migration path
- [ ] Move to archive with timestamp

---

## 🔍 Files Under Review

### Potential Candidates (Need Investigation):

1. **Old Scraper Files** - Check if v3 scrapers are still referenced
   - `archive/company-intelligence-v3-to-v4-migration/`
   - Status: Already archived, verify no imports

2. **Test Endpoints** - Already archived in previous cleanup
   - `archive/cleanup-2025-10-01/test-infrastructure/`
   - Status: ✅ Confirmed archived

3. **Backup Files** - Already archived
   - `archive/cleanup-2025-10-01/backup-files/`
   - Status: ✅ Confirmed archived

---

## 📊 Deprecation Stats

| Category | Count | Archived | Pending |
|----------|-------|----------|---------|
| Mock API Endpoints | 1 | 0 | 1 |
| Test Files | 13 | 13 | 0 |
| Backup Files | 30+ | 30+ | 0 |

---

## 🚀 Next Actions

1. ✅ Mark `/api/company-intelligence/credits` with deprecation notice
2. ⏳ Verify no active imports (grep completed - none found)
3. ⏳ Archive to `archive/deprecated-2025-10-03/`
4. ⏳ Update PROJECT_MANIFEST.json
5. ⏳ Update this document with archive confirmation

---

**Last Updated:** 2025-10-03T08:25:00Z
**Reviewer:** Claude Code
**Status:** In Progress
