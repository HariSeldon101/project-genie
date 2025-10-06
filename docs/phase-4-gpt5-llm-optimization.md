# Phase 4: GPT-5 & LLM Optimization
*Optimize LLM usage with GPT-5 family and advanced prompting*

## 📚 Related Documents
- [Shared Content & Standards](./company-intelligence-shared-content.md)
- [Phase 1: Advanced Scraping](./phase-1-advanced-scraping.md)
- [Phase 2: Data Sources & OSINT](./phase-2-data-sources-osint.md)
- [Phase 3: Enricher Activation](./phase-3-enricher-activation.md)
- [Phase 5: Database & Performance](./phase-5-database-performance.md)

---

## 🎯 Phase 4 Overview

### Objectives
1. Integrate Vercel AI Gateway for unified model access
2. Implement tiered model strategy (nano → mini → flagship)
3. Advanced prompt engineering with role-based personas
4. Cost optimization via caching and batch processing
5. Create LLM management UI with real-time cost tracking

### Timeline
- **Duration**: 2 weeks
- **Dependencies**: Phases 1-3 (data collection and enrichment)
- **Team Size**: 1-2 developers

### Success Metrics
- Cost reduction: 60-70% vs current usage
- Response quality: >90% accuracy
- Cache hit rate: >80% for similar queries
- Processing time: <30s for standard reports
- Zero rate limit violations

---

## 🏗️ Architecture Design

### Component Structure
```
lib/llm/
├── core/
│   ├── llm-gateway.ts           # Vercel AI Gateway integration
│   ├── model-router.ts          # Intelligent model selection
│   ├── prompt-manager.ts        # Prompt template management
│   └── cost-optimizer.ts        # Cost optimization logic
├── models/
│   ├── gpt5-nano.ts            # $0.05/1M input tokens
│   ├── gpt5-mini.ts            # $0.25/1M input tokens
│   ├── gpt5-flagship.ts        # $1.25/1M input tokens
│   └── gpt4-structured.ts      # For structured outputs
├── prompts/
│   ├── templates/
│   │   ├── analysis-prompts.ts
│   │   ├── report-prompts.ts
│   │   └── extraction-prompts.ts
│   ├── personas/
│   │   ├── business-analyst.ts
│   │   ├── technical-architect.ts
│   │   └── market-researcher.ts
│   └── chains/
│       ├── multi-pass-analysis.ts
│       └── validation-chain.ts
├── optimization/
│   ├── semantic-cache.ts        # 90% discount on cached
│   ├── batch-processor.ts       # 50% discount batching
│   ├── response-cache.ts        # Supabase caching
│   └── token-manager.ts         # Token budget management
└── monitoring/
    ├── usage-tracker.ts          # Track token usage
    ├── cost-monitor.ts          # Real-time cost tracking
    └── quality-scorer.ts        # Response quality metrics
```

---

## 🔧 Implementation Details

### 4.1 Vercel AI Gateway Integration

