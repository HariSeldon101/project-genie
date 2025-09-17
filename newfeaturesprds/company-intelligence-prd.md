# Product Requirements Document: Company Intelligence Web Scraping Module
## For Existing Next.js 15 Application with LLM Infrastructure

## 1. Executive Summary

### Purpose
Build an automated company research module that takes a user-supplied domain name and generates a comprehensive "Company Information Pack" by scraping and analyzing multiple data sources. This pack will serve as persistent context for the project manager and all subsequent LLM interactions, improving the quality and relevance of generated artifacts.

### Key Objectives
- Extract comprehensive company information from their website
- Research market position, competitors, and industry context
- Generate structured company intelligence document
- Integrate with existing LLM infrastructure for enhanced context-aware responses
- Store company packs for reuse across project lifecycle

## 2. Business Context

### Use Case Flow
1. User provides company domain (e.g., "acme-corp.com")
2. System scrapes company website for core information
3. System enriches data with external sources (industry databases, news, social media)
4. LLM processes and structures the raw data into a Company Information Pack
5. Pack is stored and automatically included as context in future LLM prompts
6. All generated artifacts (proposals, documentation, strategies) reflect accurate company context

### Expected Outcomes
- 80% reduction in time spent researching client companies
- Improved accuracy in generated documents with company-specific context
- Consistent company information across all project artifacts
- Better competitive positioning insights

## 3. Architecture Overview

```
User Input (domain) 
    ↓
Company Research Pipeline
    ├── Primary Scraping (company website)
    ├── Secondary Scraping (external sources)
    ├── Data Enrichment APIs
    └── LLM Processing
    ↓
Company Information Pack (stored)
    ↓
Context Enhancement Layer
    ↓
Enhanced LLM Responses
```

### Directory Structure
```
├── lib/
│   ├── company-intelligence/
│   │   ├── core/
│   │   │   ├── orchestrator.ts         # Main research orchestrator
│   │   │   ├── company-scraper.ts      # Company website scraper
│   │   │   └── enrichment-engine.ts    # External data enrichment
│   │   ├── scrapers/
│   │   │   ├── website-analyzer.ts     # Company website analysis
│   │   │   ├── linkedin-scraper.ts     # Company LinkedIn data
│   │   │   ├── news-scraper.ts         # Recent news/PR
│   │   │   ├── glassdoor-scraper.ts    # Employee reviews/count
│   │   │   └── industry-scraper.ts     # Industry reports
│   │   ├── extractors/
│   │   │   ├── company-info.ts         # Basic company details
│   │   │   ├── products-services.ts    # Product/service catalog
│   │   │   ├── team-extractor.ts       # Leadership/team info
│   │   │   ├── contact-extractor.ts    # Contact information
│   │   │   └── tech-stack.ts           # Technology detection
│   │   ├── processors/
│   │   │   ├── pack-generator.ts       # Generate final document
│   │   │   ├── competitor-analyzer.ts  # Competitor identification
│   │   │   └── market-position.ts      # Market analysis
│   │   └── storage/
│   │       ├── pack-store.ts           # Store/retrieve packs
│   │       └── cache-manager.ts        # Intelligent caching
├── app/
│   └── api/
│       ├── company-research/
│       │   └── route.ts                # Research endpoint
│       └── company-pack/
│           └── [id]/route.ts           # Retrieve pack
```

## 4. Core Libraries Selection

### Recommended Stack
```json
{
  "dependencies": {
    // Primary scraping library
    "cheerio": "^1.0.0-rc.12",
    
    // For JavaScript-rendered content
    "playwright": "^1.40.x",
    
    // HTTP client
    "axios": "^1.6.x",
    
    // Queue management
    "p-queue": "^8.0.x",
    
    // Utilities
    "robotstxt-parser": "^3.0.x",
    "user-agents": "^1.1.x",
    "html-to-text": "^9.0.x",
    
    // Caching
    "@upstash/redis": "^1.28.x",
    
    // Data validation
    "zod": "^3.22.x"
  }
}
```

