import { NextRequest } from 'next/server'
import { DocumentGenerator } from '@/lib/documents/generator'
import { DocumentStorage, GenerationMetrics } from '@/lib/documents/storage'
import { DataSanitizer } from '@/lib/llm/sanitizer'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/permanent-logger'

// Set maximum duration for retrying
export const maxDuration = 300 // 5 minutes
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  logger.info('RETRY_API', 'Generate retry endpoint called', {
    timestamp: new Date().toISOString()
  })
  
  // Set up SSE headers
  const responseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  }
  
  const encoder = new TextEncoder()
  let isClosed = false
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        if (isClosed) return
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }
      
      const sendError = (error: string, details?: any) => {
        sendEvent('error', { error, details })
      }
      
      try {
        // Parse request body
        const { projectId, projectData, failedDocuments, forceProvider } = await request.json()
        
        if (!failedDocuments || failedDocuments.length === 0) {
          sendError('No documents to retry')
          controller.close()
          return
        }
        
        // Get user session
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        const authHeader = request.headers.get('authorization')
        let user = null
        
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '')
          const { data: authData } = await supabase.auth.getUser(token)
          user = authData?.user
        }
        
        // For testing purposes, allow unauthenticated requests with forceProvider
        if (!user && !forceProvider) {
          sendError('Authentication required', 'Please log in and try again')
          controller.close()
          return
        }
        
        if (!projectId || !projectData) {
          sendError('Missing projectId or projectData')
          controller.close()
          return
        }
        
        // Security: Log the retry request
        const sanitizer = new DataSanitizer()
        await sanitizer.logSecurityEvent('RETRY_GENERATION_STARTED', {
          projectId,
          userId: user?.id || 'test-user',
          failedCount: failedDocuments.length,
          timestamp: new Date().toISOString()
        })
        
        // Send initial status
        sendEvent('retry_start', {
          projectId,
          totalDocuments: failedDocuments.length,
          documentTypes: failedDocuments
        })
        
        // Initialize generator
        const generator = new DocumentGenerator(forceProvider ? { provider: forceProvider } : undefined)
        const providerInfo = generator.getProviderInfo()
        
        sendEvent('provider', providerInfo)
        
        const successfulDocuments: any[] = []
        const stillFailedDocuments: any[] = []
        
        // Retry only the failed documents
        for (let i = 0; i < failedDocuments.length; i++) {
          const docType = failedDocuments[i]
          
          sendEvent('retry_document_start', {
            type: docType,
            index: i,
            total: failedDocuments.length,
            title: getDocumentTitle(docType)
          })
          
          try {
            const docStartTime = Date.now()
            
            // Generate single document
            const doc = await generator.generateDocument(docType, projectData, projectId)
            
            const docGenerationTime = Date.now() - docStartTime
            
            successfulDocuments.push({
              ...doc,
              generationTimeMs: docGenerationTime
            })
            
            sendEvent('retry_document_complete', {
              type: docType,
              index: i,
              title: getDocumentTitle(docType),
              generationTimeMs: docGenerationTime,
              usage: doc.metadata.usage,
              success: true
            })
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            
            stillFailedDocuments.push({
              type: docType,
              title: getDocumentTitle(docType),
              error: errorMessage
            })
            
            sendEvent('retry_document_failed', {
              type: docType,
              index: i,
              title: getDocumentTitle(docType),
              error: errorMessage
            })
            
            logger.error('RETRY_DOCUMENT', `Failed to retry ${docType}`, { error: errorMessage })
          }
        }
        
        // Get aggregated metrics from generator
        const metrics = generator.getAggregatedMetrics()
        
        // Store successful documents if any
        let artifactIds: string[] = []
        
        if (successfulDocuments.length > 0) {
          if (user?.id) {
            const storage = new DocumentStorage()
            const storageMetrics: GenerationMetrics = {
              provider: metrics.provider,
              model: metrics.model,
              inputTokens: metrics.totalInputTokens,
              outputTokens: metrics.totalOutputTokens,
              reasoningTokens: metrics.totalReasoningTokens,
              totalTokens: metrics.totalTokens,
              generationTimeMs: Date.now() - startTime,
              success: true,
              retryCount: 1
            }
            
            try {
              artifactIds = await storage.storeDocuments(successfulDocuments, user.id, storageMetrics)
              
              sendEvent('storage_complete', {
                artifactIds,
                count: artifactIds.length
              })
            } catch (storageError) {
              logger.error('RETRY_STORAGE', 'Failed to store documents', storageError)
              sendEvent('storage_failed', {
                error: storageError instanceof Error ? storageError.message : 'Storage failed'
              })
            }
          } else {
            // Test mode - generate fake IDs
            artifactIds = successfulDocuments.map(() => `test-artifact-${Date.now()}-${Math.random()}`)
          }
        }
        
        // Calculate cost estimate
        const estimatedCost = calculateGenerationCost(
          metrics.model,
          metrics.totalInputTokens,
          metrics.totalOutputTokens,
          metrics.totalReasoningTokens
        )
        
        // Send completion event with summary
        sendEvent('retry_complete', {
          success: true,
          successCount: successfulDocuments.length,
          failureCount: stillFailedDocuments.length,
          totalRetried: failedDocuments.length,
          artifactIds,
          stillFailedDocuments: stillFailedDocuments.map(d => ({ type: d.type, title: d.title, error: d.error })),
          metrics: {
            ...metrics,
            estimatedCostUsd: estimatedCost,
            generationTimeMs: Date.now() - startTime,
            provider: metrics.provider,
            model: metrics.model
          }
        })
        
        // Update project status if not in test mode
        if (!forceProvider && user && successfulDocuments.length > 0) {
          // If all retries succeeded, set to green, otherwise keep yellow
          const newStatus = stillFailedDocuments.length === 0 ? 'green' : 'yellow'
          
          await supabase
            .from('projects')
            .update({ 
              updated_at: new Date().toISOString(),
              rag_status: newStatus
            })
            .eq('id', projectId)
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error('RETRY_API', 'Retry generation failed', { error: errorMessage })
        sendError('Retry failed', errorMessage)
      } finally {
        // Close the stream
        if (!isClosed) {
          controller.close()
          isClosed = true
        }
      }
    },
    
    cancel() {
      isClosed = true
    }
  })
  
  return new Response(stream, { headers: responseHeaders })
}