```typescript
// lib/llm/core/llm-gateway.ts
import { createOpenAI } from '@ai-sdk/openai'
import { streamText, generateText, generateObject } from 'ai'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface LLMConfig {
  model: 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5' | 'gpt-4.1-nano' | 'gpt-4.1-mini'
  temperature?: number
  maxTokens?: number
  stream?: boolean
  structuredOutput?: boolean
}

export class LLMGateway {
  private openai: any
  private logger = permanentLogger.create('LLMGateway')
  private usageTracker: UsageTracker
  
  constructor() {
    // Initialize Vercel AI Gateway
    this.openai = createOpenAI({
      baseURL: 'https://gateway.ai.vercel.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      // Vercel AI Gateway handles failover automatically
      defaultHeaders: {
        'X-Vercel-AI-Gateway-Version': '1'
      }
    })
    
    this.usageTracker = new UsageTracker()
  }
  
  async generateText(
    prompt: string,
    config: LLMConfig = { model: 'gpt-5-nano' }
  ): Promise<any> {
    const startTime = Date.now()
    this.logger.log('Generating text', { model: config.model, prompt: prompt.substring(0, 100) })
    
    try {
      // Use GPT-5 responses API for GPT-5 models
      if (config.model.startsWith('gpt-5')) {
        return await this.generateGPT5Response(prompt, config)
      }
      
      // Use standard chat API for GPT-4.1 models
      return await this.generateGPT4Response(prompt, config)
      
    } catch (error) {
      this.logger.error('Text generation failed', error)
      throw error
    }
  }
  
  private async generateGPT5Response(prompt: string, config: LLMConfig): Promise<any> {
    // GPT-5 models MUST use responses.create API
    const response = await this.openai.responses.create({
      model: config.model,
      input: prompt,
      text: { verbosity: 'high' },
      reasoning: { 
        effort: this.getReasoningEffort(config.model) 
      },
      max_output_tokens: config.maxTokens || 2000
    })
    
    // Track usage
    await this.usageTracker.track({
      model: config.model,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      cost: this.calculateCost(config.model, response.usage)
    })
    
    return {
      text: response.output_text,
      usage: response.usage,
      model: config.model
    }
  }
  
  private async generateGPT4Response(prompt: string, config: LLMConfig): Promise<any> {
    if (config.stream) {
      const result = await streamText({
        model: this.openai(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 2000
      })
      
      return result
    }
    
    const result = await generateText({
      model: this.openai(config.model),
      prompt,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2000
    })
    
    // Track usage
    await this.usageTracker.track({
      model: config.model,
      inputTokens: result.usage?.promptTokens || 0,
      outputTokens: result.usage?.completionTokens || 0,
      cost: this.calculateCost(config.model, result.usage)
    })
    
    return result
  }
  
  async generateStructuredOutput<T>(
    prompt: string,
    schema: z.ZodType<T>,
    config: LLMConfig = { model: 'gpt-4.1-mini' }
  ): Promise<T> {
    this.logger.log('Generating structured output', { 
      model: config.model,
      schemaType: schema._def.typeName 
    })
    
    // GPT-4.1 models support structured outputs
    if (!config.model.includes('4.1')) {
      throw new Error('Structured outputs require GPT-4.1 models')
    }
    
    const result = await generateObject({
      model: this.openai(config.model),
      prompt,
      schema,
      schemaName: 'Response',
      schemaDescription: 'Structured response format',
      temperature: 0.3, // Lower temperature for structured data
      maxTokens: config.maxTokens || 4000
    })
    
    // Track usage
    await this.usageTracker.track({
      model: config.model,
      inputTokens: result.usage?.promptTokens || 0,
      outputTokens: result.usage?.completionTokens || 0,
      cost: this.calculateCost(config.model, result.usage)
    })
    
    return result.object
  }
  
  private getReasoningEffort(model: string): string {
    switch (model) {
      case 'gpt-5-nano':
        return 'minimal' // Fast responses
      case 'gpt-5-mini':
        return 'low'     // Balanced
      case 'gpt-5':
        return 'medium'  // Thorough analysis
      default:
        return 'low'
    }
  }
  
  private calculateCost(model: string, usage: any): number {
    const pricing = {
      'gpt-5-nano': { input: 0.00005, output: 0.0004 },
      'gpt-5-mini': { input: 0.00025, output: 0.002 },
      'gpt-5': { input: 0.00125, output: 0.01 },
      'gpt-4.1-nano': { input: 0.000075, output: 0.0003 },
      'gpt-4.1-mini': { input: 0.00015, output: 0.0006 }
    }
    
    const modelPricing = pricing[model] || pricing['gpt-5-nano']
    const inputCost = (usage?.input_tokens || usage?.promptTokens || 0) * modelPricing.input / 1000
    const outputCost = (usage?.output_tokens || usage?.completionTokens || 0) * modelPricing.output / 1000
    
    return inputCost + outputCost
  }
}
```

### 4.2 Intelligent Model Router

