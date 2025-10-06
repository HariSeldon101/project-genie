# Phase 3: Enricher Activation & Enhancement
*Activate dormant enrichers and add new enrichment capabilities*

## 📚 Related Documents
- [Shared Content & Standards](./company-intelligence-shared-content.md)
- [Phase 1: Advanced Scraping](./phase-1-advanced-scraping.md)
- [Phase 2: Data Sources & OSINT](./phase-2-data-sources-osint.md)
- [Phase 4: GPT-5 Optimization](./phase-4-gpt5-llm-optimization.md)
- [Phase 5: Database & Performance](./phase-5-database-performance.md)

---

## 🎯 Phase 3 Overview

### Objectives
1. Activate all 9 dormant enrichers (currently only 1/9 active)
2. Add 5+ new enrichment capabilities
3. Implement smart enrichment pipeline with priority ordering
4. Add cost optimization and caching
5. Create comprehensive enrichment UI with cost tracking

### Timeline
- **Duration**: 2 weeks
- **Dependencies**: Phase 1 (scraping) and Phase 2 (data sources)
- **Team Size**: 1-2 developers

### Success Metrics
- Enrichers active: 15+ (from current 1)
- Data enrichment rate: >90%
- Cost per enrichment: <$0.50
- Cache hit rate: >60%
- Zero enrichment failures due to rate limiting

---

## 🏗️ Architecture Design

### Component Structure
```
lib/company-intelligence/enrichers/
├── core/
│   ├── enrichment-pipeline.ts    # Main orchestrator
│   ├── enricher-registry.ts      # Auto-discovery
│   ├── base-enricher.ts         # Base class
│   └── enrichment-cache.ts      # Smart caching
├── existing/ (Currently dormant - will activate)
│   ├── social-media-enricher.ts  # Social presence
│   ├── news-enricher.ts         # News mentions
│   ├── linkedin-enricher.ts     # Professional data
│   ├── google-business-enricher.ts # Business info
│   ├── industry-enricher.ts     # Industry analysis
│   ├── competitor-enricher.ts   # Competitive intel
│   ├── financial-enricher.ts    # Financial data (ACTIVE)
│   └── news-regulatory-enricher.ts # Regulatory news
├── new/ (To be added)
│   ├── dns-infrastructure-enricher.ts # DNS/SSL data
│   ├── technology-stack-enricher.ts   # Tech detection
│   ├── sentiment-analysis-enricher.ts # Brand sentiment
│   ├── patent-ip-enricher.ts         # IP analysis
│   └── market-data-enricher.ts       # Market metrics
└── utils/
    ├── cost-calculator.ts         # Cost estimation
    ├── rate-limiter.ts           # API rate management
    └── data-validator.ts         # Quality checks
```

---

## 🔧 Implementation Details

### 3.1 Enrichment Pipeline Architecture

