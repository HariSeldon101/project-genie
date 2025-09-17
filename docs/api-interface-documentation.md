# API Interface Documentation

**Last Updated**: 2025-01-12 (Phase 10 Documentation)  
**Status**: Updated with refactored scraper interfaces

## 🚨 CRITICAL: SSE Event Standardization (MANDATORY as of 2025-01-11)

### ALL Server-Sent Events MUST Follow This Structure:
```typescript
interface SSEEvent<T = any> {
  id: string                   // Unique event ID (use nanoid or uuid)
  type: EventType              // 'progress' | 'data' | 'error' | 'complete'
  timestamp: number            // Date.now()
  correlationId: string        // Links related events
  sequence: number             // Incrementing counter for order
  data: T                      // Type-safe payload
  metadata: {
    source: string             // Which service/component
    phase?: string             // Current processing phase
    progress?: {
      current: number
      total: number
      percentage: number
      message?: string
    }
  }
}
```

### ALL Captured Data MUST Extend BaseDataItem:
```typescript
interface BaseDataItem {
  id: string                   // Unique identifier
  type: DataType               // 'link' | 'text' | 'image' | 'contact' | etc
  source: DataSource           // 'scraping' | 'extraction' | 'external' | 'analysis'
  url?: string                 // Source URL if applicable
  timestamp: number            // When captured
  confidence: number           // 0-1 confidence score
  quality: 'high' | 'medium' | 'low'
  metadata: Record<string, any> // Extensible metadata
}

// Example specialized extension:
interface LinkDataItem extends BaseDataItem {
  type: 'link'
  linkType: 'internal' | 'external' | 'navigation' | 'resource'
  text?: string                // Link text
  target?: string              // href value
  normalized?: string          // Deduplicated URL
}
```

### SSE Event Factory Usage:
```typescript
import { SSEEventFactory } from '@/lib/company-intelligence/utils/sse-event-factory'

// Creating events:
const progressEvent = SSEEventFactory.progress(
  50, 100, 'Processing page 50 of 100',
  { phase: 'scraping', source: 'static-executor' }
)

const dataEvent = SSEEventFactory.data(
  dataItems,
  { phase: 'extraction', source: 'data-extractor' }
)

const errorEvent = SSEEventFactory.error(
  error,
  { source: 'scraper', correlationId: sessionId }
)
```

## Overview
This document defines the input/output interfaces for all Company Intelligence API endpoints and key functions. Each interface includes detailed logging requirements to ensure full traceability.

## Logging Guidelines

### 1. Always Log Interface Boundaries
```typescript
// At function entry
permanentLogger.log('COMPONENT_NAME', 'functionName called', {
  input: {
    param1: value1,
    param2: value2,
    // All parameters with their types and values
  }
})

// At function exit
permanentLogger.log('COMPONENT_NAME', 'functionName completed', {
  output: {
    result: resultValue,
    metrics: { /* performance metrics */ }
  }
})
```

### 2. Log Data Transformations
```typescript
permanentLogger.log('COMPONENT_NAME', 'Data transformation', {
  before: { /* original data structure */ },
  after: { /* transformed data structure */ },
  transformationType: 'aggregation|filtering|mapping|etc'
})
```

## API Endpoints

### POST /api/company-intelligence/analyze-site

**Purpose**: Analyze a website to determine its technology stack and metadata

**Input Interface**:
```typescript
interface AnalyzeSiteRequest {
  domain: string;      // Required: Domain to analyze (e.g., "example.com")
  includeOg?: boolean; // Optional: Include OpenGraph metadata (default: true)
}
```

**Output Interface**:
```typescript
interface AnalyzeSiteResponse {
  success: boolean;
  data?: {
    url: string;
    domain: string;
    siteType: 'static' | 'react' | 'nextjs' | 'vue' | 'angular' | 'svelte' | 'unknown';
    metadata: {
      title?: string;
      description?: string;
      organizationName?: string;
      schemaType?: string;
      language?: string;
      openGraph?: {
        title?: string;
        description?: string;
        image?: string;
        type?: string;
      };
      twitter?: {
        card?: string;
        title?: string;
        description?: string;
        image?: string;
      };
    };
    technologies: string[];
    performance: {
      loadTime: number;
      responseTime: number;
    };
  };
  error?: string;
}
```

**Logging Requirements**:
- Log full request body on entry
- Log detected site type and technologies
- Log any errors with full stack traces
- Log response time metrics

### POST /api/company-intelligence/phases/scraping

