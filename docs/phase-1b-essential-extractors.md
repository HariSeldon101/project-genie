# Phase 1B: Essential Extractors Activation

**Status**: 🚧 IN PROGRESS  
**Priority**: HIGH  
**Duration**: 2-3 days  
**Dependencies**: Phase 1A (Scraping Operational) ✅  

## 🎯 Objective

Activate and connect the existing extractor components that are already built but not integrated into the pipeline. These extractors will enhance data quality without requiring external services or complex implementations.

## 📦 Existing Extractors to Activate

### 1. RSS Feed Extractor 🔧
**Location**: `/lib/company-intelligence/extractors/rss-extractor.ts`  
**Status**: Built but not connected  
**Integration Point**: Sitemap Discovery phase  

**Implementation Tasks**:
- [ ] Import RSS extractor in sitemap discovery
- [ ] Add RSS detection to site analysis
- [ ] Parse RSS feeds for content URLs
- [ ] Merge RSS URLs with sitemap URLs
- [ ] Display RSS source in UI

**Expected Impact**:
- Find 20-30% more content pages
- Discover blog posts and news articles
- Get publication dates and authors

### 2. Enhanced Robots.txt Parser 🔧
**Location**: `/lib/company-intelligence/scrapers/utils/sitemap-parser.ts`  
**Status**: Basic implementation exists  
**Enhancement Needed**: Multiple sitemap support  

**Implementation Tasks**:
- [ ] Parse multiple sitemap declarations
- [ ] Support sitemap index files
- [ ] Handle .gz compressed sitemaps
- [ ] Extract crawl-delay directives
- [ ] Parse disallow rules for validation

**Expected Impact**:
- Find additional sitemaps (news, video, image)
- Respect rate limiting automatically
- Avoid blocked paths

### 3. Contact Information Extractor 📧
**Location**: `/lib/company-intelligence/extractors/contact-extractor.ts`  
**Status**: Built but not connected  
**Integration Point**: Extraction phase  

**Implementation Tasks**:
- [ ] Connect to extraction pipeline
- [ ] Enhance email pattern matching
- [ ] Add phone number validation
- [ ] Extract physical addresses
- [ ] Find social media handles
- [ ] Detect contact forms

**Expected Impact**:
- 95% accuracy in contact detection
- Multiple contact methods captured
- Structured contact data output

### 4. Legal Documents Detector 📄
**Location**: `/lib/company-intelligence/extractors/legal-extractor.ts`  
**Status**: Built but not connected  
**Integration Point**: Sitemap Discovery & Extraction  

**Implementation Tasks**:
- [ ] Detect privacy policy links
- [ ] Find terms of service pages
- [ ] Locate cookie policies
- [ ] Extract GDPR compliance info
- [ ] Parse legal entity names
- [ ] Find registration numbers

**Expected Impact**:
- Compliance information captured
- Legal structure understood
- Business registration details

### 5. Pattern Extractor Enhancement 🔍
**Location**: `/lib/company-intelligence/extractors/pattern-extractor.ts`  
**Status**: Basic implementation  
**Enhancement Needed**: More patterns  

**Implementation Tasks**:
- [ ] Add VAT number detection
- [ ] Extract pricing patterns
- [ ] Find product SKUs
- [ ] Detect opening hours
- [ ] Parse date patterns
- [ ] Extract version numbers

**Expected Impact**:
- Structured data extraction
- Business metrics captured
- Temporal information parsed

## 🔌 Integration Architecture

### Current Architecture: StrategyManager Pattern
The scraping pipeline now uses a **StrategyManager** that orchestrates different scraping strategies based on site detection. This replaces the old PlaywrightScraper/CheerioScraper approach.

### Scraping Strategies
1. **StaticStrategy** - Uses Cheerio + Axios for fast HTML extraction
2. **DynamicStrategy** - Uses Playwright for JavaScript-heavy sites  
3. **SPAStrategy** - Uses Playwright with SPA optimizations

### Pipeline Integration Points

```typescript
// Sitemap Discovery Phase
class SitemapDiscovery {
  async discover(domain: string) {
    const sources = await Promise.all([
      this.fetchSitemap(domain),        // Existing
      this.parseRobotsTxt(domain),      // Enhanced
      this.fetchRSSFeeds(domain),       // New
      this.findLegalPages(domain)       // New
    ])
    return this.mergeSources(sources)
  }
}

// Scraping Phase (uses StrategyManager)
const strategyManager = new StrategyManager()
const result = await strategyManager.scrapeWithBestStrategy(url, options)

// Extraction Phase
class ExtractionPhase {
  async extract(scrapedData: any) {
    const extractors = [
      new ContactExtractor(),          // Activate
      new PatternExtractor(),          // Enhance
      new LegalExtractor(),            // Activate
      new StructuredDataExtractor()    // Existing
    ]
    
    return await this.runExtractors(extractors, scrapedData)
  }
}
```

