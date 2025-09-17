import { ArtifactsRepository } from '@/lib/repositories/artifacts-repository'
import { GeneratedDocument } from '../llm/types'
import { permanentLogger } from '../utils/permanent-logger'
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

/**
 * Document Storage - Manages document persistence using repository pattern
 *
 * Technical PM Note: This class now uses ArtifactsRepository instead of
 * direct database calls. This ensures consistent error handling and
 * makes the code testable (mock the repository).
 */
export class DocumentStorage {
  private artifactsRepo: ArtifactsRepository

  constructor() {
    // Use repository instead of direct Supabase client
    this.artifactsRepo = ArtifactsRepository.getInstance()
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
      permanentLogger.warn('STORAGE', `Invalid user ID provided: ${userId}. Skipping document storage.`)
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

        // Use repository to store artifact - NO ID generation in app
        const artifact = await this.artifactsRepo.createArtifact(insertData)

        permanentLogger.database('INSERT', 'artifacts', true, undefined, {
          artifactId: artifact.id,
          type: doc.metadata.type
        })
        DevLogger.logSuccess(`Stored ${doc.metadata.type}`, { artifactId: artifact.id })
        artifactIds.push(artifact.id)
        
        // Store generation analytics if metrics provided
        if (metrics) {
          await this.artifactsRepo.storeGenerationAnalytics(
            artifact.id,
            doc.metadata.projectId,
            metrics
          )
        }

        // Store AI insights separately if needed
        if (doc.aiInsights) {
          await this.storeAIInsights(artifact.id, doc.aiInsights)
        }
      } catch (error) {
        permanentLogger.captureError('STORAGE', new Error('Failed to store document ${doc.metadata.type}'), error, error.stack)
        console.error('Failed to store document:', error)
        throw new Error(`Failed to store ${doc.metadata.type}: ${error.message}`)
      }
    }
    
    return artifactIds
  }

  /**
   * Retrieve document from repository
   * Technical PM: Now uses repository pattern for consistency
   */
  async getDocument(artifactId: string): Promise<any> {
    return this.artifactsRepo.getArtifact(artifactId)
  }

  /**
   * Update document content through repository
   * Technical PM: Version increment handled automatically by repository
   */
  async updateDocument(
    artifactId: string,
    content: any,
    userId: string
  ): Promise<void> {
    await this.artifactsRepo.updateArtifact(artifactId, {
      content,
      // Version handled automatically by repository
    })

    // Log the update in activity log
    await this.logActivity(artifactId, 'update', userId, {
      // Repository handles version tracking
    })
  }

  /**
   * Get all documents for a project through repository
   */
  async getProjectDocuments(projectId: string): Promise<any[]> {
    return this.artifactsRepo.getProjectArtifacts(projectId)
  }

  /**
   * Store AI insights through repository
   * Technical PM: Merges insights into existing content
   */
  private async storeAIInsights(
    artifactId: string,
    insights: any
  ): Promise<void> {
    try {
      // Get current artifact content
      const artifact = await this.artifactsRepo.getArtifact(artifactId)

      // Merge insights into content
      const updatedContent = {
        ...artifact.content,
        _aiInsights: insights
      }

      // Update through repository
      await this.artifactsRepo.updateArtifact(artifactId, {
        content: updatedContent
      })

      permanentLogger.database('UPDATE', 'artifacts', true, undefined, { artifactId })
    } catch (error) {
      permanentLogger.captureError('STORAGE', error as Error, {
        operation: 'storeAIInsights',
        artifactId
      })
      // Don't throw - insights are secondary
    }
  }

  /**
   * Log activity - temporarily disabled pending ActivityLogRepository
   * Technical PM: Activity logging needs its own repository
   */
  private async logActivity(
    entityId: string,
    action: string,
    userId: string,
    details: any
  ): Promise<void> {
    try {
      // Use ActivityLogRepository to log the activity
      const activityRepo = (await import('@/lib/repositories/activity-log-repository')).ActivityLogRepository.getInstance()

      // Get project ID for this entity
      const projectId = await this.getProjectIdFromArtifact(entityId)

      await activityRepo.logActivity({
        project_id: projectId,
        user_id: userId,
        action,
        entity_type: 'artifact',
        entity_id: entityId,
        details
      })
    } catch (error) {
      // Fall back to permanent logger if activity logging fails
      permanentLogger.breadcrumb('activity', action, {
        entityId,
        userId,
        details,
        entityType: 'artifact',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get project ID from artifact through repository
   */
  private async getProjectIdFromArtifact(artifactId: string): Promise<string> {
    try {
      const artifact = await this.artifactsRepo.getArtifact(artifactId)
      return artifact.project_id || ''
    } catch (error) {
      permanentLogger.captureError('STORAGE', error as Error, {
        operation: 'getProjectIdFromArtifact',
        artifactId
      })
      return ''
    }
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
   * Check if documents exist for a project through repository
   */
  async hasDocuments(projectId: string): Promise<boolean> {
    try {
      const artifacts = await this.artifactsRepo.getProjectArtifacts(projectId)
      return artifacts.length > 0
    } catch (error) {
      permanentLogger.captureError('STORAGE', error as Error, {
        operation: 'hasDocuments',
        projectId
      })
      return false
    }
  }

  /**
   * Delete document through repository
   */
  async deleteDocument(
    artifactId: string,
    userId: string
  ): Promise<void> {
    // Log deletion first
    await this.logActivity(artifactId, 'delete', userId, {})

    // Delete through repository
    await this.artifactsRepo.deleteArtifact(artifactId)
  }

  /**
   * Store generation analytics through repository
   * Technical PM: Delegates to ArtifactsRepository for consistency
   * NO BACKWARD COMPATIBILITY - old code archived per CLAUDE.md
   */
  private async storeGenerationAnalytics(
    documentId: string,
    projectId: string,
    metrics: GenerationMetrics
  ): Promise<void> {
    try {
      // Delegate to repository - single source of truth
      await this.artifactsRepo.storeGenerationAnalytics(
        documentId,
        projectId,
        metrics
      )
    } catch (error) {
      // Analytics are secondary - log but don't fail
      permanentLogger.captureError('STORAGE', error as Error, {
        operation: 'storeGenerationAnalytics',
        documentId,
        projectId
      })
    }
  }

  /**
   * Get generation analytics for a project
   */
  async getProjectAnalytics(projectId: string): Promise<any[]> {
    try {
      const analyticsRepo = (await import('@/lib/repositories/generation-analytics-repository')).GenerationAnalyticsRepository.getInstance()
      return await analyticsRepo.getProjectAnalytics(projectId)
    } catch (error) {
      permanentLogger.captureError('STORAGE', error as Error, {
        operation: 'getProjectAnalytics',
        projectId
      })
      return []
    }
  }

  /**
   * Get analytics summary for a project
   */
  async getAnalyticsSummary(projectId: string): Promise<any> {
    try {
      const analyticsRepo = (await import('@/lib/repositories/generation-analytics-repository')).GenerationAnalyticsRepository.getInstance()
      const analytics = await analyticsRepo.getProjectAnalytics(projectId)
      const totalCost = await analyticsRepo.getProjectTotalCost(projectId)

      // Calculate summary
      const totalTokens = analytics.reduce((sum, item) => sum + (item.total_tokens || 0), 0)
      const totalGenerations = analytics.length
      const avgTokensPerGeneration = totalGenerations > 0 ? totalTokens / totalGenerations : 0

      return {
        totalGenerations,
        totalTokens,
        totalCost,
        avgTokensPerGeneration,
        analytics
      }
    } catch (error) {
      permanentLogger.captureError('STORAGE', error as Error, {
        operation: 'getAnalyticsSummary',
        projectId
      })
      return null
    }
  }
}