## 5. Core Implementation

### 5.1 Company Research Orchestrator

```typescript
// lib/company-intelligence/core/orchestrator.ts
import { WebScraper } from '@/lib/scraping';
import { CompanyInfoExtractor } from '../extractors/company-info';
import { ProductServiceExtractor } from '../extractors/products-services';
import { EnrichmentEngine } from './enrichment-engine';
import { PackGenerator } from '../processors/pack-generator';

export interface CompanyResearchRequest {
  domain: string;
  depth: 'basic' | 'standard' | 'comprehensive';
  options?: {
    includeNews?: boolean;
    includeCompetitors?: boolean;
    includeSocialMedia?: boolean;
    includeFinancials?: boolean;
    includeTechStack?: boolean;
    maxPages?: number;
  };
}

export interface CompanyInformationPack {
  id: string;
  domain: string;
  generatedAt: string;
  lastUpdated: string;
  companyName: string;
  
  // Core Information
  basics: {
    legalName?: string;
    foundedYear?: number;
    headquarters?: Address;
    description: string;
    mission?: string;
    vision?: string;
    values?: string[];
    logoUrl?: string;
    brandColors?: string[];
  };
  
  // Business Information
  business: {
    industry: string[];
    sector?: string;
    businessModel?: string;
    targetMarket?: string[];
    uniqueSellingPoints?: string[];
    numberOfEmployees?: string | number;
    annualRevenue?: string;
    fundingStatus?: string;
    investors?: string[];
  };
  
  // Products & Services
  productsServices: {
    products: Product[];
    services: Service[];
    pricing?: PricingModel[];
    keyFeatures?: string[];
    useCases?: string[];
  };
  
  // Market Position
  marketPosition: {
    marketSize?: string;
    marketShare?: string;
    growthRate?: string;
    competitors: Competitor[];
    competitiveAdvantages?: string[];
    challenges?: string[];
    opportunities?: string[];
  };
  
  // Digital Presence
  digitalPresence: {
    website: WebsiteAnalysis;
    socialMedia?: SocialMediaPresence;
    contentStrategy?: ContentAnalysis;
    seoMetrics?: SEOData;
    techStack?: Technology[];
  };
  
  // People & Culture
  people: {
    leadership?: TeamMember[];
    teamSize?: number;
    culture?: string[];
    hiring?: boolean;
    openPositions?: number;
    employeeReviews?: ReviewSummary;
  };
  
  // Contact & Locations
  contact: {
    emails?: ContactEmail[];
    phones?: string[];
    addresses?: Address[];
    supportChannels?: string[];
  };
  
  // Recent Activity
  recentActivity: {
    news?: NewsItem[];
    pressReleases?: PressRelease[];
    productLaunches?: string[];
    partnerships?: string[];
  };
  
  // Analysis & Insights
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    recommendations?: string[];
  };
  
  // Metadata
  metadata: {
    confidence: Record<string, number>;
    sources: string[];
    dataQuality: 'high' | 'medium' | 'low';
    missingData: string[];
  };
}

export class CompanyResearchOrchestrator {
  private scraper: WebScraper;
  private enrichmentEngine: EnrichmentEngine;
  private packGenerator: PackGenerator;
  private cache: Map<string, CompanyInformationPack>;

  constructor() {
    this.scraper = new WebScraper({
      concurrency: 3,
      rateLimit: { requests: 30, per: 60000 }
    });
    this.enrichmentEngine = new EnrichmentEngine();
    this.packGenerator = new PackGenerator();
    this.cache = new Map();
  }

  async research(request: CompanyResearchRequest): Promise<CompanyInformationPack> {
    // Check cache first
    const cached = await this.getCached(request.domain);
    if (cached && this.isFresh(cached)) {
      return cached;
    }

    // Phase 1: Initial website discovery
    const websiteData = await this.scrapeCompanyWebsite(request);
    
    // Phase 2: Extract structured data
    const extractedData = await this.extractCompanyData(websiteData);
    
    // Phase 3: External enrichment
    const enrichedData = await this.enrichWithExternalSources(
      extractedData, 
      request
    );
    
    // Phase 4: Competitive analysis
    const withCompetitors = await this.analyzeCompetitors(
      enrichedData,
      request
    );
    
    // Phase 5: Generate insights with LLM
    const withInsights = await this.generateInsights(withCompetitors);
    
    // Phase 6: Create final pack
    const pack = await this.packGenerator.generate(withInsights);
    
    // Store for future use
    await this.storePack(pack);
    
    return pack;
  }

  private async scrapeCompanyWebsite(
    request: CompanyResearchRequest
  ): Promise<WebsiteData> {
    const baseUrl = `https://${request.domain}`;
    const pagesToScrape = this.identifyKeyPages(request.domain);
    
    const scrapedPages: ScrapedPage[] = [];
    
    for (const page of pagesToScrape) {
      try {
        const url = `${baseUrl}${page.path}`;
        const data = await this.scraper.scrape(url, {
          strategy: page.requiresJS ? 'dynamic' : 'static',
          extractMetadata: true,
          extractStructuredData: true,
          extractTables: true,
          selectors: page.selectors
        });
        
        scrapedPages.push({
          type: page.type,
          url,
          data
        });
      } catch (error) {
        console.error(`Failed to scrape ${page.path}:`, error);
      }
    }
    
    return {
      domain: request.domain,
      pages: scrapedPages,
      timestamp: new Date()
    };
  }

  private identifyKeyPages(domain: string): PageToScrape[] {
    return [
      {
        type: 'home',
        path: '/',
        requiresJS: false,
        selectors: {
          hero: 'h1, .hero-title, .headline',
          tagline: '.tagline, .subtitle, .hero-subtitle',
          cta: '.cta, .hero-cta button'
        }
      },
      {
        type: 'about',
        path: '/about',
        requiresJS: false,
        selectors: {
          mission: '.mission, #mission',
          vision: '.vision, #vision',
          values: '.values, #values',
          story: '.company-story, .our-story'
        }
      },
      {
        type: 'products',
        path: '/products',
        alternativePaths: ['/services', '/solutions', '/features'],
        requiresJS: true,
        selectors: {
          productList: '.product-card, .service-item',
          pricing: '.pricing-card, .price'
        }
      },
      {
        type: 'team',
        path: '/team',
        alternativePaths: ['/about/team', '/leadership', '/people'],
        requiresJS: false,
        selectors: {
          members: '.team-member, .person-card',
          name: '.member-name, .person-name',
          role: '.member-role, .person-title'
        }
      },
      {
        type: 'contact',
        path: '/contact',
        alternativePaths: ['/contact-us'],
        requiresJS: false,
        selectors: {
          email: 'a[href^="mailto:"]',
          phone: 'a[href^="tel:"]',
          address: '.address, address'
        }
      }
    ];
  }
}
```

### 5.2 Company Data Extractors

```typescript
// lib/company-intelligence/extractors/company-info.ts
export class CompanyInfoExtractor {
  async extract($: cheerio.CheerioAPI, url: string): Promise<CompanyBasics> {
    const basics: CompanyBasics = {
      companyName: this.extractCompanyName($, url),
      description: this.extractDescription($),
      mission: this.extractMission($),
      vision: this.extractVision($),
      values: this.extractValues($),
      foundedYear: this.extractFoundedYear($),
      headquarters: this.extractHeadquarters($),
      logoUrl: this.extractLogo($, url)
    };
    
    // Use LLM to extract additional context if needed
    if (!basics.description) {
      basics.description = await this.generateDescription($);
    }
    
    return basics;
  }
  
