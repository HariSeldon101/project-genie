# Firecrawl Guide: Features, Costs & Best Practices
**Generated**: September 21, 2024
**Author**: Stuart Holmes
**Purpose**: Complete guide to Firecrawl API features and credit optimization

## 📊 Credit System Overview

### Free Tier
- **500 credits/month** (no credit card required)
- Resets monthly
- Perfect for testing and small projects
- Access to ALL features (no feature restrictions)

### Credit Consumption Model
```
Standard Scrape:     1 credit per page
LLM Extraction:     50 credits per page
Search API:          1 credit per result
Map (Discovery):     1 credit per URL found
```

### Important: Credits vs Features
**ALL features are included in the base credit cost:**
- ✅ Screenshots (no extra credits)
- ✅ PDFs (no extra credits)
- ✅ Proxies (no extra credits)
- ✅ Actions/interactions (no extra credits)
- ✅ Markdown conversion (no extra credits)

The ONLY thing that increases credit usage is **LLM extraction** (50x multiplier).

## 🔑 Key Difference: Standard vs AI Scraping

### Standard Scraping (1 credit)
**What it does:**
- Fetches webpage content
- Converts to clean markdown
- Extracts all links
- Takes screenshots
- Generates PDFs
- Handles JavaScript rendering
- Bypasses anti-bot measures

**You get:**
- Raw content in multiple formats
- Basic metadata
- All visual assets
- Clean, structured text

**Best for:**
- Content archiving
- Link discovery
- Visual documentation
- When you'll process data yourself

### AI/LLM Extraction (50 credits)
**What it does:**
Everything from standard scraping PLUS:
- **Structured data extraction using schemas**
- **AI understands context and meaning**
- **Transforms unstructured HTML into typed data**
- **Handles variations in page structure**

**You get:**
- Structured JSON matching your schema
- Validated, typed data
- Intelligent field extraction
- Semantic understanding

**Example Schema Extraction:**
```javascript
// Input: Messy HTML page
// Output: Clean structured data
{
  company: {
    name: "Acme Corp",
    founded: 2010,
    employees: "50-100",
    industry: "Software"
  },
  contact: {
    email: "info@acme.com",
    phone: "+1-555-0100",
    address: "123 Main St, City"
  },
  products: [
    { name: "Product A", price: 99.99 },
    { name: "Product B", price: 149.99 }
  ]
}
```

**Best for:**
- Extracting specific data fields
- Building databases
- Competitive intelligence
- When you need structured output

## 💰 Pricing Tiers (After Free Credits)

### Hobby Plan - $16/month
- 3,000 credits
- = 3,000 standard pages OR
- = 60 AI extractions
- $0.0053 per standard page
- $0.27 per AI extraction

### Standard Plan - $83/month
- 100,000 credits
- = 100,000 standard pages OR
- = 2,000 AI extractions
- $0.00083 per standard page
- $0.04 per AI extraction

### Growth Plan - $333/month
- 500,000 credits
- = 500,000 standard pages OR
- = 10,000 AI extractions
- $0.00067 per standard page
- $0.03 per AI extraction

## 🚀 Key Features

### 1. Map API (URL Discovery)
```javascript
// Discovers all URLs on a domain
const urls = await firecrawl.map('example.com')
// Returns: ['/', '/about', '/products', ...]
```
- Replaces custom sitemap parsing
- Handles robots.txt automatically
- Discovers hidden pages
- **Cost**: 1 credit per URL found

### 2. Actions (Dynamic Interactions)
```javascript
actions: [
  { type: 'wait', milliseconds: 2000 },
  { type: 'click', selector: '#load-more' },
  { type: 'scroll', direction: 'down' },
  { type: 'screenshot' }
]
```
- No extra credit cost
- Handles dynamic content
- Simulates user interactions

### 3. Content Formats
```javascript
formats: ['markdown', 'html', 'screenshot', 'pdf', 'links']
```
- Get content in multiple formats simultaneously
- All included in base credit cost

### 4. Anti-Detection Features
- **Residential proxies** (30+ countries)
- **Stealth browser** (bypasses Cloudflare)
- **Smart rate limiting**
- **Automatic retries**
- All included in base credits

