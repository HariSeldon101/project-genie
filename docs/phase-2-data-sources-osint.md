# Phase 2: Data Sources & OSINT Integration
*Expand beyond websites to government, academic, and OSINT sources*

## 📚 Related Documents
- [Shared Content & Standards](./company-intelligence-shared-content.md)
- [Phase 1: Advanced Scraping](./phase-1-advanced-scraping.md)
- [Phase 3: Enricher Activation](./phase-3-enricher-activation.md)
- [Phase 4: GPT-5 Optimization](./phase-4-gpt5-llm-optimization.md)
- [Phase 5: Database & Performance](./phase-5-database-performance.md)

---

## 🎯 Phase 2 Overview

### Objectives
1. Integrate government databases (SEC EDGAR, USPTO, Data.gov)
2. Add OSINT tools (Shodan, SpiderFoot, TheHarvester, Maltego)
3. Connect academic sources (CORE, OpenAlex, Semantic Scholar)
4. Optional: Dark web monitoring for enterprise
5. Create unified search interface across all sources

### Timeline
- **Duration**: 2 weeks
- **Dependencies**: Phase 1 scraping infrastructure
- **Team Size**: 1-2 developers

### Success Metrics
- Data sources integrated: 10+
- Query response time: <5 seconds
- Data quality score: >90%
- Source reliability tracking: Implemented
- Zero API rate limit violations

---

## 🏗️ Architecture Design

### Component Structure
```
lib/company-intelligence/data-sources/
├── core/
│   ├── source-manager.ts          # Orchestrates all data sources
│   ├── source-registry.ts         # Auto-discovery of sources
│   └── base-source.ts            # Base class for all sources
├── government/
│   ├── sec-edgar-source.ts       # SEC financial filings
│   ├── uspto-source.ts           # Patent database
│   ├── data-gov-source.ts        # Government datasets
│   └── companies-house-source.ts # UK company data
├── osint/
│   ├── shodan-source.ts          # Internet device intelligence
│   ├── spiderfoot-source.ts      # Automated OSINT
│   ├── theharvester-source.ts    # Email/subdomain discovery
│   └── maltego-source.ts         # Relationship mapping
├── academic/
│   ├── core-source.ts            # Open access papers
│   ├── openalex-source.ts        # Research entities
│   └── semantic-scholar-source.ts # AI-powered search
├── darkweb/ (optional)
│   ├── darkowl-source.ts         # Dark web database
│   ├── flare-source.ts           # Threat detection
│   └── sixgill-source.ts         # AI-powered intelligence
└── utils/
    ├── rate-limiter.ts            # API rate management
    ├── data-normalizer.ts         # Standardize formats
    └── source-aggregator.ts       # Combine results
```

---

## 🔧 Implementation Details

### 2.1 Government Data Integration