```typescript
// lib/llm/core/model-router.ts
import { LLMGateway, LLMConfig } from './llm-gateway'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export enum TaskComplexity {
  SIMPLE = 'simple',      // Classification, extraction
  MODERATE = 'moderate',  // Analysis, summarization
  COMPLEX = 'complex'     // Strategic planning, deep analysis
}

export interface RoutingDecision {
  model: string
  reasoning: string
  estimatedCost: number
  estimatedTime: number
}

export class ModelRouter {
  private gateway: LLMGateway
  private logger = permanentLogger.create('ModelRouter')
  
  constructor() {
    this.gateway = new LLMGateway()
  }
  
  async route(
    task: string,
    data: any,
    requirements?: {
      maxCost?: number
      maxTime?: number
      minQuality?: number
      structuredOutput?: boolean
    }
  ): Promise<RoutingDecision> {
    this.logger.log('Routing task', { task, requirements })
    
    // Analyze task complexity
    const complexity = await this.analyzeComplexity(task, data)
    
    // Determine if structured output is needed
    const needsStructured = requirements?.structuredOutput || 
                          this.requiresStructuredOutput(task)
    
    // Select optimal model
    let model: string
    let reasoning: string
    
    if (needsStructured) {
      // Use GPT-4.1 for structured outputs
      model = complexity === TaskComplexity.SIMPLE ? 'gpt-4.1-nano' : 'gpt-4.1-mini'
      reasoning = 'Structured output required, using GPT-4.1 with zodResponseFormat'
    } else {
      // Use GPT-5 for general tasks
      switch (complexity) {
        case TaskComplexity.SIMPLE:
          model = 'gpt-5-nano'
          reasoning = 'Simple task: extraction/classification, using fastest model'
          break
        
        case TaskComplexity.MODERATE:
          model = 'gpt-5-mini'
          reasoning = 'Moderate complexity: analysis/summarization, using balanced model'
          break
        
        case TaskComplexity.COMPLEX:
          model = requirements?.maxCost && requirements.maxCost < 0.01 
            ? 'gpt-5-mini' 
            : 'gpt-5'
          reasoning = 'Complex task: deep analysis required, using most capable model'
          break
        
        default:
          model = 'gpt-5-nano'
          reasoning = 'Default routing to most cost-effective model'
      }
    }
    
    // Check cost constraints
    const estimatedCost = this.estimateCost(model, data)
    if (requirements?.maxCost && estimatedCost > requirements.maxCost) {
      // Downgrade model
      model = this.downgradeModel(model)
      reasoning += ' (downgraded due to cost constraints)'
    }
    
    const estimatedTime = this.estimateTime(model, data)
    
    this.logger.log('Routing decision', { model, reasoning, estimatedCost, estimatedTime })
    
    return {
      model,
      reasoning,
      estimatedCost,
      estimatedTime
    }
  }
  
  private async analyzeComplexity(task: string, data: any): Promise<TaskComplexity> {
    // Analyze task keywords
    const simpleKeywords = ['extract', 'classify', 'categorize', 'identify', 'list']
    const moderateKeywords = ['analyze', 'summarize', 'compare', 'evaluate']
    const complexKeywords = ['strategy', 'plan', 'forecast', 'recommend', 'design']
    
    const taskLower = task.toLowerCase()
    
    if (complexKeywords.some(k => taskLower.includes(k))) {
      return TaskComplexity.COMPLEX
    }
    
    if (moderateKeywords.some(k => taskLower.includes(k))) {
      return TaskComplexity.MODERATE
    }
    
    // Check data size
    const dataSize = JSON.stringify(data).length
    if (dataSize > 50000) return TaskComplexity.COMPLEX
    if (dataSize > 10000) return TaskComplexity.MODERATE
    
    return TaskComplexity.SIMPLE
  }
  
  private requiresStructuredOutput(task: string): boolean {
    const structuredKeywords = ['json', 'structured', 'format', 'schema', 'api', 'database']
    return structuredKeywords.some(k => task.toLowerCase().includes(k))
  }
  
  private estimateCost(model: string, data: any): number {
    const dataSize = JSON.stringify(data).length
    const estimatedTokens = dataSize / 4 // Rough estimate
    
    const costPerToken = {
      'gpt-5-nano': 0.00005,
      'gpt-5-mini': 0.00025,
      'gpt-5': 0.00125,
      'gpt-4.1-nano': 0.000075,
      'gpt-4.1-mini': 0.00015
    }
    
    return estimatedTokens * (costPerToken[model] || 0.00005)
  }
  
  private estimateTime(model: string, data: any): number {
    const baseTime = {
      'gpt-5-nano': 2000,
      'gpt-5-mini': 3000,
      'gpt-5': 5000,
      'gpt-4.1-nano': 2500,
      'gpt-4.1-mini': 3500
    }
    
    const dataSize = JSON.stringify(data).length
    const sizeFactor = Math.min(dataSize / 10000, 3) // Max 3x for large data
    
    return (baseTime[model] || 3000) * sizeFactor
  }
  
  private downgradeModel(model: string): string {
    const downgrades = {
      'gpt-5': 'gpt-5-mini',
      'gpt-5-mini': 'gpt-5-nano',
      'gpt-4.1-mini': 'gpt-4.1-nano'
    }
    
    return downgrades[model] || 'gpt-5-nano'
  }
}
```

### 4.3 Advanced Prompt Engineering

```typescript
// lib/llm/prompts/personas/business-analyst.ts
export class BusinessAnalystPersona {
  private role = `You are a Senior Business Analyst with:
    - 15+ years of experience in competitive intelligence
    - CFA certification and MBA from top business school
    - Expertise in financial analysis, market research, and strategic planning
    - Deep understanding of various industries and business models
    - Proficiency in data analysis and visualization
    
    Your approach is:
    - Data-driven and evidence-based
    - Focused on actionable insights
    - Clear and concise in communication
    - Strategic in thinking but practical in recommendations`
  
  generateAnalysisPrompt(company: string, data: any): string {
    return `${this.role}
    
    Analyze the following company data for ${company}:
    
    ${JSON.stringify(data, null, 2)}
    
    Provide a comprehensive analysis covering:
    
    1. **Business Model Assessment**
       - Revenue streams and monetization strategy
       - Value proposition and competitive advantages
       - Customer segments and market positioning
    
    2. **Financial Health Analysis**
       - Key financial metrics and trends
       - Profitability and growth indicators
       - Risk factors and financial stability
    
    3. **Competitive Landscape**
       - Main competitors and market position
       - Competitive advantages and disadvantages
       - Market share and growth potential
    
    4. **Strategic Recommendations**
       - Opportunities for growth
       - Potential risks and mitigation strategies
       - Key actions for next 12 months
    
    Format your response with clear sections and bullet points.
    Include confidence levels (High/Medium/Low) for key findings.
    Highlight the top 3 most important insights at the beginning.`
  }
  
  generateCompetitorPrompt(company: string, competitors: any[]): string {
    return `${this.role}
    
    Conduct a competitive analysis for ${company} against these competitors:
    
    ${JSON.stringify(competitors, null, 2)}
    
    Provide:
    
    1. **Competitive Positioning Matrix**
       - Market position for each competitor
       - Strengths and weaknesses comparison
       - Unique value propositions
    
    2. **SWOT Analysis**
       - Detailed SWOT for ${company}
       - Key differentiators vs each competitor
    
    3. **Market Dynamics**
       - Market share estimates
       - Growth trajectories
       - Emerging threats and opportunities
    
    4. **Strategic Recommendations**
       - How to compete effectively
       - Areas to defend
       - Opportunities to attack
    
    Use tables where appropriate for comparisons.
    Provide specific, actionable recommendations.`
  }
}
```

### 4.4 Cost Optimization Implementation