## 📊 Expected Improvements

### Data Quality Metrics
| Metric | Current | Expected | Improvement |
|--------|---------|----------|-------------|
| Pages Discovered | ~20-30 | ~40-50 | +67% |
| Contact Info Found | 60% | 95% | +58% |
| Legal Docs Found | 0% | 90% | New |
| Structured Data | 40% | 80% | +100% |
| RSS Feeds Found | 0% | 70% | New |

### Performance Impact
- No additional API calls required
- Minimal processing overhead (<100ms per extractor)
- Parallel execution for all extractors
- No external dependencies

## 🧪 Testing Strategy

### Unit Tests
```bash
# Test individual extractors
npm test -- extractors/rss-extractor.test.ts
npm test -- extractors/contact-extractor.test.ts
npm test -- extractors/legal-extractor.test.ts
```

### Integration Tests
```bash
# Test full pipeline with extractors
npm run test:ui
```

### Test Domains
- `bigfluffy.ai` - Next.js site with RSS
- `example.com` - Simple HTML site
- `shopify.com` - Complex e-commerce
- `wordpress.org` - CMS with multiple feeds

## 📝 Implementation Checklist

### Day 1: RSS & Robots.txt
- [ ] Enhance robots.txt parser for multiple sitemaps
- [ ] Implement RSS feed discovery
- [ ] Add RSS parsing to sitemap discovery
- [ ] Test with multiple domains
- [ ] Update UI to show RSS sources

### Day 2: Contact & Legal
- [ ] Connect contact extractor to pipeline
- [ ] Implement legal document detector
- [ ] Add validation for extracted data
- [ ] Create UI components for display
- [ ] Test extraction accuracy

### Day 3: Pattern Enhancement & Testing
- [ ] Enhance pattern extractor with new patterns
- [ ] Add data validation and normalization
- [ ] Run comprehensive tests
- [ ] Document extractor outputs
- [ ] Update API interfaces

## 🚀 Activation Guide

### Step 1: Import Extractors
```typescript
// In phase-orchestrator.ts
import { RSSExtractor } from '@/lib/company-intelligence/extractors/rss-extractor'
import { ContactExtractor } from '@/lib/company-intelligence/extractors/contact-extractor'
import { LegalExtractor } from '@/lib/company-intelligence/extractors/legal-extractor'
```

### Step 2: Register in Pipeline
```typescript
// In extraction-engine.ts
private extractors = [
  new RSSExtractor(),
  new ContactExtractor(),
  new LegalExtractor(),
  new PatternExtractor(),
  new StructuredDataExtractor()
]
```

### Step 3: Update UI Components
```typescript
// Display extracted data in StageReviewPanel
<ExtractedDataView
  rssFeeds={data.rssFeeds}
  contactInfo={data.contactInfo}
  legalDocs={data.legalDocs}
  patterns={data.patterns}
/>
```

## 📈 Success Metrics

### Quantitative
- [ ] All 5 extractors activated and working
- [ ] 40+ pages discovered on test domains
- [ ] 95% contact information accuracy
- [ ] 90% legal document detection rate
- [ ] <500ms total extraction time

### Qualitative
- [ ] Clean, structured data output
- [ ] No false positives in extraction
- [ ] Clear UI presentation of extracted data
- [ ] Comprehensive logging for debugging
- [ ] No performance degradation

## 🔄 Migration Path

### From Current State
1. No breaking changes to existing pipeline
2. Extractors added incrementally
3. Backward compatible with existing data
4. Feature flags for gradual rollout

### Data Schema Updates
```typescript
interface ExtractedData {
  // Existing
  structuredData: any
  socialLinks: any[]
  
  // New in Phase 1B
  rssFeeds: RSSFeed[]
  contactInfo: ContactInfo
  legalDocuments: LegalDoc[]
  extractedPatterns: Pattern[]
}
```

## 📚 Related Documentation

- [Phase 1A: Scraping Operational](./phase-1a-scraping-operational.md) ✅
- [Phase 1C: Advanced Scraping](./phase-1c-advanced-scraping.md)
- [Phase 2A: External Intelligence](./phase-2a-external-intelligence.md)
- [API Interface Documentation](./api-interface-documentation.md)

## ⚠️ Risk Mitigation

### Potential Issues
1. **RSS feeds may be malformed**
   - Solution: Robust error handling, fallback to manual parsing
   
2. **Contact patterns may vary by region**
   - Solution: Multiple regex patterns, international format support
   
3. **Legal pages may use various names**
   - Solution: Comprehensive keyword list, fuzzy matching

4. **Performance impact of multiple extractors**
   - Solution: Parallel execution, caching, early termination

## 🎯 Next Steps

After Phase 1B completion:
1. Move to Phase 1C for advanced scraping capabilities
2. Begin Phase 2A for external intelligence integration
3. Start collecting metrics on extraction accuracy
4. Gather user feedback on extracted data quality