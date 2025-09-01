import { LLMGateway } from '../llm/gateway'
import { DataSanitizer } from '../llm/sanitizer'
import { SanitizedProjectData, GeneratedDocument, DocumentMetadata } from '../llm/types'
import { agilePrompts } from '../llm/prompts/agile'
import { prince2Prompts } from '../llm/prompts/prince2'
import { technicalLandscapePrompts } from '../llm/prompts/technical-landscape'
import { comparableProjectsPrompts } from '../llm/prompts/comparable-projects'
import { AgileCharterSchema, ProductBacklogSchema } from './schemas/agile-charter'
import { Prince2PIDSchema, RiskRegisterSchema } from './schemas/prince2-pid'
import { DocumentQueue } from './queue'
import { DocumentCache } from './cache'
import { documentLogger } from '../utils/document-logger'
import { logger } from '@/lib/utils/permanent-logger'
import { TwoStageGenerator, ResearchContext } from './two-stage-generator'
import { DevLogger } from '@/lib/utils/dev-logger'
import { SectionedDocumentGenerator } from './sectioned-generator'
import { StructuredDocumentGenerator } from './structured-generator'

// GPT-5 optimized document configurations based on architecture doc
// Reasoning effort levels optimized for document complexity
// Token allocations increased for better quality
const DOCUMENT_CONFIG = {
  // Simple documents (minimal reasoning, structured outputs)
  charter: { maxTokens: 4000, reasoningEffort: 'minimal' as const },
  business_case: { maxTokens: 4000, reasoningEffort: 'minimal' as const },
  backlog: { maxTokens: 3500, reasoningEffort: 'minimal' as const },
  
  // Medium complexity (low reasoning for better analysis)
  project_plan: { maxTokens: 8000, reasoningEffort: 'low' as const }, // Detailed planning
  comparable_projects: { maxTokens: 10000, reasoningEffort: 'low' as const }, // Case analysis
  communication_plan: { maxTokens: 10000, reasoningEffort: 'low' as const }, // Stakeholder management
  
  // Complex documents (medium reasoning for deep analysis)
  pid: { maxTokens: 1500, reasoningEffort: 'minimal' as const }, // Complex JSON with multiple sections
  risk_register: { maxTokens: 8000, reasoningEffort: 'medium' as const }, // 15 detailed risks with mitigation
  technical_landscape: { maxTokens: 12000, reasoningEffort: 'medium' as const }, // Deep technical analysis
  quality_management: { maxTokens: 10000, reasoningEffort: 'medium' as const }, // Quality procedures and standards
}

export class DocumentGenerator {
  private gateway: LLMGateway
  private sanitizer: DataSanitizer
  private queue: DocumentQueue
  private cache: DocumentCache
  private useQueue: boolean
  private useCache: boolean
  private sectionedGenerator: SectionedDocumentGenerator
  private structuredGenerator: StructuredDocumentGenerator
  private aggregatedMetrics: {
    totalInputTokens: number
    totalOutputTokens: number
    totalReasoningTokens: number
    totalTokens: number
    totalGenerationTimeMs: number
    documentCount: number
    totalCostUsd: number
  }

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
    this.sectionedGenerator = new SectionedDocumentGenerator(this.gateway)
    