```typescript
// lib/llm/optimization/semantic-cache.ts
import { createHash } from 'crypto'
import { supabase } from '@/lib/supabase/client'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export class SemanticCache {
  private logger = permanentLogger.create('SemanticCache')
  private memoryCache = new Map<string, any>()
  private similarityThreshold = 0.85
  
  async get(prompt: string, model: string): Promise<any | null> {
    const cacheKey = this.generateKey(prompt, model)
    
    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      this.logger.log('Memory cache hit', { cacheKey })
      return this.memoryCache.get(cacheKey)
    }
    
    // Check database cache
    const { data: cached } = await supabase
      .from('llm_response_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single()
    
    if (cached) {
      this.logger.log('Database cache hit', { cacheKey })
      this.memoryCache.set(cacheKey, cached.response)
      return cached.response
    }
    
    // Check for similar prompts (semantic matching)
    const similar = await this.findSimilar(prompt, model)
    if (similar) {
      this.logger.log('Semantic cache hit', { 
        originalKey: cacheKey,
        similarKey: similar.cache_key,
        similarity: similar.similarity
      })
      return similar.response
    }
    
    return null
  }
  
  async set(
    prompt: string,
    model: string,
    response: any,
    ttl: number = 3600
  ): Promise<void> {
    const cacheKey = this.generateKey(prompt, model)
    const embedding = await this.generateEmbedding(prompt)
    
    // Store in memory
    this.memoryCache.set(cacheKey, response)
    
    // Store in database with embedding for semantic search
    await supabase.from('llm_response_cache').upsert({
      cache_key: cacheKey,
      prompt,
      model,
      response,
      embedding,
      expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      created_at: new Date().toISOString()
    })
    
    this.logger.log('Response cached', { cacheKey, ttl })
  }
  
  private generateKey(prompt: string, model: string): string {
    return createHash('sha256')
      .update(`${model}:${prompt}`)
      .digest('hex')
  }
  
  private async generateEmbedding(text: string): Promise<number[]> {
    // Use OpenAI embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    })
    
    const data = await response.json()
    return data.data[0].embedding
  }
  
  private async findSimilar(prompt: string, model: string): Promise<any | null> {
    const embedding = await this.generateEmbedding(prompt)
    
    // Use pgvector for similarity search
    const { data: similar } = await supabase.rpc('find_similar_prompts', {
      query_embedding: embedding,
      match_threshold: this.similarityThreshold,
      match_count: 1,
      model_filter: model
    })
    
    if (similar && similar.length > 0) {
      return similar[0]
    }
    
    return null
  }
}

// lib/llm/optimization/batch-processor.ts
export class BatchProcessor {
  private queue: Map<string, any[]> = new Map()
  private logger = permanentLogger.create('BatchProcessor')
  private batchSize = 20
  private batchTimeout = 5000 // 5 seconds
  
  async addToQueue(
    request: any,
    callback: (result: any) => void
  ): Promise<void> {
    const model = request.model || 'gpt-5-nano'
    
    if (!this.queue.has(model)) {
      this.queue.set(model, [])
      // Start batch timer
      setTimeout(() => this.processBatch(model), this.batchTimeout)
    }
    
    this.queue.get(model)!.push({ request, callback })
    
    // Process immediately if batch is full
    if (this.queue.get(model)!.length >= this.batchSize) {
      await this.processBatch(model)
    }
  }
  
  private async processBatch(model: string): Promise<void> {
    const batch = this.queue.get(model) || []
    if (batch.length === 0) return
    
    this.queue.set(model, []) // Clear queue
    
    this.logger.log('Processing batch', { model, size: batch.length })
    
    try {
      // Submit batch to OpenAI Batch API for 50% discount
      const batchResponse = await this.submitBatch(model, batch)
      
      // Distribute results to callbacks
      batch.forEach((item, index) => {
        item.callback(batchResponse.results[index])
      })
      
      this.logger.metric('Batch processed', {
        model,
        size: batch.length,
        cost: batchResponse.cost,
        savings: batchResponse.cost * 0.5 // 50% savings
      })
    } catch (error) {
      this.logger.error('Batch processing failed', error)
      // Fall back to individual processing
      for (const item of batch) {
        try {
          const result = await this.processSingle(model, item.request)
          item.callback(result)
        } catch (err) {
          item.callback({ error: err.message })
        }
      }
    }
  }
  
  private async submitBatch(model: string, batch: any[]): Promise<any> {
    // OpenAI Batch API submission
    const response = await fetch('https://api.openai.com/v1/batches', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input_file_id: await this.uploadBatchFile(batch),
        endpoint: '/v1/chat/completions',
        completion_window: '24h'
      })
    })
    
    const batchJob = await response.json()
    
    // Poll for completion
    return await this.pollBatchCompletion(batchJob.id)
  }
  
  private async uploadBatchFile(batch: any[]): Promise<string> {
    // Format batch as JSONL
    const jsonl = batch.map(item => JSON.stringify({
      model: item.request.model,
      messages: item.request.messages,
      temperature: item.request.temperature
    })).join('\n')
    
    // Upload to OpenAI Files API
    const formData = new FormData()
    formData.append('file', new Blob([jsonl], { type: 'application/jsonl' }))
    formData.append('purpose', 'batch')
    
    const response = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    })
    
    const file = await response.json()
    return file.id
  }
  
  private async pollBatchCompletion(batchId: string): Promise<any> {
    // Poll for batch completion
    // Implementation details...
    return { results: [], cost: 0 }
  }
  
  private async processSingle(model: string, request: any): Promise<any> {
    // Fallback to single processing
    const gateway = new LLMGateway()
    return await gateway.generateText(request.prompt, { model })
  }
}
```

