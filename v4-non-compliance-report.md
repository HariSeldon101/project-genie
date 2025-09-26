# V4 Streaming Scraper Non-Compliance Report

**Date**: September 23, 2025
**Component**: V4 Scraping System
**Severity**: CRITICAL - System Non-Functional

---

## Executive Summary

The V4 scraping system contains **7 critical violations** and **3 major architectural misunderstandings** that prevent it from functioning. The system has never been successfully executed and requires significant corrections before deployment.

---

## 🔴 CRITICAL VIOLATIONS

### 1. StreamWriter Constructor Arguments Reversed
**Location**: `/app/api/company-intelligence/v4/scrape/route.ts:164`

```typescript
// ❌ CURRENT (WRONG ORDER)
const streamWriter = new StreamWriter(correlationId, user.id)

// ✅ CORRECT ORDER (per line 52-55 of stream-writer.ts)
const streamWriter = new StreamWriter(user.id, correlationId)
```

**Impact**: TypeError on every request
**Fix Required**: Swap argument order

---

### 2. Direct Database Access (Repository Pattern Violation)
**Location**: `/app/api/company-intelligence/v4/scrape/route.ts:254-265`

```typescript
// ❌ CURRENT (DIRECT ACCESS - VIOLATES CLAUDE.md)
const { error: dbError } = await supabase
  .from('company_intelligence_results')
  .insert({...})

// ✅ REQUIRED (REPOSITORY PATTERN)
const repository = CompanyIntelligenceRepository.getInstance()
const session = await repository.getOrCreateUserSession(user.id, cleanDomain)
await repository.updateMergedData(session.id, {
  ...session.merged_data,
  pages: dataObject,
  scraping_metrics: result.metrics
})
```

**Impact**: Violates core architecture principles
**Fix Required**: Use repository methods

---

### 3. Non-Existent Database Table
**Location**: `/app/api/company-intelligence/v4/scrape/route.ts:255`

```typescript
// ❌ TABLE DOES NOT EXIST
.from('company_intelligence_results')
```

**Existing Schema**: Only `company_intelligence_sessions` exists
**Data Storage**: Should update `merged_data` field in sessions table
**Impact**: PostgreSQL error on every save attempt

---

### 4. Missing Scraper Implementation
**Location**: `/lib/company-intelligence/scrapers-v4/scrapers/cheerio-streaming.ts`

```typescript
// ❌ FILE DOES NOT EXIST
case ScraperType.CHEERIO:
  throw new Error('Cheerio scraper not yet implemented for v4 streaming')
```

**Impact**: Cannot scrape 30% of websites (WordPress/static)
**Fix Required**: Implement CheerioStreamingScraper (~150 lines)

---

### 5. EventFactory.complete() Method Exists But Misunderstood
**Location**: `/app/api/company-intelligence/v4/scrape/route.ts:286`

```typescript
// ✅ ACTUALLY CORRECT (Method exists at line 461 of event-factory.ts)
await streamWriter.sendEvent(EventFactory.complete(...))

// Note: Initial audit was wrong - this method DOES exist
```

**Status**: No fix needed - method exists

---

### 6. EventFactory.parse() Wrong Method Name in Documentation
**Location**: `/docs/v4-streaming-scraper-architecture-22nd-sept.md:558`

```typescript
// ❌ DOCUMENTED INCORRECTLY
const event = EventFactory.parse(value)

// ✅ ACTUAL METHOD NAME
const event = EventFactory.parseFromSSE(value)
```

**Impact**: Documentation misleading
**Fix Required**: Update documentation

---

### 7. Timer Double Stop
**Location**: `/app/api/company-intelligence/v4/scrape/route.ts:305`

```typescript
// ❌ CURRENT (stop() called twice)
totalDuration: Date.now() - requestTimer.stop()

// ✅ CORRECT
const duration = requestTimer.stop()
// Then use: totalDuration: duration
```

**Impact**: Undefined behavior
**Fix Required**: Store result before use

---

## 🏗️ ARCHITECTURAL MISUNDERSTANDINGS

### 1. Data Storage Pattern

**Current Understanding (WRONG)**:
- V4 tries to create a new `company_intelligence_results` table
- Attempts to store scraping data separately from sessions

**Correct Pattern**:
- All scraping data goes into `merged_data` field of `company_intelligence_sessions`
- Structure: `merged_data.pages[url] = { content, metadata, ... }`
- This is how V2 and V3 already work

