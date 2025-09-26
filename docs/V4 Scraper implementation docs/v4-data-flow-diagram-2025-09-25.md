# V4 Company Intelligence Data Flow Diagram
**Generated:** 2025-09-25
**Purpose:** Complete data flow mapping from scraper API through UI to repository and persistence

## Complete Data Flow Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        U[User] --> UI[Web Interface]
        UI --> DC[Domain Config]
        DC --> SC[Scraper Selection]
        SC --> CC[Category Selection]
        CC --> AC[Advanced Config]
    end

    subgraph "API Gateway Layer"
        AC --> API["/api/company-intelligence/v4/scrape"]
        API --> AUTH[Authentication Check]
        AUTH --> VAL[Request Validation]
        VAL --> SESS[Session Management]
    end

    subgraph "Session Layer"
        SESS --> GOS[getOrCreateUserSession]
        GOS --> REPO1[CompanyIntelligenceRepository]
        REPO1 --> DB1[(Supabase Sessions Table)]
    end

    subgraph "Scraper Factory Layer"
        VAL --> SF[Scraper Factory]
        SF --> ST{Scraper Type?}
        ST -->|Firecrawl| FC[FirecrawlStreamingScraper]
        ST -->|Playwright| PW[PlaywrightStreamingScraper]
        ST -->|Cheerio| CH[CheerioStreamingScraper]
    end

    subgraph "Execution Layer"
        FC --> FE[Firecrawl Execution]
        PW --> PE[Playwright Execution]
        CH --> CE[Cheerio Execution]

        FE --> DISC1[URL Discovery]
        FE --> BATCH[Batch Processing]
        FE --> AI[AI Extraction]

        PE --> BROWSER[Browser Automation]
        PE --> SCRIPT[Script Execution]
        PE --> CAPTURE[Screenshot Capture]

        CE --> HTTP[HTTP Fetching]
        CE --> PARSE[HTML Parsing]
        CE --> EXTRACT[Content Extraction]
    end

    subgraph "Intelligence Processing Layer"
        AI --> CAT[Category Extractor]
        SCRIPT --> CAT
        EXTRACT --> CAT

        CAT --> INTEL[Intelligence Categorizer]
        INTEL --> C1[Corporate Data]
        INTEL --> C2[Products Data]
        INTEL --> C3[Pricing Data]
        INTEL --> C4[Team Data]
        INTEL --> C5[... 21 More Categories]
    end

    subgraph "Stream Layer"
        INTEL --> SW[StreamWriter]
        SW --> SSE[SSE Events]
        SSE --> E1[DiscoveryEvent]
        SSE --> E2[ProgressEvent]
        SSE --> E3[DataEvent]
        SSE --> E4[ErrorEvent]
        SSE --> E5[CompleteEvent]
    end

    subgraph "UI Reception Layer"
        E1 --> UIR[UI Event Receiver]
        E2 --> UIR
        E3 --> UIR
        E4 --> UIR
        E5 --> UIR

        UIR --> STATE[Component State Update]
        STATE --> KANBAN[Kanban Board Render]
    end

    subgraph "Kanban UI Layer"
        KANBAN --> COLS[Category Columns]
        COLS --> CARDS[Intelligence Cards]
        CARDS --> DND[Drag & Drop Context]
        DND --> QUEUE[Enrichment Queue]
        QUEUE --> CALC[Credit Calculator]
    end

    subgraph "Persistence Layer"
        QUEUE --> SAVE[Save Intelligence Data]
        SAVE --> REPO2[Repository Methods]
        REPO2 --> TRANS[Data Transformation]
        TRANS --> DB2[(Supabase Tables)]
    end

    subgraph "Database Schema"
        DB2 --> T1[company_intelligence_sessions]
        DB2 --> T2[page_intelligence]
        DB2 --> T3[external_intelligence]
        DB2 --> T4[discovered_urls]
        DB2 --> T5[enrichment_queue]
    end

    subgraph "Enrichment Flow"
        QUEUE --> ENR[Enrichment Trigger]
        ENR --> LLM[LLM Processing]
        LLM --> ENRICH[Enriched Data]
        ENRICH --> REPO3[Repository Update]
        REPO3 --> DB3[(Supabase Update)]
    end

    style U fill:#e1f5fe
    style API fill:#fff3e0
    style SF fill:#f3e5f5
    style CAT fill:#e8f5e9
    style SW fill:#fff9c4
    style KANBAN fill:#fce4ec
    style DB2 fill:#f5f5f5
    style LLM fill:#ffebee
