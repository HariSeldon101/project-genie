import { LLMGateway } from '../llm/gateway'
import { DataSanitizer } from '../llm/sanitizer'
import { SanitizedProjectData, GeneratedDocument, DocumentMetadata } from '../llm/types'
import { agilePrompts } from '../llm/prompts/agile'
import { prince2Prompts } from '../llm/prompts/prince2'
import { AgileCharterSchema, ProductBacklogSchema } from './schemas/agile-charter'
import { Prince2PIDSchema, RiskRegisterSchema } from './schemas/prince2-pid'
import { DocumentQueue } from './queue'
import { DocumentCache } from './cache'

export class DocumentGenerator {
  private gateway: LLMGateway
  private sanitizer: DataSanitizer
  private queue: DocumentQueue
  private cache: DocumentCache
  private useQueue: boolean
  private useCache: boolean

  constructor(config?: { 
    provider?: string
    useQueue?: boolean
    useCache?: boolean
    cacheOptions?: {
      maxSize?: number
      ttlMinutes?: number
    }
  }) {
    this.gateway = new LLMGateway(config ? { provider: config.provider as any } : undefined)
    this.sanitizer = new DataSanitizer()
    
    // Initialize queue for DeepSeek or if explicitly enabled
    this.useQueue = config?.useQueue ?? (this.getProvider() === 'deepseek')
    this.queue = new DocumentQueue({
      maxConcurrent: this.getProvider() === 'deepseek' ? 1 : 3,
      maxRetries: 3,
      onTaskComplete: (task) => {
        console.log(`✅ Queue: ${task.documentType} completed`)
      },
      onTaskFailed: (task) => {
        console.error(`❌ Queue: ${task.documentType} failed after retries`)
      }
    })
    
    // Initialize cache
    this.useCache = config?.useCache ?? true
    this.cache = new DocumentCache({
      maxSize: config?.cacheOptions?.maxSize || 50,
      ttlMinutes: config?.cacheOptions?.ttlMinutes || 60,
      enableCleanup: true
    })
  }
  
  getProvider() {
    return this.gateway.config?.provider || 'unknown'
  }