```typescript
// lib/company-intelligence/enrichers/core/enrichment-pipeline.ts
import { BaseEnricher } from './base-enricher'
import { EnrichmentCache } from './enrichment-cache'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { supabase } from '@/lib/supabase/client'

export interface EnrichmentRequest {
  sessionId: string
  domain: string
  data: any // Data to enrich
  enrichers?: string[] // Specific enrichers to use
  options?: {
    maxCost?: number
    priority?: 'speed' | 'quality' | 'cost'
    useCache?: boolean
    parallel?: boolean
  }
}

export interface EnrichmentResult {
  success: boolean
  enrichedData: any
  metrics: {
    enrichersUsed: string[]
    totalCost: number
    duration: number
    cacheHits: number
    errors: any[]
  }
}

export class EnrichmentPipeline {
  private enrichers = new Map<string, BaseEnricher>()
  private cache: EnrichmentCache
  private logger = permanentLogger.create('EnrichmentPipeline')
  
  constructor() {
    this.cache = new EnrichmentCache()
    this.autoDiscoverEnrichers()
  }
  
  private async autoDiscoverEnrichers() {
    // Import all enrichers from the enrichers directory
    const enricherModules = import.meta.glob('../**/*-enricher.ts')
    
    for (const path in enricherModules) {
      try {
        const module = await enricherModules[path]() as any
        const EnricherClass = module.default || module[Object.keys(module)[0]]
        
        if (EnricherClass && typeof EnricherClass === 'function') {
          const enricher = new EnricherClass()
          if (enricher instanceof BaseEnricher) {
            this.register(enricher)
          }
        }
      } catch (error) {
        this.logger.error(`Failed to load enricher from ${path}`, error)
      }
    }
    
    this.logger.log('Enrichers auto-discovered', {
      count: this.enrichers.size,
      enrichers: Array.from(this.enrichers.keys())
    })
    
    // Update manifest with discovered enrichers
    await this.updateManifest()
  }
  
  register(enricher: BaseEnricher) {
    this.enrichers.set(enricher.id, enricher)
    this.logger.log('Enricher registered', {
      id: enricher.id,
      name: enricher.name,
      enabled: enricher.enabled
    })
  }
  
  async enrich(request: EnrichmentRequest): Promise<EnrichmentResult> {
    const startTime = Date.now()
    this.logger.log('Starting enrichment', {
      sessionId: request.sessionId,
      domain: request.domain,
      requestedEnrichers: request.enrichers
    })
    
    try {
      // Select and prioritize enrichers
      const selectedEnrichers = this.selectEnrichers(request)
      
      // Check cache for existing enrichments
      const cacheResults = request.options?.useCache !== false
        ? await this.checkCache(request, selectedEnrichers)
        : { hits: [], misses: selectedEnrichers }
      
      // Run enrichments
      const results = request.options?.parallel
        ? await this.runParallel(request, cacheResults.misses)
        : await this.runSequential(request, cacheResults.misses)
      
      // Combine cached and new results
      const allResults = [...cacheResults.hits, ...results]
      
      // Aggregate enriched data
      const enrichedData = this.aggregateResults(request.data, allResults)
      
      // Calculate metrics
      const metrics = {
        enrichersUsed: allResults.map(r => r.enricher),
        totalCost: allResults.reduce((sum, r) => sum + r.cost, 0),
        duration: Date.now() - startTime,
        cacheHits: cacheResults.hits.length,
        errors: allResults.filter(r => !r.success).map(r => ({
          enricher: r.enricher,
          error: r.error
        }))
      }
      
      // Store results
      await this.storeResults(request, enrichedData, metrics)
      
      this.logger.metric('Enrichment completed', metrics)
      
      return {
        success: true,
        enrichedData,
        metrics
      }
    } catch (error) {
      this.logger.error('Enrichment failed', error)
      return {
        success: false,
        enrichedData: request.data,
        metrics: {
          enrichersUsed: [],
          totalCost: 0,
          duration: Date.now() - startTime,
          cacheHits: 0,
          errors: [{ error: error.message }]
        }
      }
    }
  }
  
  private selectEnrichers(request: EnrichmentRequest): BaseEnricher[] {
    let enrichers = Array.from(this.enrichers.values())
    
    // Filter by requested enrichers
    if (request.enrichers?.length) {
      enrichers = enrichers.filter(e => request.enrichers!.includes(e.id))
    }
    
    // Filter by enabled status
    enrichers = enrichers.filter(e => e.enabled)
    
    // Filter by cost limit
    if (request.options?.maxCost !== undefined) {
      enrichers = enrichers.filter(e => 
        e.getEstimatedCost() <= request.options!.maxCost!
      )
    }
    
    // Sort by priority
    enrichers = this.prioritizeEnrichers(enrichers, request.options?.priority)
    
    return enrichers
  }
  
  private prioritizeEnrichers(
    enrichers: BaseEnricher[],
    priority?: 'speed' | 'quality' | 'cost'
  ): BaseEnricher[] {
    switch (priority) {
      case 'speed':
        return enrichers.sort((a, b) => a.getAverageTime() - b.getAverageTime())
      
      case 'quality':
        return enrichers.sort((a, b) => b.getQualityScore() - a.getQualityScore())
      
      case 'cost':
        return enrichers.sort((a, b) => a.getEstimatedCost() - b.getEstimatedCost())
      
      default:
        // Default: balance of quality and cost
        return enrichers.sort((a, b) => {
          const scoreA = a.getQualityScore() / (a.getEstimatedCost() + 0.01)
          const scoreB = b.getQualityScore() / (b.getEstimatedCost() + 0.01)
          return scoreB - scoreA
        })
    }
  }
  
  private async checkCache(
    request: EnrichmentRequest,
    enrichers: BaseEnricher[]
  ): Promise<{ hits: any[], misses: BaseEnricher[] }> {
    const hits = []
    const misses = []
    
    for (const enricher of enrichers) {
      const cached = await this.cache.get(
        request.domain,
        enricher.id,
        request.data
      )
      
      if (cached) {
        hits.push({
          enricher: enricher.id,
          data: cached,
          cost: 0,
          fromCache: true,
          success: true
        })
      } else {
        misses.push(enricher)
      }
    }
    
    this.logger.log('Cache check results', {
      hits: hits.length,
      misses: misses.length
    })
    
    return { hits, misses }
  }
  
  private async runParallel(
    request: EnrichmentRequest,
    enrichers: BaseEnricher[]
  ): Promise<any[]> {
    const promises = enrichers.map(enricher =>
      this.runSingleEnricher(enricher, request)
        .catch(error => ({
          enricher: enricher.id,
          success: false,
          error: error.message,
          cost: 0
        }))
    )
    
    return await Promise.all(promises)
  }
  
  private async runSequential(
    request: EnrichmentRequest,
    enrichers: BaseEnricher[]
  ): Promise<any[]> {
    const results = []
    
    for (const enricher of enrichers) {
      try {
        const result = await this.runSingleEnricher(enricher, request)
        results.push(result)
      } catch (error) {
        results.push({
          enricher: enricher.id,
          success: false,
          error: error.message,
          cost: 0
        })
      }
    }
    
    return results
  }
  
  private async runSingleEnricher(
    enricher: BaseEnricher,
    request: EnrichmentRequest
  ): Promise<any> {
    const startTime = Date.now()
    
    const result = await enricher.enrich({
      domain: request.domain,
      data: request.data,
      sessionId: request.sessionId
    })
    
    // Cache successful results
    if (result.success) {
      await this.cache.set(
        request.domain,
        enricher.id,
        request.data,
        result.data
      )
    }
    
    return {
      enricher: enricher.id,
      ...result,
      duration: Date.now() - startTime
    }
  }
  
  private aggregateResults(originalData: any, results: any[]): any {
    const enriched = { ...originalData }
    
    results.forEach(result => {
      if (result.success && result.data) {
        // Merge enrichment data
        Object.assign(enriched, {
          [result.enricher]: result.data
        })
      }
    })
    
    return enriched
  }
  
  private async storeResults(
    request: EnrichmentRequest,
    enrichedData: any,
    metrics: any
  ): Promise<void> {
    try {
      await supabase.from('enrichment_results').insert({
        session_id: request.sessionId,
        domain: request.domain,
        enriched_data: enrichedData,
        metrics,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      this.logger.error('Failed to store enrichment results', error)
    }
  }
  
  private async updateManifest(): Promise<void> {
    // Update PROJECT_MANIFEST.json with enricher status
    const manifest = await import('/PROJECT_MANIFEST.json')
    const enricherStatus = Array.from(this.enrichers.values()).map(e => ({
      name: e.name,
      id: e.id,
      enabled: e.enabled,
      connected: true,
      dataTypes: e.getDataTypes(),
      requiredKeys: e.getRequiredKeys(),
      tables: e.getConnectedTables()
    }))
    
    // Update manifest enrichers section
    // Implementation would update the actual file
  }
}
```