  private extractCompanyName($: cheerio.CheerioAPI, url: string): string {
    const strategies = [
      () => $('meta[property="og:site_name"]').attr('content'),
      () => $('.company-name, .brand-name').first().text(),
      () => $('h1').first().text(),
      () => new URL(url).hostname.split('.')[0]
    ];
    
    for (const strategy of strategies) {
      const result = strategy();
      if (result) return result.trim();
    }
    
    return 'Unknown Company';
  }
  
  private extractValues($: cheerio.CheerioAPI): string[] {
    const values: string[] = [];
    const valueSelectors = [
      '.values li',
      '.company-values li',
      '.our-values li',
      '[class*="value-"] h3'
    ];
    
    for (const selector of valueSelectors) {
      $(selector).each((_, elem) => {
        const value = $(elem).text().trim();
        if (value && value.length < 100) {
          values.push(value);
        }
      });
      
      if (values.length > 0) break;
    }
    
    return values;
  }
}

// lib/company-intelligence/extractors/products-services.ts
export class ProductServiceExtractor {
  async extract(scrapedData: ScrapedData): Promise<ProductsServicesData> {
    const $ = cheerio.load(scrapedData.raw.html);
    
    const products: Product[] = [];
    const services: Service[] = [];
    
    // Extract product/service cards
    $('.product-card, .service-card, .solution-card').each((_, elem) => {
      const $elem = $(elem);
      const item = {
        name: $elem.find('h2, h3, .title').first().text().trim(),
        description: $elem.find('.description, p').first().text().trim(),
        features: this.extractFeatures($elem),
        pricing: this.extractPricing($elem),
        imageUrl: $elem.find('img').attr('src'),
        link: $elem.find('a').attr('href')
      };
      
      // Classify as product or service
      if (this.isProduct(item)) {
        products.push(item as Product);
      } else {
        services.push(item as Service);
      }
    });
    
    // If no structured data found, use LLM to extract
    if (products.length === 0 && services.length === 0) {
      const extracted = await this.extractWithLLM(scrapedData.raw.text);
      products.push(...extracted.products);
      services.push(...extracted.services);
    }
    
    return { products, services };
  }
  