  /**
   * Generate all documents for a project based on methodology
   */
  async generateProjectDocuments(
    projectData: Record<string, unknown>,
    projectId: string
  ): Promise<GeneratedDocument[]> {
    // Sanitize project data first
    const sanitizedData = this.sanitizer.sanitizeProjectData(projectData)
    
    // Check cache first
    if (this.useCache) {
      const cachedDocs = this.cache.get(sanitizedData, projectId)
      if (cachedDocs && cachedDocs.length > 0) {
        console.log(`🎯 Using cached documents for project ${projectId}`)
        return cachedDocs
      }
    }
    
    // Create mapping table for later rehydration
    const mappingTable = this.sanitizer.createMappingTable(projectData, sanitizedData)
    
    const documents: GeneratedDocument[] = []
    
    try {
      console.log(`📄 Starting ${sanitizedData.methodology} document generation...`)
      const startTime = Date.now()
      
      // Add timeout wrapper for each document generation
      const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs/1000}s`)), timeoutMs)
          )
        ])
      }
      
      // Use longer timeout for DeepSeek
      const timeoutMs = this.getProvider() === 'deepseek' ? 60000 : 30000
      
      switch (sanitizedData.methodology) {
        case 'agile':
          // Use sequential generation for DeepSeek to avoid timeouts
          const isDeepSeek = this.getProvider() === 'deepseek'
          
          if (isDeepSeek) {
            console.log('🔄 Generating 3 Agile documents sequentially (DeepSeek mode)...')
            const agileGenerators = [
              { fn: () => this.generateAgileCharter(sanitizedData, projectId), name: 'Charter' },
              { fn: () => this.generateProductBacklog(sanitizedData, projectId), name: 'Backlog' },
              { fn: () => this.generateSprintPlan(sanitizedData, projectId), name: 'Sprint Plan' }
            ]
            
            for (const { fn, name } of agileGenerators) {
              try {
                console.log(`  📄 Generating ${name}...`)
                const doc = await withTimeout(fn(), timeoutMs, name)
                documents.push(doc)
                console.log(`  ✅ ${name} completed`)
              } catch (error: any) {
                console.warn(`  ⚠️ ${name} failed: ${error.message}`)
              }
            }
          } else {
            // Generate all documents in PARALLEL for other providers
            console.log('🚀 Generating 3 Agile documents in parallel...')
            const agilePromises = await Promise.allSettled([
              withTimeout(this.generateAgileCharter(sanitizedData, projectId), timeoutMs, 'Charter'),
              withTimeout(this.generateProductBacklog(sanitizedData, projectId), timeoutMs, 'Backlog'),
              withTimeout(this.generateSprintPlan(sanitizedData, projectId), timeoutMs, 'Sprint Plan')
            ])
            
            // Collect successful documents
            agilePromises.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                documents.push(result.value)
              } else {
                console.warn(`⚠️ Document ${index} failed: ${result.reason}`)
              }
            })
          }
          break
          
        case 'prince2':
          if (isDeepSeek) {
            console.log('🔄 Generating 4 PRINCE2 documents sequentially (DeepSeek mode)...')
            const prince2Generators = [
              { fn: () => this.generatePrince2PID(sanitizedData, projectId), name: 'PID' },
              { fn: () => this.generateBusinessCase(sanitizedData, projectId), name: 'Business Case' },
              { fn: () => this.generateRiskRegister(sanitizedData, projectId), name: 'Risk Register' },
              { fn: () => this.generateProjectPlan(sanitizedData, projectId), name: 'Project Plan' }
            ]
            
            for (const { fn, name } of prince2Generators) {
              try {
                console.log(`  📄 Generating ${name}...`)
                const doc = await withTimeout(fn(), timeoutMs, name)
                documents.push(doc)
                console.log(`  ✅ ${name} completed`)
              } catch (error: any) {
                console.warn(`  ⚠️ ${name} failed: ${error.message}`)
              }
            }
          } else {
            // Generate all documents in PARALLEL for other providers
            console.log(`🚀 Generating 4 PRINCE2 documents in parallel with ${timeoutMs/1000}s timeout each...`)
            const prince2Promises = await Promise.allSettled([
              withTimeout(this.generatePrince2PID(sanitizedData, projectId), timeoutMs, 'PID'),
              withTimeout(this.generateBusinessCase(sanitizedData, projectId), timeoutMs, 'Business Case'),
              withTimeout(this.generateRiskRegister(sanitizedData, projectId), timeoutMs, 'Risk Register'),
              withTimeout(this.generateProjectPlan(sanitizedData, projectId), timeoutMs, 'Project Plan')
            ])
            
            // Collect successful documents
            prince2Promises.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                documents.push(result.value)
                console.log(`✅ Document ${index + 1}/4 completed`)
              } else {
                console.warn(`⚠️ Document ${index + 1}/4 failed: ${result.reason}`)
              }
            })
          }
          break
          
        case 'hybrid':
          if (isDeepSeek) {
            console.log('🔄 Generating 3 Hybrid documents sequentially (DeepSeek mode)...')
            const hybridGenerators = [
              { fn: () => this.generateHybridCharter(sanitizedData, projectId), name: 'Hybrid Charter' },
              { fn: () => this.generateRiskRegister(sanitizedData, projectId), name: 'Risk Register' },
              { fn: () => this.generateProductBacklog(sanitizedData, projectId), name: 'Backlog' }
            ]
            
            for (const { fn, name } of hybridGenerators) {
              try {
                console.log(`  📄 Generating ${name}...`)
                const doc = await withTimeout(fn(), timeoutMs, name)
                documents.push(doc)
                console.log(`  ✅ ${name} completed`)
              } catch (error: any) {
                console.warn(`  ⚠️ ${name} failed: ${error.message}`)
              }
            }
          } else {
            // Generate all documents in PARALLEL for other providers
            console.log('🚀 Generating 3 Hybrid documents in parallel...')
            const hybridPromises = await Promise.allSettled([
              withTimeout(this.generateHybridCharter(sanitizedData, projectId), timeoutMs, 'Hybrid Charter'),
              withTimeout(this.generateRiskRegister(sanitizedData, projectId), timeoutMs, 'Risk Register'),
              withTimeout(this.generateProductBacklog(sanitizedData, projectId), timeoutMs, 'Backlog')
            ])
            
            // Collect successful documents
            hybridPromises.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                documents.push(result.value)
              } else {
                console.warn(`⚠️ Document ${index} failed: ${result.reason}`)
              }
            })
          }
          break
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000)
      
      // Check if we got at least some documents
      if (documents.length === 0) {
        console.error('❌ No documents were generated successfully')
        throw new Error('All document generation attempts failed. Please try again.')
      }
      
      console.log(`✅ Generated ${documents.length} documents in ${duration} seconds`)
      
      // Cache the generated documents for future use
      if (this.useCache && documents.length > 0) {
        this.cache.set(sanitizedData, projectId, documents, this.provider.name)
      }
      
      // Store mapping table for later use
      await this.storeMappingTable(projectId, mappingTable)
      
      return documents
    } catch (error) {
      console.error('Document generation failed:', error)
      throw new Error(`Failed to generate documents: ${error.message}`)
    }
  }

  /**
   * Generate Agile Project Charter
   */
  private async generateAgileCharter(
    data: SanitizedProjectData,
    projectId: string
  ): Promise<GeneratedDocument> {
    const prompt = this.gateway.buildContextPrompt(
      agilePrompts.projectCharter.system,
      agilePrompts.projectCharter.user,
      data
    )
    
    const content = await this.gateway.generateJSON(
      prompt,
      AgileCharterSchema
    )
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'charter',
      methodology: 'agile',
      version: 1,
      generatedAt: new Date(),
      llmProvider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    
    return {
      metadata,
      content,
      aiInsights: {
        industryContext: `Generated for ${data.sector} industry`,
        suggestions: [
          'Review and customize success criteria',
          'Validate timeline with team capacity',
          'Confirm stakeholder availability'
        ]
      }
    }
  }

  /**
   * Generate Product Backlog
   */
  private async generateProductBacklog(
    data: SanitizedProjectData,
    projectId: string
  ): Promise<GeneratedDocument> {
    const prompt = this.gateway.buildContextPrompt(
      agilePrompts.productBacklog.system,
      agilePrompts.productBacklog.user,
      data
    )
    
    const content = await this.gateway.generateJSON(
      prompt,
      ProductBacklogSchema
    )
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'backlog',
      methodology: 'agile',
      version: 1,
      generatedAt: new Date(),
      llmProvider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    
    return {
      metadata,
      content,
      aiInsights: {
        recommendedKPIs: [
          'Velocity trend',
          'Burndown rate',
          'Story completion rate'
        ]
      }
    }
  }

  /**
   * Generate Sprint Plan
   */
  private async generateSprintPlan(
    data: SanitizedProjectData,
    projectId: string
  ): Promise<GeneratedDocument> {
    const prompt = this.gateway.buildContextPrompt(
      agilePrompts.sprintPlan.system,
      agilePrompts.sprintPlan.user,
      data
    )
    
    const content = await this.gateway.generateText(prompt)
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'project_plan',
      methodology: 'agile',
      version: 1,
      generatedAt: new Date(),
      llmProvider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    
    return {
      metadata,
      content: { plan: content }, // Wrap text in object
      aiInsights: {
        suggestions: [
          'Adjust sprint capacity based on team availability',
          'Consider holidays and training in planning'
        ]
      }
    }
  }

  /**
   * Generate Prince2 PID
   */
  private async generatePrince2PID(
    data: SanitizedProjectData,
    projectId: string
  ): Promise<GeneratedDocument> {
    const prompt = this.gateway.buildContextPrompt(
      prince2Prompts.pid.system,
      prince2Prompts.pid.user,
      data
    )
    
    const content = await this.gateway.generateJSON(
      prompt,
      Prince2PIDSchema
    )
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'pid',
      methodology: 'prince2',
      version: 1,
      generatedAt: new Date(),
      llmProvider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    
    return {
      metadata,
      content,
      aiInsights: {
        industryContext: `Tailored for ${data.sector} governance requirements`,
        potentialRisks: [
          'Regulatory compliance',
          'Stakeholder engagement',
          'Resource availability'
        ]
      }
    }
  }

  /**
   * Generate Business Case
   */
  private async generateBusinessCase(
    data: SanitizedProjectData,
    projectId: string
  ): Promise<GeneratedDocument> {
    const prompt = this.gateway.buildContextPrompt(
      prince2Prompts.businessCase.system,
      prince2Prompts.businessCase.user,
      data
    )
    
    const content = await this.gateway.generateText(prompt)
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'business_case',
      methodology: 'prince2',
      version: 1,
      generatedAt: new Date(),
      llmProvider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    
    return {
      metadata,
      content: { businessCase: content },
      aiInsights: {
        recommendedKPIs: [
          'ROI achievement',
          'Cost variance',
          'Benefit realization'
        ]
      }
    }
  }

  /**
   * Generate Risk Register
   */
  private async generateRiskRegister(
    data: SanitizedProjectData,
    projectId: string
  ): Promise<GeneratedDocument> {
    const prompt = this.gateway.buildContextPrompt(
      prince2Prompts.riskRegister.system,
      prince2Prompts.riskRegister.user,
      data
    )
    
    const content = await this.gateway.generateJSON(
      prompt,
      RiskRegisterSchema
    )
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'risk_register',
      methodology: data.methodology,
      version: 1,
      generatedAt: new Date(),
      llmProvider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    
    return {
      metadata,
      content,
      aiInsights: {
        potentialRisks: content.risks?.map?.(r => r.description || r)?.slice(0, 5) || []
      }
    }
  }

  /**
   * Generate Project Plan
   */
  private async generateProjectPlan(
    data: SanitizedProjectData,
    projectId: string
  ): Promise<GeneratedDocument> {
    const prompt = this.gateway.buildContextPrompt(
      prince2Prompts.projectPlan.system,
      prince2Prompts.projectPlan.user,
      data
    )
    
    const content = await this.gateway.generateText(prompt)
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'project_plan',
      methodology: 'prince2',
      version: 1,
      generatedAt: new Date(),
      llmProvider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    
    return {
      metadata,
      content: { plan: content },
      aiInsights: {
        suggestions: [
          'Validate stage gates with governance board',
          'Confirm resource availability for each stage'
        ]
      }
    }
  }

  /**
   * Generate Hybrid Charter (combination of Agile and Prince2)
   */
  private async generateHybridCharter(
    data: SanitizedProjectData,
    projectId: string
  ): Promise<GeneratedDocument> {
    // Use Agilometer values to balance the approach
    const agileWeight = data.agilometer?.flexibility || 50
    const prince2Weight = 100 - agileWeight
    
    const hybridPrompt = {
      system: `You are an expert in both Agile and Prince2 methodologies.
Create a hybrid approach that is ${agileWeight}% Agile and ${prince2Weight}% Prince2.
Balance flexibility with governance based on these parameters.`,
      user: `Create a Hybrid Project Charter combining Agile and Prince2 elements.
Include both iterative delivery and stage gates.
Project: {{projectName}}
Vision: {{vision}}
Business Case: {{businessCase}}
Agilometer Settings:
- Flexibility: ${data.agilometer?.flexibility}%
- Team Experience: ${data.agilometer?.teamExperience}%
- Risk Tolerance: ${data.agilometer?.riskTolerance}%
- Documentation: ${data.agilometer?.documentation}%
- Governance: ${data.agilometer?.governance}%`
    }
    
    const prompt = this.gateway.buildContextPrompt(
      hybridPrompt.system,
      hybridPrompt.user,
      data
    )
    
    const content = await this.gateway.generateText(prompt)
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'charter',
      methodology: 'hybrid',
      version: 1,
      generatedAt: new Date(),
      llmProvider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    
    return {
      metadata,
      content: { charter: content },
      aiInsights: {
        suggestions: [
          'Review balance between agility and governance',
          'Validate hybrid approach with stakeholders'
        ]
      }
    }
  }

  /**
   * Store mapping table for PII rehydration
   */
  private async storeMappingTable(
    projectId: string,
    mapping: Record<string, string>
  ): Promise<void> {
    // In production, store this securely in Supabase
    // For now, we'll store in memory or session storage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        `mapping_${projectId}`,
        JSON.stringify(mapping)
      )
    }
  }

  /**
   * Retrieve mapping table for export
   */
  async getMappingTable(projectId: string): Promise<Record<string, string>> {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`mapping_${projectId}`)
      return stored ? JSON.parse(stored) : {}
    }
    return {}
  }

  /**
   * Estimate generation cost
   */
  async estimateCost(projectData: Record<string, unknown>): Promise<number> {
    const sanitizedData = this.sanitizer.sanitizeProjectData(projectData)
    
    // Estimate tokens for each document type
    let totalInputTokens = 0
    let totalOutputTokens = 0
    
    // Rough estimates based on document type
    const estimates = {
      agile: { input: 2000, output: 4000 },
      prince2: { input: 3000, output: 6000 },
      hybrid: { input: 2500, output: 5000 }
    }
    
    const est = estimates[sanitizedData.methodology]
    totalInputTokens = est.input
    totalOutputTokens = est.output
    
    return this.gateway.estimateCost(totalInputTokens, totalOutputTokens)
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return this.queue.getStatus()
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.cache.destroy()
    this.queue.stop()
  }
}