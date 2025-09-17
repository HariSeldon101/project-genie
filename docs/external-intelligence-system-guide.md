# External Intelligence System Guide

## Overview

The External Intelligence System is a comprehensive data enrichment framework that augments website scraping with external data sources, providing a 360-degree view of any company. Built on September 7, 2025, this system represents version 8.0 of the Company Intelligence feature.

## Purpose & Business Value

### Why External Intelligence?

Website scraping alone provides limited insights. Companies don't always publish all relevant information on their websites:
- Financial performance metrics
- Employee growth trends
- Social media engagement
- Customer satisfaction ratings
- Recent news and regulatory filings

The External Intelligence System fills these gaps by gathering data from authoritative external sources, creating a comprehensive intelligence profile that enables:

1. **Better Investment Decisions**: Real-time financial data and market positioning
2. **Competitive Analysis**: Social proof metrics and market share insights
3. **Partnership Evaluation**: Company stability and growth indicators
4. **Risk Assessment**: Regulatory compliance and news sentiment
5. **Market Research**: Industry trends and customer perception

## System Architecture

### Component Overview

```
┌──────────────────────────────────────────────────────────┐
│                 External Intelligence System              │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │        External Intelligence Orchestrator           │ │
│  │                                                     │ │
│  │  • Coordinates all enrichers                       │ │
│  │  • Manages parallel execution                      │ │
│  │  • Handles caching (24-hour TTL)                   │ │
│  │  • Calculates completeness scores                  │ │
│  └──────────────────┬──────────────────────────────────┘ │
│                     │                                     │
│    ┌────────────────┼────────────────────────┐           │
│    ▼                ▼                        ▼           │
│ ┌──────┐      ┌──────────┐           ┌──────────┐       │
│ │Financial│    │LinkedIn  │           │Social    │       │
│ │Enricher │    │Enricher  │           │Enricher  │       │
│ └──────┘      └──────────┘           └──────────┘       │
│                                                           │
│    ▼                ▼                        ▼           │
│ ┌──────────┐  ┌──────────┐           ┌──────────┐       │
│ │Google    │  │News &    │           │Database  │       │
│ │Business  │  │Regulatory│           │Storage   │       │
│ └──────────┘  └──────────┘           └──────────┘       │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initiation**: Enrichment Engine requests external intelligence
2. **Orchestration**: Orchestrator checks cache, determines what's needed
3. **Parallel Execution**: Enrichers run simultaneously in groups
4. **Data Collection**: Each enricher gathers specific intelligence
5. **Persistence**: All data stored in Supabase with RLS policies
6. **Aggregation**: Results combined into ExternalIntelligence object
7. **Scoring**: Completeness calculated (0-100%)
8. **Return**: Enhanced data returned to Enrichment Engine

## Enricher Components

### 1. Financial & Investor Relations Enricher

**Purpose**: Provides financial market intelligence for public companies

**Data Sources**:
- Web search for stock tickers
- Market data APIs
- Company investor relations pages
- SEC EDGAR database references

**Key Metrics**:
- Stock price and volume
- Market capitalization
- P/E ratio and EPS
- 52-week high/low
- Dividend yield
- Beta coefficient

**Implementation**:
```typescript
class FinancialEnricher {
  async enrich(companyName: string, domain: string, sessionId: string): Promise<EnrichmentResult> {
    // 1. Discover ticker symbol
    const ticker = await this.discoverTicker(companyName)
    
    // 2. Fetch market data
    const marketData = await this.fetchMarketData(ticker)
    
    // 3. Find IR information
    const irData = await this.fetchInvestorRelations(companyName, domain, ticker)
    
    return { success: true, data: { ...marketData, ...irData } }
  }
}
```

### 2. LinkedIn Company Enricher

**Purpose**: Extracts professional network and employee insights

**Data Collection**:
- Company page URL discovery
- Employee count and growth
- Industry classification
- Company specialties
- Headquarters location
- Verification status

**Key Features**:
- Homepage link checking first (fast)
- Web search fallback (comprehensive)
- Playwright scraping for dynamic content
- Confidence scoring based on data completeness

**Use Cases**:
- Determine if company is public (helps other enrichers)
- Track employee growth trends
- Verify company legitimacy
- Understand company focus areas

### 3. Social Media Enricher

**Purpose**: Aggregates brand presence across social platforms

**Supported Platforms**:
- Twitter/X
- Facebook
- Instagram
- YouTube
- TikTok

**Extraction Strategy**:
```typescript
private readonly platformStrategies: PlatformSearchStrategy[] = [
  {
    platform: 'twitter',
    searchPatterns: ['site:twitter.com {company}', 'site:x.com {company}'],
    urlPattern: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+/i,
    profilePattern: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i
  },
  // ... other platforms
]
```

**Metrics Collected**:
- Follower counts
- Engagement rates
- Verification status
- Post frequency
- Profile completeness

### 4. Google Business Enricher

**Purpose**: Local business presence and customer satisfaction

**Data Points**:
- Business listing verification
- Customer ratings and reviews
- Operating hours
- Location information
- Popular times
- Business attributes

**Discovery Methods**:
1. Search for Google Maps listing
2. Extract from company website
3. Parse structured data (Schema.org)

### 5. News & Regulatory Enricher

**Purpose**: Current events and compliance tracking

**News Sources** (Prioritized):
1. Regulatory (SEC, LSE RNS, ASX)
2. Business (Reuters, Bloomberg, FT, WSJ)
3. Tech (TechCrunch, The Verge, Wired)
4. General (Press releases, industry news)

**Analysis Features**:
- Sentiment analysis (positive/negative/neutral)
- Relevance scoring (0-1)
- Entity extraction
- Category classification
- Date filtering (365-day window)

## Database Schema

### Table Structure

All tables follow consistent patterns:
- Session-based isolation
- Confidence scoring
- Timestamp tracking
- JSONB for flexible data

### Key Tables

```sql
-- Financial market data
company_financial_data
  ├── session_id (FK)
  ├── ticker
  ├── market_cap
  ├── share_price
  └── [15+ financial metrics]