### 2. Repository Usage

**Current Implementation (WRONG)**:
- Direct database access with Supabase client
- No session management
- No phase updates

**Correct Pattern**:
```typescript
// 1. Get or create session
const session = await repository.getOrCreateUserSession(userId, domain)

// 2. Update merged_data with scraping results
await repository.updateMergedData(session.id, {
  ...session.merged_data,
  pages: scrapedData,
  scraping_complete: true,
  scraping_metrics: metrics
})

// 3. Update phase if needed
await repository.updateSessionPhase(session.id, 4) // Move to extraction
```

### 3. Session Management

**Current Implementation (WRONG)**:
- No session creation or retrieval
- No tracking of scraping progress in session

**Correct Pattern**:
- MUST use `getOrCreateUserSession()` - NEVER create new sessions directly
- Update session's merged_data as scraping progresses
- Track phase transitions

---

## 📊 COMPLIANCE SCORECARD

| Category | Status | Details |
|----------|--------|---------|
| **Repository Pattern** | ❌ FAIL | Direct DB access instead of repository |
| **Database Schema** | ❌ FAIL | Trying to use non-existent table |
| **Method Signatures** | ⚠️ PARTIAL | StreamWriter wrong, EventFactory.complete OK |
| **Session Management** | ❌ FAIL | No session handling at all |
| **Data Storage** | ❌ FAIL | Wrong storage location |
| **SSE Architecture** | ✅ PASS | EventFactory methods mostly correct |
| **Error Handling** | ✅ PASS | Uses convertSupabaseError properly |
| **Mock Data** | ✅ PASS | No mock data found |
| **Logging** | ✅ PASS | PermanentLogger used correctly |

---

## 🔧 REQUIRED FIXES (Priority Order)

### Priority 1: Critical Runtime Errors
1. **Fix StreamWriter constructor** - Swap arguments (line 164)
2. **Fix timer double stop** - Store result first (line 305)

### Priority 2: Data Storage
3. **Remove direct DB access** (lines 254-265)
4. **Add repository usage**:
   ```typescript
   const repository = CompanyIntelligenceRepository.getInstance()
   const session = await repository.getOrCreateUserSession(user.id, cleanDomain)

   // After scraping completes:
   await repository.updateMergedData(session.id, {
     ...session.merged_data,
     pages: dataObject,
     scraping_metrics: result.metrics,
     scraping_completed_at: new Date().toISOString()
   })
   ```

### Priority 3: Missing Implementation
5. **Create CheerioStreamingScraper** (~150 lines)
   - Required for WordPress/static sites
   - Follow same pattern as Firecrawl/Playwright scrapers

### Priority 4: Documentation
6. **Fix EventFactory.parseFromSSE** in docs
7. **Update architecture doc** with correct data flow

---

## 🎯 CONCLUSION

The V4 system demonstrates a fundamental misunderstanding of the application's data architecture:

1. **It bypasses the repository pattern** entirely
2. **It tries to create new tables** instead of using existing schema
3. **It ignores session management** which is critical for the multi-phase workflow
4. **It has never been tested** - would fail on first request

Before ANY UI work can begin, the V4 backend must be corrected to:
- Use the repository pattern exclusively
- Store data in merged_data of company_intelligence_sessions
- Properly manage sessions with getOrCreateUserSession()
- Implement the missing Cheerio scraper

**Estimated Effort**:
- 2-3 hours to fix existing violations
- 2-3 hours to implement CheerioStreamingScraper
- 1-2 hours to test complete flow

**Risk Assessment**: HIGH - Current code will fail 100% of requests

---

## Appendix: Correct V4 Flow

```typescript
// 1. Authenticate
const { user } = await supabase.auth.getUser()

// 2. Get/Create Session (Repository)
const repository = CompanyIntelligenceRepository.getInstance()
const session = await repository.getOrCreateUserSession(user.id, domain)

// 3. Execute Scraping
const scraper = new FirecrawlStreamingScraper(config)
const result = await scraper.scrapeWithStreaming(domain, streamWriter)

// 4. Update Session (Repository)
await repository.updateMergedData(session.id, {
  ...session.merged_data,
  pages: result.data,
  scraping_metrics: result.metrics,
  scraping_phase: 'complete'
})

// 5. Update Phase if needed
await repository.updateSessionPhase(session.id, 4)
```

This is the ONLY acceptable pattern for V4.