  private extractFeatures($elem: cheerio.Cheerio): string[] {
    const features: string[] = [];
    $elem.find('.feature, .benefit, li').each((_, feat) => {
      const text = $(feat).text().trim();
      if (text && text.length < 150) {
        features.push(text);
      }
    });
    return features;
  }
  
  private extractPricing($elem: cheerio.Cheerio): PricingInfo | undefined {
    const priceText = $elem.find('.price, .pricing').text();
    if (!priceText) return undefined;
    
    const priceMatch = priceText.match(/\$?\d+(?:,\d{3})*(?:\.\d{2})?/);
    const periodMatch = priceText.match(/(monthly|yearly|annual|one-time)/i);
    
    if (priceMatch) {
      return {
        amount: priceMatch[0],
        period: periodMatch ? periodMatch[0].toLowerCase() : 'one-time',
        currency: priceText.includes('$') ? 'USD' : 'Unknown'
      };
    }
    
    return undefined;
  }
}

// lib/company-intelligence/extractors/tech-stack.ts
export class TechStackExtractor {
  private readonly techSignatures = {
    // Frontend frameworks
    react: ['_app', '__next', 'react', 'jsx', 'useState'],
    vue: ['vue', 'v-if', 'v-for', 'v-model'],
    angular: ['ng-', 'angular', '*ngFor', '*ngIf'],
    
    // Analytics
    googleAnalytics: ['gtag', 'ga(', 'google-analytics', '_gaq'],
    mixpanel: ['mixpanel', 'mixpanel.track'],
    segment: ['analytics.track', 'segment'],
    
    // E-commerce
    shopify: ['shopify', 'myshopify.com', 'cdn.shopify'],
    woocommerce: ['woocommerce', 'wc-'],
    
    // CMS
    wordpress: ['wp-content', 'wp-includes', 'wordpress'],
    contentful: ['contentful', 'ctfassets'],
    
    // Marketing
    hubspot: ['hubspot', 'hs-scripts', 'hsforms'],
    marketo: ['marketo', 'mktoForms'],
    mailchimp: ['mailchimp', 'mc-'],
    
    // Infrastructure
    cloudflare: ['cloudflare', 'cf-'],
    aws: ['amazonaws.com', 'aws'],
    vercel: ['vercel', '_vercel']
  };
  
