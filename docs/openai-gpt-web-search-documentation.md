# OpenAI GPT Web Search Documentation

## Executive Summary

OpenAI's web search capability for GPT models allows AI systems to access and incorporate real-time web information into their responses. This document provides comprehensive documentation for implementing web search with GPT-5 models using the Responses API.

## Table of Contents

1. [Overview](#overview)
2. [API Requirements](#api-requirements)
3. [Model Compatibility](#model-compatibility)
4. [Implementation Guide](#implementation-guide)
5. [Search Types](#search-types)
6. [Configuration Options](#configuration-options)
7. [Cost Optimization](#cost-optimization)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)
10. [Testing & Validation](#testing--validation)

## Overview

### What is GPT Web Search?

GPT web search is a tool that enables GPT models to:
- Access current information beyond training data cutoff
- Retrieve real-time market data and news
- Validate facts with authoritative sources
- Research specific companies, products, or topics
- Gather competitive intelligence

### Key Benefits

- **Real-time Information**: Access to current events, news, and data
- **Source Attribution**: Automatic citation of sources
- **Context Enhancement**: Enriches responses with relevant web content
- **Fact Verification**: Cross-references information with multiple sources
- **Domain Filtering**: Control which websites to include/exclude

## API Requirements

### Authentication

```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://openai.vercel.app', // For Vercel AI Gateway
})
```

### Required Headers

```typescript
headers: {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'OpenAI-Beta': 'responses-2024-12-17' // For Responses API
}
```

## Model Compatibility

### Supported Models

| Model | Web Search Support | Recommended Use Case |
|-------|-------------------|---------------------|
| gpt-5 | ✅ Full Support | Deep research, complex analysis |
| gpt-5-mini | ✅ Full Support | Production research, cost-optimized |
| gpt-5-nano | ✅ Full Support | Testing, quick searches |
| gpt-4.1-mini | ✅ Full Support | Structured data extraction |
| gpt-4.1-nano | ✅ Full Support | Simple searches |

### CRITICAL: API Compatibility

**GPT-5 models MUST use the Responses API**, not the Chat Completions API:

```typescript
// ❌ WRONG - Returns empty responses with GPT-5
const response = await openai.chat.completions.create({
  model: 'gpt-5-mini',
  messages: [...],
  tools: [webSearchTool]
})

// ✅ CORRECT - Works with GPT-5 (Simple format as per OpenAI docs)
const response = await openai.responses.create({
  model: 'gpt-5-mini',
  input: prompt,
  tools: [
    { type: 'web_search' }  // Simple format - no parameters needed
  ]
})
```

## Implementation Guide

### Web Search Tool Format (Updated 2025)

OpenAI's web search tool now uses a simplified format:

```typescript
// Correct web search tool definition
const webSearchTool = {
  type: 'web_search'  // That's it! No function definition needed
}
```

### Response Structure

The Responses API returns an array with two types of items:

```typescript
interface WebSearchResponse {
  output: Array<
    | { type: 'web_search_call', query: string }
    | { 
        type: 'message', 
        text: string,
        annotations?: Array<{
          type: 'url_citation',
          url: string,
          start_index: number,
          end_index: number
        }>
      }
  >
}
```

### Basic Web Search Implementation

```typescript
import { OpenAI } from 'openai'

class WebSearchClient {
  private client: OpenAI
  
  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      defaultHeaders: {
        'OpenAI-Beta': 'responses-2024-12-17'
      }
    })
  }

  async searchWithGPT5(
    query: string,
    options: WebSearchOptions = {}
  ): Promise<WebSearchResponse> {
    const response = await this.client.responses.create({
      model: options.model || 'gpt-5-nano',
      input: query,
      
      // Simple web search tool format (as per OpenAI docs)
      tools: [
        { type: 'web_search' }
      ],
      
      // Output configuration
      max_output_tokens: options.maxTokens || 2000
    })
    
    return this.parseResponse(response)
  }
  
  private parseResponse(response: any): WebSearchResponse {
    // Handle array response format
    const output = response.output || []
    
    // Find web search calls and message items
    const webSearchCalls = output.filter(item => item.type === 'web_search_call')
    const messages = output.filter(item => item.type === 'message')
    
    // Extract citations from message annotations
    const citations = messages.flatMap(msg => 
      (msg.annotations || []).filter(a => a.type === 'url_citation')
    )
    
    return {
      content: messages.map(m => m.text).join('\n'),
      sources: citations.map(c => c.url),
      searchQueries: webSearchCalls.map(w => w.query),
      citations,
      cost: this.calculateCost(response.usage)
    }
  }
}
```

### Advanced Implementation with Retry Logic

```typescript
class RobustWebSearchClient extends WebSearchClient {
  async searchWithRetry(
    query: string,
    options: WebSearchOptions = {},
    maxRetries: number = 3
  ): Promise<WebSearchResponse> {
    let lastError: Error | null = null
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await this.searchWithGPT5(query, {
          ...options,
          // Exponential backoff on retries
          timeout: options.timeout * Math.pow(2, i)
        })
        
        // Validate response quality
        if (this.isValidResponse(response)) {
          return response
        }
      } catch (error) {
        lastError = error as Error
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error
        }
        
        // Wait before retry
        await this.delay(1000 * Math.pow(2, i))
      }
    }
    
    throw lastError || new Error('Max retries reached')
  }
  
  private isValidResponse(response: WebSearchResponse): boolean {
    return !!(
      response.content &&
      response.sources.length > 0 &&
      response.content.length > 100
    )
  }
  
  private isRetryableError(error: any): boolean {
    const retryableCodes = [429, 500, 502, 503, 504]
    return retryableCodes.includes(error?.status)
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

## Search Types

### 1. Non-Reasoning Search

For simple factual queries without complex analysis:

```typescript
const response = await client.responses.create({
  model: 'gpt-5-nano',
  input: 'What is Apple Inc current stock price?',
  tools: [{
    type: 'web_search',
    web_search: {
      search_context_size: 'low'
    }
  }],
  tool_choice: 'auto'
})
```

### 2. Agentic Search

For research requiring multiple search iterations:

```typescript
const response = await client.responses.create({
  model: 'gpt-5-mini',
  input: `Research Tesla's latest product announcements.
          Find information about:
          1. New vehicle models
          2. Battery technology updates
          3. Manufacturing expansions
          4. Software features`,
  reasoning: {
    effort: 'medium'
  },
  tools: [{
    type: 'web_search',
    web_search: {
      search_context_size: 'high',
      max_searches: 5
    }
  }],
  tool_choice: 'required'
})
```

### 3. Deep Research

For comprehensive analysis requiring extensive web research:

```typescript
const response = await client.responses.create({
  model: 'gpt-5',
  input: `Conduct comprehensive competitive analysis of Stripe vs Square.
          Include:
          - Market share data
          - Product feature comparison
          - Pricing analysis
          - Customer reviews
          - Recent news and developments
          - Financial performance`,
  reasoning: {
    effort: 'high'
  },
  tools: [{
    type: 'web_search',
    web_search: {
      search_context_size: 'high',
      max_searches: 10,
      domains: [
        'techcrunch.com',
        'bloomberg.com',
        'reuters.com',
        'stripe.com',
        'square.com'
      ]
    }
  }],
  tool_choice: 'required',
  max_output_tokens: 4000
})
```

## Configuration Options

### Web Search Tool Configuration

```typescript
interface WebSearchConfig {
  // Control search scope
  domains?: string[]           // Include only these domains
  blocked_domains?: string[]   // Exclude these domains
  
  // Search behavior
  search_context_size: 'low' | 'medium' | 'high'
  max_searches?: number        // Max number of searches (1-10)
  
  // Geographic context
  user_location?: string       // User's location for local results
  
  // Time constraints
  recency_filter?: 'day' | 'week' | 'month' | 'year'
  
  // Content type
  content_type?: 'all' | 'news' | 'blogs' | 'academic'
}
```

### Domain Filtering Examples

```typescript
// Company research - trusted sources only
const companyResearch = {
  domains: [
    'bloomberg.com',
    'reuters.com',
    'techcrunch.com',
    'forbes.com',
    'wsj.com',
    'ft.com'
  ]
}

// Technical documentation
const technicalDocs = {
  domains: [
    'github.com',
    'stackoverflow.com',
    'developer.mozilla.org',
    'docs.microsoft.com',
    'cloud.google.com',
    'aws.amazon.com'
  ]
}

// Exclude unreliable sources
const reliableSearch = {
  blocked_domains: [
    'wikipedia.org',  // User-generated
    'reddit.com',     // Forums
    'quora.com',      // Q&A sites
    'medium.com'      // Unverified blogs
  ]
}
```

## Cost Optimization

### Token Usage by Context Size

| Context Size | Approx Tokens | Use Case |
|--------------|---------------|----------|
| low | 500-1000 | Quick facts, stock prices |
| medium | 1000-3000 | Company overviews, news summaries |
| high | 3000-8000 | Deep research, competitive analysis |

### Cost Calculation

```typescript
class CostCalculator {
  private rates = {
    'gpt-5': { input: 0.50, output: 4.00 },
    'gpt-5-mini': { input: 0.25, output: 2.00 },
    'gpt-5-nano': { input: 0.05, output: 0.40 },
    'gpt-4.1-mini': { input: 0.15, output: 0.60 },
    'gpt-4.1-nano': { input: 0.075, output: 0.30 }
  }
  
  calculateCost(
    model: string,
    usage: { input_tokens: number, output_tokens: number }
  ): number {
    const rate = this.rates[model]
    if (!rate) throw new Error(`Unknown model: ${model}`)
    
    const inputCost = (usage.input_tokens / 1_000_000) * rate.input
    const outputCost = (usage.output_tokens / 1_000_000) * rate.output
    
    return inputCost + outputCost
  }
  
  estimateSearchCost(
    model: string,
    contextSize: 'low' | 'medium' | 'high'
  ): number {
    const contextTokens = {
      low: 750,
      medium: 2000,
      high: 5000
    }
    
    const estimatedUsage = {
      input_tokens: contextTokens[contextSize],
      output_tokens: contextTokens[contextSize] * 0.5 // Assume 50% output
    }
    
    return this.calculateCost(model, estimatedUsage)
  }
}
```

### Optimization Strategies

1. **Start with nano models** for testing and development
2. **Use domain filtering** to reduce irrelevant content
3. **Set appropriate context size** - don't use 'high' unless needed
4. **Cache search results** for repeated queries
5. **Batch related searches** into single requests

## Error Handling

### Common Errors and Solutions

```typescript
class WebSearchErrorHandler {
  handleError(error: any): WebSearchError {
    // Rate limiting
    if (error.status === 429) {
      return {
        type: 'rate_limit',
        message: 'Too many requests',
        retryAfter: error.headers?.['retry-after'],
        solution: 'Implement exponential backoff'
      }
    }
    
    // No search results
    if (error.message?.includes('No results found')) {
      return {
        type: 'no_results',
        message: 'Web search returned no results',
        solution: 'Broaden search terms or remove domain filters'
      }
    }
    
    // Model not supporting web search
    if (error.message?.includes('Tool not supported')) {
      return {
        type: 'unsupported_model',
        message: 'Model does not support web search',
        solution: 'Use GPT-5 or GPT-4.1 models'
      }
    }
    
    // Timeout
    if (error.code === 'ETIMEDOUT') {
      return {
        type: 'timeout',
        message: 'Search request timed out',
        solution: 'Reduce context size or increase timeout'
      }
    }
    
    // Generic error
    return {
      type: 'unknown',
      message: error.message || 'Unknown error',
      solution: 'Check logs and retry'
    }
  }
}
```

## Best Practices

### 1. Query Optimization

```typescript
// ❌ BAD - Too vague
"Tell me about companies"

// ✅ GOOD - Specific and focused
"Research Stripe's payment processing fees, supported countries, and API features"

// ❌ BAD - Multiple unrelated topics
"Find info on Tesla cars, SpaceX rockets, and Amazon shopping"

// ✅ GOOD - Related topics for coherent research
"Analyze Tesla's electric vehicle market share, battery technology, and autonomous driving features"
```

### 2. Source Quality Control

```typescript
class SourceQualityValidator {
  private trustedDomains = new Set([
    'reuters.com',
    'bloomberg.com',
    'techcrunch.com',
    'forbes.com',
    'wsj.com',
    'ft.com',
    'bbc.com',
    'nytimes.com'
  ])
  
  validateSources(sources: WebSource[]): QualityReport {
    const report = {
      totalSources: sources.length,
      trustedSources: 0,
      untrustedSources: 0,
      sourceDiversity: new Set(),
      warnings: []
    }
    
    for (const source of sources) {
      const domain = new URL(source.url).hostname
      
      if (this.trustedDomains.has(domain)) {
        report.trustedSources++
      } else {
        report.untrustedSources++
        report.warnings.push(`Untrusted source: ${domain}`)
      }
      
      report.sourceDiversity.add(domain)
    }
    
    // Check for single-source bias
    if (report.sourceDiversity.size === 1) {
      report.warnings.push('All information from single source')
    }
    
    // Check for lack of trusted sources
    if (report.trustedSources === 0) {
      report.warnings.push('No trusted sources found')
    }
    
    return report
  }
}
```

### 3. Result Caching

```typescript
class WebSearchCache {
  private cache = new Map<string, CachedResult>()
  private maxAge = 3600000 // 1 hour in milliseconds
  
  getCached(query: string, options: WebSearchOptions): WebSearchResponse | null {
    const key = this.generateKey(query, options)
    const cached = this.cache.get(key)
    
    if (!cached) return null
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }
    
    return cached.result
  }
  
  setCached(
    query: string,
    options: WebSearchOptions,
    result: WebSearchResponse
  ): void {
    const key = this.generateKey(query, options)
    
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    })
    
    // Implement LRU eviction if cache gets too large
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }
  
  private generateKey(query: string, options: WebSearchOptions): string {
    return JSON.stringify({
      query,
      model: options.model,
      domains: options.domains,
      contextSize: options.contextSize
    })
  }
}
```

## Testing & Validation

### Unit Tests

```typescript
describe('WebSearchClient', () => {
  let client: WebSearchClient
  
  beforeEach(() => {
    client = new WebSearchClient(process.env.TEST_API_KEY)
  })
  
  it('should perform basic web search', async () => {
    const result = await client.searchWithGPT5(
      'OpenAI GPT-5 release date',
      { model: 'gpt-5-nano', contextSize: 'low' }
    )
    
    expect(result.content).toBeDefined()
    expect(result.sources.length).toBeGreaterThan(0)
    expect(result.sources[0].url).toMatch(/^https?:\/\//)
  })
  
  it('should respect domain filtering', async () => {
    const result = await client.searchWithGPT5(
      'Latest AI news',
      {
        model: 'gpt-5-nano',
        domains: ['techcrunch.com'],
        contextSize: 'low'
      }
    )
    
    result.sources.forEach(source => {
      expect(source.url).toContain('techcrunch.com')
    })
  })
  
  it('should handle no results gracefully', async () => {
    const result = await client.searchWithGPT5(
      'asdkfjalskdfjalskdfj', // Nonsense query
      { model: 'gpt-5-nano', contextSize: 'low' }
    )
    
    expect(result.sources.length).toBe(0)
    expect(result.content).toContain('no results')
  })
})
```

### Integration Tests

```typescript
describe('Company Intelligence Web Search', () => {
  it('should enrich company data with web search', async () => {
    const orchestrator = new IntelligenceOrchestrator()
    
    const result = await orchestrator.research({
      domain: 'stripe.com',
      includeWebSearch: true,
      webSearchOptions: {
        model: 'gpt-5-mini',
        contextSize: 'medium',
        domains: ['techcrunch.com', 'reuters.com', 'stripe.com']
      }
    })
    
    // Verify enriched data
    expect(result.enrichedData).toBeDefined()
    expect(result.enrichedData.recentNews).toHaveLength(greaterThan(0))
    expect(result.enrichedData.marketInsights).toBeDefined()
    
    // Verify source citations
    expect(result.sources).toBeDefined()
    expect(result.sources.webSearch).toHaveLength(greaterThan(0))
  })
})
```

### Performance Benchmarks

```typescript
class WebSearchBenchmark {
  async runBenchmarks(): Promise<BenchmarkResults> {
    const queries = [
      { query: 'Apple stock price', contextSize: 'low' },
      { query: 'Tesla latest news', contextSize: 'medium' },
      { query: 'AI market analysis 2025', contextSize: 'high' }
    ]
    
    const results = {
      'gpt-5-nano': [],
      'gpt-5-mini': [],
      'gpt-5': []
    }
    
    for (const model of Object.keys(results)) {
      for (const { query, contextSize } of queries) {
        const start = Date.now()
        
        const response = await this.client.searchWithGPT5(query, {
          model,
          contextSize
        })
        
        const duration = Date.now() - start
        
        results[model].push({
          query,
          contextSize,
          duration,
          tokens: response.usage,
          cost: this.calculateCost(model, response.usage)
        })
      }
    }
    
    return this.analyzeResults(results)
  }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Empty Responses

**Problem**: GPT-5 returns empty content
**Solution**: Ensure using Responses API, not Chat Completions API

```typescript
// Check API endpoint
console.log(client.baseURL) // Should NOT be standard OpenAI endpoint for GPT-5
```

#### 2. No Web Search Results

**Problem**: Web search returns no results
**Solutions**:
- Broaden search terms
- Remove restrictive domain filters
- Check if query is too specific
- Verify API key has web search permissions

#### 3. High Costs

**Problem**: Web search costs exceeding budget
**Solutions**:
- Use gpt-5-nano for testing
- Reduce context size
- Implement result caching
- Batch related searches

#### 4. Slow Response Times

**Problem**: Searches taking > 30 seconds
**Solutions**:
- Reduce context size
- Use fewer domain filters
- Optimize query specificity
- Implement parallel searches for independent queries

## Appendix: Complete Implementation Example

```typescript
// lib/company-intelligence/services/web-search-service.ts

import { OpenAI } from 'openai'
import { logger } from '@/lib/logger'

export interface WebSearchOptions {
  model?: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano'
  contextSize?: 'low' | 'medium' | 'high'
  domains?: string[]
  blockedDomains?: string[]
  maxSearches?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
  outputFormat?: 'json' | 'text'
  maxTokens?: number
  userLocation?: string
  recencyFilter?: 'day' | 'week' | 'month' | 'year'
}

export interface WebSearchResponse {
  content: any
  sources: WebSource[]
  searchQueries: string[]
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  cost: number
  duration: number
}

export interface WebSource {
  url: string
  title: string
  snippet: string
  timestamp?: string
}

export class CompanyIntelligenceWebSearch {
  private client: OpenAI
  private cache: Map<string, WebSearchResponse>
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: process.env.VERCEL_AI_GATEWAY_URL,
      defaultHeaders: {
        'OpenAI-Beta': 'responses-2024-12-17'
      }
    })
    
    this.cache = new Map()
  }
  
  async searchCompanyIntelligence(
    companyDomain: string,
    searchType: 'overview' | 'news' | 'competitive' | 'deep',
    options: WebSearchOptions = {}
  ): Promise<WebSearchResponse> {
    const start = Date.now()
    
    // Check cache
    const cacheKey = `${companyDomain}-${searchType}-${JSON.stringify(options)}`
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (Date.now() - cached.duration < 3600000) { // 1 hour cache
        logger.info('WEB_SEARCH', 'Returning cached result', { companyDomain, searchType })
        return cached
      }
    }
    
    try {
      // Build search query based on type
      const query = this.buildSearchQuery(companyDomain, searchType)
      
      // Configure search options based on type
      const searchConfig = this.getSearchConfig(searchType, options)
      
      // Perform web search
      const response = await this.performSearch(query, searchConfig)
      
      // Parse and validate response
      const result = this.parseSearchResponse(response, Date.now() - start)
      
      // Cache result
      this.cache.set(cacheKey, result)
      
      logger.info('WEB_SEARCH', 'Search completed', {
        companyDomain,
        searchType,
        sources: result.sources.length,
        cost: result.cost,
        duration: result.duration
      })
      
      return result
    } catch (error) {
      logger.error('WEB_SEARCH', 'Search failed', { error, companyDomain, searchType })
      throw error
    }
  }
  
  private buildSearchQuery(domain: string, type: string): string {
    const companyName = domain.replace(/\.(com|org|net|io)$/, '')
    
    const queries = {
      overview: `${companyName} company overview mission products services market position`,
      news: `${companyName} latest news announcements updates ${new Date().getFullYear()}`,
      competitive: `${companyName} competitors market share industry analysis comparison`,
      deep: `${companyName} comprehensive analysis financials strategy leadership technology culture`
    }
    
    return queries[type] || queries.overview
  }
  
  private getSearchConfig(
    type: string,
    options: WebSearchOptions
  ): WebSearchOptions {
    const configs = {
      overview: {
        model: 'gpt-5-nano' as const,
        contextSize: 'medium' as const,
        maxSearches: 3,
        reasoningEffort: 'low' as const
      },
      news: {
        model: 'gpt-5-nano' as const,
        contextSize: 'medium' as const,
        maxSearches: 5,
        reasoningEffort: 'low' as const,
        recencyFilter: 'month' as const
      },
      competitive: {
        model: 'gpt-5-mini' as const,
        contextSize: 'high' as const,
        maxSearches: 7,
        reasoningEffort: 'medium' as const
      },
      deep: {
        model: 'gpt-5' as const,
        contextSize: 'high' as const,
        maxSearches: 10,
        reasoningEffort: 'high' as const
      }
    }
    
    return {
      ...configs[type],
      ...options // User options override defaults
    }
  }
  
  private async performSearch(
    query: string,
    options: WebSearchOptions
  ): Promise<any> {
    return await this.client.responses.create({
      model: options.model || 'gpt-5-nano',
      input: query,
      
      reasoning: options.model?.startsWith('gpt-5') ? {
        effort: options.reasoningEffort || 'low'
      } : undefined,
      
      tools: [{
        type: 'web_search',
        web_search: {
          domains: options.domains,
          blocked_domains: options.blockedDomains,
          user_location: options.userLocation || 'United States',
          search_context_size: options.contextSize || 'medium',
          max_searches: options.maxSearches,
          recency_filter: options.recencyFilter
        }
      }],
      
      tool_choice: 'required',
      include: ['web_search_call.action.sources'],
      
      text: {
        format: options.outputFormat === 'json' ? {
          type: 'json_schema',
          json_schema: {
            name: 'company_intelligence',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                overview: { type: 'string' },
                keyFindings: {
                  type: 'array',
                  items: { type: 'string' }
                },
                data: { type: 'object' }
              },
              required: ['overview', 'keyFindings', 'data'],
              additionalProperties: false
            }
          }
        } : undefined,
        verbosity: 'high'
      },
      
      max_output_tokens: options.maxTokens || 2000
    })
  }
  
  private parseSearchResponse(response: any, duration: number): WebSearchResponse {
    const usage = response.usage || {}
    
    return {
      content: response.output_text,
      sources: this.extractSources(response),
      searchQueries: this.extractQueries(response),
      usage: {
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        totalTokens: usage.total_tokens || 0
      },
      cost: this.calculateCost(response.model, usage),
      duration
    }
  }
  
  private extractSources(response: any): WebSource[] {
    const sources = response.web_search_call?.action?.sources || []
    
    return sources.map((source: any) => ({
      url: source.url,
      title: source.title || 'Untitled',
      snippet: source.snippet || '',
      timestamp: source.timestamp
    }))
  }
  
  private extractQueries(response: any): string[] {
    return response.web_search_call?.action?.queries || []
  }
  
  private calculateCost(model: string, usage: any): number {
    const rates = {
      'gpt-5': { input: 0.50, output: 4.00 },
      'gpt-5-mini': { input: 0.25, output: 2.00 },
      'gpt-5-nano': { input: 0.05, output: 0.40 }
    }
    
    const rate = rates[model] || rates['gpt-5-nano']
    
    const inputCost = (usage.input_tokens / 1_000_000) * rate.input
    const outputCost = (usage.output_tokens / 1_000_000) * rate.output
    
    return Number((inputCost + outputCost).toFixed(4))
  }
}

// Export singleton instance
export const webSearchService = new CompanyIntelligenceWebSearch()
```

## Conclusion

OpenAI's web search capability transforms GPT models into powerful research assistants capable of accessing real-time information. By following this documentation, you can implement robust web search functionality that:

- Provides accurate, up-to-date information
- Cites sources for transparency
- Optimizes costs through smart model selection
- Handles errors gracefully
- Scales from simple queries to deep research

Remember to always use the Responses API for GPT-5 models and implement proper error handling and cost optimization strategies for production deployments.