#### SEC EDGAR Implementation
```typescript
// lib/company-intelligence/data-sources/government/sec-edgar-source.ts
import { BaseDataSource, DataSourceResult } from '../core/base-source'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { z } from 'zod'

// SEC Filing Schema
const SECFilingSchema = z.object({
  accessionNumber: z.string(),
  filingDate: z.string(),
  reportDate: z.string(),
  acceptanceDateTime: z.string(),
  act: z.string().optional(),
  form: z.string(),
  fileNumber: z.string(),
  filmNumber: z.string().optional(),
  items: z.string().optional(),
  size: z.number(),
  isXBRL: z.boolean(),
  isInlineXBRL: z.boolean(),
  primaryDocument: z.string(),
  primaryDocDescription: z.string(),
  documents: z.array(z.object({
    sequence: z.string(),
    description: z.string(),
    documentUrl: z.string(),
    type: z.string().optional(),
    size: z.number().optional()
  }))
})

export class SECEdgarSource extends BaseDataSource {
  private baseUrl = 'https://data.sec.gov'
  private apiUrl = 'https://www.sec.gov/Archives/edgar/data'
  private logger = permanentLogger.create('SECEdgarSource')
  
  constructor() {
    super('sec-edgar', 'government')
    // No API key required!
  }
  
  async searchCompany(query: string): Promise<DataSourceResult> {
    const startTime = Date.now()
    this.logger.log('Searching SEC EDGAR', { query })
    
    try {
      // Step 1: Search for company CIK
      const cik = await this.findCompanyCIK(query)
      if (!cik) {
        return {
          source: 'sec-edgar',
          success: false,
          error: 'Company not found in SEC database'
        }
      }
      
      // Step 2: Get company submissions
      const submissions = await this.getCompanySubmissions(cik)
      
      // Step 3: Get recent filings
      const recentFilings = await this.getRecentFilings(cik, submissions)
      
      // Step 4: Extract financial data from 10-K/10-Q
      const financialData = await this.extractFinancialData(recentFilings)
      
      const duration = Date.now() - startTime
      this.logger.metric('SEC search completed', {
        query,
        cik,
        filingsFound: recentFilings.length,
        duration
      })
      
      return {
        source: 'sec-edgar',
        success: true,
        data: {
          cik,
          companyName: submissions.name,
          ticker: submissions.tickers?.[0],
          sic: submissions.sic,
          sicDescription: submissions.sicDescription,
          ein: submissions.ein,
          filings: recentFilings,
          financialData,
          metadata: {
            fiscalYearEnd: submissions.fiscalYearEnd,
            stateOfIncorporation: submissions.stateOfIncorporation,
            businessAddress: submissions.addresses?.business,
            mailingAddress: submissions.addresses?.mailing,
            formerNames: submissions.formerNames
          }
        },
        reliability: 1.0, // Government source = highest reliability
        cost: 0, // Free!
        duration
      }
    } catch (error) {
      this.logger.error('SEC EDGAR search failed', error)
      return {
        source: 'sec-edgar',
        success: false,
        error: error.message
      }
    }
  }
  
  private async findCompanyCIK(query: string): Promise<string | null> {
    // Search company tickers JSON
    const response = await fetch(`${this.baseUrl}/files/company_tickers.json`)
    const tickers = await response.json()
    
    // Search by ticker or name
    const queryLower = query.toLowerCase()
    for (const [_, company] of Object.entries(tickers)) {
      const comp = company as any
      if (comp.ticker?.toLowerCase() === queryLower ||
          comp.title?.toLowerCase().includes(queryLower)) {
        // Pad CIK to 10 digits
        return String(comp.cik_str).padStart(10, '0')
      }
    }
    
    return null
  }
  
  private async getCompanySubmissions(cik: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/submissions/CIK${cik}.json`,
      {
        headers: {
          'User-Agent': 'ProjectGenie/1.0 (contact@projectgenie.dev)',
          'Accept': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to get submissions: ${response.status}`)
    }
    
    return await response.json()
  }
  
  private async getRecentFilings(cik: string, submissions: any): Promise<any[]> {
    const recentFilings = []
    const recent = submissions.filings?.recent || {}
    
    // Get last 20 filings
    const numFilings = Math.min(20, recent.accessionNumber?.length || 0)
    
    for (let i = 0; i < numFilings; i++) {
      recentFilings.push({
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i],
        form: recent.form[i],
        primaryDocument: recent.primaryDocument[i],
        primaryDocDescription: recent.primaryDocDescription[i],
        // Construct document URL
        documentUrl: this.constructDocumentUrl(
          cik,
          recent.accessionNumber[i],
          recent.primaryDocument[i]
        )
      })
    }
    
    return recentFilings
  }
  
  private constructDocumentUrl(cik: string, accession: string, document: string): string {
    const accessionNoDashes = accession.replace(/-/g, '')
    return `${this.apiUrl}/${cik}/${accessionNoDashes}/${document}`
  }
  
  private async extractFinancialData(filings: any[]): Promise<any> {
    // Find most recent 10-K or 10-Q
    const financialFiling = filings.find(f => 
      f.form === '10-K' || f.form === '10-Q'
    )
    
    if (!financialFiling) {
      return null
    }
    
    // In production, would parse XBRL data
    // For now, return filing reference
    return {
      type: financialFiling.form,
      date: financialFiling.filingDate,
      url: financialFiling.documentUrl,
      // Would extract: revenue, profit, assets, etc.
    }
  }
}
```

#### USPTO Patent Database
```typescript
// lib/company-intelligence/data-sources/government/uspto-source.ts
export class USPTOSource extends BaseDataSource {
  private apiUrl = 'https://developer.uspto.gov/ibd-api/v1'
  private logger = permanentLogger.create('USPTOSource')
  
  async searchPatents(company: string): Promise<DataSourceResult> {
    const startTime = Date.now()
    this.logger.log('Searching USPTO', { company })
    
    try {
      // Search for patents by assignee
      const response = await fetch(
        `${this.apiUrl}/patents/query?searchText=assignee:"${encodeURIComponent(company)}"&rows=100`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      )
      
      const data = await response.json()
      const patents = data.response?.docs || []
      
      // Extract patent details
      const patentDetails = patents.map(patent => ({
        patentNumber: patent.patentNumber,
        title: patent.title,
        abstract: patent.abstract,
        filingDate: patent.filingDate,
        grantDate: patent.grantDate,
        inventors: patent.inventors,
        assignee: patent.assignee,
        classifications: patent.classifications,
        claims: patent.claims?.length || 0,
        citations: patent.citations?.length || 0
      }))
      
      // Analyze innovation trends
      const innovationMetrics = this.analyzeInnovation(patentDetails)
      
      const duration = Date.now() - startTime
      this.logger.metric('USPTO search completed', {
        company,
        patentsFound: patents.length,
        duration
      })
      
      return {
        source: 'uspto',
        success: true,
        data: {
          company,
          totalPatents: patents.length,
          patents: patentDetails,
          innovationMetrics,
          technologyAreas: this.extractTechAreas(patents),
          recentActivity: this.getRecentActivity(patents)
        },
        reliability: 1.0,
        cost: 0,
        duration
      }
    } catch (error) {
      this.logger.error('USPTO search failed', error)
      return {
        source: 'uspto',
        success: false,
        error: error.message
      }
    }
  }
  
  private analyzeInnovation(patents: any[]): any {
    // Sort by date
    const sorted = patents.sort((a, b) => 
      new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime()
    )
    
    // Calculate metrics
    const currentYear = new Date().getFullYear()
    const recentPatents = sorted.filter(p => 
      new Date(p.filingDate).getFullYear() >= currentYear - 2
    )
    
    return {
      totalPatents: patents.length,
      recentFilings: recentPatents.length,
      averageCitations: patents.reduce((sum, p) => sum + p.citations, 0) / patents.length,
      topInventors: this.getTopInventors(patents),
      filingTrend: this.calculateTrend(patents)
    }
  }
  
  private extractTechAreas(patents: any[]): string[] {
    const areas = new Map<string, number>()
    
    patents.forEach(patent => {
      patent.classifications?.forEach(classification => {
        const area = classification.class || classification.description
        areas.set(area, (areas.get(area) || 0) + 1)
      })
    })
    
    // Return top 10 areas
    return Array.from(areas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([area]) => area)
  }
  
  private getTopInventors(patents: any[]): any[] {
    const inventors = new Map<string, number>()
    
    patents.forEach(patent => {
      patent.inventors?.forEach(inventor => {
        inventors.set(inventor, (inventors.get(inventor) || 0) + 1)
      })
    })
    
    return Array.from(inventors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, patentCount: count }))
  }
  
  private calculateTrend(patents: any[]): string {
    const yearCounts = new Map<number, number>()
    
    patents.forEach(patent => {
      const year = new Date(patent.filingDate).getFullYear()
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
    })
    
    const years = Array.from(yearCounts.keys()).sort()
    if (years.length < 2) return 'insufficient-data'
    
    const recentAvg = years.slice(-2).reduce((sum, year) => 
      sum + (yearCounts.get(year) || 0), 0) / 2
    const historicalAvg = years.slice(0, -2).reduce((sum, year) => 
      sum + (yearCounts.get(year) || 0), 0) / Math.max(1, years.length - 2)
    
    if (recentAvg > historicalAvg * 1.2) return 'increasing'
    if (recentAvg < historicalAvg * 0.8) return 'decreasing'
    return 'stable'
  }
  
  private getRecentActivity(patents: any[]): any {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const recent = patents.filter(p => 
      new Date(p.filingDate) > sixMonthsAgo
    )
    
    return {
      last6Months: recent.length,
      mostRecent: recent[0] || null
    }
  }
}
```

### 2.2 OSINT Tools Integration

#### Shodan Integration
```typescript
// lib/company-intelligence/data-sources/osint/shodan-source.ts
import { BaseDataSource, DataSourceResult } from '../core/base-source'
import * as Shodan from 'shodan-client'

export class ShodanSource extends BaseDataSource {
  private client: any
  private logger = permanentLogger.create('ShodanSource')
  
  constructor(apiKey?: string) {
    super('shodan', 'osint')
    const key = apiKey || process.env.SHODAN_API_KEY
    
    if (!key) {
      this.logger.warn('Shodan API key not provided')
      this.enabled = false
      return
    }
    
    this.client = new Shodan.Client(key)
  }
  
  async searchOrganization(org: string): Promise<DataSourceResult> {
    if (!this.enabled) {
      return {
        source: 'shodan',
        success: false,
        error: 'Shodan API key not configured'
      }
    }
    
    const startTime = Date.now()
    this.logger.log('Searching Shodan', { org })
    
    try {
      // Search for organization's infrastructure
      const searchQuery = `org:"${org}"`
      const results = await this.client.search(searchQuery, {
        facets: 'port,product,os,country'
      })
      
      // Get detailed host information
      const hosts = await Promise.all(
        results.matches.slice(0, 10).map(async (match) => {
          try {
            const hostInfo = await this.client.host(match.ip_str)
            return this.parseHostInfo(hostInfo)
          } catch {
            return this.parseHostInfo(match)
          }
        })
      )
      
      // Analyze security posture
      const securityAnalysis = this.analyzeSecurityPosture(results.matches)
      
      const duration = Date.now() - startTime
      this.logger.metric('Shodan search completed', {
        org,
        hostsFound: results.total,
        duration
      })
      
      return {
        source: 'shodan',
        success: true,
        data: {
          organization: org,
          totalHosts: results.total,
          hosts: hosts,
          infrastructure: {
            ports: results.facets?.port || [],
            products: results.facets?.product || [],
            operatingSystems: results.facets?.os || [],
            countries: results.facets?.country || []
          },
          securityAnalysis,
          vulnerabilities: this.extractVulnerabilities(results.matches),
          services: this.extractServices(results.matches),
          certificates: this.extractCertificates(results.matches)
        },
        reliability: 0.9,
        cost: 0.001, // Shodan query cost
        duration
      }
    } catch (error) {
      this.logger.error('Shodan search failed', error)
      return {
        source: 'shodan',
        success: false,
        error: error.message
      }
    }
  }
  
  private parseHostInfo(host: any): any {
    return {
      ip: host.ip_str,
      hostname: host.hostnames?.[0] || host.domains?.[0] || null,
      ports: host.ports || [],
      os: host.os,
      location: {
        country: host.country_name,
        city: host.city,
        latitude: host.latitude,
        longitude: host.longitude
      },
      isp: host.isp,
      lastUpdate: host.last_update,
      vulnerabilities: host.vulns || [],
      services: this.extractHostServices(host)
    }
  }
  
  private extractHostServices(host: any): any[] {
    const services = []
    
    if (host.data) {
      host.data.forEach(service => {
        services.push({
          port: service.port,
          transport: service.transport,
          product: service.product,
          version: service.version,
          banner: service.data?.substring(0, 200)
        })
      })
    }
    
    return services
  }
  
  private analyzeSecurityPosture(hosts: any[]): any {
    const analysis = {
      exposedDatabases: 0,
      unencryptedServices: 0,
      outdatedSoftware: 0,
      criticalPorts: [],
      riskLevel: 'low'
    }
    
    const criticalPorts = [22, 23, 445, 3389, 3306, 5432, 27017, 9200]
    const dbPorts = [3306, 5432, 27017, 6379, 9200, 5984]
    
    hosts.forEach(host => {
      // Check for exposed databases
      if (host.ports?.some(port => dbPorts.includes(port))) {
        analysis.exposedDatabases++
      }
      
      // Check for unencrypted services
      if (host.ports?.includes(21) || host.ports?.includes(23)) {
        analysis.unencryptedServices++
      }
      
      // Check for critical ports
      host.ports?.forEach(port => {
        if (criticalPorts.includes(port)) {
          analysis.criticalPorts.push(port)
        }
      })
      
      // Check for outdated software
      if (host.vulns?.length > 0) {
        analysis.outdatedSoftware++
      }
    })
    
    // Calculate risk level
    const riskScore = 
      analysis.exposedDatabases * 3 +
      analysis.unencryptedServices * 2 +
      analysis.outdatedSoftware * 2 +
      analysis.criticalPorts.length
    
    if (riskScore > 10) analysis.riskLevel = 'high'
    else if (riskScore > 5) analysis.riskLevel = 'medium'
    
    return analysis
  }
  
  private extractVulnerabilities(hosts: any[]): any[] {
    const vulns = new Map<string, any>()
    
    hosts.forEach(host => {
      host.vulns?.forEach(vuln => {
        if (!vulns.has(vuln)) {
          vulns.set(vuln, {
            cve: vuln,
            affectedHosts: 1,
            severity: this.getCVESeverity(vuln)
          })
        } else {
          vulns.get(vuln).affectedHosts++
        }
      })
    })
    
    return Array.from(vulns.values())
      .sort((a, b) => b.affectedHosts - a.affectedHosts)
  }
  
  private getCVESeverity(cve: string): string {
    // In production, would look up CVSS score
    // For now, use simple heuristic
    const year = parseInt(cve.split('-')[1])
    const currentYear = new Date().getFullYear()
    
    if (currentYear - year > 5) return 'critical'
    if (currentYear - year > 2) return 'high'
    if (currentYear - year > 1) return 'medium'
    return 'low'
  }
  
  private extractServices(hosts: any[]): any {
    const services = new Map<string, number>()
    
    hosts.forEach(host => {
      host.data?.forEach(item => {
        const service = item.product || item._shodan?.module || 'unknown'
        services.set(service, (services.get(service) || 0) + 1)
      })
    })
    
    return Array.from(services.entries())
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
  }
  
  private extractCertificates(hosts: any[]): any[] {
    const certs = []
    
    hosts.forEach(host => {
      host.data?.forEach(item => {
        if (item.ssl?.cert) {
          certs.push({
            subject: item.ssl.cert.subject,
            issuer: item.ssl.cert.issuer,
            expires: item.ssl.cert.expires,
            signatureAlgorithm: item.ssl.cert.sig_alg,
            host: host.ip_str
          })
        }
      })
    })
    
    return certs
  }
}
```

#### Service Costs & API Keys

| Service | Free Tier | Paid Tiers | API Key Required |
|---------|-----------|------------|------------------|
| **Government Sources** | | | |
| SEC EDGAR | Unlimited | N/A | No |
| USPTO | Unlimited | N/A | No |
| Data.gov | Unlimited | N/A | Some datasets |
| Companies House | 600/month | £4/1000 requests | Yes |
| **OSINT Tools** | | | |
| Shodan | 100 results/month | $59-899/month | Yes |
| SpiderFoot | Open source | $299-899/month (HX) | No (self-hosted) |
| TheHarvester | Open source | N/A | No |
| Maltego | Community Edition | $1,999-4,999/year | Yes |
| **Academic Sources** | | | |
| CORE | Unlimited | N/A | Optional |
| OpenAlex | Unlimited | N/A | No |
| Semantic Scholar | 5000/day | Contact for higher | Optional |
| **Dark Web (Optional)** | | | |
| DarkOwl | No free tier | $50,000+/year | Yes |
| Flare | Trial available | $15,000+/year | Yes |
| Sixgill | No free tier | $30,000+/year | Yes |

### 2.3 Unified Search Interface

#### Source Manager Implementation
```typescript
// lib/company-intelligence/data-sources/core/source-manager.ts
import { BaseDataSource } from './base-source'
import { SECEdgarSource } from '../government/sec-edgar-source'
import { USPTOSource } from '../government/uspto-source'
import { ShodanSource } from '../osint/shodan-source'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface UnifiedSearchQuery {
  query: string
  sources?: string[] // If not specified, search all
  filters?: {
    dateRange?: { start: Date; end: Date }
    reliability?: number // Minimum reliability score
    maxCost?: number // Maximum cost per source
  }
  options?: {
    parallel?: boolean // Run searches in parallel
    timeout?: number // Timeout per source
    includeRawData?: boolean
  }
}

export class SourceManager {
  private sources = new Map<string, BaseDataSource>()
  private logger = permanentLogger.create('SourceManager')
  
  constructor() {
    this.registerDefaultSources()
  }
  
  private registerDefaultSources() {
    // Government sources (free, no API key)
    this.register(new SECEdgarSource())
    this.register(new USPTOSource())
    
    // OSINT sources (require API keys)
    if (process.env.SHODAN_API_KEY) {
      this.register(new ShodanSource())
    }
    
    // Add more sources as configured
    this.logger.log('Sources registered', {
      count: this.sources.size,
      sources: Array.from(this.sources.keys())
    })
  }
  
  register(source: BaseDataSource) {
    this.sources.set(source.id, source)
    this.logger.log('Source registered', {
      id: source.id,
      type: source.type
    })
  }
  
  async search(query: UnifiedSearchQuery): Promise<any> {
    const startTime = Date.now()
    this.logger.log('Unified search started', query)
    
    // Select sources to search
    const sourcesToSearch = this.selectSources(query)
    
    // Execute searches
    const results = query.options?.parallel
      ? await this.searchParallel(sourcesToSearch, query)
      : await this.searchSequential(sourcesToSearch, query)
    
    // Aggregate and normalize results
    const aggregated = this.aggregateResults(results)
    
    // Calculate reliability score
    const reliability = this.calculateReliability(results)
    
    const duration = Date.now() - startTime
    this.logger.metric('Unified search completed', {
      query: query.query,
      sourcesSearched: sourcesToSearch.length,
      resultsFound: results.filter(r => r.success).length,
      duration
    })
    
    return {
      query: query.query,
      timestamp: new Date().toISOString(),
      duration,
      sources: {
        total: sourcesToSearch.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      results: aggregated,
      reliability,
      totalCost: results.reduce((sum, r) => sum + (r.cost || 0), 0),
      rawResults: query.options?.includeRawData ? results : undefined
    }
  }
  
  private selectSources(query: UnifiedSearchQuery): BaseDataSource[] {
    let sources = Array.from(this.sources.values())
    
    // Filter by requested sources
    if (query.sources?.length) {
      sources = sources.filter(s => query.sources!.includes(s.id))
    }
    
    // Filter by reliability
    if (query.filters?.reliability) {
      sources = sources.filter(s => 
        s.getReliabilityScore() >= query.filters!.reliability!
      )
    }
    
    // Filter by cost
    if (query.filters?.maxCost !== undefined) {
      sources = sources.filter(s => 
        s.getEstimatedCost() <= query.filters!.maxCost!
      )
    }
    
    // Filter by enabled status
    sources = sources.filter(s => s.isEnabled())
    
    return sources
  }
  
  private async searchParallel(
    sources: BaseDataSource[],
    query: UnifiedSearchQuery
  ): Promise<any[]> {
    const promises = sources.map(source => 
      this.searchSingleSource(source, query)
        .catch(error => ({
          source: source.id,
          success: false,
          error: error.message
        }))
    )
    
    return await Promise.all(promises)
  }
  
  private async searchSequential(
    sources: BaseDataSource[],
    query: UnifiedSearchQuery
  ): Promise<any[]> {
    const results = []
    
    for (const source of sources) {
      try {
        const result = await this.searchSingleSource(source, query)
        results.push(result)
      } catch (error) {
        results.push({
          source: source.id,
          success: false,
          error: error.message
        })
      }
    }
    
    return results
  }
  
  private async searchSingleSource(
    source: BaseDataSource,
    query: UnifiedSearchQuery
  ): Promise<any> {
    const timeout = query.options?.timeout || 30000
    
    return await Promise.race([
      source.search(query.query),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ])
  }
  
  private aggregateResults(results: any[]): any {
    const aggregated = {
      company: {},
      financial: {},
      intellectual_property: {},
      infrastructure: {},
      people: {},
      news: [],
      social: {}
    }
    
    results.forEach(result => {
      if (!result.success) return
      
      switch (result.source) {
        case 'sec-edgar':
          aggregated.financial = {
            ...aggregated.financial,
            ...result.data
          }
          break
        
        case 'uspto':
          aggregated.intellectual_property = {
            ...aggregated.intellectual_property,
            patents: result.data
          }
          break
        
        case 'shodan':
          aggregated.infrastructure = {
            ...aggregated.infrastructure,
            ...result.data
          }
          break
        
        // Add more source mappings
      }
    })
    
    return aggregated
  }
  
  private calculateReliability(results: any[]): number {
    const successfulResults = results.filter(r => r.success)
    if (successfulResults.length === 0) return 0
    
    const totalReliability = successfulResults.reduce(
      (sum, r) => sum + (r.reliability || 0.5),
      0
    )
    
    return totalReliability / successfulResults.length
  }
}
```

### 2.4 UI Implementation

#### Multi-Source Search Interface
```tsx
// components/company-intelligence/multi-source-search.tsx
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TreeGridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Toolbar,
  ExcelExport,
  Inject
} from '@syncfusion/ej2-react-treegrid'
import {
  DiagramComponent,
  NodeModel,
  ConnectorModel,
  Inject as DiagramInject,
  DataBinding,
  HierarchicalTree
} from '@syncfusion/ej2-react-diagrams'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface MultiSourceSearchProps {
  onSearchComplete: (results: any) => void
}

export function MultiSourceSearch({ onSearchComplete }: MultiSourceSearchProps) {
  const logger = permanentLogger.create('MultiSourceSearch')
  const [query, setQuery] = useState('')
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [costEstimate, setCostEstimate] = useState(0)
  
  const sources = [
    // Government (Free)
    { id: 'sec-edgar', name: 'SEC EDGAR', category: 'government', cost: 0, reliability: 1.0 },
    { id: 'uspto', name: 'USPTO Patents', category: 'government', cost: 0, reliability: 1.0 },
    { id: 'data-gov', name: 'Data.gov', category: 'government', cost: 0, reliability: 1.0 },
    
    // OSINT (Paid/Free)
    { id: 'shodan', name: 'Shodan', category: 'osint', cost: 0.001, reliability: 0.9 },
    { id: 'spiderfoot', name: 'SpiderFoot', category: 'osint', cost: 0, reliability: 0.8 },
    { id: 'theharvester', name: 'TheHarvester', category: 'osint', cost: 0, reliability: 0.7 },
    { id: 'maltego', name: 'Maltego', category: 'osint', cost: 0.01, reliability: 0.85 },
    
    // Academic (Free)
    { id: 'core', name: 'CORE', category: 'academic', cost: 0, reliability: 0.9 },
    { id: 'openalex', name: 'OpenAlex', category: 'academic', cost: 0, reliability: 0.9 },
    { id: 'semantic-scholar', name: 'Semantic Scholar', category: 'academic', cost: 0, reliability: 0.95 },
    
    // Dark Web (Enterprise)
    { id: 'darkowl', name: 'DarkOwl', category: 'darkweb', cost: 1.0, reliability: 0.8 },
    { id: 'flare', name: 'Flare', category: 'darkweb', cost: 0.5, reliability: 0.85 },
  ]
  
  useEffect(() => {
    // Calculate cost estimate
    const estimate = selectedSources.reduce((sum, sourceId) => {
      const source = sources.find(s => s.id === sourceId)
      return sum + (source?.cost || 0)
    }, 0)
    setCostEstimate(estimate)
  }, [selectedSources])
  
  const handleSearch = async () => {
    setSearching(true)
    logger.log('Starting multi-source search', {
      query,
      sources: selectedSources
    })
    
    try {
      const response = await fetch('/api/company-intelligence/multi-source-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          sources: selectedSources,
          options: {
            parallel: true,
            timeout: 30000
          }
        })
      })
      
      const data = await response.json()
      setResults(data)
      onSearchComplete(data)
      
      logger.log('Search completed', {
        sourcesSearched: data.sources.total,
        successful: data.sources.successful
      })
    } catch (error) {
      logger.error('Search failed', error)
    } finally {
      setSearching(false)
    }
  }
  
  const renderSourceSelector = () => (
    <div className="space-y-4">
      {['government', 'osint', 'academic', 'darkweb'].map(category => (
        <div key={category}>
          <h4 className="text-sm font-medium mb-2 capitalize">{category} Sources</h4>
          <div className="grid grid-cols-2 gap-2">
            {sources
              .filter(s => s.category === category)
              .map(source => (
                <div key={source.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={source.id}
                    checked={selectedSources.includes(source.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedSources([...selectedSources, source.id])
                      } else {
                        setSelectedSources(selectedSources.filter(id => id !== source.id))
                      }
                    }}
                  />
                  <label 
                    htmlFor={source.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    {source.name}
                    <TooltipWrapper content={`Cost: $${source.cost}/query | Reliability: ${source.reliability * 100}%`}>
                      <div className="flex gap-1">
                        {source.cost === 0 && <Badge variant="success" className="text-xs">Free</Badge>}
                        {source.cost > 0 && <Badge variant="outline" className="text-xs">${source.cost}</Badge>}
                      </div>
                    </TooltipWrapper>
                  </label>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
  
  const renderResults = () => {
    if (!results) return null
    
    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="intellectual">IP & Patents</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{results.sources.successful}</div>
                <p className="text-xs text-muted-foreground">Successful Sources</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{(results.reliability * 100).toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">Data Reliability</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">${results.totalCost.toFixed(3)}</div>
                <p className="text-xs text-muted-foreground">Search Cost</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="financial">
          {results.results.financial && (
            <TreeGridComponent
              dataSource={formatFinancialData(results.results.financial)}
              treeColumnIndex={0}
              childMapping="children"
              allowPaging={true}
              pageSettings={{ pageSize: 10 }}
              toolbar={['ExcelExport']}
            >
              <ColumnsDirective>
                <ColumnDirective field="metric" headerText="Metric" width="200" />
                <ColumnDirective field="value" headerText="Value" width="150" />
                <ColumnDirective field="date" headerText="Date" width="100" />
                <ColumnDirective field="source" headerText="Source" width="100" />
              </ColumnsDirective>
              <Inject services={[Page, Toolbar, ExcelExport]} />
            </TreeGridComponent>
          )}
        </TabsContent>
        
        <TabsContent value="intellectual">
          {results.results.intellectual_property && (
            <div className="space-y-4">
              <div className="text-lg font-semibold">
                Patents: {results.results.intellectual_property.patents?.totalPatents || 0}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {results.results.intellectual_property.patents?.patents?.slice(0, 10).map((patent, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <div className="font-medium">{patent.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Patent #{patent.patentNumber} | Filed: {patent.filingDate}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="infrastructure">
          {results.results.infrastructure && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>Open Ports</CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {results.results.infrastructure.infrastructure?.ports?.slice(0, 10).map(port => (
                        <Badge key={port.value} variant="outline">
                          {port.value}: {port.count}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>Technologies</CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {results.results.infrastructure.infrastructure?.products?.slice(0, 10).map(product => (
                        <Badge key={product.value} variant="secondary">
                          {product.value}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {results.results.infrastructure.securityAnalysis && (
                <Card>
                  <CardHeader>Security Analysis</CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Risk Level</span>
                        <Badge variant={
                          results.results.infrastructure.securityAnalysis.riskLevel === 'high' ? 'destructive' :
                          results.results.infrastructure.securityAnalysis.riskLevel === 'medium' ? 'warning' :
                          'success'
                        }>
                          {results.results.infrastructure.securityAnalysis.riskLevel}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Exposed Databases</span>
                        <span>{results.results.infrastructure.securityAnalysis.exposedDatabases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vulnerabilities</span>
                        <span>{results.results.infrastructure.vulnerabilities?.length || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="relationships">
          <div className="h-96">
            <DiagramComponent
              width="100%"
              height="100%"
              nodes={generateRelationshipNodes(results)}
              connectors={generateRelationshipConnectors(results)}
              layout={{
                type: 'HierarchicalTree',
                margin: { top: 20, bottom: 20, left: 20, right: 20 },
                horizontalSpacing: 40,
                verticalSpacing: 40
              }}
            >
              <DiagramInject services={[DataBinding, HierarchicalTree]} />
            </DiagramComponent>
          </div>
        </TabsContent>
      </Tabs>
    )
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Multi-Source Intelligence Search</h3>
          <div className="flex gap-2">
            <TooltipWrapper content="Estimated cost for this search">
              <Badge variant="outline">
                Est. Cost: ${costEstimate.toFixed(3)}
              </Badge>
            </TooltipWrapper>
            <TooltipWrapper content="Number of sources selected">
              <Badge variant="secondary">
                {selectedSources.length} Sources
              </Badge>
            </TooltipWrapper>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input
            placeholder="Enter company name or domain..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <TooltipWrapper content="Search across all selected data sources">
            <Button 
              onClick={handleSearch}
              disabled={!query || selectedSources.length === 0 || searching}
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </TooltipWrapper>
        </div>
        
        {!results && renderSourceSelector()}
        {results && renderResults()}
      </CardContent>
    </Card>
  )
}

function formatFinancialData(financial: any): any[] {
  // Format financial data for TreeGrid
  return []
}

function generateRelationshipNodes(results: any): NodeModel[] {
  // Generate nodes for relationship diagram
  return []
}

function generateRelationshipConnectors(results: any): ConnectorModel[] {
  // Generate connectors for relationship diagram
  return []
}
```

---

## 📊 Database Schema

### New Tables for Phase 2
```sql
-- Data source registry
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  source_id TEXT UNIQUE NOT NULL,
  source_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'government', 'osint', 'academic', 'darkweb'
  enabled BOOLEAN DEFAULT true,
  
  -- API configuration
  requires_api_key BOOLEAN DEFAULT false,
  api_key_configured BOOLEAN DEFAULT false,
  api_endpoint TEXT,
  
  -- Metrics
  reliability_score DECIMAL(3,2), -- 0.00 to 1.00
  average_response_time_ms INTEGER,
  success_rate DECIMAL(3,2),
  
  -- Cost tracking
  cost_per_query DECIMAL(10,4),
  monthly_quota INTEGER,
  quota_used INTEGER DEFAULT 0,
  
  INDEX idx_data_sources_category (category),
  INDEX idx_data_sources_enabled (enabled)
);

-- Search history
CREATE TABLE multi_source_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES research_sessions(id),
  
  query TEXT NOT NULL,
  sources_requested TEXT[], -- Array of source IDs
  sources_completed TEXT[], -- Sources that returned results
  
  -- Results summary
  total_results INTEGER,
  reliability_score DECIMAL(3,2),
  total_cost DECIMAL(10,4),
  duration_ms INTEGER,
  
  -- Cached results
  results JSONB,
  cache_expires_at TIMESTAMPTZ,
  
  INDEX idx_searches_user (user_id),
  INDEX idx_searches_query (query),
  INDEX idx_searches_created (created_at DESC)
);

-- Source-specific data storage
CREATE TABLE source_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  search_id UUID REFERENCES multi_source_searches(id),
  source_id TEXT REFERENCES data_sources(source_id),
  
  -- Raw data from source
  raw_data JSONB,
  
  -- Normalized data
  normalized_data JSONB,
  
  -- Metadata
  reliability DECIMAL(3,2),
  cost DECIMAL(10,4),
  response_time_ms INTEGER,
  error_message TEXT,
  
  INDEX idx_source_data_search (search_id),
  INDEX idx_source_data_source (source_id)
);
```

---

## 🧪 Testing Plan

### Test Suite for Phase 2
```typescript
// test-phase-2-data-sources.ts
import { describe, test, expect } from 'vitest'
import { SECEdgarSource } from '@/lib/company-intelligence/data-sources/government/sec-edgar-source'
import { USPTOSource } from '@/lib/company-intelligence/data-sources/government/uspto-source'
import { ShodanSource } from '@/lib/company-intelligence/data-sources/osint/shodan-source'
import { SourceManager } from '@/lib/company-intelligence/data-sources/core/source-manager'

describe('Phase 2: Data Sources & OSINT Integration', () => {
  describe('Government Sources', () => {
    test('SEC EDGAR should retrieve financial filings', async () => {
      const source = new SECEdgarSource()
      const result = await source.searchCompany('Apple')
      
      expect(result.success).toBe(true)
      expect(result.data.cik).toBeDefined()
      expect(result.data.filings).toBeInstanceOf(Array)
      expect(result.cost).toBe(0) // Free!
    })
    
    test('USPTO should find patents', async () => {
      const source = new USPTOSource()
      const result = await source.searchPatents('Apple Inc')
      
      expect(result.success).toBe(true)
      expect(result.data.totalPatents).toBeGreaterThan(0)
      expect(result.data.patents).toBeInstanceOf(Array)
    })
  })
  
  describe('OSINT Sources', () => {
    test('Shodan should find infrastructure', async () => {
      if (!process.env.SHODAN_API_KEY) {
        console.log('Skipping Shodan test - no API key')
        return
      }
      
      const source = new ShodanSource()
      const result = await source.searchOrganization('Google')
      
      expect(result.success).toBe(true)
      expect(result.data.totalHosts).toBeGreaterThan(0)
      expect(result.data.infrastructure).toBeDefined()
    })
  })
  
  describe('Unified Search', () => {
    test('should search multiple sources in parallel', async () => {
      const manager = new SourceManager()
      const result = await manager.search({
        query: 'Microsoft',
        sources: ['sec-edgar', 'uspto'],
        options: {
          parallel: true,
          timeout: 10000
        }
      })
      
      expect(result.sources.total).toBe(2)
      expect(result.results).toBeDefined()
      expect(result.totalCost).toBeDefined()
    })
    
    test('should respect cost limits', async () => {
      const manager = new SourceManager()
      const result = await manager.search({
        query: 'Test Company',
        filters: {
          maxCost: 0 // Only free sources
        }
      })
      
      expect(result.totalCost).toBe(0)
    })
  })
  
  describe('UI Components', () => {
    test('should display source selector', async () => {
      const { container } = render(<MultiSourceSearch />)
      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      
      expect(checkboxes.length).toBeGreaterThan(10) // Many sources
    })
    
    test('should calculate cost estimate', async () => {
      const { container } = render(<MultiSourceSearch />)
      // Select paid sources and verify cost calculation
    })
  })
})
```

---

## 📋 Implementation Checklist

### Week 1 Tasks
- [ ] Implement SEC EDGAR source
- [ ] Implement USPTO source
- [ ] Implement Data.gov source
- [ ] Create Shodan integration
- [ ] Set up SpiderFoot (self-hosted)
- [ ] Integrate TheHarvester
- [ ] Create source registry system
- [ ] Implement rate limiting
- [ ] Add data normalization
- [ ] Create unified search manager

### Week 2 Tasks
- [ ] Add academic sources (CORE, OpenAlex)
- [ ] Implement Semantic Scholar
- [ ] Create multi-source UI
- [ ] Add results visualization
- [ ] Implement caching system
- [ ] Create cost tracking
- [ ] Add reliability scoring
- [ ] Build relationship mapper
- [ ] Add comprehensive tests
- [ ] Update manifest.json

---

## 💰 Cost Analysis

### Monthly Cost Estimate (100 searches/day)
| Service | Usage | Cost |
|---------|-------|------|
| Government Sources | 3000 queries | $0 |
| Shodan (Small Business) | 3000 queries | $59/month |
| Maltego (Classic) | Unlimited | $166/month ($1999/year) |
| Academic Sources | 3000 queries | $0 |
| **Total (Basic)** | | **$59/month** |
| **Total (with Maltego)** | | **$225/month** |

### Enterprise Options (Optional)
| Service | Annual Cost | Use Case |
|---------|------------|----------|
| DarkOwl | $50,000+ | Brand monitoring, threat detection |
| Flare | $15,000+ | Automated threat alerts |
| Recorded Future | Custom | Predictive intelligence |
| ZoomInfo | $15,000+ | B2B contact enrichment |

### ROI Calculation
- Manual research: 4 hours/company × 3 companies/day = 12 hours/day
- Automated: 5 min/company × 3 companies/day = 15 minutes/day
- Time saved: 11.75 hours/day
- Value at $75/hour: $881.25/day saved
- **ROI: 1,176% in first month (basic plan)**

---

## 🚀 Deployment Steps

### Environment Variables
```bash
# Add to .env.local

# OSINT Sources (Optional but recommended)
SHODAN_API_KEY=your_api_key_here
MALTEGO_API_KEY=your_api_key_here

# Academic Sources (Optional)
SEMANTIC_SCHOLAR_API_KEY=your_api_key_here

# Dark Web (Enterprise only)
DARKOWL_API_KEY=your_api_key_here
FLARE_API_KEY=your_api_key_here
```

### API Key Setup Instructions

#### Shodan
1. Sign up at https://account.shodan.io/register
2. Choose plan (Free or Small Business $59/month)
3. Get API key from https://account.shodan.io
4. Add to environment variables

#### Maltego
1. Download from https://www.maltego.com/downloads/
2. Register for Community Edition (free) or Classic ($1999/year)
3. Get transform API key from account settings
4. Add to environment variables

#### SpiderFoot (Self-Hosted)
```bash
# Install via Docker
docker pull spiderfoot/spiderfoot
docker run -p 5001:5001 spiderfoot/spiderfoot

# Or install directly
git clone https://github.com/smicallef/spiderfoot.git
cd spiderfoot
pip install -r requirements.txt
python sf.py -l 127.0.0.1:5001
```

### Database Migration
```bash
# Apply Phase 2 migrations
npm run supabase:migrate -- --name phase_2_data_sources
```

---

## 📝 Notes & Recommendations

### Critical Success Factors
1. Start with free government sources for immediate value
2. Add Shodan for infrastructure intelligence ($59/month good value)
3. Self-host SpiderFoot for free OSINT capabilities
4. Consider Maltego for relationship mapping if budget allows
5. Dark web monitoring only for enterprise clients

### Integration Priority
1. **High Priority**: SEC EDGAR, USPTO (free, high value)
2. **Medium Priority**: Shodan, SpiderFoot (infrastructure/OSINT)
3. **Low Priority**: Dark web monitoring (expensive, niche)

### Next Phase Dependencies
- Phase 3 (Enrichers) benefits from these data sources
- Phase 4 (GPT-5) can analyze data from all sources
- Phase 5 (Database) needs schema for source data

---

## 🔗 Resources & Documentation

### Government APIs
- [SEC EDGAR API Docs](https://www.sec.gov/edgar/sec-api-documentation)
- [USPTO API Portal](https://developer.uspto.gov/)
- [Data.gov API](https://www.data.gov/developers/apis)

### OSINT Tools
- [Shodan API](https://developer.shodan.io/api)
- [SpiderFoot Docs](https://www.spiderfoot.net/documentation/)
- [TheHarvester Wiki](https://github.com/laramies/theHarvester/wiki)
- [Maltego Docs](https://docs.maltego.com/)

### Academic APIs
- [CORE API](https://core.ac.uk/documentation/api/)
- [OpenAlex Docs](https://docs.openalex.org/)
- [Semantic Scholar API](https://api.semanticscholar.org/)