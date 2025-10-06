import { createClient } from '@supabase/supabase-js'
import { GeneratedDocument } from '../llm/types'
import { logger } from '../utils/permanent-logger'
import { DevLogger } from '@/lib/utils/dev-logger'

export interface GenerationMetrics {
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  totalTokens?: number
  generationTimeMs: number
  reasoningEffort?: string
  temperature?: number
  maxTokens?: number
  costUsd?: number
  success: boolean
  errorMessage?: string
  retryCount?: number
}

export class DocumentStorage {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side operations
    )
  }

  /**
   * Store generated documents in Supabase with analytics tracking
   */
  async storeDocuments(
    documents: GeneratedDocument[],
    userId: string,
    metrics?: GenerationMetrics
  ): Promise<string[]> {
    DevLogger.logSection('storeDocuments')
    DevLogger.logStep('Documents to store', { count: documents.length, types: documents.map(d => d.metadata.type) })
    DevLogger.logStep('Storage metrics', metrics)
    
    // Validate userId is a proper UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!userId || !uuidRegex.test(userId)) {
      logger.warn('STORAGE', `Invalid user ID provided: ${userId}. Skipping document storage.`)
      DevLogger.logWarning('Invalid user ID, skipping storage', { userId })
      return [] // Return empty array if no valid user
    }
    
    const artifactIds: string[] = []
    
    for (const doc of documents) {
      try {
        DevLogger.logStep(`Storing ${doc.metadata.type}`, {
          projectId: doc.metadata.projectId,
          contentType: typeof doc.content,
          contentKeys: doc.content && typeof doc.content === 'object' ? Object.keys(doc.content) : 'N/A',
          hasUsage: !!doc.metadata.usage
        })
        
        // Use document-specific usage if available, otherwise fall back to overall metrics
        const docUsage = doc.metadata.usage
        const effectiveMetrics = docUsage ? {
          provider: doc.metadata.llmProvider || doc.metadata.provider || metrics?.provider,
          model: doc.metadata.model || metrics?.model,
          inputTokens: docUsage.inputTokens,
          outputTokens: docUsage.outputTokens,
          reasoningTokens: docUsage.reasoningTokens,
          totalTokens: docUsage.totalTokens,
          generationTimeMs: doc.metadata.generationTimeMs || metrics?.generationTimeMs,
          reasoningEffort: doc.metadata.reasoningEffort,
          temperature: doc.metadata.temperature,
          maxTokens: doc.metadata.maxTokens,
          costUsd: docUsage.costUsd || metrics?.costUsd
        } : metrics
        
        DevLogger.logStep(`Effective metrics for ${doc.metadata.type}`, effectiveMetrics)
        
        // Store document with generation metrics
        const insertData = {
          project_id: doc.metadata.projectId,
          type: doc.metadata.type,
          title: this.getDocumentTitle(doc.metadata.type),
          content: doc.content,
          version: doc.metadata.version,
          created_by: userId,
          // Add generation metrics if available
          generation_provider: effectiveMetrics?.provider,
          generation_model: effectiveMetrics?.model,
          generation_tokens: effectiveMetrics?.totalTokens,
          generation_cost: effectiveMetrics?.costUsd,
          generation_time_ms: effectiveMetrics?.generationTimeMs,
          // Store token breakdown
          generation_input_tokens: effectiveMetrics?.inputTokens,
          generation_output_tokens: effectiveMetrics?.outputTokens,
          generation_reasoning_tokens: effectiveMetrics?.reasoningTokens,
          // Store prompt parameters
          generation_reasoning_level: effectiveMetrics?.reasoningEffort,
          generation_temperature: effectiveMetrics?.temperature,
          generation_max_tokens: effectiveMetrics?.maxTokens
        }
        
        DevLogger.logDatabaseOperation(`INSERT ${doc.metadata.type}`, insertData)
        
        const { data, error } = await this.supabase
          .from('artifacts')
          .insert(insertData)
          .select('id')
          .single()
        
        if (error) {
          logger.database('INSERT', 'artifacts', false, error.message, { doc: doc.metadata })
          DevLogger.logError(`Failed to store ${doc.metadata.type}`, error)
          throw error
        }
        
        logger.database('INSERT', 'artifacts', true, undefined, { artifactId: data.id, type: doc.metadata.type })
        DevLogger.logSuccess(`Stored ${doc.metadata.type}`, { artifactId: data.id })
        artifactIds.push(data.id)
        
        // Store generation analytics if metrics provided
        if (metrics) {
          await this.storeGenerationAnalytics(data.id, doc.metadata.projectId, metrics)
        }
        
        // Store AI insights separately if needed
        if (doc.aiInsights) {
          await this.storeAIInsights(data.id, doc.aiInsights)
        }
      } catch (error) {
        logger.error('STORAGE', `Failed to store document ${doc.metadata.type}`, error, error.stack)
        console.error('Failed to store document:', error)
        throw new Error(`Failed to store ${doc.metadata.type}: ${error.message}`)
      }
    }
    
    return artifactIds
  }

  /**
   * Retrieve document from Supabase
   */
  async getDocument(artifactId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('artifacts')
      .select('*')
      .eq('id', artifactId)
      .single()
    
    if (error) throw error
    
    return data
  }

  /**
   * Update document content
   */
  async updateDocument(
    artifactId: string,
    content: any,
    userId: string
  ): Promise<void> {
    // Get current version
    const { data: current } = await this.supabase
      .from('artifacts')
      .select('version')
      .eq('id', artifactId)
      .single()
    
    const newVersion = (current?.version || 1) + 1
    
    // Update with new version
    const { error } = await this.supabase
      .from('artifacts')
      .update({
        content,
        version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('id', artifactId)
    
    if (error) throw error
    
    // Log the update in activity log
    await this.logActivity(artifactId, 'update', userId, {
      version: newVersion
    })
  }

  /**
   * Get all documents for a project
   */
  async getProjectDocuments(projectId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('artifacts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    return data || []
  }

  /**
   * Store AI insights
   */
  private async storeAIInsights(
    artifactId: string,
    insights: any
  ): Promise<void> {
    // Store insights as metadata in the artifact
    const { error } = await this.supabase
      .from('artifacts')
      .update({
        content: await this.supabase
          .from('artifacts')
          .select('content')
          .eq('id', artifactId)
          .single()
          .then(({ data }) => ({
            ...data?.content,
            _aiInsights: insights
          }))
      })
      .eq('id', artifactId)
    
    if (error) {
      logger.database('UPDATE', 'artifacts', false, error.message, { artifactId, insights })
      console.error('Failed to store AI insights:', error)
    } else {
      logger.database('UPDATE', 'artifacts', true, undefined, { artifactId })
    }
  }

  /**
   * Log activity
   */
  private async logActivity(
    entityId: string,
    action: string,
    userId: string,
    details: any
  ): Promise<void> {
    const { error } = await this.supabase
      .from('activity_log')
      .insert({
        project_id: await this.getProjectIdFromArtifact(entityId),
        user_id: userId,
        action,
        entity_type: 'artifact',
        entity_id: entityId,
        details
      })
    
    if (error) {
      logger.database('INSERT', 'activity_log', false, error.message, { action, entityId })
      console.error('Failed to log activity:', error)
    }
  }

  /**
   * Get project ID from artifact
   */
  private async getProjectIdFromArtifact(artifactId: string): Promise<string> {
    const { data } = await this.supabase
      .from('artifacts')
      .select('project_id')
      .eq('id', artifactId)
      .single()
    
    return data?.project_id || ''
  }

  /**
   * Get document title based on type
   */
  private getDocumentTitle(type: string): string {
    const titles: Record<string, string> = {
      charter: 'Project Charter',
      pid: 'Project Initiation Document (PID)',
      backlog: 'Product Backlog',
      risk_register: 'Risk Register',
      business_case: 'Business Case',
      project_plan: 'Project Plan',
      quality_management: 'Quality Management Strategy',
      communication_plan: 'Communication Management Approach',
      technical_landscape: 'Technical Landscape Analysis',
      comparable_projects: 'Comparable Projects Analysis'
    }
    
    return titles[type] || 'Project Document'
  }

  /**
   * Check if documents exist for a project
   */
  async hasDocuments(projectId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('artifacts')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)
    
    return (data?.length || 0) > 0
  }

  /**
   * Delete document
   */
  async deleteDocument(
    artifactId: string,
    userId: string
  ): Promise<void> {
    // Log deletion first
    await this.logActivity(artifactId, 'delete', userId, {})
    
    const { error } = await this.supabase
      .from('artifacts')
      .delete()
      .eq('id', artifactId)
    
    if (error) throw error
  }

  /**
   * Store generation analytics
   */
  private async storeGenerationAnalytics(
    documentId: string,
    projectId: string,
    metrics: GenerationMetrics
  ): Promise<void> {
    try {
      // Get user ID from auth context
      const { data: { user } } = await this.supabase.auth.getUser()
      
      // Skip analytics if no user (test mode) - user_id is a required UUID field
      if (!user?.id) {
        logger.info('ANALYTICS', 'Skipping analytics storage - no authenticated user')
        return
      }
      
      // Store analytics with correct schema
      const { error } = await this.supabase
        .from('generation_analytics')
        .insert({
          project_id: projectId,
          user_id: user.id,
          document_type: 'document', // We can enhance this later
          provider: metrics.provider,
          model: metrics.model,
          tokens_used: metrics.totalTokens,
          generation_time_ms: metrics.generationTimeMs,
          success: metrics.success,
          error_message: metrics.errorMessage,
          metadata: {
            document_id: documentId,
            input_tokens: metrics.inputTokens,
            output_tokens: metrics.outputTokens,
            reasoning_tokens: metrics.reasoningTokens,
            reasoning_effort: metrics.reasoningEffort,
            temperature: metrics.temperature,
            max_tokens: metrics.maxTokens,
            cost_usd: metrics.costUsd,
            retry_count: metrics.retryCount || 0
          }
        })
      
      if (error) {
        logger.database('INSERT', 'generation_analytics', false, error.message, metrics)
        console.error('Failed to store generation analytics:', error)
        // Don't throw error - analytics failure shouldn't break document storage
      } else {
        logger.database('INSERT', 'generation_analytics', true, undefined, { projectId, documentId })
      }
    } catch (error) {
      logger.error('ANALYTICS', 'Error storing generation analytics', error, error.stack)
      console.error('Error storing generation analytics:', error)
      // Continue without throwing - analytics is supplementary
    }
  }

  /**
   * Get generation analytics for a project
   */
  async getProjectAnalytics(projectId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('generation_analytics')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error('Failed to get project analytics:', error)
      return []
    }
  }

  /**
   * Get analytics summary for a project
   */
  async getAnalyticsSummary(projectId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('generation_analytics_summary')
        .select('*')
        .eq('project_id', projectId)
      
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error('Failed to get analytics summary:', error)
      return null
    }
  }
}