// Helper to get document title
function getDocumentTitle(type: string): string {
  const titles: Record<string, string> = {
    charter: 'Project Charter',
    pid: 'Project Initiation Document (PID)',
    backlog: 'Product Backlog',
    sprint_plan: 'Sprint Plan',
    risk_register: 'Risk Register',
    business_case: 'Business Case',
    project_plan: 'Project Plan',
    technical_landscape: 'Technical Landscape Analysis',
    comparable_projects: 'Comparable Projects Analysis'
  }
  return titles[type] || 'Project Document'
}

// Cost calculation
function calculateGenerationCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  reasoningTokens: number = 0
): number {
  if (model?.includes('gpt-5')) {
    if (model === 'gpt-5-mini' || model === 'gpt-5-nano') {
      return (inputTokens * 0.000025) + (outputTokens * 0.0002) + (reasoningTokens * 0.0002)
    } else {
      return (inputTokens * 0.00005) + (outputTokens * 0.0004) + (reasoningTokens * 0.0004)
    }
  } else if (model?.includes('gpt-4')) {
    if (model.includes('turbo')) {
      return (inputTokens * 0.00001) + (outputTokens * 0.00003)
    } else {
      return (inputTokens * 0.00003) + (outputTokens * 0.00006)
    }
  } else if (model?.includes('llama') || model?.includes('mixtral')) {
    return (inputTokens + outputTokens) * 0.000001
  } else {
    return (inputTokens + outputTokens) * 0.000002
  }
}