**Purpose**: Scrape selected pages from a website using intelligent strategy selection

**Input Interface**:
```typescript
interface ScrapingRequest {
  sessionId: string;    // Required: Research session ID
  domain: string;       // Required: Domain being scraped
  pages: string[];      // Required: Array of URLs to scrape
  options?: {
    mode?: 'multi-phase' | 'single' | 'auto-detect';
    maxPages?: number;   // Default: pages.length or 500
    timeout?: number;    // Default: 60000ms
    stream?: boolean;    // Default: false
  };
}
```

**Output Interface (Streaming)**:
```typescript
// Progress updates during scraping
interface ScrapingProgress {
  type: 'progress';
  phase: 'rapid-scrape' | 'validation' | 'enhancement' | 'complete';
  completedPages: number;
  totalPages: number;
  phases: Array<{
    name: string;
    status: 'pending' | 'in-progress' | 'complete' | 'skipped';
    details?: string;
  }>;
  validationScore?: number;
  enhancementCount?: number;
  scraperType?: string;
}

// Final result
interface ScrapingComplete {
  type: 'complete';
  result: {
    pages: Array<{
      url: string;
      content: string;
      brandAssets?: any;
      contactInfo?: any;
      socialLinks?: string[];
      // ... other extracted data
    }>;
    brandAssets: any;
    contactInfo: any;
    socialLinks: string[];
    teamMembers: any[];
    testimonials: any[];
    products: any[];
    llmUsage: {
      calls: number;
      cost: number;
      message: string;
    };
  };
}
```

**Logging Requirements**:
- Log request with pages count and first 5 URLs
- Log strategy manager initialization
- Log each batch start/completion with timing
- Log individual page scraping success/failure
- Log validation scores and enhancement decisions
- Log final aggregation metrics

### POST /api/company-intelligence/phases/enrichment

**Purpose**: Enrich scraped data using AI/LLM analysis

**Input Interface**:
```typescript
interface EnrichmentRequest {
  sessionId: string;
  domain: string;
  scrapedData: any; // Data from scraping phase
  options?: {
    enrichers?: string[]; // Specific enrichers to use
    llmModel?: string;    // LLM model preference
  };
}
```

**Output Interface**:
```typescript
interface EnrichmentResponse {
  success: boolean;
  data?: {
    enrichedData: any;
    enrichmentMetrics: {
      enrichersUsed: string[];
      llmCalls: number;
      totalCost: number;
      duration: number;
    };
  };
  error?: string;
}
```

## Component Interfaces

### PhaseControls Component

**handleStageComplete Function**:
```typescript
// Input
interface StageCompleteInput {
  stage: 'site-analysis' | 'sitemap' | 'scraping' | 'extraction' | 'data-review' | 'enrichment' | 'generation';
  data: any; // Stage-specific data
}

// Processing
- Store data in stageData state
- Update completedStages set
- Create/update database session
- Trigger next stage if appropriate

// Output (via onPhaseComplete callback)
interface PhaseCompleteCallback {
  (stage: string, data: any): void;
}
```

**startScraping Function**:
```typescript
// Input
interface StartScrapingInput {
  sitemapPages?: string[]; // Optional: Direct pages to scrape
  // Falls back to stageData.sitemap if not provided
}

// Processing
- Validate session exists
- Check pages available (passed or from state)
- Initialize progress tracking
- Call scraping API with streaming
- Handle progress updates
- Process final results

// Output
- Updates scrapingProgress state
- Calls handleStageComplete on success
- Shows error toast on failure
```

## State Management Interfaces

### Research Session State
```typescript
interface ResearchSession {
  id: string;
  domain: string;
  session_name: string;
  stage: string;
  status: 'active' | 'completed' | 'failed';
  site_analysis_data?: any;
  sitemap_data?: any;
  scraping_data?: any;
  extraction_data?: any;
  enrichment_data?: any;
  generation_data?: any;
  created_at: string;
  updated_at: string;
}
```

### Component State
```typescript
interface PhaseControlsState {
  sessionId: string | null;
  currentStage: Stage;
  completedStages: Set<Stage>;
  stageData: Record<Stage, any>;
  isProcessing: boolean;
  scrapingProgress: {
    totalPages: number;
    completedPages: number;
    currentPhase: string;
    phases: PhaseInfo[];
    validationScore?: number;
    enhancementCount: number;
    scraperType: string;
  };
}
```

## Error Handling Standards