### 4.5 LLM Management UI

```tsx
// components/company-intelligence/llm-management-panel.tsx
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  LineSeries,
  ColumnSeries,
  DateTime,
  Legend,
  Tooltip as ChartTooltip,
  DataLabel
} from '@syncfusion/ej2-react-charts'
import { 
  GaugeComponent,
  AxesDirective,
  AxisDirective,
  PointersDirective,
  PointerDirective,
  RangesDirective,
  RangeDirective
} from '@syncfusion/ej2-react-circulargauge'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface LLMManagementPanelProps {
  onConfigChange: (config: LLMConfiguration) => void
  currentUsage?: UsageMetrics
}

export function LLMManagementPanel({ 
  onConfigChange,
  currentUsage 
}: LLMManagementPanelProps) {
  const logger = permanentLogger.create('LLMManagementPanel')
  const [config, setConfig] = useState<LLMConfiguration>({
    defaultModel: 'gpt-5-nano',
    enableCaching: true,
    enableBatching: true,
    costLimit: 100,
    qualityThreshold: 0.8
  })
  
  const [usageStats, setUsageStats] = useState<any>({
    today: { cost: 0, tokens: 0, requests: 0 },
    week: { cost: 0, tokens: 0, requests: 0 },
    month: { cost: 0, tokens: 0, requests: 0 }
  })
  
  const [modelDistribution, setModelDistribution] = useState<any[]>([])
  const [costTrend, setCostTrend] = useState<any[]>([])
  const [cacheMetrics, setCacheMetrics] = useState({
    hitRate: 0,
    savings: 0,
    totalHits: 0
  })
  
  useEffect(() => {
    loadUsageStats()
    const interval = setInterval(loadUsageStats, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])
  
  const loadUsageStats = async () => {
    try {
      const response = await fetch('/api/llm/usage-stats')
      const data = await response.json()
      setUsageStats(data.stats)
      setModelDistribution(data.modelDistribution)
      setCostTrend(data.costTrend)
      setCacheMetrics(data.cacheMetrics)
    } catch (error) {
      logger.error('Failed to load usage stats', error)
    }
  }
  
  const modelPricing = [
    { model: 'gpt-5-nano', input: 0.05, output: 0.40, speed: 'Fastest', quality: 'Good' },
    { model: 'gpt-5-mini', input: 0.25, output: 2.00, speed: 'Fast', quality: 'Better' },
    { model: 'gpt-5', input: 1.25, output: 10.00, speed: 'Moderate', quality: 'Best' },
    { model: 'gpt-4.1-nano', input: 0.075, output: 0.30, speed: 'Fast', quality: 'Good' },
    { model: 'gpt-4.1-mini', input: 0.15, output: 0.60, speed: 'Moderate', quality: 'Better' }
  ]
  
  const renderModelSelector = () => (
    <Card>
      <CardHeader>Model Configuration</CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Default Model</label>
          <TooltipWrapper content="Model used for general tasks">
            <Select
              value={config.defaultModel}
              onValueChange={(value) => {
                const newConfig = { ...config, defaultModel: value }
                setConfig(newConfig)
                onConfigChange(newConfig)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelPricing.map(model => (
                  <SelectItem key={model.model} value={model.model}>
                    <div className="flex justify-between items-center w-full">
                      <span>{model.model}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          ${model.input}/1M in
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {model.speed}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TooltipWrapper>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Semantic Caching</label>
            <TooltipWrapper content="90% cost reduction for cached responses">
              <Switch
                checked={config.enableCaching}
                onCheckedChange={(checked) => {
                  const newConfig = { ...config, enableCaching: checked }
                  setConfig(newConfig)
                  onConfigChange(newConfig)
                }}
              />
            </TooltipWrapper>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Batch Processing</label>
            <TooltipWrapper content="50% cost reduction for non-urgent tasks">
              <Switch
                checked={config.enableBatching}
                onCheckedChange={(checked) => {
                  const newConfig = { ...config, enableBatching: checked }
                  setConfig(newConfig)
                  onConfigChange(newConfig)
                }}
              />
            </TooltipWrapper>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">
            Daily Cost Limit: ${config.costLimit}
          </label>
          <TooltipWrapper content="Maximum daily spend on LLM calls">
            <Slider
              value={[config.costLimit]}
              onValueChange={([value]) => {
                const newConfig = { ...config, costLimit: value }
                setConfig(newConfig)
                onConfigChange(newConfig)
              }}
              min={10}
              max={500}
              step={10}
              className="mt-2"
            />
          </TooltipWrapper>
        </div>
        
        <div>
          <label className="text-sm font-medium">
            Quality Threshold: {(config.qualityThreshold * 100).toFixed(0)}%
          </label>
          <TooltipWrapper content="Minimum acceptable response quality">
            <Slider
              value={[config.qualityThreshold * 100]}
              onValueChange={([value]) => {
                const newConfig = { ...config, qualityThreshold: value / 100 }
                setConfig(newConfig)
                onConfigChange(newConfig)
              }}
              min={50}
              max={100}
              step={5}
              className="mt-2"
            />
          </TooltipWrapper>
        </div>
      </CardContent>
    </Card>
  )
  
  const renderUsageMetrics = () => (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">${usageStats.today.cost.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Today's Cost</p>
          <div className="mt-2 text-xs">
            {usageStats.today.tokens.toLocaleString()} tokens
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">${usageStats.week.cost.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">This Week</p>
          <div className="mt-2 text-xs">
            {usageStats.week.requests.toLocaleString()} requests
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">${usageStats.month.cost.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">This Month</p>
          <div className="mt-2 text-xs">
            Projected: ${(usageStats.month.cost * 30 / new Date().getDate()).toFixed(2)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
  
  const renderCostTrendChart = () => (
    <ChartComponent
      id="cost-trend-chart"
      primaryXAxis={{
        valueType: 'DateTime',
        title: 'Date',
        intervalType: 'Days'
      }}
      primaryYAxis={{
        title: 'Cost ($)',
        minimum: 0
      }}
      tooltip={{ enable: true }}
      legendSettings={{ visible: true }}
      title="Cost Trend (Last 30 Days)"
      height="300px"
    >
      <Inject services={[LineSeries, DateTime, Legend, ChartTooltip, DataLabel]} />
      <SeriesCollectionDirective>
        <SeriesDirective
          dataSource={costTrend}
          xName="date"
          yName="cost"
          type="Line"
          name="Daily Cost"
          marker={{ visible: true, height: 8, width: 8 }}
        />
        <SeriesDirective
          dataSource={costTrend}
          xName="date"
          yName="projected"
          type="Line"
          name="Projected"
          dashArray="5,5"
        />
      </SeriesCollectionDirective>
    </ChartComponent>
  )
  
  const renderCacheEffectiveness = () => (
    <Card>
      <CardHeader>Cache Effectiveness</CardHeader>
      <CardContent>
        <div className="h-48">
          <GaugeComponent
            id="cache-gauge"
            background="transparent"
            axes={[{
              radius: '80%',
              startAngle: 180,
              endAngle: 0,
              minimum: 0,
              maximum: 100,
              ranges: [
                { start: 0, end: 50, color: '#EF4444' },
                { start: 50, end: 75, color: '#EAB308' },
                { start: 75, end: 100, color: '#22C55E' }
              ],
              pointers: [{
                value: cacheMetrics.hitRate * 100,
                radius: '60%',
                color: '#1E40AF',
                pointerWidth: 10,
                cap: {
                  radius: 10,
                  color: '#1E40AF'
                }
              }],
              annotations: [{
                content: `<div style="text-align:center">
                  <div style="font-size:24px;font-weight:bold">
                    ${(cacheMetrics.hitRate * 100).toFixed(0)}%
                  </div>
                  <div style="font-size:12px;color:#666">Hit Rate</div>
                </div>`,
                angle: 0,
                radius: '0%',
                zIndex: '1'
              }]
            }]}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center">
            <div className="text-lg font-semibold">
              ${cacheMetrics.savings.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              Saved Today
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              {cacheMetrics.totalHits.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Cache Hits
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
  
  const renderModelDistribution = () => (
    <ChartComponent
      id="model-distribution-chart"
      primaryXAxis={{ valueType: 'Category' }}
      primaryYAxis={{ title: 'Requests' }}
      tooltip={{ enable: true }}
      title="Model Usage Distribution"
      height="250px"
    >
      <Inject services={[ColumnSeries, Legend, ChartTooltip, DataLabel]} />
      <SeriesCollectionDirective>
        <SeriesDirective
          dataSource={modelDistribution}
          xName="model"
          yName="count"
          type="Column"
          name="Requests"
          dataLabel={{ visible: true, position: 'Top' }}
        />
      </SeriesCollectionDirective>
    </ChartComponent>
  )
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">LLM Management & Optimization</h3>
          <div className="flex gap-2">
            <TooltipWrapper content="Percentage of budget used today">
              <Badge variant={usageStats.today.cost > config.costLimit * 0.8 ? 'destructive' : 'default'}>
                {((usageStats.today.cost / config.costLimit) * 100).toFixed(0)}% Budget Used
              </Badge>
            </TooltipWrapper>
            <TooltipWrapper content="Active model optimizations">
              <Badge variant="success">
                {[config.enableCaching, config.enableBatching].filter(Boolean).length} Optimizations
              </Badge>
            </TooltipWrapper>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {renderUsageMetrics()}
            {renderCostTrendChart()}
          </TabsContent>
          
          <TabsContent value="configuration" className="space-y-4">
            {renderModelSelector()}
            
            <Card>
              <CardHeader>Model Comparison</CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Model</th>
                        <th className="text-right p-2">Input $/1M</th>
                        <th className="text-right p-2">Output $/1M</th>
                        <th className="text-center p-2">Speed</th>
                        <th className="text-center p-2">Quality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelPricing.map(model => (
                        <tr key={model.model} className="border-b">
                          <td className="p-2 font-medium">{model.model}</td>
                          <td className="text-right p-2">${model.input}</td>
                          <td className="text-right p-2">${model.output}</td>
                          <td className="text-center p-2">
                            <Badge variant="outline">{model.speed}</Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant="secondary">{model.quality}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            {renderModelDistribution()}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>Average Response Time</CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {modelDistribution.map(m => (
                      <div key={m.model} className="flex justify-between">
                        <span className="text-sm">{m.model}</span>
                        <span className="text-sm font-medium">{m.avgTime}ms</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>Quality Scores</CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {modelDistribution.map(m => (
                      <div key={m.model} className="flex justify-between">
                        <span className="text-sm">{m.model}</span>
                        <span className="text-sm font-medium">{m.qualityScore}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="optimization" className="space-y-4">
            {renderCacheEffectiveness()}
            
            <Card>
              <CardHeader>Optimization Recommendations</CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {!config.enableCaching && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="font-medium text-yellow-800">
                        Enable Semantic Caching
                      </div>
                      <div className="text-sm text-yellow-700">
                        Could save ~${(usageStats.today.cost * 0.6).toFixed(2)}/day
                      </div>
                    </div>
                  )}
                  
                  {!config.enableBatching && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium text-blue-800">
                        Enable Batch Processing
                      </div>
                      <div className="text-sm text-blue-700">
                        Could save ~${(usageStats.today.cost * 0.3).toFixed(2)}/day on async tasks
                      </div>
                    </div>
                  )}
                  
                  {config.defaultModel === 'gpt-5' && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-medium text-green-800">
                        Consider GPT-5-mini as Default
                      </div>
                      <div className="text-sm text-green-700">
                        80% of tasks could use mini, saving ~${(usageStats.today.cost * 0.7).toFixed(2)}/day
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
```

