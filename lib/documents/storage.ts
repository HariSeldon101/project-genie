import { createClient } from '@supabase/supabase-js'
import { GeneratedDocument } from '../llm/types'

export class DocumentStorage {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side operations
    )
  }

  /**
   * Store generated documents in Supabase
   */
  async storeDocuments(
    documents: GeneratedDocument[],
    userId: string
  ): Promise<string[]> {
    const artifactIds: string[] = []
    
    for (const doc of documents) {
      try {
        const { data, error } = await this.supabase
          .from('artifacts')
          .insert({
            project_id: doc.metadata.projectId,
            type: doc.metadata.type,
            title: this.getDocumentTitle(doc.metadata.type),
            content: doc.content,
            version: doc.metadata.version,
            created_by: userId
          })
          .select('id')
          .single()
        
        if (error) throw error
        
        artifactIds.push(data.id)
        
        // Store AI insights separately if needed
        if (doc.aiInsights) {
          await this.storeAIInsights(data.id, doc.aiInsights)
        }
      } catch (error) {
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
      console.error('Failed to store AI insights:', error)
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
      project_plan: 'Project Plan'
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
}