```

## Data Transformation Points

### 1. Input Transformation (UI → API)
```typescript
// User Input
{
  domain: "example.com",
  depth: "comprehensive",
  categories: ["corporate", "products", "pricing"],
  scraperType: "firecrawl",
  maxPages: 50
}
↓
// API Request Body
{
  domain: "example.com",
  scraperType: "FIRECRAWL",
  config: {
    maxPages: 50,
    depth: IntelligenceDepth.COMPREHENSIVE,
    categories: [IntelligenceCategory.CORPORATE, ...]
  }
}
```

### 2. Scraper Configuration Transform (API → Scraper)
```typescript
// API Config
{
  scraperType: "FIRECRAWL",
  config: { maxPages: 50, categories: [...] }
}
↓
// Firecrawl Config
{
  urls: ["https://example.com", ...],
  scrapeOptions: {
    formats: ["markdown", "extract", "links"],
    extract: { schema: mergedZodSchema },
    timeout: 30000
  }
}
```

### 3. Raw Data → Intelligence Transform (Scraper → Categories)
```typescript
// Firecrawl Response
{
  url: "https://example.com/about",
  markdown: "# About Us...",
  extract: { company_name: "Example Corp", ... }
}
↓
// Categorized Intelligence
{
  category: IntelligenceCategory.CORPORATE,
  items: [{
    id: "uuid",
    type: "company_info",
    content: { name: "Example Corp", ... },
    confidence: 0.95
  }]
}
```

### 4. Intelligence → UI State Transform
```typescript
// Intelligence Data
{
  [IntelligenceCategory.CORPORATE]: {
    metadata: { label: "Corporate", icon: "building" },
    items: [...],
    confidence: 0.95
  }
}
↓
// Kanban Columns
[{
  id: "CORPORATE",
  title: "Corporate",
  items: [...],
  expanded: true,
  color: "blue"
}]
```

### 5. UI State → Database Transform
```typescript
// Kanban State
{
  enrichmentQueue: [item1, item2, ...],
  categories: { CORPORATE: {...}, ... }
}
↓
// Database Update
{
  merged_data: {
    intelligence: { categories: {...} },
    enrichment_queue: [...]
  }
}
```

## Critical Integration Points

### 1. Session Management
- **Entry:** `getOrCreateUserSession(userId, domain)`
- **Constraint:** UNIQUE(user_id, domain)
- **Output:** SessionData with `id` for all operations

### 2. SSE Streaming
- **Entry:** `new StreamWriter(sessionId, correlationId, signal)`
- **Events:** 5 distinct types (Discovery, Progress, Data, Error, Complete)
- **Client:** EventSource API subscription

### 3. Repository Layer
- **Pattern:** All DB access through repositories
- **Error Handling:** `convertSupabaseError()` for all Supabase errors
- **Logging:** `permanentLogger.captureError()` for all errors

### 4. Type Safety Checkpoints
- **API Boundary:** Zod validation of request/response
- **Scraper Output:** Runtime type validation
- **Database Operations:** TypeScript types from Supabase
- **UI Props:** Component prop validation

## Error Handling Flow

```mermaid
graph TD
    ERR[Error Occurs] --> TYPE{Error Type?}
    TYPE -->|Auth| AUTH_ERR[401 Unauthorized]
    TYPE -->|Validation| VAL_ERR[400 Bad Request]
    TYPE -->|Scraper| SCRAPE_ERR[500 + Retry Logic]
    TYPE -->|Database| DB_ERR[convertSupabaseError]

    AUTH_ERR --> LOG[permanentLogger.captureError]
    VAL_ERR --> LOG
    SCRAPE_ERR --> LOG
    DB_ERR --> LOG

    LOG --> STREAM[Stream Error Event]
    STREAM --> UI_ERR[UI Error Display]
    UI_ERR --> RECOVERY[Recovery Actions]
```

## Performance Metrics Flow

```mermaid
graph LR
    START[Request Start] --> T1[permanentLogger.timing]
    T1 --> AUTH_TIME[Auth Duration]
    T1 --> SCRAPE_TIME[Scrape Duration]
    T1 --> PROCESS_TIME[Processing Duration]
    T1 --> PERSIST_TIME[Persistence Duration]

    AUTH_TIME --> METRICS[Performance Metrics]
    SCRAPE_TIME --> METRICS
    PROCESS_TIME --> METRICS
    PERSIST_TIME --> METRICS

    METRICS --> LOGS[Permanent Logs]
    METRICS --> ANALYTICS[Analytics Dashboard]
```

## Credit Flow Management

```mermaid
graph TD
    USER[User Credits] --> CHECK{Credits Available?}
    CHECK -->|Yes| CALC[Calculate Cost]
    CHECK -->|No| REJECT[Reject Request]

    CALC --> EST[Estimate Pages × Cost/Page]
    EST --> RESERVE[Reserve Credits]
    RESERVE --> EXEC[Execute Scraping]

    EXEC --> ACTUAL[Actual Usage]
    ACTUAL --> DEDUCT[Deduct from Balance]
    DEDUCT --> UPDATE[Update User Credits]
    UPDATE --> DB[(Credits Table)]
```

## Missing Components (Per Audit)

### Currently Missing:
1. **Category Extractor** - Transforms raw data to categories
2. **Intelligence Enums** - Type definitions for categories
3. **Kanban Components** - UI for drag & drop
4. **Enrichment Queue Table** - Database persistence
5. **Credit Calculator** - Cost estimation logic

### Data Flow Breaks:
- ❌ Scraper → Category Extractor (component missing)
- ❌ Category Extractor → Kanban UI (no types)
- ❌ Kanban UI → Enrichment Queue (no components)
- ❌ Enrichment Queue → Database (no table)

---

**Note:** This diagram represents the INTENDED architecture from the design documents. Actual implementation has gaps as noted in the compliance audit report.