### 5. Schema-Based Extraction (AI)
```javascript
extract: {
  schema: {
    company: { type: 'object', properties: {...} },
    products: { type: 'array', items: {...} }
  },
  systemPrompt: "Extract company information"
}
```
- **50 credits per page**
- Returns structured, typed data
- Handles page variations intelligently

## 📈 Credit Optimization Strategies

### 1. Use Standard Scraping When Possible
- If you can process the data yourself, use standard scraping
- Build your own parsers for consistent sites
- Use CSS selectors for simple extractions

### 2. Cache Aggressively
```javascript
// Check cache before scraping
const cached = await checkCache(url)
if (cached && !isStale(cached)) {
  return cached
}
```

### 3. Batch Similar Pages
- Use AI extraction for one sample page
- Apply the pattern to similar pages with standard scraping

### 4. Progressive Enhancement
```javascript
// Start with standard scrape
const basic = await firecrawl.scrape(url) // 1 credit

// Only use AI if needed
if (needsStructuredData(basic)) {
  const structured = await firecrawl.scrapeWithExtraction(url) // 50 credits
}
```

### 5. Use Map API Wisely
- Limit discovery depth
- Filter URLs before scraping
- Prioritize important pages

## 🎯 When to Use Each Scraper

### Use Firecrawl When:
- ✅ Site has anti-bot protection
- ✅ Need structured data extraction
- ✅ Scraping at scale (better infrastructure)
- ✅ Need multiple output formats
- ✅ Want zero maintenance

### Use Playwright When:
- ✅ Need complex interactions
- ✅ Custom authentication flows
- ✅ Testing/debugging scrapers
- ✅ One-off scraping tasks
- ✅ Have server infrastructure

### Use Cheerio When:
- ✅ Simple static HTML
- ✅ No JavaScript required
- ✅ High-volume, simple extractions
- ✅ Cost is critical
- ✅ Have parsing expertise

## 🔧 Implementation in Project Genie

### Current Configuration
```typescript
// Standard scrape (1 credit)
FIRECRAWL_PRESETS.quick = {
  features: { extract: false },
  extraction: { llmExtraction: false }
}

// AI extraction (50 credits)
FIRECRAWL_PRESETS.comprehensive = {
  features: { extract: true },
  extraction: { llmExtraction: true }
}
```

### Credit Tracking
```typescript
// API response includes credits
{
  success: true,
  creditsUsed: 1,      // Actual credits consumed
  data: {...}
}

// Track in UI
<CreditDisplay
  used={creditsUsed}
  remaining={500 - totalUsed}
  tier="free"
/>
```

## 📊 ROI Calculation

### Standard Scraping
- **Free tier**: 500 pages/month = $0
- **Hobby tier**: 3,000 pages for $16 = $0.0053/page
- **Alternative (Playwright on AWS)**: ~$50/month for server

### AI Extraction
- **Free tier**: 10 pages/month = $0
- **Hobby tier**: 60 pages for $16 = $0.27/page
- **Alternative (OpenAI GPT-4)**: ~$0.30/page + development time

## 🚨 Common Pitfalls

1. **Using AI extraction unnecessarily**
   - 50x more expensive than standard
   - Often simple parsing suffices

2. **Not caching results**
   - Rescraping costs credits
   - Cache for at least 24 hours

3. **Ignoring Map API**
   - Manual URL discovery wastes credits
   - Map API is more efficient

4. **Over-engineering schemas**
   - Complex schemas don't extract better
   - Keep schemas focused

5. **Not monitoring usage**
   - Track credits in real-time
   - Set alerts at 80% usage

## 📚 Best Practices Summary

1. **Start with standard scraping** (1 credit)
2. **Use AI extraction selectively** (50 credits)
3. **Cache everything** (save credits)
4. **Monitor usage constantly** (avoid surprises)
5. **Choose the right tool** (Firecrawl vs Playwright vs Cheerio)

## 🔗 Resources

- [Firecrawl Documentation](https://docs.firecrawl.dev)
- [Pricing Calculator](https://firecrawl.dev/pricing)
- [API Reference](https://docs.firecrawl.dev/api-reference)
- [Schema Examples](https://docs.firecrawl.dev/features/extract)

---

**Remember**: The key to cost-effective scraping is using the right tool for the job. Firecrawl excels at structured extraction and anti-bot bypassing, but simple tasks should use simpler (free) tools.