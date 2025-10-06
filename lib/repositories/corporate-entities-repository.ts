/**
 * Corporate Entities Repository - Handles all corporate_entities table operations
 *
 * Technical PM Note: Centralizes corporate entity management.
 * No other file should directly query the corporate_entities table.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type CorporateEntity = Database['public']['Tables']['corporate_entities']['Row']
type CorporateEntityInsert = Database['public']['Tables']['corporate_entities']['Insert']
type CorporateEntityUpdate = Database['public']['Tables']['corporate_entities']['Update']

export type EntityType = 'parent' | 'subsidiary' | 'division' | 'brand'

export class CorporateEntitiesRepository extends BaseRepository {
  private static instance: CorporateEntitiesRepository

  static getInstance(): CorporateEntitiesRepository {
    if (!this.instance) {
      this.instance = new CorporateEntitiesRepository()
    }
    return this.instance
  }

  /**
   * Create a new corporate entity
   * CRITICAL: No ID generation - database handles via gen_random_uuid()
   */
  async createEntity(entity: Omit<CorporateEntityInsert, 'id' | 'created_at' | 'updated_at'>): Promise<CorporateEntity> {
    const timer = permanentLogger.timing('repository.createEntity')

    return this.execute('createEntity', async (client) => {
      permanentLogger.breadcrumb('repository', 'Creating corporate entity', {
        name: entity.name,
        domain: entity.primary_domain,
        entityType: entity.entity_type,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('corporate_entities')
        .insert(entity)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('CORPORATE_ENTITIES_REPO', error as Error, {
          operation: 'createEntity',
          entityName: entity.name
        })
        throw error
      }

      if (!data) {
        throw new Error('Entity creation failed - no data returned')
      }

      permanentLogger.info('Entity created', {
        entityId: data.id,
        name: entity.name,
        domain: entity.primary_domain
      })

      timer.stop()
      return data
    })
  }

  /**
   * Get entity by ID
   */
  async getEntity(entityId: string): Promise<CorporateEntity | null> {
    const timer = permanentLogger.timing('repository.getEntity')

    return this.execute('getEntity', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching entity', {
        entityId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('corporate_entities')
        .select('*')
        .eq('id', entityId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('CORPORATE_ENTITIES_REPO', error as Error, {
          operation: 'getEntity',
          entityId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Get entity by domain
   */
  async getEntityByDomain(domain: string): Promise<CorporateEntity | null> {
    const timer = permanentLogger.timing('repository.getEntityByDomain')

    return this.execute('getEntityByDomain', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching entity by domain', {
        domain,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('corporate_entities')
        .select('*')
        .eq('primary_domain', domain)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('CORPORATE_ENTITIES_REPO', error as Error, {
          operation: 'getEntityByDomain',
          domain
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Update corporate entity
   */
  async updateEntity(entityId: string, updates: CorporateEntityUpdate): Promise<CorporateEntity> {
    const timer = permanentLogger.timing('repository.updateEntity')

    return this.execute('updateEntity', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating entity', {
        entityId,
        updateFields: Object.keys(updates),
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('corporate_entities')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('CORPORATE_ENTITIES_REPO', error as Error, {
          operation: 'updateEntity',
          entityId
        })
        throw error
      }

      if (!data) {
        throw new Error(`Entity ${entityId} not found`)
      }

      permanentLogger.info('Entity updated', {
        entityId,
        updatedFields: Object.keys(updates)
      })

      timer.stop()
      return data
    })
  }

  /**
   * Get entities by type
   */
  async getEntitiesByType(entityType: EntityType): Promise<CorporateEntity[]> {
    const timer = permanentLogger.timing('repository.getEntitiesByType')

    return this.execute('getEntitiesByType', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching entities by type', {
        entityType,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('corporate_entities')
        .select('*')
        .eq('entity_type', entityType)
        .order('name', { ascending: true })

      if (error) {
        permanentLogger.captureError('CORPORATE_ENTITIES_REPO', error as Error, {
          operation: 'getEntitiesByType',
          entityType
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Delete corporate entity
   */
  async deleteEntity(entityId: string): Promise<void> {
    const timer = permanentLogger.timing('repository.deleteEntity')

    return this.execute('deleteEntity', async (client) => {
      permanentLogger.breadcrumb('repository', 'Deleting entity', {
        entityId,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('corporate_entities')
        .delete()
        .eq('id', entityId)

      if (error) {
        permanentLogger.captureError('CORPORATE_ENTITIES_REPO', error as Error, {
          operation: 'deleteEntity',
          entityId
        })
        throw error
      }

      permanentLogger.info('Entity deleted', { entityId })
      timer.stop()
    })
  }

  /**
   * Search entities by name
   */
  async searchEntities(searchTerm: string): Promise<CorporateEntity[]> {
    const timer = permanentLogger.timing('repository.searchEntities')

    return this.execute('searchEntities', async (client) => {
      permanentLogger.breadcrumb('repository', 'Searching entities', {
        searchTerm,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('corporate_entities')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('name', { ascending: true })
        .limit(20)

      if (error) {
        permanentLogger.captureError('CORPORATE_ENTITIES_REPO', error as Error, {
          operation: 'searchEntities',
          searchTerm
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }
}