  async detectFromPages(pages: ScrapedPage[]): Promise<Technology[]> {
    const detectedTech = new Set<string>();
    const technologies: Technology[] = [];
    
    for (const page of pages) {
      const html = page.data.raw.html.toLowerCase();
      
      // Check for technology signatures
      for (const [tech, signatures] of Object.entries(this.techSignatures)) {
        if (signatures.some(sig => html.includes(sig))) {
          if (!detectedTech.has(tech)) {
            detectedTech.add(tech);
            technologies.push({
              name: tech,
              category: this.categorize(tech),
              confidence: this.calculateConfidence(html, signatures)
            });
          }
        }
      }
      
      // Check meta generator tag
      const $ = cheerio.load(html);
      const generator = $('meta[name="generator"]').attr('content');
      if (generator) {
        technologies.push({
          name: generator.split(' ')[0],
          category: 'CMS',
          confidence: 1.0
        });
      }
    }
    
    return technologies;
  }
  
  private categorize(tech: string): string {
    const categories: Record<string, string[]> = {
      'Analytics': ['googleAnalytics', 'mixpanel', 'segment'],
      'Frontend': ['react', 'vue', 'angular'],
      'E-commerce': ['shopify', 'woocommerce'],
      'CMS': ['wordpress', 'contentful'],
      'Marketing': ['hubspot', 'marketo', 'mailchimp'],
      'Infrastructure': ['cloudflare', 'aws', 'vercel']
    };
    
    for (const [category, techs] of Object.entries(categories)) {
      if (techs.includes(tech)) return category;
    }
    
    return 'Other';
  }
}
```

### 5.3 Enrichment Engine

```typescript
// lib/company-intelligence/core/enrichment-engine.ts
export class EnrichmentEngine {
  async enrich(
    companyData: ExtractedCompanyData,
    request: CompanyResearchRequest
  ): Promise<EnrichedCompanyData> {
    const enriched = { ...companyData };
    
    // Parallel enrichment from multiple sources
    const enrichmentTasks = [];
    
    if (request.options?.includeNews) {
      enrichmentTasks.push(this.enrichWithNews(enriched));
    }
    
    if (request.options?.includeCompetitors) {
      enrichmentTasks.push(this.enrichWithCompetitors(enriched));
    }
    
    if (request.options?.includeSocialMedia) {
      enrichmentTasks.push(this.enrichWithSocialMedia(enriched));
    }
    
    await Promise.all(enrichmentTasks);
    
    // Industry analysis
    enriched.industry = await this.analyzeIndustry(enriched);
    
    // Market size estimation
    enriched.marketSize = await this.estimateMarketSize(enriched);
    
    return enriched;
  }
  
  private async enrichWithNews(data: any): Promise<void> {
    // Search for recent news
    const newsQuery = `${data.basics.companyName} company news`;
    
    // Scrape news results
    const newsData = await this.scrapeNews(newsQuery);
    
    data.recentNews = newsData.articles.slice(0, 10).map(article => ({
      title: article.title,
      source: article.source,
      date: article.publishedAt,
      summary: article.description,
      url: article.url,
      sentiment: this.analyzeSentiment(article.description)
    }));
    
    // Extract key events
    data.keyEvents = await this.extractKeyEvents(newsData.articles);
  }
  