### Always Include Context
```typescript
try {
  // operation
} catch (error) {
  permanentLogger.error('COMPONENT_NAME', 'Operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    context: {
      // Include all relevant context
      input: { /* input params */ },
      state: { /* current state */ }
    }
  })
}
```

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: string;        // User-friendly message
  details?: string;     // Technical details
  code?: string;        // Error code for debugging
  timestamp: string;    // When error occurred
}
```

## Best Practices

1. **Always validate inputs** before processing
2. **Log at boundaries** - Entry, exit, and errors
3. **Include metrics** - Timing, counts, sizes
4. **Use consistent naming** - Component names, function names
5. **Preserve context** - Include relevant state in logs
6. **Handle edge cases** - Empty arrays, null values, timeouts
7. **Document assumptions** - What the code expects
8. **Version interfaces** - Track changes over time
9. **USE SSEEventFactory** - Never create ad-hoc SSE structures
10. **EXTEND BaseDataItem** - All data must follow base structure
11. **INCLUDE correlation IDs** - Track related events across phases
12. **DEDUPLICATE properly** - Use existing ContentDeduplicator utility

## Utility Functions

### HTML and URL Processing Utilities (`/lib/utils/html-decoder.ts`)

#### decodeHtmlEntities
**Purpose**: Decodes HTML entities to their readable characters

**Input**:
```typescript
decodeHtmlEntities(html: string): string
```

**Output**: Decoded string with readable characters

**Usage Example**:
```typescript
decodeHtmlEntities("&lt;div&gt;Hello &amp; goodbye&lt;/div&gt;") 
// Returns: "<div>Hello & goodbye</div>"
```

**Handles**:
- Common HTML entities (&amp;, &lt;, &gt;, &quot;, &#039;)
- Dashes and spaces (&mdash;, &ndash;, &nbsp;)
- Special characters (&copy;, &reg;, &trade;, currencies)
- Fractions (&frac12;, &frac14;, &frac34;)
- Arrows (&larr;, &rarr;, &uarr;, &darr;)
- Mathematical symbols (&times;, &divide;, &plusmn;)
- Quotes (&lsquo;, &rsquo;, &ldquo;, &rdquo;)
- Numeric entities (&#123;, &#xABC;)

#### normalizeUrl
**Purpose**: Normalizes URLs for deduplication and consistency

**Input**:
```typescript
normalizeUrl(url: string): string
```

**Output**: Normalized URL string with consistent formatting

**Normalization Rules**:
1. Protocol normalized to HTTPS
2. Trailing slashes removed from pathname
3. Fragments (#) removed
4. Query parameters sorted alphabetically
5. Handles malformed URLs gracefully

**Usage Example**:
```typescript
normalizeUrl("http://example.com/path/?b=2&a=1#section")
// Returns: "https://example.com/path?a=1&b=2"
```

**Use Cases**:
- URL deduplication in scraping
- Consistent URL storage in database
- URL comparison across different sources

#### generateTitleFromUrl
**Purpose**: Generates human-readable titles from URL paths

**Input**:
```typescript
generateTitleFromUrl(url: string, baseUrl?: string): string
```

**Output**: Human-readable title string

**Processing**:
1. Removes base URL if provided
2. Extracts path segments
3. Removes file extensions
4. Replaces hyphens/underscores with spaces
5. Capitalizes each word
6. Applies HTML entity decoding

**Usage Example**:
```typescript
generateTitleFromUrl("https://example.com/about-us/team-members.html", "https://example.com")
// Returns: "About Us > Team Members"
```

### CSS Class Utility (`/lib/utils.ts`)

#### cn (className merger)
**Purpose**: Merges and deduplicates Tailwind CSS classes with conflict resolution

**Input**:
```typescript
cn(...inputs: ClassValue[]): string
```

**Output**: Merged and optimized className string

**Features**:
- Filters out undefined, null, and empty strings
- Resolves Tailwind class conflicts (later classes override earlier ones)
- Combines multiple conditional classes efficiently

**Usage Example**:
```typescript
cn(
  'px-4 py-2',
  isActive && 'bg-blue-500',
  isDisabled && 'opacity-50 cursor-not-allowed',
  className // User-provided classes
)
// Returns optimized class string with conflicts resolved
```

### Logging Utilities

#### PermanentLogger (`/lib/utils/permanent-logger.ts`)
**Purpose**: Enhanced logging with color-coded output and persistent file storage

**Key Methods**:
```typescript
permanentLogger.log(category: string, message: string, data?: any)
permanentLogger.error(category: string, message: string, error: Error | any)
permanentLogger.warn(category: string, message: string, data?: any)
permanentLogger.debug(category: string, message: string, data?: any)
permanentLogger.critical(category: string, message: string, data?: any)
```

**Features**:
- Color-coded console output for different log types
- Persistent file logging to `logs/claude-code-dev-log.md`
- Special formatting for LLM calls, rate limits, and phase transitions
- Automatic log rotation at 10MB file size
- Server-side only file writing

#### PlainTextFormatter (`/lib/utils/plain-text-formatter.ts`)
**Purpose**: Converts complex document content to formatted plain text

**Key Method**:
```typescript
PlainTextFormatter.format(content: any, documentType: string): string
```

**Features**:
- Handles JSON strings and objects
- Recursive object formatting with proper indentation
- Section-based formatting for documents
- Error recovery with fallback formatting
- Cleans and normalizes text output

**Usage Example**:
```typescript
const plainText = PlainTextFormatter.format(documentData, 'project-plan')
// Returns formatted plain text with proper sections and indentation
```

#### Client-Safe Logger (`/lib/utils/client-safe-logger.ts`)
**Purpose**: Browser-safe logging that avoids server-side module errors

**Features**:
- Safe for use in both client and server environments
- Falls back to console methods
- No file system dependencies

#### Server Logger (`/lib/utils/server-logger.ts`)
**Purpose**: Server-side specific logging with file system access

**Features**:
- File-based persistent logging
- Log rotation and archiving
- Server-only execution guards

#### LLM Logger (`/lib/utils/llm-logger.ts`)
**Purpose**: Specialized logging for LLM API interactions

**Features**:
- Tracks token usage and costs
- Logs model parameters and responses
- Performance metrics for LLM calls
- Rate limit tracking

## Refactored Scraper Interfaces (Phase 1-11)

### UnifiedScraperExecutor Interfaces

#### ExecutionRequest
```typescript
interface ExecutionRequest {
  sessionId: string           // Unique session identifier
  domain: string              // Company domain (e.g., 'example.com')
  scraperId: string          // 'static' or 'dynamic'
  urls?: string[]            // Optional - will load from database if not provided
  options?: any              // Additional scraper options
  stream?: boolean           // Enable SSE streaming
  progressCallback?: (event: SSEEvent) => Promise<void>
}
```

#### ExecutionResult
```typescript
interface ExecutionResult {
  success: boolean
  sessionId: string
  scraperId: string
  newData: {
    pages: number
    dataPoints: number
    discoveredLinks: number
    duration: number
  }
  totalData: {
    pagesScraped: number
    dataPoints: number
    discoveredLinks: number
  }
  suggestions: string[]
  stats: any
  validation: any
  extractedData: any
}
```

#### URLMetadata (New in Phase 5)
```typescript
interface URLMetadata {
  url: string
  priority?: 'high' | 'medium' | 'low'  // Priority for scraping order
  lastmod?: string                       // Last modified date from sitemap
  pageType?: string                      // Type of page (homepage, about, etc)
  lastScraped?: number                   // Timestamp of last scrape
  metadata?: Record<string, any>         // Additional metadata
}
```

### Scraper Options (Enhanced)

```typescript
interface ScraperOptions {
  maxPages?: number
  timeout?: number
  waitForSelector?: string
  sessionId?: string
  progressCallback?: ProgressCallback
  urlMetadata?: Map<string, URLMetadata>  // NEW: Metadata for smart processing
  enableSmartSkipping?: boolean           // NEW: Enable 24-hour skip threshold
  priorityOrder?: boolean                 // NEW: Sort by priority
}
```

### Error Handling (No Fallbacks!)

```typescript
// All errors MUST be thrown with context
class ScrapingError extends Error {
  context: {
    sessionId: string
    timestamp: number
    source: string
    phase: string
    breadcrumbs?: any[]
  }
}

// NEVER do this:
try {
  // ... scraping code
} catch (error) {
  return { pages: [] }  // ❌ NO FALLBACKS!
}

// ALWAYS do this:
try {
  // ... scraping code
} catch (error) {
  permanentLogger.error('SCRAPING_FAILED', error.message, { context })
  throw error  // ✅ Throw with context
}
```

## Testing Requirements

For each interface:
1. Test with valid inputs
2. Test with invalid inputs
3. Test edge cases (empty, null, undefined)
4. Test error scenarios
5. Verify logging output
6. Check performance metrics