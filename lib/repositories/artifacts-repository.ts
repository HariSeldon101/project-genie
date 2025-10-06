/**
 * Artifacts Repository - Handles all database operations for documents/artifacts
 *
 * Technical PM Note: Manages all generated documents (PID, Business Case, etc).
 * Includes version control and generation metrics tracking.
 * This replaces direct database calls in DocumentStorage.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import type { Database } from '@/lib/database.types'

type Artifact = Database['public']['Tables']['artifacts']['Row']
type ArtifactInsert = Database['public']['Tables']['artifacts']['Insert']
type ArtifactUpdate = Database['public']['Tables']['artifacts']['Update']

export class ArtifactsRepository extends BaseRepository {
  private static instance: ArtifactsRepository

  static getInstance(): ArtifactsRepository {
    if (!this.instance) {
      this.instance = new ArtifactsRepository()
    }
    return this.instance
  }

  /**
   * Store a document/artifact with generation metrics
   * CRITICAL: No ID generation - database handles via gen_random_uuid()
   */
  async createArtifact(artifact: Omit<ArtifactInsert, 'id'>): Promise<Artifact> {
    const timer = permanentLogger.timing('repository.createArtifact')

    return this.execute('createArtifact', async (client) => {
      permanentLogger.breadcrumb('repository', 'Creating artifact', {
        type: artifact.type,
        projectId: artifact.project_id,
        timestamp: Date.now()
      })

      // NO ID field - let PostgreSQL gen_random_uuid() handle it
      const { data, error } = await client
        .from('artifacts')
        .insert(artifact)
        .select()
        .single()

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ARTIFACTS_REPO', jsError, {
          operation: 'createArtifact',
          type: artifact.type,
          projectId: artifact.project_id
        })
        throw jsError
      }

      if (!data) {
        throw new Error('Artifact creation failed - no data returned')
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Artifact created', {
        artifactId: data.id,
        type: data.type,
        duration
      })

      return data
    })
  }

  /**
   * Get artifact by ID
   * Technical PM: Includes all generation metrics and content
   */
  async getArtifact(artifactId: string): Promise<Artifact> {
    const timer = permanentLogger.timing('repository.getArtifact')

    return this.execute('getArtifact', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching artifact', {
        artifactId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('artifacts')
        .select('*')
        .eq('id', artifactId)
        .single()

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ARTIFACTS_REPO', jsError, {
          operation: 'getArtifact',
          artifactId
        })
        throw jsError
      }

      // NO FALLBACK - throw if not found
      if (!data) {
        const notFoundError = new Error(`Artifact ${artifactId} not found`)
        permanentLogger.captureError('ARTIFACTS_REPO', notFoundError, {
          artifactId
        })
        throw notFoundError
      }

      timer.stop()
      return data
    })
  }

  /**
   * Update artifact content with version increment
   * Technical PM: Automatically increments version number
   */
  async updateArtifact(artifactId: string, updates: ArtifactUpdate): Promise<Artifact> {
    const timer = permanentLogger.timing('repository.updateArtifact')

    return this.execute('updateArtifact', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating artifact', {
        artifactId,
        updateFields: Object.keys(updates),
        timestamp: Date.now()
      })

      // Get current version for increment
      const { data: current, error: fetchError } = await client
        .from('artifacts')
        .select('version')
        .eq('id', artifactId)
        .single()

      if (fetchError || !current) {
        permanentLogger.captureError('ARTIFACTS_REPO', fetchError || new Error('Artifact not found'), {
          operation: 'updateArtifact.fetch',
          artifactId
        })
        throw fetchError || new Error(`Artifact ${artifactId} not found`)
      }

      // Auto-increment version
      const newVersion = (current.version || 1) + 1

      const { data, error } = await client
        .from('artifacts')
        .update({
          ...updates,
          version: newVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', artifactId)
        .select()
        .single()

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ARTIFACTS_REPO', jsError, {
          operation: 'updateArtifact.update',
          artifactId,
          version: newVersion
        })
        throw jsError
      }

      if (!data) {
        throw new Error('Artifact update failed - no data returned')
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Artifact updated', {
        artifactId,
        newVersion,
        duration
      })

      return data
    })
  }

  /**
   * Get all artifacts for a project
   * Technical PM: Returns all generated documents for a project
   */
  async getProjectArtifacts(projectId: string): Promise<Artifact[]> {
    const timer = permanentLogger.timing('repository.getProjectArtifacts')

    return this.execute('getProjectArtifacts', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching project artifacts', {
        projectId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('artifacts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ARTIFACTS_REPO', jsError, {
          operation: 'getProjectArtifacts',
          projectId
        })
        throw jsError
      }

      // Empty array is valid - no fallback needed
      const artifacts = data || []

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Project artifacts fetched', {
        projectId,
        count: artifacts.length,
        duration
      })

      return artifacts
    })
  }

  /**
   * Get artifacts for a specific project and type
   * Technical PM: Filters by both project and document type
   */
  async getProjectArtifactsByType(projectId: string, type: string): Promise<Artifact[]> {
    const timer = permanentLogger.timing('repository.getProjectArtifactsByType')

    return this.execute('getProjectArtifactsByType', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching project artifacts by type', {
        projectId,
        type,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('artifacts')
        .select('*')
        .eq('project_id', projectId)
        .eq('type', type)
        .order('created_at', { ascending: false })

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ARTIFACTS_REPO', jsError, {
          operation: 'getProjectArtifactsByType',
          projectId,
          type
        })
        throw jsError
      }

      const artifacts = data || []

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Project artifacts by type fetched', {
        projectId,
        type,
        count: artifacts.length,
        duration
      })

      return artifacts
    })
  }

  /**
   * Get artifacts by type across all projects
   * Technical PM: Useful for finding all PIDs, Business Cases, etc.
   */
  async getArtifactsByType(type: string, userId?: string): Promise<Artifact[]> {
    const timer = permanentLogger.timing('repository.getArtifactsByType')

    return this.execute('getArtifactsByType', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching artifacts by type', {
        type,
        userId,
        timestamp: Date.now()
      })

      let query = client
        .from('artifacts')
        .select('*')
        .eq('type', type)

      // Optional user filter
      if (userId) {
        query = query.eq('created_by', userId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ARTIFACTS_REPO', jsError, {
          operation: 'getArtifactsByType',
          type,
          userId
        })
        throw jsError
      }

      const artifacts = data || []

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Artifacts by type fetched', {
        type,
        count: artifacts.length,
        duration
      })

      return artifacts
    })
  }

  /**
   * Delete artifact
   * Technical PM: Permanent deletion - consider soft delete in future
   */
  async deleteArtifact(artifactId: string): Promise<void> {
    const timer = permanentLogger.timing('repository.deleteArtifact')

    return this.execute('deleteArtifact', async (client) => {
      permanentLogger.breadcrumb('repository', 'Deleting artifact', {
        artifactId,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('artifacts')
        .delete()
        .eq('id', artifactId)

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ARTIFACTS_REPO', jsError, {
          operation: 'deleteArtifact',
          artifactId
        })
        throw jsError
      }

      timer.stop()
      permanentLogger.breadcrumb('repository', 'Artifact deleted', {
        artifactId
      })
    })
  }

  /**
   * Get latest artifact of each type for a project
   * Technical PM: Useful for dashboard - shows latest version of each document
   */
  async getLatestProjectArtifacts(projectId: string): Promise<Artifact[]> {
    const timer = permanentLogger.timing('repository.getLatestProjectArtifacts')

    return this.execute('getLatestProjectArtifacts', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching latest artifacts', {
        projectId,
        timestamp: Date.now()
      })

      // Get all artifacts for project
      const { data, error } = await client
        .from('artifacts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ARTIFACTS_REPO', jsError, {
          operation: 'getLatestProjectArtifacts',
          projectId
        })
        throw jsError
      }

      // Group by type and get latest of each
      const latestByType = new Map<string, Artifact>()

      for (const artifact of data || []) {
        if (!latestByType.has(artifact.type)) {
          latestByType.set(artifact.type, artifact)
        }
      }

      const latest = Array.from(latestByType.values())

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Latest artifacts fetched', {
        projectId,
        uniqueTypes: latest.length,
        duration
      })

      return latest
    })
  }

  /**
   * Store generation analytics
   * Technical PM: Tracks AI model usage, costs, and performance
   */
  async storeGenerationAnalytics(
    artifactId: string,
    projectId: string,
    metrics: {
      provider: string
      model: string
      inputTokens?: number
      outputTokens?: number
      totalTokens?: number
      generationTimeMs: number
      costUsd?: number
      success: boolean
      errorMessage?: string
    }
  ): Promise<void> {
    const timer = permanentLogger.timing('repository.storeGenerationAnalytics')

    return this.execute('storeGenerationAnalytics', async (client) => {
      permanentLogger.breadcrumb('repository', 'Storing generation analytics', {
        artifactId,
        provider: metrics.provider,
        model: metrics.model,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('generation_analytics')
        .insert({
          artifact_id: artifactId,
          project_id: projectId,
          provider: metrics.provider,
          model: metrics.model,
          input_tokens: metrics.inputTokens,
          output_tokens: metrics.outputTokens,
          total_tokens: metrics.totalTokens,
          generation_time_ms: metrics.generationTimeMs,
          cost_usd: metrics.costUsd,
          success: metrics.success,
          error_message: metrics.errorMessage
          // id auto-generated by database
        })

      if (error) {
        // Log but don't fail artifact creation for analytics errors
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ARTIFACTS_REPO', jsError, {
          operation: 'storeGenerationAnalytics',
          artifactId,
          projectId
        })
        // Don't throw - analytics are secondary
      }

      timer.stop()
    })
  }

  /**
   * Get all artifacts - Admin only
   * Technical PM: For admin statistics and artifact management
   */
  async getAllArtifacts(): Promise<Artifact[]> {
    const timer = permanentLogger.timing('repository.getAllArtifacts')

    return this.execute('getAllArtifacts', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching all artifacts', {
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('artifacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ARTIFACTS_REPO', jsError, {
          operation: 'getAllArtifacts'
        })
        throw jsError
      }

      timer.stop()
      return data || []
    })
  }
}