### 3.2 Activate Dormant Enrichers

#### Social Media Enricher Activation
```typescript
// lib/company-intelligence/enrichers/social-media-enricher.ts
import { BaseEnricher } from './core/base-enricher'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export class SocialMediaEnricher extends BaseEnricher {
  constructor() {
    super('social-media', 'Social Media Presence')
    this.enabled = true // ACTIVATE!
    this.logger = permanentLogger.create('SocialMediaEnricher')
  }
  
  async enrich(request: EnrichmentRequest): Promise<EnrichmentResult> {
    this.logger.log('Enriching social media data', { domain: request.domain })
    
    try {
      const socialProfiles = await this.findSocialProfiles(request.domain)
      const engagement = await this.analyzeEngagement(socialProfiles)
      const sentiment = await this.analyzeSentiment(socialProfiles)
      
      return {
        success: true,
        data: {
          profiles: socialProfiles,
          engagement,
          sentiment,
          reach: this.calculateReach(engagement),
          activity: this.analyzeActivity(socialProfiles)
        },
        cost: 0.05, // API costs
        reliability: 0.85
      }
    } catch (error) {
      this.logger.error('Social media enrichment failed', error)
      return {
        success: false,
        error: error.message,
        cost: 0
      }
    }
  }
  
  private async findSocialProfiles(domain: string): Promise<any> {
    const profiles = {
      twitter: null,
      linkedin: null,
      facebook: null,
      instagram: null,
      youtube: null,
      tiktok: null
    }
    
    // Search for social profiles
    // Twitter/X
    try {
      const twitterSearch = await fetch(
        `https://api.twitter.com/2/users/by/username/${domain.replace('.com', '')}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
          }
        }
      )
      if (twitterSearch.ok) {
        profiles.twitter = await twitterSearch.json()
      }
    } catch {}
    
    // LinkedIn Company Search
    try {
      // LinkedIn requires OAuth, using alternative approach
      const linkedinSearch = await fetch(
        `https://www.linkedin.com/company/${domain.replace('.com', '')}`
      )
      if (linkedinSearch.ok) {
        profiles.linkedin = {
          url: linkedinSearch.url,
          exists: true
        }
      }
    } catch {}
    
    // Facebook Graph API
    if (process.env.FACEBOOK_APP_TOKEN) {
      try {
        const fbSearch = await fetch(
          `https://graph.facebook.com/v18.0/search?type=page&q=${domain}&access_token=${process.env.FACEBOOK_APP_TOKEN}`
        )
        if (fbSearch.ok) {
          const data = await fbSearch.json()
          profiles.facebook = data.data?.[0]
        }
      } catch {}
    }
    
    return profiles
  }
  
  private async analyzeEngagement(profiles: any): Promise<any> {
    const engagement = {
      twitter: { followers: 0, engagement_rate: 0 },
      linkedin: { followers: 0, engagement_rate: 0 },
      facebook: { likes: 0, engagement_rate: 0 }
    }
    
    if (profiles.twitter?.data) {
      engagement.twitter = {
        followers: profiles.twitter.data.public_metrics?.followers_count || 0,
        following: profiles.twitter.data.public_metrics?.following_count || 0,
        tweets: profiles.twitter.data.public_metrics?.tweet_count || 0,
        engagement_rate: this.calculateEngagementRate(profiles.twitter.data.public_metrics)
      }
    }
    
    return engagement
  }
  
  private calculateEngagementRate(metrics: any): number {
    if (!metrics || !metrics.followers_count) return 0
    
    const interactions = (metrics.like_count || 0) + 
                        (metrics.retweet_count || 0) + 
                        (metrics.reply_count || 0)
    
    return (interactions / metrics.followers_count) * 100
  }
  
  private async analyzeSentiment(profiles: any): Promise<any> {
    // Would integrate with sentiment analysis API
    return {
      overall: 'positive',
      score: 0.75,
      breakdown: {
        positive: 0.60,
        neutral: 0.30,
        negative: 0.10
      }
    }
  }
  
  private calculateReach(engagement: any): number {
    return Object.values(engagement).reduce((sum: number, platform: any) => {
      return sum + (platform.followers || platform.likes || 0)
    }, 0)
  }
  
  private analyzeActivity(profiles: any): any {
    return {
      mostActive: 'twitter',
      postingFrequency: 'daily',
      lastPost: new Date().toISOString()
    }
  }
  
  getEstimatedCost(): number {
    return 0.05 // Average API costs
  }
  
  getQualityScore(): number {
    return 0.85
  }
  
  getAverageTime(): number {
    return 3000 // 3 seconds
  }
}
```

### 3.3 New Enricher Implementations

#### Technology Stack Enricher
```typescript
// lib/company-intelligence/enrichers/new/technology-stack-enricher.ts
import { BaseEnricher } from '../core/base-enricher'
import Wappalyzer from 'wappalyzer'

