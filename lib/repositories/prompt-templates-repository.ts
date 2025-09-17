/**
 * Prompt Templates Repository - Handles all database operations for prompt templates
 *
 * Technical PM Note: Manages document generation prompts for each document type.
 * Includes versioning and active/inactive states for A/B testing prompts.
 * This centralizes prompt management with proper audit trails.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type PromptTemplate = Database['public']['Tables']['prompt_templates']['Row']
type PromptTemplateInsert = Database['public']['Tables']['prompt_templates']['Insert']
type PromptTemplateUpdate = Database['public']['Tables']['prompt_templates']['Update']

export class PromptTemplatesRepository extends BaseRepository {
  private static instance: PromptTemplatesRepository

  static getInstance(): PromptTemplatesRepository {
    if (!this.instance) {
      this.instance = new PromptTemplatesRepository()
    }
    return this.instance
  }

  /**
   * Get all prompt templates
   * Used by admin dashboard to manage prompts
   */
  async getAllTemplates(): Promise<PromptTemplate[]> {
    const timer = permanentLogger.timing('repository.getAllTemplates')

    return this.execute('getAllTemplates', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching all prompt templates', {
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('prompt_templates')
        .select('*')
        .order('document_type')
        .order('version', { ascending: false })

      if (error) {
        permanentLogger.captureError('PROMPT_TEMPLATES_REPO', error, {
          operation: 'getAllTemplates'
        })
        timer.stop()
        throw error
      }

      timer.stop()
      permanentLogger.info('PROMPT_TEMPLATES_REPO', 'Retrieved prompt templates', {
        count: data?.length || 0
      })

      return data || []
    })
  }

  /**
   * Get active template for a specific document type
   * This is what the generation system uses
   */
  async getActiveTemplate(documentType: string): Promise<PromptTemplate | null> {
    const timer = permanentLogger.timing('repository.getActiveTemplate')

    return this.execute('getActiveTemplate', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching active template', {
        documentType,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('prompt_templates')
        .select('*')
        .eq('document_type', documentType)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No active template found
          permanentLogger.warn('PROMPT_TEMPLATES_REPO', 'No active template found', {
            documentType
          })
          timer.stop()
          return null
        }
        permanentLogger.captureError('PROMPT_TEMPLATES_REPO', error, {
          operation: 'getActiveTemplate',
          documentType
        })
        timer.stop()
        throw error
      }

      timer.stop()
      permanentLogger.info('PROMPT_TEMPLATES_REPO', 'Retrieved active template', {
        documentType,
        version: data?.version
      })

      return data
    })
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<PromptTemplate | null> {
    const timer = permanentLogger.timing('repository.getTemplateById')

    return this.execute('getTemplateById', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching template by ID', {
        id,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('prompt_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          timer.stop()
          return null
        }
        permanentLogger.captureError('PROMPT_TEMPLATES_REPO', error, {
          operation: 'getTemplateById',
          id
        })
        timer.stop()
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Create a new prompt template
   * CRITICAL: No ID generation - database handles via gen_random_uuid()
   */
  async createTemplate(template: Omit<PromptTemplateInsert, 'id'>): Promise<PromptTemplate> {
    const timer = permanentLogger.timing('repository.createTemplate')

    return this.execute('createTemplate', async (client) => {
      permanentLogger.breadcrumb('repository', 'Creating prompt template', {
        documentType: template.document_type,
        version: template.version,
        timestamp: Date.now()
      })

      // If this is being set as active, deactivate other templates for this document type
      if (template.is_active) {
        await this.deactivateTemplatesForType(template.document_type!)
      }

      const { data, error } = await client
        .from('prompt_templates')
        .insert(template)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PROMPT_TEMPLATES_REPO', error, {
          operation: 'createTemplate',
          documentType: template.document_type
        })
        timer.stop()
        throw error
      }

      timer.stop()
      permanentLogger.info('PROMPT_TEMPLATES_REPO', 'Created prompt template', {
        id: data.id,
        documentType: data.document_type,
        version: data.version
      })

      return data
    })
  }

  /**
   * Update a prompt template
   */
  async updateTemplate(id: string, updates: PromptTemplateUpdate): Promise<PromptTemplate> {
    const timer = permanentLogger.timing('repository.updateTemplate')

    return this.execute('updateTemplate', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating prompt template', {
        id,
        timestamp: Date.now()
      })

      // If setting as active, first get the template to know its document type
      if (updates.is_active === true) {
        const existing = await this.getTemplateById(id)
        if (existing) {
          await this.deactivateTemplatesForType(existing.document_type)
        }
      }

      const { data, error } = await client
        .from('prompt_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PROMPT_TEMPLATES_REPO', error, {
          operation: 'updateTemplate',
          id
        })
        timer.stop()
        throw error
      }

      timer.stop()
      permanentLogger.info('PROMPT_TEMPLATES_REPO', 'Updated prompt template', {
        id: data.id
      })

      return data
    })
  }

  /**
   * Delete a prompt template
   */
  async deleteTemplate(id: string): Promise<void> {
    const timer = permanentLogger.timing('repository.deleteTemplate')

    return this.execute('deleteTemplate', async (client) => {
      permanentLogger.breadcrumb('repository', 'Deleting prompt template', {
        id,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('prompt_templates')
        .delete()
        .eq('id', id)

      if (error) {
        permanentLogger.captureError('PROMPT_TEMPLATES_REPO', error, {
          operation: 'deleteTemplate',
          id
        })
        timer.stop()
        throw error
      }

      timer.stop()
      permanentLogger.info('PROMPT_TEMPLATES_REPO', 'Deleted prompt template', {
        id
      })
    })
  }

  /**
   * Get all templates for a specific document type
   */
  async getTemplatesByType(documentType: string): Promise<PromptTemplate[]> {
    const timer = permanentLogger.timing('repository.getTemplatesByType')

    return this.execute('getTemplatesByType', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching templates by type', {
        documentType,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('prompt_templates')
        .select('*')
        .eq('document_type', documentType)
        .order('version', { ascending: false })

      if (error) {
        permanentLogger.captureError('PROMPT_TEMPLATES_REPO', error, {
          operation: 'getTemplatesByType',
          documentType
        })
        timer.stop()
        throw error
      }

      timer.stop()
      permanentLogger.info('PROMPT_TEMPLATES_REPO', 'Retrieved templates by type', {
        documentType,
        count: data?.length || 0
      })

      return data || []
    })
  }

  /**
   * Helper: Deactivate all templates for a document type
   */
  private async deactivateTemplatesForType(documentType: string): Promise<void> {
    const client = await this.getClient()

    const { error } = await client
      .from('prompt_templates')
      .update({ is_active: false })
      .eq('document_type', documentType)
      .eq('is_active', true)

    if (error) {
      permanentLogger.captureError('PROMPT_TEMPLATES_REPO', error, {
        operation: 'deactivateTemplatesForType',
        documentType
      })
      throw error
    }

    permanentLogger.debug('PROMPT_TEMPLATES_REPO', 'Deactivated templates', {
      documentType
    })
  }
}