    // Use GPT-4o-mini for structured documents (PID & Business Case)
    // GPT-4o supports zodResponseFormat for guaranteed schema adherence
    // GPT-5 models cause truncation issues with large complex schemas
    this.structuredGenerator = new StructuredDocumentGenerator(undefined, 'gpt-4o-mini')
    this.aggregatedMetrics = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalReasoningTokens: 0,
      totalTokens: 0,
      totalGenerationTimeMs: 0,
      documentCount: 0,
      totalCostUsd: 0
    }
    
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
    // Access the provider directly from gateway's private config
    return (this.gateway as any).config?.provider || 'unknown'
  }
  
  getProviderInfo() {
    const config = (this.gateway as any).config
    return {
      provider: config?.provider || 'unknown',
      model: config?.model || 'default',
      temperature: config?.temperature || 0.7,
      maxTokens: config?.maxTokens || 4000
    }
  }
  
  getDebugInfo() {
    return {
      cacheEnabled: this.useCache,
      provider: this.getProvider(),
      providerInfo: this.getProviderInfo(),
      aggregatedMetrics: this.aggregatedMetrics,
      timestamp: new Date().toISOString()
    }
  }
  
  getAggregatedMetrics() {
    return {
      ...this.aggregatedMetrics,
      provider: this.getProvider(),
      model: this.getProviderInfo().model
    }
  }

  /**
   * Generate all documents for a project based on methodology
   */
  async generateProjectDocuments(
    projectData: Record<string, unknown>,
    projectId: string,
    selectedDocuments?: string[]
  ): Promise<GeneratedDocument[]> {
    // Log incoming project data to verify wizard data flow
    console.log(`
==========================================
🚀 DOCUMENT GENERATION SESSION STARTED
==========================================
  🎯 Methodology: ${projectData.methodology}
  📝 Documents: ${selectedDocuments?.length || 'All'} selected
  💰 Budget: ${projectData.budget || 'Not specified'}
  📅 Timeline: ${projectData.timeline || 'Not specified'}
  📆 Start Date: ${projectData.startDate || 'Not specified'}
  📆 End Date: ${projectData.endDate || 'Not specified'}
  👥 Stakeholders: ${(projectData.stakeholders as any[])?.length || 0}
  🔧 Provider: ${this.getProvider()}
  ⏱️  Time: ${new Date().toISOString()}
==========================================
`)
    console.log('Selected documents to generate:', selectedDocuments)
    
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
    
    // Helper to check if document should be generated
    const shouldGenerate = (docName: string): boolean => {
      if (!selectedDocuments || selectedDocuments.length === 0) {
        // If no selection provided, generate all
        return true
      }
      
      // Map document type names to display names
      const typeToDisplayMap: Record<string, string> = {
        'charter': 'Project Charter',
        'backlog': 'Product Backlog',
        'sprint_plan': 'Sprint Plan',
        'technical_landscape': 'Technical Landscape',
        'comparable_projects': 'Comparable Projects',
        'pid': 'Project Initiation Document',
        'business_case': 'Business Case',
        'project_plan': 'Project Plan',
        'risk_register': 'Risk Register',
        'hybrid_charter': 'Hybrid Charter'
      }
      
      // Check if the document is selected by matching either the display name or the type
      for (const selected of selectedDocuments) {
        if (selected === docName) return true
        if (typeToDisplayMap[selected] === docName) return true
      }
      
      return false
    }
    
    try {
      console.log(`📄 Starting ${sanitizedData.methodology} document generation...`)
      console.log(`  Raw methodology: "${sanitizedData.methodology}"`)
      console.log(`  Lowercase: "${sanitizedData.methodology.toLowerCase()}"`)
      if (selectedDocuments) {
        console.log(`  Selected documents: ${selectedDocuments.join(', ')}`)
      }
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
      
      // Use longer timeout for GPT-5 models which can take 60-120s
      // Increased timeout for parallel generation reliability
      const timeoutMs = 180000 // Increased to 180s for GPT-5 models
      
      // Check if we're using DeepSeek provider for sequential generation
      const isDeepSeek = this.getProvider() === 'deepseek'
      
      // Convert to lowercase for case-insensitive comparison
      const methodology = sanitizedData.methodology.toLowerCase()
      
      // Check if we should use two-stage generation
      const useTwoStage = TwoStageGenerator.shouldGenerateResearch(sanitizedData)
      let researchContext: ResearchContext = {}
      
      if (useTwoStage) {
        logger.info('TWO_STAGE', 'Using two-stage generation with research context')
      }
      
      switch (methodology) {
        case 'agile':
          // Generate all 5 Agile documents with two-stage process
          console.log('🚀 Generating 5 Agile documents with enhanced context...')
          
          // Stage 1: Generate research documents first if two-stage enabled
          if (useTwoStage) {
            console.log('📚 Stage 1: Generating research documents...')
            
            try {
              // Generate Technical Landscape if selected
              if (shouldGenerate('Technical Landscape')) {
                console.log('  📄 Generating Technical Landscape (research)...')
                const techLandscape = await withTimeout(
                  this.generateTechnicalLandscape(sanitizedData, projectId),
                  timeoutMs,
                  'Technical Landscape'
                )
                documents.push(techLandscape)
                
                // Only extract context if we have the document
                if (shouldGenerate('Comparable Projects')) {
                  console.log('\n  📄 [STAGE 1] Generating Comparable Projects Analysis...')
                  console.log('     Purpose: Identify similar projects for insights and best practices')
                  const comparableProjects = await withTimeout(
                    this.generateComparableProjects(sanitizedData, projectId),
                    timeoutMs,
                    'Comparable Projects'
                  )
                  documents.push(comparableProjects)
                  
                  // Extract research context from both
                  researchContext = TwoStageGenerator.extractResearchContext(
                    techLandscape,
                    comparableProjects
                  )
                } else {
                  // Extract context from tech landscape only
                  researchContext = TwoStageGenerator.extractResearchContext(
                    techLandscape,
                    undefined
                  )
                }
              } else if (shouldGenerate('Comparable Projects')) {
                // Only generate Comparable Projects
                console.log('\n  📄 [STAGE 1] Generating Comparable Projects Analysis...')
                console.log('     Purpose: Identify similar projects for insights and best practices')
                const comparableProjects = await withTimeout(
                  this.generateComparableProjects(sanitizedData, projectId),
                  timeoutMs,
                  'Comparable Projects'
                )
                documents.push(comparableProjects)
                
                // Extract context from comparable projects only
                researchContext = TwoStageGenerator.extractResearchContext(
                  undefined,
                  comparableProjects
                )
              }
              
              if (Object.keys(researchContext).length > 0) {
                console.log('\n  ✅ Stage 1 Complete! Research context extracted:', 
                  TwoStageGenerator.formatContextForLogging(researchContext))
                console.log('     This context will now enhance all remaining documents')
              }
              
            } catch (error) {
              console.error('  ⚠️ Research generation failed, continuing without context:', error)
              logger.error('TWO_STAGE', 'Research generation failed', error)
            }
          }
          
          // Stage 2: Generate main documents (with or without research context)
          console.log('\n' + '='.repeat(80))
          console.log(`${useTwoStage ? '📋 STAGE 2: MAIN DOCUMENTS GENERATION (with research context)' : '📋 GENERATING MAIN DOCUMENTS...'}`)
          console.log('='.repeat(80))
          if (useTwoStage && Object.keys(researchContext).length > 0) {
            console.log('Using research insights to enhance document quality...')
          }
          
          // Build list of generators based on selection
          const agileGenerators = []
          
          if (shouldGenerate('Project Charter')) {
            agileGenerators.push({
              fn: () => useTwoStage 
                ? this.generateAgileCharter(sanitizedData, projectId, researchContext)
                : this.generateAgileCharter(sanitizedData, projectId),
              name: 'Project Charter',
              docName: 'Project Charter'
            })
          }
          
          if (shouldGenerate('Product Backlog')) {
            agileGenerators.push({
              fn: () => useTwoStage
                ? this.generateProductBacklog(sanitizedData, projectId, researchContext)
                : this.generateProductBacklog(sanitizedData, projectId),
              name: 'Product Backlog',
              docName: 'Product Backlog'
            })
          }
          
          if (shouldGenerate('Sprint Plan')) {
            agileGenerators.push({
              fn: () => useTwoStage
                ? this.generateSprintPlan(sanitizedData, projectId, researchContext)
                : this.generateSprintPlan(sanitizedData, projectId),
              name: 'Sprint Plan',
              docName: 'Sprint Plan'
            })
          }
          
          // Add research documents if not using two-stage (they weren't generated in stage 1)
          if (!useTwoStage) {
            if (shouldGenerate('Technical Landscape')) {
              agileGenerators.push({
                fn: () => this.generateTechnicalLandscape(sanitizedData, projectId),
                name: 'Technical Landscape',
                docName: 'Technical Landscape'
              })
            }
            
            if (shouldGenerate('Comparable Projects')) {
              agileGenerators.push({
                fn: () => this.generateComparableProjects(sanitizedData, projectId),
                name: 'Comparable Projects',
                docName: 'Comparable Projects'
              })
            }
          }
          
          console.log(`  Provider: ${this.getProvider()}`)
          console.log(`  Model: ${this.getProviderInfo().model}`)
          console.log(`  Number of generators: ${agileGenerators.length}`)
          
          // Always use sequential for stability
          console.log('📋 Generating documents sequentially for stability...')
          for (const { fn, name } of agileGenerators) {
            let retryCount = 0
            const maxRetries = 3
            let lastError: any = null
            
            while (retryCount < maxRetries) {
              try {
                console.log(`  📄 Generating ${name}... (Attempt ${retryCount + 1}/${maxRetries})`)
                const startTime = Date.now()
                documentLogger.logGenerationAttempt(projectId, name, this.getProvider(), this.getProviderInfo().model)
                
                const doc = await withTimeout(fn(), timeoutMs, name)
                documents.push(doc)
                
                const duration = Date.now() - startTime
                const contentLength = JSON.stringify(doc.content).length
                documentLogger.logGenerationSuccess(projectId, name, duration, contentLength)
                console.log(`  ✅ ${name} completed in ${duration}ms`)
                break // Success, exit retry loop
              } catch (error: any) {
                retryCount++
                lastError = error
                console.error(`  ⚠️ ${name} failed (Attempt ${retryCount}/${maxRetries}):`, error?.message || error)
                
                if (retryCount < maxRetries) {
                  // Wait before retrying with exponential backoff
                  const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000)
                  console.log(`  ⏳ Waiting ${waitTime}ms before retry...`)
                  await new Promise(resolve => setTimeout(resolve, waitTime))
                } else {
                  // Final failure - log detailed error
                  console.error(`  ❌ ${name} failed after ${maxRetries} attempts`)
                  console.error(`    Error type:`, error?.constructor?.name)
                  console.error(`    Error details:`, {
                    message: error?.message,
                    code: error?.code,
                    status: error?.status,
                    provider: this.getProvider()
                  })
                  if (error?.stack) {
                    console.error(`    Error stack (first 5 lines):`)
                    error.stack.split('\n').slice(0, 5).forEach((line: string) => 
                      console.error(`      ${line}`))
                  }
                  documentLogger.logGenerationFailure(projectId, name, error, retryCount, maxRetries)
                  
                  // Add a placeholder error document so user knows it failed
                  documents.push({
                    metadata: {
                      projectId,
                      type: name.toLowerCase().replace(/ /g, '_'),
                      methodology: 'agile',
                      version: 1,
                      generatedAt: new Date(),
                      llmProvider: this.getProvider(),
                      model: this.getProviderInfo().model,
                      error: true
                    },
                    content: {
                      error: `Failed to generate ${name}`,
                      message: lastError?.message || 'Unknown error',
                      retries: retryCount
                    },
                    aiInsights: {
                      error: true,
                      message: `Document generation failed after ${retryCount} attempts`
                    }
                  })
                }
              }
            }
          }
          break
          
        case 'prince2':
          // Generate PRINCE2 documents with two-stage process
          console.log('🚀 Generating PRINCE2 documents with enhanced context...')
          
          // Stage 1: Generate research documents first if two-stage enabled
          if (useTwoStage) {
            console.log('\n' + '='.repeat(80))
            console.log('📚 STAGE 1: RESEARCH DOCUMENTS GENERATION (for enhanced context)')
            console.log('='.repeat(80))
            console.log('Research documents will generate FIRST to provide context for main documents')
            
            try {
              // Generate Technical Landscape if selected
              if (shouldGenerate('Technical Landscape')) {
                console.log('\n  📄 [STAGE 1] Generating Technical Landscape Analysis...')
                console.log('     Purpose: Analyze technical requirements and architecture')
                const techLandscape = await withTimeout(
                  this.generateTechnicalLandscape(sanitizedData, projectId),
                  timeoutMs,
                  'Technical Landscape'
                )
                documents.push(techLandscape)
                
                // Only extract context if we have the document
                if (shouldGenerate('Comparable Projects')) {
                  console.log('\n  📄 [STAGE 1] Generating Comparable Projects Analysis...')
                  console.log('     Purpose: Identify similar projects for insights and best practices')
                  const comparableProjects = await withTimeout(
                    this.generateComparableProjects(sanitizedData, projectId),
                    timeoutMs,
                    'Comparable Projects'
                  )
                  documents.push(comparableProjects)
                  
                  // Extract research context from both
                  researchContext = TwoStageGenerator.extractResearchContext(
                    techLandscape,
                    comparableProjects
                  )
                } else {
                  // Extract context from tech landscape only
                  researchContext = TwoStageGenerator.extractResearchContext(
                    techLandscape,
                    undefined
                  )
                }
              } else if (shouldGenerate('Comparable Projects')) {
                // Only generate Comparable Projects
                console.log('\n  📄 [STAGE 1] Generating Comparable Projects Analysis...')
                console.log('     Purpose: Identify similar projects for insights and best practices')
                const comparableProjects = await withTimeout(
                  this.generateComparableProjects(sanitizedData, projectId),
                  timeoutMs,
                  'Comparable Projects'
                )
                documents.push(comparableProjects)
                
                // Extract context from comparable projects only
                researchContext = TwoStageGenerator.extractResearchContext(
                  undefined,
                  comparableProjects
                )
              }
              
              if (Object.keys(researchContext).length > 0) {
                console.log('\n  ✅ Stage 1 Complete! Research context extracted:', 
                  TwoStageGenerator.formatContextForLogging(researchContext))
                console.log('     This context will now enhance all remaining documents')
              }
              
            } catch (error) {
              console.error('  ⚠️ Research generation failed, continuing without context:', error)
              logger.error('TWO_STAGE', 'Research generation failed', error)
            }
          }
          
          // Stage 2: Generate main documents (with or without research context)
          console.log('\n' + '='.repeat(80))
          console.log(`${useTwoStage ? '📋 STAGE 2: MAIN DOCUMENTS GENERATION (with research context)' : '📋 GENERATING MAIN DOCUMENTS...'}`)
          console.log('='.repeat(80))
          if (useTwoStage && Object.keys(researchContext).length > 0) {
            console.log('Using research insights to enhance document quality...')
          }
          
          // Build batches based on selected documents
          const batch1 = []
          const batch2 = []
          const batch3 = []
          
          if (shouldGenerate('Business Case')) {
            batch1.push({
              fn: () => useTwoStage
                ? this.generateBusinessCase(sanitizedData, projectId, researchContext)
                : this.generateBusinessCase(sanitizedData, projectId),
              name: 'Business Case'
            })
          }
          
          if (shouldGenerate('Project Initiation Document')) {
            batch1.push({
              fn: () => useTwoStage
                ? this.generatePrince2PID(sanitizedData, projectId, researchContext)
                : this.generatePrince2PID(sanitizedData, projectId),
              name: 'Project Initiation Document'
            })
          }
          
          if (shouldGenerate('Project Plan')) {
            batch2.push({
              fn: () => useTwoStage
                ? this.generateProjectPlan(sanitizedData, projectId, researchContext)
                : this.generateProjectPlan(sanitizedData, projectId),
              name: 'Project Plan'
            })
          }
          
          if (shouldGenerate('Risk Register')) {
            batch2.push({
              fn: () => useTwoStage
                ? this.generateRiskRegister(sanitizedData, projectId, researchContext)
                : this.generateRiskRegister(sanitizedData, projectId),
              name: 'Risk Register'
            })
          }
          
          // Add PRINCE2 documents to batch 2
          if (shouldGenerate('Quality Management Strategy')) {
            batch2.push({
              fn: () => useTwoStage
                ? this.generateQualityManagementStrategy(sanitizedData, projectId, researchContext)
                : this.generateQualityManagementStrategy(sanitizedData, projectId),
              name: 'Quality Management Strategy'
            })
          }
          
          if (shouldGenerate('Communication Plan')) {
            batch2.push({
              fn: () => useTwoStage
                ? this.generateCommunicationPlan(sanitizedData, projectId, researchContext)
                : this.generateCommunicationPlan(sanitizedData, projectId),
              name: 'Communication Plan'
            })
          }
          
          // Add research documents if not using two-stage (they weren't generated in stage 1)
          if (!useTwoStage) {
            if (shouldGenerate('Technical Landscape')) {
              batch3.push({
                fn: () => this.generateTechnicalLandscape(sanitizedData, projectId),
                name: 'Technical Landscape'
              })
            }
            
            if (shouldGenerate('Comparable Projects')) {
              batch3.push({
                fn: () => this.generateComparableProjects(sanitizedData, projectId),
                name: 'Comparable Projects'
              })
            }
          }
          
          // Only process batches that have documents
          const batches = [batch1, batch2, batch3].filter(batch => batch.length > 0)
          
          if (batches.length === 0) {
            console.log('⚠️ No documents selected for generation')
            break
          }
          
          console.log(`📋 Generating in ${batches.length} batch(es) to prevent rate limiting...`)
          
          // Process each batch in sequence
          for (let i = 0; i < batches.length; i++) {
            const batch = batches[i]
            const batchNames = batch.map(item => item.name).join(', ')
            console.log(`  📦 Batch ${i + 1}: ${batchNames} (parallel)...`)
            const batchStartTime = Date.now()
            
            const batchPromises = batch.map(async ({ fn, name }) => {
            let retryCount = 0
            const maxRetries = 3
            let lastError: any = null
            
            while (retryCount < maxRetries) {
              try {
                console.log(`    📄 Starting ${name}... (Attempt ${retryCount + 1}/${maxRetries})`)
                const startTime = Date.now()
                documentLogger.logGenerationAttempt(projectId, name, this.getProvider(), this.getProviderInfo().model)
                
                const doc = await withTimeout(fn(), timeoutMs, name)
                
                const duration = Date.now() - startTime
                const contentLength = JSON.stringify(doc.content).length
                documentLogger.logGenerationSuccess(projectId, name, duration, contentLength)
                console.log(`    ✅ ${name} completed in ${duration}ms`)
                
                return doc
              } catch (error: any) {
                retryCount++
                lastError = error
                console.error(`    ⚠️ ${name} failed (Attempt ${retryCount}/${maxRetries}):`, error?.message || error)
                
                if (retryCount < maxRetries) {
                  // Wait before retrying with exponential backoff
                  const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000)
                  console.log(`    ⏳ Waiting ${waitTime}ms before retry...`)
                  await new Promise(resolve => setTimeout(resolve, waitTime))
                } else {
                  // Final failure - log detailed error
                  console.error(`    ❌ ${name} failed after ${maxRetries} attempts`)
                  console.error(`    Error type:`, error?.constructor?.name)
                  console.error(`    Error details:`, {
                    message: error?.message,
                    code: error?.code,
                    status: error?.status,
                    provider: this.getProvider()
                  })
                  if (error?.stack) {
                    console.error(`    Error stack (first 5 lines):`)
                    error.stack.split('\n').slice(0, 5).forEach((line: string) => 
                      console.error(`      ${line}`))
                  }
                  documentLogger.logGenerationFailure(projectId, name, error, retryCount, maxRetries)
                  
                  // Return error document placeholder
                  return {
                    metadata: {
                      projectId,
                      type: name.toLowerCase().replace(/ /g, '_'),
                      methodology: 'prince2',
                      version: 1,
                      generatedAt: new Date(),
                      llmProvider: this.getProvider(),
                      model: this.getProviderInfo().model,
                      error: true
                    },
                    content: {
                      error: `Failed to generate ${name}`,
                      message: lastError?.message || 'Unknown error',
                      retries: retryCount
                    },
                    aiInsights: {
                      error: true,
                      message: `Document generation failed after ${retryCount} attempts`
                    }
                  }
                }
              }
            }
            return null
          })
          
            const batchResults = await Promise.allSettled(batchPromises)
            batchResults.forEach((result, index) => {
              if (result.status === 'fulfilled' && result.value) {
                documents.push(result.value)
              } else if (result.status === 'rejected') {
                console.error(`    ❌ Batch ${i + 1} document ${index} failed:`, result.reason)
              }
            })
            console.log(`  ✅ Batch ${i + 1} completed in ${Date.now() - batchStartTime}ms`)
          }
          break
          
        case 'hybrid':
          console.log('🔄 Generating Hybrid documents with enhanced context...')
          
          // Stage 1: Generate research documents first if two-stage enabled
          if (useTwoStage) {
            console.log('📚 Stage 1: Generating research documents...')
            
            try {
              // Generate Technical Landscape if selected
              if (shouldGenerate('Technical Landscape')) {
                console.log('  📄 Generating Technical Landscape (research)...')
                const techLandscape = await withTimeout(
                  this.generateTechnicalLandscape(sanitizedData, projectId),
                  timeoutMs,
                  'Technical Landscape'
                )
                documents.push(techLandscape)
                
                // Only extract context if we have the document
                if (shouldGenerate('Comparable Projects')) {
                  console.log('\n  📄 [STAGE 1] Generating Comparable Projects Analysis...')
                  console.log('     Purpose: Identify similar projects for insights and best practices')
                  const comparableProjects = await withTimeout(
                    this.generateComparableProjects(sanitizedData, projectId),
                    timeoutMs,
                    'Comparable Projects'
                  )
                  documents.push(comparableProjects)
                  
                  // Extract research context from both
                  researchContext = TwoStageGenerator.extractResearchContext(
                    techLandscape,
                    comparableProjects
                  )
                } else {
                  // Extract context from tech landscape only
                  researchContext = TwoStageGenerator.extractResearchContext(
                    techLandscape,
                    undefined
                  )
                }
              } else if (shouldGenerate('Comparable Projects')) {
                // Only generate Comparable Projects
                console.log('\n  📄 [STAGE 1] Generating Comparable Projects Analysis...')
                console.log('     Purpose: Identify similar projects for insights and best practices')
                const comparableProjects = await withTimeout(
                  this.generateComparableProjects(sanitizedData, projectId),
                  timeoutMs,
                  'Comparable Projects'
                )
                documents.push(comparableProjects)
                
                // Extract context from comparable projects only
                researchContext = TwoStageGenerator.extractResearchContext(
                  undefined,
                  comparableProjects
                )
              }
              
              if (Object.keys(researchContext).length > 0) {
                console.log('\n  ✅ Stage 1 Complete! Research context extracted:', 
                  TwoStageGenerator.formatContextForLogging(researchContext))
                console.log('     This context will now enhance all remaining documents')
              }
              
            } catch (error) {
              console.error('  ⚠️ Research generation failed, continuing without context:', error)
              logger.error('TWO_STAGE', 'Research generation failed', error)
            }
          }
          
          // Stage 2: Generate main documents (with or without research context)
          console.log('\n' + '='.repeat(80))
          console.log(`${useTwoStage ? '📋 STAGE 2: MAIN DOCUMENTS GENERATION (with research context)' : '📋 GENERATING MAIN DOCUMENTS...'}`)
          console.log('='.repeat(80))
          if (useTwoStage && Object.keys(researchContext).length > 0) {
            console.log('Using research insights to enhance document quality...')
          }
          
          // Build list of generators based on selection
          const hybridGenerators = []
          
          if (shouldGenerate('Hybrid Charter')) {
            hybridGenerators.push({
              fn: () => useTwoStage
                ? this.generateHybridCharter(sanitizedData, projectId, researchContext)
                : this.generateHybridCharter(sanitizedData, projectId),
              name: 'Hybrid Charter'
            })
          }
          
          if (shouldGenerate('Risk Register')) {
            hybridGenerators.push({
              fn: () => useTwoStage
                ? this.generateRiskRegister(sanitizedData, projectId, researchContext)
                : this.generateRiskRegister(sanitizedData, projectId),
              name: 'Risk Register'
            })
          }
          
          if (shouldGenerate('Product Backlog')) {
            hybridGenerators.push({
              fn: () => useTwoStage
                ? this.generateProductBacklog(sanitizedData, projectId, researchContext)
                : this.generateProductBacklog(sanitizedData, projectId),
              name: 'Product Backlog'
            })
          }
          
          // Add research documents if not using two-stage (they weren't generated in stage 1)
          if (!useTwoStage) {
            if (shouldGenerate('Technical Landscape')) {
              hybridGenerators.push({
                fn: () => this.generateTechnicalLandscape(sanitizedData, projectId),
                name: 'Technical Landscape'
              })
            }
            
            if (shouldGenerate('Comparable Projects')) {
              hybridGenerators.push({
                fn: () => this.generateComparableProjects(sanitizedData, projectId),
                name: 'Comparable Projects'
              })
            }
          }
          
          if (hybridGenerators.length === 0) {
            console.log('⚠️ No documents selected for generation')
            break
          }
          
          if (isDeepSeek) {
            console.log('📋 Generating documents sequentially (DeepSeek mode)...')
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
            console.log(`🚀 Generating ${hybridGenerators.length} documents in parallel...`)
            const hybridPromises = await Promise.allSettled(
              hybridGenerators.map(({ fn, name }) => withTimeout(fn(), timeoutMs, name))
            )
            
            // Collect successful documents
            hybridPromises.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                documents.push(result.value)
              } else {
                console.warn(`⚠️ Document ${hybridGenerators[index].name} failed: ${result.reason}`)
              }
            })
          }
          break
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000)
      const totalTimeMs = Date.now() - startTime
      
      // Check if we got at least some documents
      if (documents.length === 0) {
        console.error('❌ No documents were generated successfully')
        throw new Error('All document generation attempts failed. Please try again.')
      }
      
      console.log(`✅ Generated ${documents.length} documents in ${duration} seconds`)
      
      // Log aggregated metrics
      if (this.aggregatedMetrics.documentCount > 0) {
        console.log('[Generator] Aggregated metrics:', {
          documents: this.aggregatedMetrics.documentCount,
          totalInputTokens: this.aggregatedMetrics.totalInputTokens,
          totalOutputTokens: this.aggregatedMetrics.totalOutputTokens,
          totalReasoningTokens: this.aggregatedMetrics.totalReasoningTokens,
          totalTokens: this.aggregatedMetrics.totalTokens,
          totalTimeMs: totalTimeMs,
          avgTimePerDoc: Math.round(totalTimeMs / this.aggregatedMetrics.documentCount),
          provider: this.getProvider(),
          model: this.getProviderInfo().model
        })
      }
      
      // Cache the generated documents for future use
      if (this.useCache && documents.length > 0) {
        const providerName = this.getProvider()
        this.cache.set(sanitizedData, projectId, documents, providerName)
      }
      
      // Store mapping table for later use
      await this.storeMappingTable(projectId, mappingTable)
      
      // Rehydrate documents with original stakeholder names before returning
      const rehydratedDocuments = documents.map(doc => {
        // Skip if no content to rehydrate
        if (!doc.content) return doc
        
        // Rehydrate string content
        if (typeof doc.content === 'string') {
          return {
            ...doc,
            content: this.sanitizer.rehydrateDocument(doc.content, mappingTable)
          }
        }
        
        // Rehydrate object content by converting to string, rehydrating, then parsing back
        try {
          const contentString = JSON.stringify(doc.content)
          const rehydratedString = this.sanitizer.rehydrateDocument(contentString, mappingTable)
          return {
            ...doc,
            content: JSON.parse(rehydratedString)
          }
        } catch (error) {
          console.warn('Failed to rehydrate document content, returning original:', error)
          return doc
        }
      })
      
      return rehydratedDocuments
    } catch (error) {
      console.error('Document generation failed:', error)
      throw new Error(`Failed to generate documents: ${error.message}`)
    }
  }

  /**
   * Generate a single document by type
   * Public method for streaming/individual generation
   */
  async generateDocument(
    documentType: string,
    projectData: Record<string, unknown>,
    projectId: string
  ): Promise<GeneratedDocument> {
    DevLogger.logSection(`generateDocument: ${documentType}`)
    DevLogger.logStep('Project Data', projectData)
    
    // Sanitize project data first
    const sanitizedData = this.sanitizer.sanitizeProjectData(projectData)
    DevLogger.logStep('Sanitized Data', sanitizedData)
    
    // Create mapping table for later rehydration
    const mappingTable = this.sanitizer.createMappingTable(projectData, sanitizedData)
    
    // Map document type to generator method
    const generatorMap: Record<string, () => Promise<GeneratedDocument>> = {
      'charter': () => this.generateAgileCharter(sanitizedData, projectId),
      'backlog': () => this.generateProductBacklog(sanitizedData, projectId),
      'sprint_plan': () => this.generateSprintPlan(sanitizedData, projectId),
      'pid': () => this.generatePrince2PID(sanitizedData, projectId),
      'business_case': () => this.generateBusinessCase(sanitizedData, projectId),
      'risk_register': () => this.generateRiskRegister(sanitizedData, projectId),
      'project_plan': () => this.generateProjectPlan(sanitizedData, projectId),
      'technical_landscape': () => this.generateTechnicalLandscape(sanitizedData, projectId),
      'comparable_projects': () => this.generateComparableProjects(sanitizedData, projectId)
    }
    
    const generator = generatorMap[documentType]
    if (!generator) {
      DevLogger.logError(`Unknown document type: ${documentType}`)
      throw new Error(`Unknown document type: ${documentType}`)
    }
    
    try {
      const startTime = Date.now()
      documentLogger.logGenerationAttempt(projectId, documentType, this.getProvider(), this.getProviderInfo().model)
      DevLogger.logStep(`Starting ${documentType} generation`, { provider: this.getProvider(), model: this.getProviderInfo().model })
      
      const doc = await generator()
      DevLogger.logDocumentContent(documentType, doc.content)
      DevLogger.logStep('Document metadata', doc.metadata)
      
      const duration = Date.now() - startTime
      const contentLength = JSON.stringify(doc.content).length
      documentLogger.logGenerationSuccess(projectId, documentType, duration, contentLength)
      
      // Update aggregated metrics
      if (doc.metadata.usage) {
        DevLogger.logUsageTracking(`${documentType} generation`, doc.metadata.usage)
        this.aggregatedMetrics.totalInputTokens += doc.metadata.usage.inputTokens || 0
        this.aggregatedMetrics.totalOutputTokens += doc.metadata.usage.outputTokens || 0
        this.aggregatedMetrics.totalReasoningTokens += doc.metadata.usage.reasoningTokens || 0
        this.aggregatedMetrics.totalTokens += doc.metadata.usage.totalTokens || 0
        this.aggregatedMetrics.totalCostUsd += doc.metadata.usage.costUsd || 0
        this.aggregatedMetrics.totalGenerationTimeMs += duration
        this.aggregatedMetrics.documentCount++
        
        // Log to permanent file
        logger.docGen(projectId, documentType, 'completed', {
          ...doc.metadata.usage,
          generationTimeMs: duration,
          provider: doc.metadata.provider,
          model: doc.metadata.model,
          contentLength: JSON.stringify(doc.content).length
        })
      } else {
        DevLogger.logWarning(`No usage metadata for ${documentType}`, doc.metadata)
      }
      
      DevLogger.logSuccess(`${documentType} generation complete`, { duration, contentLength })
      
      // Rehydrate document content with original stakeholder names before returning
      if (doc.content) {
        if (typeof doc.content === 'string') {
          doc.content = this.sanitizer.rehydrateDocument(doc.content, mappingTable)
        } else {
          try {
            const contentString = JSON.stringify(doc.content)
            const rehydratedString = this.sanitizer.rehydrateDocument(contentString, mappingTable)
            doc.content = JSON.parse(rehydratedString)
          } catch (error) {
            console.warn('Failed to rehydrate document content, returning original:', error)
          }
        }
      }
      
      return doc
    } catch (error: any) {
      DevLogger.logError(`${documentType} generation failed`, error)
      documentLogger.logGenerationFailure(projectId, documentType, error, 1, 1)
      throw error
    }
  }

  /**
   * Generate Agile Project Charter
   */
  private async generateAgileCharter(
    data: SanitizedProjectData,
    projectId: string,
    researchContext?: ResearchContext
  ): Promise<GeneratedDocument> {
    const config = DOCUMENT_CONFIG.charter
    const providerInfo = this.getProviderInfo()
    let prompt = this.gateway.buildContextPrompt(
      agilePrompts.projectCharter.system,
      agilePrompts.projectCharter.user,
      data
    )
    
    // Enhance prompt with research context if available
    if (researchContext) {
      prompt = TwoStageGenerator.enhancePromptWithContext(prompt, researchContext, 'charter')
    }
    
    // Add GPT-5 optimizations to prompt
    const optimizedPrompt = {
      ...prompt,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort,
      temperature: providerInfo.temperature || 0.7
    }
    
    // Log generation details
    console.log('[Generator] Generating Agile Charter:', {
      provider: providerInfo.provider,
      model: providerInfo.model,
      promptLength: prompt.system.length + prompt.user.length,
      temperature: providerInfo.temperature,
      reasoningEffort: config.reasoningEffort,
      maxTokens: config.maxTokens
    })
    
    const startTime = Date.now()
    const result = await this.gateway.generateJSONWithMetrics(
      optimizedPrompt,
      AgileCharterSchema
    )
    const generationTimeMs = Date.now() - startTime
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'charter',
      methodology: 'agile',
      version: 1,
      generatedAt: new Date(),
      llmProvider: result.provider || providerInfo.provider,
      model: result.model || providerInfo.model,
      reasoningEffort: config.reasoningEffort,
      temperature: optimizedPrompt.temperature,
      maxTokens: config.maxTokens,
      usage: result.usage,
      generationTimeMs,
      prompt: { system: prompt.system, user: prompt.user }
    }
    
    // Log and aggregate token usage
    if (result.usage) {
      console.log('[Generator] Charter token usage:', {
        input: result.usage.inputTokens,
        output: result.usage.outputTokens,
        reasoning: result.usage.reasoningTokens,
        total: result.usage.totalTokens,
        timeMs: generationTimeMs
      })
      
      // Log to permanent file
      logger.docGen(projectId, 'charter', 'completed', {
        ...result.usage,
        generationTimeMs,
        provider: providerInfo.provider,
        model: providerInfo.model,
        reasoningEffort: config.reasoningEffort
      })
      
      // Update aggregated metrics
      this.aggregatedMetrics.totalInputTokens += result.usage.inputTokens || 0
      this.aggregatedMetrics.totalOutputTokens += result.usage.outputTokens || 0
      this.aggregatedMetrics.totalReasoningTokens += result.usage.reasoningTokens || 0
      this.aggregatedMetrics.totalTokens += result.usage.totalTokens || 0
      this.aggregatedMetrics.totalCostUsd += result.usage.costUsd || 0
      this.aggregatedMetrics.totalGenerationTimeMs += generationTimeMs
      this.aggregatedMetrics.documentCount++
    }
    
    return {
      metadata,
      content: result.content,
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
    projectId: string,
    researchContext?: ResearchContext
  ): Promise<GeneratedDocument> {
    const config = DOCUMENT_CONFIG.backlog
    const providerInfo = this.getProviderInfo()
    let prompt = this.gateway.buildContextPrompt(
      agilePrompts.productBacklog.system,
      agilePrompts.productBacklog.user,
      data
    )
    
    // Enhance prompt with research context if available
    if (researchContext) {
      prompt = TwoStageGenerator.enhancePromptWithContext(prompt, researchContext, 'backlog')
    }
    
    // Add GPT-5 optimizations
    const optimizedPrompt = {
      ...prompt,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort,
      temperature: providerInfo.temperature || 0.7
    }
    
    const content = await this.gateway.generateJSON(
      optimizedPrompt,
      ProductBacklogSchema
    )
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'backlog',
      methodology: 'agile',
      version: 1,
      generatedAt: new Date(),
      llmProvider: providerInfo.provider,
      model: providerInfo.model,
      reasoningEffort: config.reasoningEffort,
      temperature: optimizedPrompt.temperature,
      maxTokens: config.maxTokens
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
    projectId: string,
    researchContext?: ResearchContext
  ): Promise<GeneratedDocument> {
    const providerInfo = this.getProviderInfo()
    const prompt = this.gateway.buildContextPrompt(
      agilePrompts.sprintPlan.system,
      agilePrompts.sprintPlan.user,
      data
    )
    
    // Use generateTextWithMetrics to capture usage data
    const metricsResponse = await this.gateway.generateTextWithMetrics(prompt)
    const content = metricsResponse.content
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'project_plan',
      methodology: 'agile',
      version: 1,
      generatedAt: new Date(),
      llmProvider: metricsResponse.provider || 'openai',
      model: metricsResponse.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 8000,
      usage: metricsResponse.usage,
      generationTimeMs: metricsResponse.generationTimeMs
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
    projectId: string,
    researchContext?: ResearchContext
  ): Promise<GeneratedDocument> {
    console.log('📋 Generating PRINCE2 PID using structured outputs approach...')
    const providerInfo = this.getProviderInfo()
    const startTime = Date.now()
    
    try {
      documentLogger.logGenerationAttempt(projectId, 'PID', 'openai', 'gpt-4o-2024-08-06')
      
      // Use structured generator with proper Zod schemas
      const result = await this.structuredGenerator.generatePID(data, projectId)
      
      const duration = Date.now() - startTime
      const contentLength = JSON.stringify(result.content).length
      
      documentLogger.logGenerationSuccess(projectId, 'PID', duration, contentLength)
      console.log(`  ✅ PID generated successfully with structured outputs in ${duration}ms`)
      
      // Update aggregated metrics
      if (result.metadata.usage) {
        this.aggregatedMetrics.totalInputTokens += result.metadata.usage.inputTokens || 0
        this.aggregatedMetrics.totalOutputTokens += result.metadata.usage.outputTokens || 0
        this.aggregatedMetrics.totalReasoningTokens += result.metadata.usage.reasoningTokens || 0
        this.aggregatedMetrics.totalTokens += result.metadata.usage.totalTokens || 0
        this.aggregatedMetrics.totalCostUsd += result.metadata.usage.costUsd || 0
        this.aggregatedMetrics.totalGenerationTimeMs += duration
        this.aggregatedMetrics.documentCount++
      }
      
      return result
      
    } catch (error: any) {
      console.error('PID generation failed:', error)
      documentLogger.logGenerationFailure(projectId, 'PID', error, 1, 1)
      
      // Try fallback to sectioned generator
      console.log('  ⚠️ Attempting fallback to sectioned generator...')
      try {
        const content = await this.sectionedGenerator.generatePIDSectioned(
          data,
          projectId,
          researchContext
        )
        
        const duration = Date.now() - startTime
        documentLogger.logFallbackUsed('PID', 'Structured generation failed')
        
        return {
          content,
          metadata: {
            projectId,
            type: 'pid',
            methodology: 'prince2',
            version: 1,
            generatedAt: new Date(),
            provider: providerInfo.provider,
            model: providerInfo.model,
            usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0, costUsd: 0 }
          },
          formatted: ''
        }
      } catch (fallbackError: any) {
        console.error('  ❌ Fallback also failed:', fallbackError)
        
        // Return a basic structure on error
        const fallbackContent = {
          projectDefinition: {
            background: `${data.projectName}: ${data.businessCase}`,
            objectives: ['Complete project successfully'],
            desiredOutcomes: ['Successful implementation'],
            scope: { included: ['Core deliverables'], excluded: ['Out of scope'] },
            constraints: ['Time', 'Budget'],
            assumptions: ['Resources available'],
            deliverables: [{ name: 'Main Deliverable', description: 'Primary output', qualityCriteria: ['Quality'] }],
            interfaces: ['External systems']
          },
          businessCase: {
            reasons: data.businessCase || 'Business justification',
            options: [],
            expectedBenefits: [],
            expectedDisbenefits: [],
            timescale: data.estimatedDuration || 'TBD',
            costs: { development: '0', operational: '0', total: '0' },
            investmentAppraisal: 'TBD',
            majorRisks: []
          }
        }
        
        documentLogger.logFallbackUsed('PID', 'Both generators failed')
        
        return {
          content: fallbackContent,
          metadata: {
            projectId,
            type: 'pid',
            methodology: 'prince2',
            version: 1,
            generatedAt: new Date(),
            provider: providerInfo.provider,
            model: providerInfo.model,
            usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0, costUsd: 0 }
          },
          formatted: ''
        }
      }
    }
  }

  /**
   * Generate Business Case
   */
  private async generateBusinessCase(
    data: SanitizedProjectData,
    projectId: string,
    researchContext?: ResearchContext
  ): Promise<GeneratedDocument> {
    console.log('📋 Generating Business Case using structured outputs approach...')
    const providerInfo = this.getProviderInfo()
    const startTime = Date.now()
    
    try {
      documentLogger.logGenerationAttempt(projectId, 'Business Case', 'openai', 'gpt-4o-2024-08-06')
      
      // Use structured generator with proper Zod schemas
      const result = await this.structuredGenerator.generateBusinessCase(data, projectId)
      
      const duration = Date.now() - startTime
      const contentLength = JSON.stringify(result.content).length
      
      documentLogger.logGenerationSuccess(projectId, 'Business Case', duration, contentLength)
      console.log(`  ✅ Business Case generated successfully with structured outputs in ${duration}ms`)
      
      // Update aggregated metrics
      if (result.metadata.usage) {
        this.aggregatedMetrics.totalInputTokens += result.metadata.usage.inputTokens || 0
        this.aggregatedMetrics.totalOutputTokens += result.metadata.usage.outputTokens || 0
        this.aggregatedMetrics.totalReasoningTokens += result.metadata.usage.reasoningTokens || 0
        this.aggregatedMetrics.totalTokens += result.metadata.usage.totalTokens || 0
        this.aggregatedMetrics.totalCostUsd += result.metadata.usage.costUsd || 0
        this.aggregatedMetrics.totalGenerationTimeMs += duration
        this.aggregatedMetrics.documentCount++
      }
      
      return result
      
    } catch (error: any) {
      console.error('Business Case generation failed:', error)
      documentLogger.logGenerationFailure(projectId, 'Business Case', error, 1, 1)
      
      // Try fallback to sectioned generator
      console.log('  ⚠️ Attempting fallback to sectioned generator...')
      try {
        const content = await this.sectionedGenerator.generateBusinessCaseSectioned(
          data,
          projectId,
          researchContext
        )
        
        const duration = Date.now() - startTime
        documentLogger.logFallbackUsed('Business Case', 'Structured generation failed')
        
        return {
          content,
          metadata: {
            projectId,
            type: 'business_case',
            methodology: 'prince2',
            version: 1,
            generatedAt: new Date(),
            provider: providerInfo.provider,
            model: providerInfo.model,
            usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0, costUsd: 0 }
          },
          formatted: ''
        }
      } catch (fallbackError: any) {
        console.error('  ❌ Fallback also failed:', fallbackError)
        
        // Return a basic structure on error
        const fallbackContent = {
          executiveSummary: `Executive summary for ${data.projectName}`,
          reasons: data.businessCase || 'Business justification',
          businessOptions: [
            {
              option: 'Do Nothing',
              description: 'Continue with current state',
              costs: '$0',
              benefits: 'No disruption',
              risks: 'Miss opportunities'
            },
            {
              option: 'Recommended Solution',
              description: 'Implement proposed solution',
              costs: data.budget,
              benefits: 'Achieve objectives',
              risks: 'Implementation complexity'
            }
          ],
          expectedBenefits: [
            {
              benefit: 'Improved Efficiency',
              measurable: true,
              measurement: 'Time saved',
              baseline: 'Current state',
              target: '30% improvement'
            }
          ],
          expectedDisBenefits: [],
          timescale: data.estimatedDuration || 'TBD',
          costs: {
            development: data.budget || '0',
            operational: '0',
            maintenance: '0', 
            total: data.budget || '0'
          },
          investmentAppraisal: {
            roi: 'TBD',
            paybackPeriod: 'TBD',
            npv: 'TBD'
          },
          majorRisks: ['Implementation risk', 'Budget risk']
        }
        
        documentLogger.logFallbackUsed('Business Case', 'Both generators failed')
        
        return {
          content: fallbackContent,
          metadata: {
            projectId,
            type: 'business_case',
            methodology: 'prince2',
            version: 1,
            generatedAt: new Date(),
            provider: providerInfo.provider,
            model: providerInfo.model,
            usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0, costUsd: 0 }
          },
          formatted: ''
        }
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
    const config = DOCUMENT_CONFIG.risk_register
    const providerInfo = this.getProviderInfo()
    const prompt = this.gateway.buildContextPrompt(
      prince2Prompts.riskRegister.system,
      prince2Prompts.riskRegister.user,
      data
    )
    
    // Add GPT-5 optimizations
    const optimizedPrompt = {
      ...prompt,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort,
      temperature: providerInfo.temperature || 0.7
    }
    
    // Use generateTextWithMetrics to capture usage data
    const metricsResponse = await this.gateway.generateTextWithMetrics(optimizedPrompt)
    const textContent = metricsResponse.content
    
    // Try to parse as JSON
    let content: any
    try {
      // Clean up markdown if present
      let cleanContent = textContent.trim()
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      content = JSON.parse(cleanContent)
    } catch (e) {
      console.warn('[Generator] Risk Register JSON parsing failed, using text format')
      // If parsing fails, create a basic structure
      content = { 
        projectName: data.projectName,
        risks: [],
        rawText: textContent
      }
    }
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'risk_register',
      methodology: data.methodology,
      version: 1,
      generatedAt: new Date(),
      llmProvider: metricsResponse.provider || providerInfo.provider,
      model: metricsResponse.model || providerInfo.model,
      reasoningEffort: config.reasoningEffort,
      temperature: optimizedPrompt.temperature,
      maxTokens: config.maxTokens,
      usage: metricsResponse.usage,
      generationTimeMs: metricsResponse.generationTimeMs
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
    const config = DOCUMENT_CONFIG.project_plan
    const providerInfo = this.getProviderInfo()
    const prompt = this.gateway.buildContextPrompt(
      prince2Prompts.projectPlan.system,
      prince2Prompts.projectPlan.user,
      data
    )
    
    // Add GPT-5 optimizations
    const optimizedPrompt = {
      ...prompt,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort,
      temperature: providerInfo.temperature || 0.7
    }
    
    // Use generateTextWithMetrics to capture usage data
    const metricsResponse = await this.gateway.generateTextWithMetrics(optimizedPrompt)
    const textContent = metricsResponse.content
    
    // Try to parse as JSON
    let content: any
    try {
      // Clean up markdown if present
      let cleanContent = textContent.trim()
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      
      // Remove JavaScript comments (// style)
      cleanContent = cleanContent.replace(/\/\/.*$/gm, '')
      
      content = JSON.parse(cleanContent)
    } catch (e) {
      console.warn('[Generator] Project Plan JSON parsing failed, using text format')
      // If parsing fails, create a basic structure
      content = { 
        projectName: data.projectName,
        stages: [],
        rawText: textContent
      }
    }
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'project_plan',
      methodology: 'prince2',
      version: 1,
      generatedAt: new Date(),
      llmProvider: metricsResponse.provider || providerInfo.provider,
      model: metricsResponse.model || providerInfo.model,
      reasoningEffort: config.reasoningEffort,
      temperature: optimizedPrompt.temperature,
      maxTokens: config.maxTokens,
      usage: metricsResponse.usage,
      generationTimeMs: metricsResponse.generationTimeMs
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
    const providerInfo = this.getProviderInfo()
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
    
    // Use generateTextWithMetrics to capture usage data
    const metricsResponse = await this.gateway.generateTextWithMetrics(prompt)
    const content = metricsResponse.content
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'charter',
      methodology: 'hybrid',
      version: 1,
      generatedAt: new Date(),
      llmProvider: metricsResponse.provider || 'openai',
      model: metricsResponse.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 4000,
      usage: metricsResponse.usage,
      generationTimeMs: metricsResponse.generationTimeMs
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
   * Generate Technical Landscape Analysis (for all methodologies)
   */
  private async generateTechnicalLandscape(
    data: SanitizedProjectData,
    projectId: string
  ): Promise<GeneratedDocument> {
    console.log('🌐 Generating Technical Landscape Analysis...')
    const config = DOCUMENT_CONFIG.technical_landscape
    
    // Build the prompt using the technical landscape prompt builder
    const promptData = {
      projectName: data.projectName,
      description: data.description,
      sector: data.sector,
      companyWebsite: data.companyWebsite,
      vision: data.vision
    }
    
    const { system, user } = technicalLandscapePrompts.analysis.buildPrompt(promptData)
    const prompt = { system, user }
    
    // Apply configuration to prompt
    const optimizedPrompt = {
      ...prompt,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort
    }
    
    // Generate with retry logic
    let content: string = ''
    let metricsResponse: any = null
    let attempts = 0
    const maxAttempts = 3
    
    while (attempts < maxAttempts && !content) {
      try {
        attempts++
        console.log(`  Attempt ${attempts}/${maxAttempts}...`)
        metricsResponse = await this.gateway.generateTextWithMetrics(optimizedPrompt)
        content = metricsResponse.content
        
        // Validate content is not empty
        if (!content || content.trim() === '') {
          documentLogger.logEmptyContent('technical_landscape', this.getProvider(), attempts)
          throw new Error('Empty content received from LLM')
        }
      } catch (error: any) {
        console.warn(`  ⚠️ Attempt ${attempts} failed: ${error.message}`)
        documentLogger.logGenerationFailure(projectId, 'technical_landscape', error, attempts, maxAttempts)
        if (attempts >= maxAttempts) {
          console.error('  ❌ All attempts failed, using fallback content')
          documentLogger.logFallbackUsed('technical_landscape', 'Max attempts reached')
          content = this.generateFallbackTechnicalLandscape(data)
        }
      }
    }
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'technical_landscape',
      methodology: data.methodology,
      version: 1,
      generatedAt: new Date(),
      llmProvider: metricsResponse?.provider || this.getProvider(),
      model: metricsResponse?.model || this.getProviderInfo().model,
      temperature: 0.7,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort,
      usage: metricsResponse?.usage,
      generationTimeMs: metricsResponse?.generationTimeMs
    }
    
    return {
      metadata,
      content: { analysis: content },
      aiInsights: {
        keyTechnologies: ['Cloud Architecture', 'API Design', 'Security Framework'],
        recommendations: ['Adopt microservices', 'Implement CI/CD', 'Use containerization']
      }
    }
  }

  /**
   * Generate Comparable Projects Analysis (for all methodologies)
   */
  private async generateComparableProjects(
    data: SanitizedProjectData,
    projectId: string
  ): Promise<GeneratedDocument> {
    DevLogger.logSection('generateComparableProjects')
    console.log('📊 Generating Comparable Projects Analysis...')
    const config = DOCUMENT_CONFIG.comparable_projects
    const providerInfo = this.getProviderInfo()
    
    // Build the prompt using the comparable projects prompt builder
    const promptData = {
      projectName: data.projectName,
      description: data.description,
      sector: data.sector,
      vision: data.vision,
      businessCase: data.businessCase
    }
    
    DevLogger.logStep('Comparable Projects prompt data', promptData)
    
    const { system, user } = comparableProjectsPrompts.analysis.buildPrompt(promptData)
    const prompt = { 
      system, 
      user,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort
    }
    
    // Generate with retry logic
    let content: string = ''
    let metricsResponse: any = null
    let attempts = 0
    const maxAttempts = 3
    
    while (attempts < maxAttempts && !content) {
      try {
        attempts++
        console.log(`  Attempt ${attempts}/${maxAttempts}...`)
        DevLogger.logStep(`Comparable Projects generation attempt ${attempts}`)
        
        // Use generateTextWithMetrics to capture usage data
        metricsResponse = await this.gateway.generateTextWithMetrics(prompt)
        content = metricsResponse.content
        DevLogger.logStep('Comparable Projects response', { contentLength: content.length, hasUsage: !!metricsResponse.usage })
        
        // Validate content is not empty
        if (!content || content.trim() === '') {
          throw new Error('Empty content received from LLM')
        }
      } catch (error: any) {
        console.warn(`  ⚠️ Attempt ${attempts} failed: ${error.message}`)
        DevLogger.logWarning(`Comparable Projects attempt ${attempts} failed`, error)
        if (attempts >= maxAttempts) {
          console.error('  ❌ All attempts failed, using fallback content')
          DevLogger.logError('All Comparable Projects attempts failed, using fallback')
          content = this.generateFallbackComparableProjects(data)
        }
      }
    }
    
    DevLogger.logDocumentContent('comparable_projects', content)
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'comparable_projects',
      methodology: data.methodology,
      version: 1,
      generatedAt: new Date(),
      llmProvider: metricsResponse?.provider || providerInfo.provider,
      model: metricsResponse?.model || providerInfo.model,
      reasoningEffort: config.reasoningEffort,
      temperature: 0.7,
      maxTokens: config.maxTokens,
      usage: metricsResponse?.usage,
      generationTimeMs: metricsResponse?.generationTimeMs
    }
    
    DevLogger.logStep('Comparable Projects metadata', metadata)
    
    const result = {
      metadata,
      content: { analysis: content },
      aiInsights: {
        criticalSuccessFactors: ['Clear objectives', 'Stakeholder buy-in', 'Adequate resources'],
        commonPitfalls: ['Scope creep', 'Poor communication', 'Inadequate testing']
      }
    }
    
    DevLogger.logSuccess('Comparable Projects generation complete', { 
      hasContent: !!result.content,
      hasMetadata: !!result.metadata,
      hasUsage: !!result.metadata.usage 
    })
    
    return result
  }

  /**
   * Generate Quality Management Strategy (PRINCE2)
   */
  private async generateQualityManagementStrategy(
    data: SanitizedProjectData,
    projectId: string,
    researchContext?: ResearchContext
  ): Promise<GeneratedDocument> {
    console.log('📋 Generating Quality Management Strategy...')
    const config = DOCUMENT_CONFIG.quality_management
    const providerInfo = this.getProviderInfo()
    
    // Build the base prompt
    let basePrompt = this.gateway.buildContextPrompt(
      prince2Prompts.qualityManagement.system,
      prince2Prompts.qualityManagement.user,
      data
    )
    
    // Enhance with research context if available
    if (researchContext && Object.keys(researchContext).length > 0) {
      basePrompt.user = TwoStageGenerator.enhancePromptWithContext(
        basePrompt.user,
        researchContext,
        'quality_management'
      )
    }
    
    const optimizedPrompt = {
      ...basePrompt,
      temperature: 0.7,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort
    }
    
    // Generate with retry logic
    let content: any = null
    let metricsResponse: any = null
    let attempts = 0
    const maxAttempts = 3
    
    while (attempts < maxAttempts && !content) {
      try {
        attempts++
        console.log(`  Attempt ${attempts}/${maxAttempts}...`)
        
        metricsResponse = await this.gateway.generateTextWithMetrics(optimizedPrompt)
        const responseText = metricsResponse.content
        
        // Parse JSON response
        let cleanContent = responseText.trim()
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }
        
        content = JSON.parse(cleanContent)
        
        if (!content) {
          throw new Error('Empty content received from LLM')
        }
      } catch (error: any) {
        console.warn(`  ⚠️ Attempt ${attempts} failed: ${error.message}`)
        if (attempts >= maxAttempts) {
          console.error('  ❌ All attempts failed, using fallback content')
          content = this.generateFallbackQualityManagement(data)
        }
      }
    }
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'quality_management',
      methodology: 'prince2',
      version: 1,
      generatedAt: new Date(),
      llmProvider: metricsResponse?.provider || providerInfo.provider,
      model: metricsResponse?.model || providerInfo.model,
      temperature: 0.7,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort,
      usage: metricsResponse?.usage,
      generationTimeMs: metricsResponse?.generationTimeMs
    }
    
    return {
      metadata,
      content,
      aiInsights: {
        qualityMetrics: ['Defect rate', 'Test coverage', 'Code quality score'],
        recommendations: ['Implement automated testing', 'Regular quality reviews', 'Continuous monitoring']
      }
    }
  }

  /**
   * Generate Communication Plan (PRINCE2)
   */
  private async generateCommunicationPlan(
    data: SanitizedProjectData,
    projectId: string,
    researchContext?: ResearchContext
  ): Promise<GeneratedDocument> {
    console.log('📋 Generating Communication Plan...')
    const config = DOCUMENT_CONFIG.communication_plan
    const providerInfo = this.getProviderInfo()
    
    // Build the base prompt
    let basePrompt = this.gateway.buildContextPrompt(
      prince2Prompts.communicationPlan.system,
      prince2Prompts.communicationPlan.user,
      data
    )
    
    // Enhance with research context if available
    if (researchContext && Object.keys(researchContext).length > 0) {
      basePrompt.user = TwoStageGenerator.enhancePromptWithContext(
        basePrompt.user,
        researchContext,
        'communication_plan'
      )
    }
    
    const optimizedPrompt = {
      ...basePrompt,
      temperature: 0.7,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort
    }
    
    // Generate with retry logic
    let content: any = null
    let metricsResponse: any = null
    let attempts = 0
    const maxAttempts = 3
    
    while (attempts < maxAttempts && !content) {
      try {
        attempts++
        console.log(`  Attempt ${attempts}/${maxAttempts}...`)
        
        metricsResponse = await this.gateway.generateTextWithMetrics(optimizedPrompt)
        const responseText = metricsResponse.content
        
        // Parse JSON response
        let cleanContent = responseText.trim()
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }
        
        content = JSON.parse(cleanContent)
        
        if (!content) {
          throw new Error('Empty content received from LLM')
        }
      } catch (error: any) {
        console.warn(`  ⚠️ Attempt ${attempts} failed: ${error.message}`)
        if (attempts >= maxAttempts) {
          console.error('  ❌ All attempts failed, using fallback content')
          content = this.generateFallbackCommunicationPlan(data)
        }
      }
    }
    
    const metadata: DocumentMetadata = {
      projectId,
      type: 'communication_plan',
      methodology: 'prince2',
      version: 1,
      generatedAt: new Date(),
      llmProvider: metricsResponse?.provider || providerInfo.provider,
      model: metricsResponse?.model || providerInfo.model,
      temperature: 0.7,
      maxTokens: config.maxTokens,
      reasoningEffort: config.reasoningEffort,
      usage: metricsResponse?.usage,
      generationTimeMs: metricsResponse?.generationTimeMs
    }
    
    return {
      metadata,
      content,
      aiInsights: {
        stakeholderGroups: ['Executive', 'Users', 'Technical Team', 'External Partners'],
        communicationChannels: ['Email', 'Meetings', 'Reports', 'Dashboard'],
        keyMessages: ['Project progress', 'Risk status', 'Milestone achievements']
      }
    }
  }

  /**
   * Generate fallback content for Technical Landscape
   */
  private generateFallbackTechnicalLandscape(data: SanitizedProjectData): string {
    return `# Technical Landscape Analysis

## Executive Summary
This technical landscape analysis provides strategic technology recommendations for ${data.projectName}.

## Current State Assessment
- Existing technology inventory requires assessment
- Infrastructure modernization opportunities identified
- Integration points need evaluation

## Future State Vision
- Cloud-native architecture recommended
- API-first design approach
- Enhanced security framework

## Technology Stack Recommendations
- Frontend: Modern JavaScript framework
- Backend: Scalable microservices architecture
- Database: Cloud-native data storage
- Infrastructure: Container orchestration platform

## Next Steps
1. Conduct detailed technology audit
2. Define integration architecture
3. Create implementation roadmap
4. Establish governance framework

*Note: This is a draft document. Please review and enhance with specific details.*`
  }

  /**
   * Generate fallback content for Comparable Projects
   */
  private generateFallbackComparableProjects(data: SanitizedProjectData): string {
    return `# Comparable Projects Analysis

## Executive Summary
This analysis examines similar projects to ${data.projectName} to extract lessons learned and best practices.

## Comparable Projects Overview
Based on industry patterns, we've identified several relevant projects with similar characteristics.

## Success Factors
1. **Clear Project Charter**: Well-defined objectives and scope
2. **Stakeholder Engagement**: Active involvement throughout lifecycle
3. **Iterative Delivery**: Regular value delivery to users
4. **Risk Management**: Proactive identification and mitigation

## Common Challenges
1. **Scope Management**: Changes in requirements
2. **Resource Allocation**: Competing priorities
3. **Technical Debt**: Balance between speed and quality
4. **Change Management**: User adoption and training

## Key Recommendations
- Establish clear governance structure
- Implement regular stakeholder reviews
- Adopt agile delivery practices
- Create comprehensive risk register
- Plan for change management early

## Benchmarks
- Timeline: 6-12 months typical for similar scope
- Team Size: 5-10 members optimal
- Budget Variance: ±15% typical

*Note: This is a draft document. Please review and enhance with specific project examples.*`
  }

  /**
   * Generate fallback content for Quality Management Strategy
   */
  private generateFallbackQualityManagement(data: SanitizedProjectData): any {
    return {
      introduction: {
        purpose: `Define quality management approach for ${data.projectName}`,
        scope: 'All project deliverables and processes',
        responsible_parties: ['Project Manager', 'Quality Assurance Team', 'Project Board'],
        quality_system_precedence: 'combined'
      },
      quality_procedures: {
        quality_planning: {
          approach: 'Product-based planning with clear quality criteria',
          product_identification: 'Product breakdown structure',
          criteria_definition: 'SMART quality criteria for each product',
          techniques: ['Product Descriptions', 'Quality Reviews', 'Testing']
        },
        quality_control: {
          standards: ['ISO 9001', 'Industry Best Practices'],
          templates: ['Quality Review Template', 'Test Plan Template'],
          methods: ['Inspection', 'Testing', 'Reviews'],
          metrics: ['Defect Rate', 'Test Coverage', 'Review Findings']
        },
        project_assurance: {
          board_responsibilities: ['Set quality expectations', 'Approve quality approach'],
          compliance_audits: 'Monthly quality audits',
          corporate_reviews: 'Quarterly corporate quality reviews'
        }
      },
      roles_responsibilities: {
        project_board: ['Define quality expectations'],
        senior_users: ['Define acceptance criteria'],
        senior_suppliers: ['Provide quality resources'],
        executive: ['Approve quality approach'],
        project_manager: ['Implement quality procedures'],
        quality_assurance: ['Independent reviews']
      }
    }
  }

  /**
   * Generate fallback content for Communication Plan
   */
  private generateFallbackCommunicationPlan(data: SanitizedProjectData): any {
    return {
      document_admin: {
        project_id: data.projectName,
        revision_history: [
          { version: '1.0', date: new Date().toISOString().split('T')[0], changes: 'Initial draft' }
        ],
        approval_records: ['Project Board approval pending'],
        distribution_list: ['Project Board', 'Team Managers', 'Key Stakeholders'],
        ownership: 'Project Manager'
      },
      communication_procedures: {
        methods: [
          { type: 'Meetings', description: 'Face-to-face and virtual', use_case: 'Decision making' },
          { type: 'Email', description: 'Written updates', use_case: 'Routine updates' },
          { type: 'Reports', description: 'Formal documentation', use_case: 'Status updates' }
        ],
        protocols: {
          formal: ['Board meetings', 'Stage reviews'],
          informal: ['Team stand-ups', 'Quick calls']
        },
        escalation_paths: [
          { level: 'Level 1', trigger: 'Team issue', contact: 'Team Manager' },
          { level: 'Level 2', trigger: 'Project issue', contact: 'Project Manager' },
          { level: 'Level 3', trigger: 'Tolerance breach', contact: 'Project Board' }
        ],
        feedback_mechanisms: ['Surveys', 'Review meetings']
      },
      stakeholder_analysis: {
        identification_method: 'Stakeholder workshops',
        power_interest_grid: {
          high_power_high_interest: ['Executive Sponsor', 'Senior Users'],
          high_power_low_interest: ['Finance Director'],
          low_power_high_interest: ['End Users', 'Team Members'],
          low_power_low_interest: ['General Staff']
        }
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.cache.destroy()
    this.queue.stop()
  }
}