export class TechnologyStackEnricher extends BaseEnricher {
  private wappalyzer: any
  
  constructor() {
    super('technology-stack', 'Technology Stack Detection')
    this.enabled = true
    this.wappalyzer = new Wappalyzer()
  }
  
  async enrich(request: EnrichmentRequest): Promise<EnrichmentResult> {
    this.logger.log('Detecting technology stack', { domain: request.domain })
    
    try {
      // Use Wappalyzer for technology detection
      const technologies = await this.wappalyzer.open(request.domain)
        .analyze()
      
      // Categorize technologies
      const categorized = this.categorizeTechnologies(technologies)
      
      // Analyze technology trends
      const trends = this.analyzeTrends(technologies)
      
      // Check for vulnerabilities
      const vulnerabilities = await this.checkVulnerabilities(technologies)
      
      return {
        success: true,
        data: {
          technologies: technologies.technologies,
          categories: categorized,
          trends,
          vulnerabilities,
          techScore: this.calculateTechScore(technologies),
          recommendations: this.generateRecommendations(technologies)
        },
        cost: 0,
        reliability: 0.95
      }
    } catch (error) {
      this.logger.error('Technology stack enrichment failed', error)
      return {
        success: false,
        error: error.message,
        cost: 0
      }
    }
  }
  
  private categorizeTechnologies(tech: any): any {
    const categories = {
      frontend: [],
      backend: [],
      database: [],
      cdn: [],
      analytics: [],
      security: [],
      hosting: [],
      cms: [],
      ecommerce: []
    }
    
    tech.technologies.forEach(t => {
      t.categories.forEach(cat => {
        const catName = cat.name.toLowerCase()
        if (catName.includes('javascript')) categories.frontend.push(t)
        else if (catName.includes('database')) categories.database.push(t)
        else if (catName.includes('cdn')) categories.cdn.push(t)
        else if (catName.includes('analytics')) categories.analytics.push(t)
        else if (catName.includes('security')) categories.security.push(t)
        else if (catName.includes('hosting')) categories.hosting.push(t)
        else if (catName.includes('cms')) categories.cms.push(t)
        else if (catName.includes('ecommerce')) categories.ecommerce.push(t)
        else categories.backend.push(t)
      })
    })
    
    return categories
  }
  
  private analyzeTrends(tech: any): any {
    const modern = ['React', 'Vue', 'Next.js', 'Nuxt.js', 'Svelte']
    const legacy = ['jQuery', 'AngularJS', 'Backbone.js']
    
    const techNames = tech.technologies.map(t => t.name)
    
    return {
      modern: techNames.filter(n => modern.includes(n)),
      legacy: techNames.filter(n => legacy.includes(n)),
      isModern: techNames.some(n => modern.includes(n)),
      needsModernization: techNames.some(n => legacy.includes(n))
    }
  }
  
  private async checkVulnerabilities(tech: any): Promise<any[]> {
    const vulnerabilities = []
    
    // Check for known vulnerable versions
    for (const t of tech.technologies) {
      if (t.version) {
        // Would check CVE database
        // For demo, flag old jQuery versions
        if (t.name === 'jQuery' && t.version < '3.0') {
          vulnerabilities.push({
            technology: t.name,
            version: t.version,
            severity: 'medium',
            cve: 'Multiple XSS vulnerabilities in jQuery < 3.0'
          })
        }
      }
    }
    
    return vulnerabilities
  }
  
  private calculateTechScore(tech: any): number {
    let score = 50 // Base score
    
    // Add points for modern tech
    if (tech.technologies.some(t => ['React', 'Vue', 'Next.js'].includes(t.name))) {
      score += 20
    }
    
    // Add points for security
    if (tech.technologies.some(t => t.categories.some(c => c.name.includes('Security')))) {
      score += 15
    }
    
    // Subtract for legacy tech
    if (tech.technologies.some(t => ['jQuery', 'AngularJS'].includes(t.name))) {
      score -= 10
    }
    
    // Add for performance tools
    if (tech.technologies.some(t => t.categories.some(c => c.name.includes('CDN')))) {
      score += 10
    }
    
    return Math.min(100, Math.max(0, score))
  }
  