  private async enrichWithCompetitors(data: any): Promise<void> {
    // Search for competitors
    const competitorQuery = `${data.basics.companyName} competitors alternatives vs`;
    
    // Scrape comparison sites
    const comparisons = await this.scrapeComparisons(competitorQuery);
    
    // Extract competitor names
    const competitors = await this.extractCompetitorNames(comparisons);
    
    // Research each competitor briefly
    data.competitors = await Promise.all(
      competitors.slice(0, 5).map(async (name) => ({
        name,
        website: await this.findCompetitorWebsite(name),
        description: await this.getCompetitorDescription(name),
        strengths: await this.identifyStrengths(name)
      }))
    );
  }
}
```

### 5.4 Pack Generator

```typescript
// lib/company-intelligence/processors/pack-generator.ts
export class PackGenerator {
  async generate(data: EnrichedCompanyData): Promise<CompanyInformationPack> {
    // Use LLM to enhance and structure the data
    const enhanced = await this.enhanceWithLLM(data);
    
    // Calculate confidence scores
    const confidence = this.calculateConfidence(enhanced);
    
    // Identify missing data
    const missingData = this.identifyMissingData(enhanced);
    
    // Generate SWOT analysis
    const swot = await this.generateSWOT(enhanced);
    
    return {
      id: this.generatePackId(),
      domain: data.domain,
      generatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      companyName: enhanced.basics.companyName,
      
      basics: enhanced.basics,
      business: enhanced.business,
      productsServices: enhanced.productsServices,
      marketPosition: enhanced.marketPosition,
      digitalPresence: enhanced.digitalPresence,
      people: enhanced.people,
      contact: enhanced.contact,
      recentActivity: enhanced.recentActivity,
      
      insights: {
        strengths: swot.strengths,
        weaknesses: swot.weaknesses,
        opportunities: swot.opportunities,
        threats: swot.threats,
        recommendations: await this.generateRecommendations(enhanced)
      },
      
      metadata: {
        confidence,
        sources: this.extractAllSources(data),
        dataQuality: this.assessDataQuality(confidence),
        missingData
      }
    };
  }
  
  private async enhanceWithLLM(data: any): Promise<any> {
    // Use LLM to fill gaps and enhance descriptions
    const prompt = `
      Enhance and structure this company data:
      ${JSON.stringify(data, null, 2)}
      
      Fill in missing information based on context.
      Ensure all descriptions are clear and professional.
    `;
    
    return await callLLMWithJSON(prompt);
  }
  
  private async generateSWOT(data: any): Promise<SWOT> {
    const prompt = `
      Based on this company data, generate a SWOT analysis:
      Company: ${data.basics.companyName}
      Industry: ${data.business.industry}
      Products: ${JSON.stringify(data.productsServices)}
      Competitors: ${JSON.stringify(data.competitors)}
      Recent News: ${JSON.stringify(data.recentNews)}
      
      Return as JSON with arrays for:
      - strengths (internal positive factors)
      - weaknesses (internal negative factors)  
      - opportunities (external positive factors)
      - threats (external negative factors)
    `;
    
    return await callLLMWithJSON(prompt);
  }
  
  private calculateConfidence(data: any): Record<string, number> {
    const confidence: Record<string, number> = {};
    
    // Calculate confidence for each section based on data completeness
    const sections = ['basics', 'business', 'productsServices', 'people', 'contact'];
    
    for (const section of sections) {
      const sectionData = data[section];
      if (!sectionData) {
        confidence[section] = 0;
        continue;
      }
      
      const fields = Object.keys(sectionData);
      const filledFields = fields.filter(key => 
        sectionData[key] !== null && 
        sectionData[key] !== undefined &&
        sectionData[key] !== ''
      );
      
      confidence[section] = filledFields.length / fields.length;
    }
    
    return confidence;
  }
}
```

### 5.5 API Integration

```typescript
// app/api/company-research/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CompanyResearchOrchestrator } from '@/lib/company-intelligence/core/orchestrator';