---

## 📊 Database Schema

### New Tables for Phase 4
```sql
-- LLM response cache with semantic search
CREATE TABLE llm_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  cache_key TEXT UNIQUE NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  response JSONB NOT NULL,
  
  -- For semantic similarity search
  embedding vector(1536), -- OpenAI embedding dimension
  
  -- Cache management
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_cache_key (cache_key),
  INDEX idx_cache_expiry (expires_at),
  INDEX idx_cache_embedding USING ivfflat (embedding vector_cosine_ops)
);

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Function for semantic similarity search
CREATE OR REPLACE FUNCTION find_similar_prompts(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  model_filter text
)
RETURNS TABLE (
  cache_key text,
  prompt text,
  response jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.cache_key,
    c.prompt,
    c.response,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM llm_response_cache c
  WHERE 
    c.model = model_filter
    AND c.expires_at > NOW()
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- LLM usage tracking
CREATE TABLE llm_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES research_sessions(id),
  
  model TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'generate', 'structured', 'stream'
  
  -- Token usage
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Cost tracking
  input_cost DECIMAL(10,6),
  output_cost DECIMAL(10,6),
  total_cost DECIMAL(10,6),
  
  -- Performance
  duration_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  batch_processed BOOLEAN DEFAULT false,
  
  -- Quality metrics
  quality_score DECIMAL(3,2),
  
  INDEX idx_usage_user (user_id),
  INDEX idx_usage_created (created_at DESC),
  INDEX idx_usage_model (model)
);

-- Model routing decisions
CREATE TABLE model_routing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  task TEXT NOT NULL,
  complexity TEXT NOT NULL, -- 'simple', 'moderate', 'complex'
  selected_model TEXT NOT NULL,
  reasoning TEXT,
  
  estimated_cost DECIMAL(10,6),
  actual_cost DECIMAL(10,6),
  estimated_time_ms INTEGER,
  actual_time_ms INTEGER,
  
  requirements JSONB, -- maxCost, maxTime, minQuality, etc.
  
  INDEX idx_routing_created (created_at DESC),
  INDEX idx_routing_model (selected_model)
);
```