-- Professional network
company_linkedin_data
  ├── session_id (FK)
  ├── company_url
  ├── employee_count
  ├── followers
  └── [10+ company attributes]

-- Social media presence
company_social_profiles
  ├── session_id (FK)
  ├── platform
  ├── followers
  ├── engagement_metrics (JSONB)
  └── verified

-- Local business data
company_google_business
  ├── session_id (FK)
  ├── rating
  ├── review_count
  ├── hours (JSONB)
  └── location (JSONB)

-- News and filings
company_news
  ├── session_id (FK)
  ├── title
  ├── sentiment
  ├── relevance_score
  └── published_date

-- Aggregated summary
external_intelligence_summary
  ├── session_id (FK)
  ├── completeness (0-100)
  ├── has_financial_data
  ├── social_profiles_count
  └── enrichment_duration
```

## Integration with Company Intelligence

### Enrichment Engine Integration

The External Intelligence System is called during the enrichment phase:

```typescript
// In enrichment-engine.ts
if (request.options?.includeExternalIntelligence !== false) {
  const sessionId = enriched.sessionId
  const companyName = enriched.basics?.companyName
  
  // Check cache
  const existing = await orchestrator.loadExistingIntelligence(sessionId)
  
  if (!existing || orchestrator.needsRefresh(existing, 24)) {
    // Fetch fresh intelligence
    enriched.externalIntelligence = await orchestrator.enrichWithExternalIntelligence(
      sessionId, companyName, domain, enriched
    )
  } else {
    // Use cached data
    enriched.externalIntelligence = existing
  }
}
```

### Caching Strategy

**24-Hour TTL Logic**:
- Fresh data: Use immediately
- 1-24 hours old: Use cached, mark for background refresh
- >24 hours old: Fetch fresh data synchronously

**Cache Key Structure**:
```
external_intelligence:{sessionId}
```

## Completeness Scoring

The system calculates a completeness score to indicate data quality:

```typescript
function calculateCompleteness(intelligence: ExternalIntelligence): number {
  let score = 0
  let maxScore = 0
  
  // Financial (20 points if public)
  if (intelligence.financial?.isPublic) {
    maxScore += 20
    if (intelligence.financial.ticker) score += 5
    if (intelligence.financial.marketCap) score += 5
    // ...
  }
  
  // LinkedIn (25 points)
  maxScore += 25
  if (intelligence.linkedIn?.companyUrl) score += 5
  if (intelligence.linkedIn?.employeeCount) score += 5
  // ...
  
  // Social profiles (20 points)
  maxScore += 20
  score += Math.min(20, intelligence.socialProfiles.length * 5)
  
  // Google Business (15 points)
  // News (20 points)
  
  return Math.round((score / maxScore) * 100)
}
```

## Performance Optimizations

### Parallel Execution Groups

Enrichers are grouped for optimal performance:

**Group 1** (Dependent):
- LinkedIn (determines if public)
- Financial (needs public status)

**Group 2** (Independent):
- Social Media
- Google Business
- News

### Rate Limiting

Each enricher implements rate limiting:
- Web search: 2 req/sec
- Scraping: 1 req/sec per domain
- API calls: Respect provider limits

### Error Handling

**Graceful Degradation**:
- Individual enricher failures don't block others
- Partial data returned on timeout
- Confidence scores reflect data quality

## Usage Examples

### Basic Usage

```typescript
// Get external intelligence for a company
const orchestrator = new ExternalIntelligenceOrchestrator()
const intelligence = await orchestrator.enrichWithExternalIntelligence(
  sessionId,
  'Apple Inc.',
  'apple.com',
  existingData
)