const researchSchema = z.object({
  domain: z.string().refine(val => {
    try {
      new URL(`https://${val}`);
      return true;
    } catch {
      return false;
    }
  }, "Invalid domain format"),
  depth: z.enum(['basic', 'standard', 'comprehensive']).default('standard'),
  options: z.object({
    includeNews: z.boolean().default(true),
    includeCompetitors: z.boolean().default(true),
    includeSocialMedia: z.boolean().default(false),
    includeFinancials: z.boolean().default(false),
    includeTechStack: z.boolean().default(true),
    maxPages: z.number().min(1).max(50).default(10)
  }).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const request = researchSchema.parse(body);
    
    // Initialize orchestrator
    const orchestrator = new CompanyResearchOrchestrator();
    
    // Start research (this could be async/queued for longer operations)
    const pack = await orchestrator.research(request);
    
    // Store pack ID in session/database for future reference
    await storePackForUser(pack.id, req);
    
    return NextResponse.json({
      success: true,
      packId: pack.id,
      pack: pack
    });
    
  } catch (error) {
    console.error('Research error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Research failed', message: error.message },
      { status: 500 }
    );
  }
}

// app/api/company-pack/[id]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pack = await getCompanyPack(params.id);
    
    if (!pack) {
      return NextResponse.json(
        { error: 'Pack not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(pack);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve pack' },
      { status: 500 }
    );
  }
}
```

### 5.6 LLM Context Integration

```typescript
// lib/company-intelligence/context-enhancer.ts
export class CompanyContextEnhancer {
  private currentPack: CompanyInformationPack | null = null;
  
  async loadPackForSession(packId: string): Promise<void> {
    this.currentPack = await getCompanyPack(packId);
  }
  
  enhancePrompt(originalPrompt: string): string {
    if (!this.currentPack) return originalPrompt;
    
    const context = this.generateContextString();
    
    return `
      ## Company Context
      ${context}
      
      ## User Request
      ${originalPrompt}
      
      Please ensure your response reflects the company's specific context,
      brand voice, industry position, and target market.
    `;
  }
  
  private generateContextString(): string {
    if (!this.currentPack) return '';
    
    const pack = this.currentPack;
    
    return `
      Company: ${pack.companyName}
      Domain: ${pack.domain}
      Industry: ${pack.business.industry.join(', ')}
      Description: ${pack.basics.description}
      
      Products/Services:
      ${pack.productsServices.products.map(p => `- ${p.name}: ${p.description}`).join('\n')}
      ${pack.productsServices.services.map(s => `- ${s.name}: ${s.description}`).join('\n')}
      
      Target Market: ${pack.business.targetMarket?.join(', ')}
      USPs: ${pack.business.uniqueSellingPoints?.join(', ')}
      
      Key Competitors: ${pack.marketPosition.competitors.map(c => c.name).join(', ')}
      
      Tech Stack: ${pack.digitalPresence.techStack?.map(t => t.name).join(', ')}
      
      Recent Developments:
      ${pack.recentActivity.news?.slice(0, 3).map(n => `- ${n.title}`).join('\n')}
    `;
  }
  
  generateArtifactContext(): ArtifactContext {
    if (!this.currentPack) return {};
    
    return {
      companyName: this.currentPack.companyName,
      brandColors: this.currentPack.basics.brandColors,
      logoUrl: this.currentPack.basics.logoUrl,
      tagline: this.currentPack.basics.tagline,
      tone: this.inferToneFromContent(),
      industry: this.currentPack.business.industry[0],
      targetAudience: this.currentPack.business.targetMarket
    };
  }
}

// Integration with existing LLM API
export async function enhancedLLMRequest(
  prompt: string,
  packId?: string
): Promise<any> {
  const enhancer = new CompanyContextEnhancer();
  
  if (packId) {
    await enhancer.loadPackForSession(packId);
  }
  
  const enhancedPrompt = enhancer.enhancePrompt(prompt);
  
  // Call existing LLM API with enhanced prompt
  return await callLLM(enhancedPrompt);
}
```

## 6. Usage Examples

```typescript
// Example: Research a company
const response = await fetch('/api/company-research', {
  method: 'POST',
  body: JSON.stringify({
    domain: 'stripe.com',
    depth: 'comprehensive',
    options: {
      includeNews: true,
      includeCompetitors: true,
      includeTechStack: true
    }
  })
});