---

## 🧪 Testing Plan

### Test Suite for Phase 4
```typescript
// test-phase-4-llm-optimization.ts
import { describe, test, expect } from 'vitest'
import { LLMGateway } from '@/lib/llm/core/llm-gateway'
import { ModelRouter } from '@/lib/llm/core/model-router'
import { SemanticCache } from '@/lib/llm/optimization/semantic-cache'
import { BatchProcessor } from '@/lib/llm/optimization/batch-processor'

describe('Phase 4: GPT-5 & LLM Optimization', () => {
  describe('LLM Gateway', () => {
    test('should use responses API for GPT-5 models', async () => {
      const gateway = new LLMGateway()
      const result = await gateway.generateText(
        'Test prompt',
        { model: 'gpt-5-nano' }
      )
      
      expect(result.text).toBeDefined()
      expect(result.model).toBe('gpt-5-nano')
    })
    
    test('should generate structured output with GPT-4.1', async () => {
      const gateway = new LLMGateway()
      const schema = z.object({
        name: z.string(),
        value: z.number()
      })
      
      const result = await gateway.generateStructuredOutput(
        'Extract name and value',
        schema,
        { model: 'gpt-4.1-mini' }
      )
      
      expect(result).toMatchSchema(schema)
    })
  })
  
  describe('Model Router', () => {
    test('should select appropriate model based on complexity', async () => {
      const router = new ModelRouter()
      
      const simple = await router.route('Extract emails from text', {})
      expect(simple.model).toBe('gpt-5-nano')
      
      const complex = await router.route('Create strategic business plan', {})
      expect(['gpt-5', 'gpt-5-mini']).toContain(complex.model)
    })
    
    test('should respect cost constraints', async () => {
      const router = new ModelRouter()
      const decision = await router.route(
        'Complex analysis task',
        {},
        { maxCost: 0.001 }
      )
      
      expect(decision.estimatedCost).toBeLessThanOrEqual(0.001)
    })
  })
  
  describe('Semantic Cache', () => {
    test('should cache and retrieve responses', async () => {
      const cache = new SemanticCache()
      
      await cache.set('test prompt', 'gpt-5-nano', { text: 'response' })
      const cached = await cache.get('test prompt', 'gpt-5-nano')
      
      expect(cached).toEqual({ text: 'response' })
    })
    
    test('should find semantically similar prompts', async () => {
      const cache = new SemanticCache()
      
      await cache.set('What is the weather?', 'gpt-5-nano', { text: 'sunny' })
      const similar = await cache.get("What's the weather like?", 'gpt-5-nano')
      
      expect(similar).toBeDefined()
    })
  })
  
  describe('Batch Processor', () => {
    test('should batch requests for discount', async () => {
      const processor = new BatchProcessor()
      const results = []
      
      // Add multiple requests
      for (let i = 0; i < 5; i++) {
        processor.addToQueue(
          { model: 'gpt-5-nano', prompt: `Test ${i}` },
          (result) => results.push(result)
        )
      }
      
      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 6000))
      
      expect(results).toHaveLength(5)
    })
  })
})
```