  private generateRecommendations(tech: any): string[] {
    const recommendations = []
    
    // Check for missing essentials
    const hasAnalytics = tech.technologies.some(t => 
      t.categories.some(c => c.name.includes('Analytics'))
    )
    if (!hasAnalytics) {
      recommendations.push('Consider adding analytics (Google Analytics, Plausible, etc.)')
    }
    
    const hasCDN = tech.technologies.some(t => 
      t.categories.some(c => c.name.includes('CDN'))
    )
    if (!hasCDN) {
      recommendations.push('Implement CDN for better performance (Cloudflare, Fastly, etc.)')
    }
    
    // Check for legacy tech
    if (tech.technologies.some(t => t.name === 'jQuery')) {
      recommendations.push('Consider migrating from jQuery to modern frameworks')
    }
    
    return recommendations
  }
}
```

### 3.4 Enrichment UI

#### Enrichment Control Panel
```tsx
// components/company-intelligence/enrichment-control-panel.tsx
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { 
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Inject
} from '@syncfusion/ej2-react-grids'
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject as ChartInject,
  PieSeries,
  AccumulationChart,
  AccumulationLegend,
  AccumulationTooltip
} from '@syncfusion/ej2-react-charts'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface EnrichmentControlPanelProps {
  data: any
  onEnrich: (config: EnrichmentConfig) => void
  enrichmentStatus?: EnrichmentStatus
}

