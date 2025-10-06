import { NextRequest } from 'next/server'
import { DocumentGenerator } from '@/lib/documents/generator'
import { DocumentStorage, GenerationMetrics } from '@/lib/documents/storage'
import { DataSanitizer } from '@/lib/llm/sanitizer'
import { createClient } from '@supabase/supabase-js'
import { permanentLogger } from '@/lib/utils/permanent-logger'

// Set maximum duration for streaming
export const maxDuration = 300 // 5 minutes
export const runtime = 'nodejs'

// Document types in generation order
const DOCUMENT_TYPES = {
  agile: ['charter', 'backlog', 'sprint_plan', 'technical_landscape', 'comparable_projects'],
  prince2: ['pid', 'business_case', 'project_plan', 'risk_register', 'quality_management', 'communication_plan', 'technical_landscape', 'comparable_projects']
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  permanentLogger.info('STREAM_API', 'Generate stream endpoint called', {
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
        const { projectId, projectData, forceProvider } = await request.json()
        
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
        
        // Security: Log the generation request
        const sanitizer = new DataSanitizer()
        await sanitizer.logSecurityEvent('STREAM_GENERATION_STARTED', {
          projectId,
          userId: user?.id || 'test-user',
          methodology: projectData.methodology,
          timestamp: new Date().toISOString()
        })
        
        // Send initial status
        sendEvent('start', {
          projectId,
          methodology: projectData.methodology,
          totalDocuments: DOCUMENT_TYPES[projectData.methodology as keyof typeof DOCUMENT_TYPES].length
        })
        
        // Initialize generator
        const generator = new DocumentGenerator(forceProvider ? { provider: forceProvider } : undefined)
        const providerInfo = generator.getProviderInfo()
        
        sendEvent('provider', providerInfo)
        
        // Get document types for methodology
        const documentTypes = DOCUMENT_TYPES[projectData.methodology as keyof typeof DOCUMENT_TYPES] || []
        const successfulDocuments: any[] = []
        const failedDocuments: any[] = []
        
        // Generate documents one by one for progress tracking
        for (let i = 0; i < documentTypes.length; i++) {
          const docType = documentTypes[i]
          
          sendEvent('document_start', {
            type: docType,
            index: i,
            total: documentTypes.length,
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
            
            sendEvent('document_complete', {
              type: docType,
              index: i,
              title: getDocumentTitle(docType),
              generationTimeMs: docGenerationTime,
              usage: doc.metadata.usage,
              success: true
            })
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            
            failedDocuments.push({
              type: docType,
              title: getDocumentTitle(docType),
              error: errorMessage
            })
            
            sendEvent('document_failed', {
              type: docType,
              index: i,
              title: getDocumentTitle(docType),
              error: errorMessage
            })
            
            permanentLogger.error('STREAM_DOCUMENT', `Failed to generate ${docType}`, { error: errorMessage })
            
            // Continue with next document instead of failing entire generation
          }
        }
        
        // Get aggregated metrics from generator
        const metrics = generator.getAggregatedMetrics()
        
        // Log aggregated metrics
        permanentLogger.info('STREAM_METRICS', 'Final aggregated metrics', {
          projectId,
          methodology: projectData.methodology,
          documentsGenerated: successfulDocuments.length,
          documentsFailed: failedDocuments.length,
          ...metrics
        })
        
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
              success: true
            }
            
            try {
              artifactIds = await storage.storeDocuments(successfulDocuments, user.id, storageMetrics)
              
              sendEvent('storage_complete', {
                artifactIds,
                count: artifactIds.length
              })
            } catch (storageError) {
              permanentLogger.error('STREAM_STORAGE', 'Failed to store documents', storageError)
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
        sendEvent('complete', {
          success: true,
          successCount: successfulDocuments.length,
          failureCount: failedDocuments.length,
          partialSuccess: failedDocuments.length > 0 && successfulDocuments.length > 0,
          totalDocuments: documentTypes.length,
          artifactIds,
          failedDocuments: failedDocuments.map(d => ({ type: d.type, title: d.title, error: d.error })),
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
          await supabase
            .from('projects')
            .update({ 
              updated_at: new Date().toISOString(),
              rag_status: failedDocuments.length === 0 ? 'green' : 'yellow'
            })
            .eq('id', projectId)
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        permanentLogger.error('STREAM_API', 'Stream generation failed', { error: errorMessage })
        sendError('Generation failed', errorMessage)
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