---

## 📋 Implementation Checklist

### Week 1 Tasks
- [ ] Set up Vercel AI Gateway
- [ ] Implement LLMGateway class
- [ ] Create ModelRouter for intelligent selection
- [ ] Implement GPT-5 responses API integration
- [ ] Add GPT-4.1 structured output support
- [ ] Create prompt templates
- [ ] Implement role-based personas
- [ ] Add multi-pass analysis
- [ ] Create semantic cache
- [ ] Implement batch processor

### Week 2 Tasks
- [ ] Build LLMManagementPanel UI
- [ ] Add cost tracking
- [ ] Implement usage analytics
- [ ] Create model comparison view
- [ ] Add cache effectiveness metrics
- [ ] Build optimization recommendations
- [ ] Add real-time monitoring
- [ ] Create quality scoring
- [ ] Add comprehensive tests
- [ ] Update manifest.json

---

## 💰 Cost Analysis

### Model Pricing Comparison
| Model | Input $/1M | Output $/1M | Best For |
|-------|------------|-------------|----------|
| GPT-5-nano | $0.05 | $0.40 | Extraction, classification |
| GPT-5-mini | $0.25 | $2.00 | Analysis, summarization |
| GPT-5 | $1.25 | $10.00 | Complex reasoning, strategy |
| GPT-4.1-nano | $0.075 | $0.30 | Structured data (dev) |
| GPT-4.1-mini | $0.15 | $0.60 | Structured data (prod) |

### Optimization Savings
| Strategy | Discount | Use Case |
|----------|----------|----------|
| Semantic Caching | 90% | Repeated/similar queries |
| Batch Processing | 50% | Non-urgent tasks |
| Model Routing | 60-70% | Right-sizing model choice |
| Combined | 80-95% | All optimizations active |

### Monthly Cost Projection (1000 analyses/day)
| Scenario | Cost/Analysis | Daily | Monthly |
|----------|---------------|-------|---------|
| No Optimization (GPT-5) | $2.00 | $2,000 | $60,000 |
| Basic (GPT-5-mini) | $0.40 | $400 | $12,000 |
| Optimized (Routing + Cache) | $0.10 | $100 | $3,000 |
| Fully Optimized | $0.05 | $50 | $1,500 |

### ROI Calculation
- Current cost: $60,000/month (unoptimized GPT-5)
- Optimized cost: $1,500/month
- Savings: $58,500/month
- **ROI: 3,900% in first month**

---

## 🚀 Deployment Steps

### Environment Variables
```bash
# Already configured
OPENAI_API_KEY=your_key_here

# Optional for enhanced features
VERCEL_AI_GATEWAY_KEY=your_key_here
```

### Database Migration
```bash
# Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Apply Phase 4 migrations
npm run supabase:migrate -- --name phase_4_llm_optimization
```

---

## 📝 Notes & Recommendations

### Critical Success Factors
1. **Always use responses API for GPT-5** (avoid empty responses bug)
2. Start with aggressive caching (90% cost reduction)
3. Implement model routing immediately (60-70% savings)
4. Monitor quality scores to ensure optimization doesn't hurt output
5. Use batch processing for all non-urgent tasks

### Implementation Priority
1. **Immediate**: Switch default to GPT-5-nano (80% cost reduction)
2. **High**: Implement semantic caching
3. **Medium**: Add batch processing
4. **Low**: Fine-tune quality thresholds

### Next Phase Dependencies
- Phase 5 benefits from optimized LLM costs
- All phases benefit from better model selection

---

## 🔗 Resources & Documentation

### Essential Reading
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [OpenAI GPT-5 Guide](https://platform.openai.com/docs/models/gpt-5)
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

### API References
- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [OpenAI Batch API](https://platform.openai.com/docs/guides/batch)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)