console.log(`Completeness: ${intelligence.completeness}%`)
console.log(`Has financial data: ${!!intelligence.financial}`)
console.log(`Social profiles found: ${intelligence.socialProfiles.length}`)
```

### Checking Cache

```typescript
// Load existing intelligence
const existing = await orchestrator.loadExistingIntelligence(sessionId)

if (existing && !orchestrator.needsRefresh(existing, 24)) {
  // Use cached data
  return existing
}
```

### Public Company Detection

```typescript
// Use LinkedIn data to determine if company is public
const isPublic = isLikelyPublicCompany(
  companyName,
  intelligence.linkedIn
)

if (isPublic) {
  // Trigger financial enrichment
  const financial = await financialEnricher.enrich(companyName, domain, sessionId)
}
```

## Best Practices

### 1. DRY Principles

All enrichers follow DRY principles:
- Shared base interfaces (`ExternalDataSource`)
- Reusable extraction methods
- Common error handling patterns

### 2. Logging

Comprehensive logging throughout:
```typescript
permanentLogger.log('ENRICHER_NAME', 'Operation description', {
  companyName,
  metric: value,
  duration: Date.now() - startTime
})
```

### 3. Data Validation

Each enricher validates its data:
```typescript
validateData(data: any): boolean {
  // Check required fields
  // Verify data types
  // Validate URLs
  // Check confidence thresholds
}
```

### 4. Testing

Test each enricher independently:
```typescript
describe('FinancialEnricher', () => {
  it('should discover ticker symbols', async () => {
    const ticker = await enricher.discoverTicker('Apple Inc.')
    expect(ticker).toBe('AAPL')
  })
  
  it('should handle non-public companies', async () => {
    const result = await enricher.enrich('Private Co', 'private.com', sessionId)
    expect(result.success).toBe(false)
  })
})
```

## Troubleshooting

### Common Issues

**1. Empty Financial Data**
- Cause: Company is private
- Solution: Check LinkedIn data first to determine public status

**2. Missing Social Profiles**
- Cause: Profiles not linked on homepage
- Solution: Web search fallback will find them

**3. Stale Cache**
- Cause: Data older than 24 hours
- Solution: Force refresh with `needsRefresh(intelligence, 0)`

**4. Low Completeness Score**
- Cause: Limited public information
- Solution: Normal for private/small companies

### Debug Mode

Enable detailed logging:
```typescript
process.env.DEBUG_EXTERNAL_INTELLIGENCE = 'true'
```

## Future Enhancements

### Planned Features

1. **Additional Sources**:
   - Glassdoor (employee reviews)
   - Crunchbase (funding data)
   - Product Hunt (product launches)
   - G2/Capterra (software reviews)

2. **Advanced Analytics**:
   - Competitor comparison matrices
   - Growth trajectory predictions
   - Market share estimation
   - Risk scoring algorithms

3. **Real-time Updates**:
   - WebSocket subscriptions
   - Push notifications for changes
   - Automated alerts for events

4. **API Access**:
   - RESTful endpoints
   - GraphQL schema
   - Webhook notifications
   - Rate-limited public access

## Conclusion

The External Intelligence System transforms Company Intelligence from a website scraper into a comprehensive business intelligence platform. By combining multiple data sources with intelligent orchestration and caching, it provides unparalleled insights into any company's operations, market position, and trajectory.

The system's modular design, following DRY principles and comprehensive logging, ensures maintainability and extensibility. With 24-hour caching and parallel execution, it balances data freshness with performance, making it suitable for both real-time analysis and batch processing scenarios.

---

*Version: 8.0*  
*Created: September 7, 2025*  
*Author: Development Team*  
*Status: Production Ready*