export function EnrichmentControlPanel({
  data,
  onEnrich,
  enrichmentStatus
}: EnrichmentControlPanelProps) {
  const logger = permanentLogger.create('EnrichmentControlPanel')
  const [enrichers, setEnrichers] = useState<EnricherConfig[]>([])
  const [selectedEnrichers, setSelectedEnrichers] = useState<string[]>([])
  const [costEstimate, setCostEstimate] = useState(0)
  const [qualityScore, setQualityScore] = useState(0)
  const [timeEstimate, setTimeEstimate] = useState(0)
  
  // Available enrichers with metadata
  const availableEnrichers = [
    // Existing (to activate)
    { id: 'social-media', name: 'Social Media', cost: 0.05, quality: 0.85, time: 3, enabled: false },
    { id: 'news', name: 'News & Media', cost: 0.10, quality: 0.80, time: 5, enabled: false },
    { id: 'linkedin', name: 'LinkedIn', cost: 0.15, quality: 0.90, time: 4, enabled: false },
    { id: 'google-business', name: 'Google Business', cost: 0, quality: 0.95, time: 2, enabled: false },
    { id: 'industry', name: 'Industry Analysis', cost: 0.20, quality: 0.85, time: 6, enabled: false },
    { id: 'competitor', name: 'Competitor Intel', cost: 0.25, quality: 0.80, time: 8, enabled: false },
    { id: 'financial', name: 'Financial Data', cost: 0, quality: 1.0, time: 3, enabled: true },
    { id: 'news-regulatory', name: 'Regulatory News', cost: 0.05, quality: 0.90, time: 4, enabled: false },
    
    // New enrichers
    { id: 'technology-stack', name: 'Tech Stack', cost: 0, quality: 0.95, time: 2, enabled: true },
    { id: 'dns-infrastructure', name: 'DNS & SSL', cost: 0, quality: 1.0, time: 1, enabled: true },
    { id: 'sentiment-analysis', name: 'Sentiment', cost: 0.10, quality: 0.75, time: 5, enabled: true },
    { id: 'patent-ip', name: 'Patents & IP', cost: 0, quality: 0.95, time: 4, enabled: true },
    { id: 'market-data', name: 'Market Data', cost: 0.15, quality: 0.85, time: 3, enabled: true }
  ]
  
  useEffect(() => {
    // Load enricher status from API
    loadEnricherStatus()
  }, [])
  
  useEffect(() => {
    // Calculate estimates based on selection
    const selected = availableEnrichers.filter(e => selectedEnrichers.includes(e.id))
    
    const cost = selected.reduce((sum, e) => sum + e.cost, 0)
    setCostEstimate(cost)
    
    const quality = selected.length > 0
      ? selected.reduce((sum, e) => sum + e.quality, 0) / selected.length
      : 0
    setQualityScore(quality)
    
    const time = Math.max(...selected.map(e => e.time), 0)
    setTimeEstimate(time)
  }, [selectedEnrichers])
  
  const loadEnricherStatus = async () => {
    try {
      const response = await fetch('/api/company-intelligence/enrichers/status')
      const data = await response.json()
      setEnrichers(data.enrichers)
    } catch (error) {
      logger.error('Failed to load enricher status', error)
    }
  }
  
  const handleEnrichmentStart = () => {
    logger.log('Starting enrichment', {
      enrichers: selectedEnrichers,
      costEstimate,
      qualityScore
    })
    
    onEnrich({
      enrichers: selectedEnrichers,
      options: {
        maxCost: costEstimate * 1.2, // 20% buffer
        priority: 'quality',
        useCache: true,
        parallel: true
      }
    })
  }
  
  const renderEnricherGrid = () => (
    <GridComponent
      dataSource={availableEnrichers}
      allowPaging={true}
      pageSettings={{ pageSize: 10 }}
      allowSorting={true}
      allowFiltering={true}
    >
      <ColumnsDirective>
        <ColumnDirective 
          field="enabled" 
          headerText="Active" 
          width="80"
          template={(props) => (
            <TooltipWrapper content={props.enabled ? 'Enricher is active' : 'Click to activate'}>
              <Switch
                checked={props.enabled || selectedEnrichers.includes(props.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedEnrichers([...selectedEnrichers, props.id])
                  } else {
                    setSelectedEnrichers(selectedEnrichers.filter(id => id !== props.id))
                  }
                }}
              />
            </TooltipWrapper>
          )}
        />
        <ColumnDirective field="name" headerText="Enricher" width="150" />
        <ColumnDirective 
          field="cost" 
          headerText="Cost" 
          width="80"
          template={(props) => (
            <TooltipWrapper content={`Cost per enrichment: $${props.cost}`}>
              <Badge variant={props.cost === 0 ? 'success' : 'outline'}>
                {props.cost === 0 ? 'Free' : `$${props.cost}`}
              </Badge>
            </TooltipWrapper>
          )}
        />
        <ColumnDirective 
          field="quality" 
          headerText="Quality" 
          width="100"
          template={(props) => (
            <TooltipWrapper content={`Data quality score: ${(props.quality * 100).toFixed(0)}%`}>
              <Progress value={props.quality * 100} className="w-full" />
            </TooltipWrapper>
          )}
        />
        <ColumnDirective 
          field="time" 
          headerText="Time (s)" 
          width="80"
          template={(props) => (
            <TooltipWrapper content={`Average processing time: ${props.time} seconds`}>
              <span>{props.time}s</span>
            </TooltipWrapper>
          )}
        />
      </ColumnsDirective>
      <Inject services={[Page, Sort, Filter]} />
    </GridComponent>
  )
  
  const renderCostBreakdown = () => {
    const costData = selectedEnrichers.map(id => {
      const enricher = availableEnrichers.find(e => e.id === id)
      return {
        name: enricher?.name || id,
        cost: enricher?.cost || 0
      }
    }).filter(e => e.cost > 0)
    
    if (costData.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-4">
          All selected enrichers are free!
        </div>
      )
    }
    
    return (
      <ChartComponent
        id="cost-pie-chart"
        primaryXAxis={{ valueType: 'Category' }}
        primaryYAxis={{ title: 'Cost ($)' }}
        tooltip={{ enable: true }}
        legendSettings={{ visible: true }}
        height="200px"
      >
        <Inject services={[AccumulationChart, AccumulationLegend, AccumulationTooltip, PieSeries]} />
        <SeriesCollectionDirective>
          <SeriesDirective
            dataSource={costData}
            xName="name"
            yName="cost"
            type="Pie"
            radius="100%"
            innerRadius="40%"
            dataLabel={{
              visible: true,
              position: 'Outside',
              name: 'name',
              font: { fontWeight: '600' }
            }}
          />
        </SeriesCollectionDirective>
      </ChartComponent>
    )
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Enrichment Pipeline Control</h3>
          <div className="flex gap-2">
            <TooltipWrapper content="Total enrichers available">
              <Badge variant="secondary">
                {availableEnrichers.length} Enrichers
              </Badge>
            </TooltipWrapper>
            <TooltipWrapper content="Currently active enrichers">
              <Badge variant="success">
                {availableEnrichers.filter(e => e.enabled).length} Active
              </Badge>
            </TooltipWrapper>
            <TooltipWrapper content="Selected for this enrichment">
              <Badge variant="default">
                {selectedEnrichers.length} Selected
              </Badge>
            </TooltipWrapper>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Enricher Selection Grid */}
        <div>
          <h4 className="text-sm font-medium mb-2">Select Enrichers</h4>
          {renderEnricherGrid()}
        </div>
        
        {/* Estimates */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                ${costEstimate.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated Cost
              </p>
              <TooltipWrapper content="Actual cost may vary by ±20%">
                <Progress value={costEstimate * 100} className="mt-2" />
              </TooltipWrapper>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {(qualityScore * 100).toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Quality Score
              </p>
              <TooltipWrapper content="Average data quality from selected enrichers">
                <Progress value={qualityScore * 100} className="mt-2" />
              </TooltipWrapper>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {timeEstimate}s
              </div>
              <p className="text-xs text-muted-foreground">
                Time Estimate
              </p>
              <TooltipWrapper content="Maximum time for parallel processing">
                <Progress value={timeEstimate * 10} className="mt-2" />
              </TooltipWrapper>
            </CardContent>
          </Card>
        </div>
        
        {/* Cost Breakdown */}
        {selectedEnrichers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Cost Breakdown</h4>
            {renderCostBreakdown()}
          </div>
        )}
        
        {/* Enrichment Progress */}
        {enrichmentStatus?.isRunning && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Enrichment Progress</span>
                  <span>{enrichmentStatus.completed}/{enrichmentStatus.total}</span>
                </div>
                <Progress 
                  value={(enrichmentStatus.completed / enrichmentStatus.total) * 100} 
                />
                <div className="text-xs text-muted-foreground">
                  Current: {enrichmentStatus.current}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline"
            onClick={() => setSelectedEnrichers(availableEnrichers.map(e => e.id))}
          >
            Select All
          </Button>
          <Button 
            variant="outline"
            onClick={() => setSelectedEnrichers([])}
          >
            Clear Selection
          </Button>
          <TooltipWrapper content="Start enrichment with selected enrichers">
            <Button
              onClick={handleEnrichmentStart}
              disabled={selectedEnrichers.length === 0 || enrichmentStatus?.isRunning}
            >
              {enrichmentStatus?.isRunning ? 'Enriching...' : 'Start Enrichment'}
            </Button>
          </TooltipWrapper>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 📊 Database Schema

### New Tables for Phase 3
```sql
-- Enrichment results storage
CREATE TABLE enrichment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  
  -- Enriched data by enricher
  enriched_data JSONB NOT NULL,
  
  -- Metrics
  metrics JSONB, -- Contains enrichersUsed, totalCost, duration, etc.
  
  -- Cache management
  cache_key TEXT GENERATED ALWAYS AS (
    MD5(domain || COALESCE(enriched_data::text, ''))
  ) STORED,
  expires_at TIMESTAMPTZ,
  
  INDEX idx_enrichment_session (session_id),
  INDEX idx_enrichment_domain (domain),
  INDEX idx_enrichment_cache (cache_key, expires_at)
);

-- Enricher configuration and status
CREATE TABLE enricher_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  enricher_id TEXT UNIQUE NOT NULL,
  enricher_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  
  -- Configuration
  config JSONB, -- API keys, endpoints, etc.
  
  -- Metrics
  total_enrichments INTEGER DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0,
  average_time_ms INTEGER,
  success_rate DECIMAL(3,2),
  quality_score DECIMAL(3,2),
  
  -- Rate limiting
  rate_limit INTEGER, -- Requests per minute
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,
  
  INDEX idx_enricher_enabled (enabled),
  INDEX idx_enricher_id (enricher_id)
);

-- Enrichment cache
CREATE TABLE enrichment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  domain TEXT NOT NULL,
  enricher_id TEXT NOT NULL,
  input_hash TEXT NOT NULL, -- Hash of input data
  
  -- Cached result
  result JSONB NOT NULL,
  
  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Unique constraint for cache key
  UNIQUE(domain, enricher_id, input_hash),
  
  INDEX idx_cache_lookup (domain, enricher_id, input_hash),
  INDEX idx_cache_expiry (expires_at)
);
```

---

## 🧪 Testing Plan

### Test Suite for Phase 3
```typescript
// test-phase-3-enrichers.ts
import { describe, test, expect } from 'vitest'
import { EnrichmentPipeline } from '@/lib/company-intelligence/enrichers/core/enrichment-pipeline'
import { SocialMediaEnricher } from '@/lib/company-intelligence/enrichers/social-media-enricher'
import { TechnologyStackEnricher } from '@/lib/company-intelligence/enrichers/new/technology-stack-enricher'

describe('Phase 3: Enricher Activation & Enhancement', () => {
  describe('Enrichment Pipeline', () => {
    test('should auto-discover all enrichers', async () => {
      const pipeline = new EnrichmentPipeline()
      await pipeline.initialize()
      
      const enrichers = pipeline.getRegisteredEnrichers()
      expect(enrichers.length).toBeGreaterThanOrEqual(13) // All enrichers
    })
    
    test('should respect cost limits', async () => {
      const pipeline = new EnrichmentPipeline()
      const result = await pipeline.enrich({
        sessionId: 'test',
        domain: 'example.com',
        data: {},
        options: {
          maxCost: 0.10 // Only cheap enrichers
        }
      })
      
      expect(result.metrics.totalCost).toBeLessThanOrEqual(0.10)
    })
    
    test('should use cache for repeated requests', async () => {
      const pipeline = new EnrichmentPipeline()
      
      // First request
      const result1 = await pipeline.enrich({
        sessionId: 'test',
        domain: 'example.com',
        data: { test: 'data' }
      })
      
      // Second request (should hit cache)
      const result2 = await pipeline.enrich({
        sessionId: 'test',
        domain: 'example.com',
        data: { test: 'data' }
      })
      
      expect(result2.metrics.cacheHits).toBeGreaterThan(0)
      expect(result2.metrics.duration).toBeLessThan(result1.metrics.duration)
    })
  })
  
  describe('Individual Enrichers', () => {
    test('Social Media Enricher should find profiles', async () => {
      const enricher = new SocialMediaEnricher()
      const result = await enricher.enrich({
        domain: 'google.com',
        data: {},
        sessionId: 'test'
      })
      
      expect(result.success).toBe(true)
      expect(result.data.profiles).toBeDefined()
    })
    
    test('Technology Stack Enricher should detect tech', async () => {
      const enricher = new TechnologyStackEnricher()
      const result = await enricher.enrich({
        domain: 'github.com',
        data: {},
        sessionId: 'test'
      })
      
      expect(result.success).toBe(true)
      expect(result.data.technologies).toBeInstanceOf(Array)
      expect(result.data.techScore).toBeGreaterThan(0)
    })
  })
  
  describe('UI Components', () => {
    test('should display all enrichers in grid', async () => {
      const { container } = render(<EnrichmentControlPanel data={{}} />)
      const grid = container.querySelector('.e-grid')
      
      expect(grid).toBeDefined()
      // Check for 13+ enrichers
    })
    
    test('should calculate cost estimate', async () => {
      // Test cost calculation logic
    })
  })
})
```

---

## 📋 Implementation Checklist

### Week 1 Tasks
- [ ] Create EnrichmentPipeline class
- [ ] Implement auto-discovery system
- [ ] Activate SocialMediaEnricher
- [ ] Activate NewsEnricher
- [ ] Activate LinkedInEnricher
- [ ] Activate GoogleBusinessEnricher
- [ ] Activate IndustryEnricher
- [ ] Activate CompetitorEnricher
- [ ] Activate NewsRegulatoryEnricher
- [ ] Implement caching system

### Week 2 Tasks
- [ ] Create TechnologyStackEnricher
- [ ] Create DNSInfrastructureEnricher
- [ ] Create SentimentAnalysisEnricher
- [ ] Create PatentIPEnricher
- [ ] Create MarketDataEnricher
- [ ] Build EnrichmentControlPanel UI
- [ ] Add cost tracking
- [ ] Implement rate limiting
- [ ] Add comprehensive tests
- [ ] Update manifest.json

---

## 💰 Cost Analysis

### Enricher Costs (Per Enrichment)
| Enricher | API/Service | Cost | Notes |
|----------|------------|------|-------|
| **Existing Enrichers** | | | |
| Financial | SEC EDGAR | $0 | Free government data |
| Social Media | Twitter/FB APIs | $0.05 | Rate limited |
| News | NewsAPI | $0.10 | 500/month free, then paid |
| LinkedIn | LinkedIn API | $0.15 | Requires OAuth |
| Google Business | Google Places | $0 | Free tier available |
| Industry | Various | $0.20 | Aggregated sources |
| Competitor | Multiple | $0.25 | Complex analysis |
| News Regulatory | Various | $0.05 | RSS feeds + APIs |
| **New Enrichers** | | | |
| Technology Stack | Wappalyzer | $0 | Open source |
| DNS Infrastructure | DNS queries | $0 | Direct queries |
| Sentiment Analysis | TextRazor | $0.10 | 500/day free |
| Patent IP | USPTO | $0 | Government data |
| Market Data | Alpha Vantage | $0.15 | Free tier limited |

### Monthly Cost Estimate (1000 enrichments/day)
| Scenario | Enrichers Used | Cost/Day | Cost/Month |
|----------|---------------|----------|------------|
| Basic (Free only) | 5 enrichers | $0 | $0 |
| Standard | 10 enrichers | $50 | $1,500 |
| Premium | All 15 enrichers | $100 | $3,000 |

### ROI Calculation
- Manual enrichment: 15 min/company × 100 companies/day = 25 hours/day
- Automated: 10 sec/company × 100 companies/day = 17 minutes/day
- Time saved: 24.7 hours/day
- Value at $75/hour: $1,852.50/day saved
- **ROI: 185% in first month (Standard plan)**

---

## 🚀 Deployment Steps

### Environment Variables
```bash
# Add to .env.local

# Social Media APIs
TWITTER_BEARER_TOKEN=your_token_here
FACEBOOK_APP_TOKEN=your_token_here

# News & Media
NEWS_API_KEY=your_key_here
NEWSDATA_API_KEY=your_key_here

# Business Data
GOOGLE_PLACES_API_KEY=your_key_here
CLEARBIT_API_KEY=your_key_here

# Market Data
ALPHA_VANTAGE_API_KEY=your_key_here
IEX_CLOUD_API_KEY=your_key_here

# Sentiment Analysis
TEXTRAZOR_API_KEY=your_key_here
```

### Database Migration
```bash
# Apply Phase 3 migrations
npm run supabase:migrate -- --name phase_3_enrichers
```

---

## 📝 Notes & Recommendations

### Critical Success Factors
1. Start by activating free enrichers first
2. Monitor API rate limits carefully
3. Implement aggressive caching (60%+ hit rate)
4. Use parallel processing where possible
5. Track cost per enrichment closely

### Quick Wins
1. **Immediate**: Activate all 9 dormant enrichers (2 hours)
2. **High Value**: Technology Stack enricher (free, high value)
3. **Cost Effective**: Government data enrichers (free)

### Next Phase Dependencies
- Phase 4 (GPT-5) can analyze enriched data
- Phase 5 (Database) needs enrichment result storage

---

## 🔗 Resources & Documentation

### API Documentation
- [Twitter API v2](https://developer.twitter.com/en/docs/twitter-api)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [Google Places API](https://developers.google.com/maps/documentation/places)
- [NewsAPI](https://newsapi.org/docs)
- [Alpha Vantage](https://www.alphavantage.co/documentation)
- [Wappalyzer](https://github.com/wappalyzer/wappalyzer)
- [TextRazor](https://www.textrazor.com/docs)