const { packId, pack } = await response.json();

// Example: Use pack for enhanced LLM response
const enhancedResponse = await fetch('/api/llm/generate', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'Create a sales pitch for our CRM product',
    companyPackId: packId
  })
});

// The LLM will now have full context about Stripe when generating the pitch
```

## 7. Data Storage Schema

```prisma
model CompanyPack {
  id            String   @id @default(cuid())
  domain        String   @unique
  companyName   String
  data          Json     // Full pack data
  summary       Json     // Condensed version for quick access
  generatedAt   DateTime
  lastUpdated   DateTime @updatedAt
  dataQuality   String
  userId        String?  // Optional user association
  projectId     String?  // Optional project association
  
  @@index([domain])
  @@index([companyName])
  @@index([userId])
  @@index([projectId])
}

model ResearchJob {
  id          String   @id @default(cuid())
  domain      String
  status      JobStatus
  request     Json
  result      Json?
  error       String?
  startedAt   DateTime @default(now())
  completedAt DateTime?
  
  @@index([status])
  @@index([domain])
}

enum JobStatus {
  PENDING
  RESEARCHING
  PROCESSING
  COMPLETED
  FAILED
}
```

## 8. Performance & Optimization

### Caching Strategy
- Cache company packs for 7 days
- Cache individual page scrapes for 24 hours
- Cache news/social media data for 6 hours
- Implement incremental updates for existing packs

### Scraping Optimization
- Parallel scraping with concurrency limits
- Smart retry logic with exponential backoff
- Use static scraping when possible (faster)
- Browser pooling for dynamic content

### Cost Optimization
- Use GPT-3.5 for simple extractions
- GPT-4 only for complex analysis and SWOT
- Batch LLM calls where possible
- Cache LLM responses aggressively

## 9. Security & Compliance

### Data Privacy
- Respect robots.txt
- No scraping of personal data without consent
- Comply with GDPR/CCPA for stored data
- Implement data retention policies

### Rate Limiting
- Implement per-domain rate limiting
- Respect server response codes
- Use rotating user agents
- Implement backoff on 429/503 responses

## 10. Monitoring & Analytics

### Metrics to Track
- Research completion rate
- Average research time
- Data quality scores
- Cache hit rates
- API costs per research
- Most researched industries

### Error Handling
- Graceful degradation for missing data
- Fallback strategies for blocked domains
- Partial pack generation on failures
- User notification for incomplete data

## 11. Future Enhancements

### Phase 2 Features
- Real-time monitoring for company changes
- Integration with business data APIs (Crunchbase, LinkedIn)
- Financial data integration (for public companies)
- Patent and trademark research
- Customer review aggregation
- Social sentiment analysis

### Phase 3 Features
- Competitive intelligence dashboard
- Automated weekly company updates
- Industry trend analysis
- Predictive insights using ML
- Custom research templates per industry
- Multi-company comparison tools

## 12. Success Metrics

### Key Performance Indicators
- Time to generate complete pack: < 60 seconds
- Data completeness score: > 80%
- Accuracy of extracted information: > 95%
- User satisfaction with pack quality: > 4.5/5
- Context enhancement improvement: 40% better artifact relevance
- Cost per company research: < $0.50

## 13. Implementation Timeline

### Week 1-2: Core Infrastructure
- Set up scraping framework
- Implement basic extractors
- Create data models

### Week 3-4: Intelligence Layer
- Implement enrichment engine
- Add competitor analysis
- Integrate LLM processing

### Week 5-6: Integration & Testing
- API endpoint development
- Context enhancement integration
- Testing and optimization

### Week 7-8: Production Ready
- Performance optimization
- Security hardening
- Documentation and training