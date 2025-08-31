import { NextRequest, NextResponse } from 'next/server'
import { DocumentGenerator } from '@/lib/documents/generator'
import { DocumentStorage, GenerationMetrics } from '@/lib/documents/storage'
import { DataSanitizer } from '@/lib/llm/sanitizer'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/permanent-logger'

// Set a maximum time for the entire route (300 seconds / 5 minutes - max for Vercel hobby plan)
// PRINCE2 documents can take 4-5 minutes per document with retries
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  logger.info('API_GENERATE', 'Generate endpoint called', {
    timestamp: new Date().toISOString(),
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasGroqKey: !!process.env.GROQ_API_KEY,
    runtime: process.env.VERCEL_REGION || 'local'
  })
  
  console.log('[API] Generate endpoint called at', new Date().toISOString())
  console.log('[API] Environment check:', {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasGroqKey: !!process.env.GROQ_API_KEY,
    groqKeyPrefix: process.env.GROQ_API_KEY?.substring(0, 10),
    nodeVersion: process.version,
    runtime: process.env.VERCEL_REGION || 'local'
  })
  
  try {
    // Get user session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const authHeader = request.headers.get('authorization')
    let user = null
    let authError = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      
      // Add retry logic for auth verification
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: authData, error } = await supabase.auth.getUser(token)
        if (!error && authData?.user) {
          user = authData.user
          break
        }
        authError = error
        
        // Wait before retrying (exponential backoff)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)))
        }
      }
    }
    
    // Parse request body
    const { projectId, projectData, selectedDocuments, forceProvider } = await request.json()
    
    // For testing purposes, allow unauthenticated requests with forceProvider
    if (!user && !forceProvider) {
      logger.warn('AUTH_FAILED', 'Authentication failed for generate endpoint', {
        error: authError?.message,
        hasAuthHeader: !!authHeader
      })
      console.error('[API] Authentication failed:', authError)
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          details: authError?.message || 'Please log in and try again'
        },
        { status: 401 }
      )
    }
    
    if (!projectId || !projectData) {
      return NextResponse.json(
        { error: 'Missing projectId or projectData' },
        { status: 400 }
      )
    }

    // Security: Log the generation request (without PII)
    const sanitizer = new DataSanitizer()
    await sanitizer.logSecurityEvent('DOCUMENT_GENERATION_STARTED', {
      projectId,
      userId: user?.id || 'test-user',
      methodology: projectData.methodology,
      timestamp: new Date().toISOString()
    })

    // Generate documents with timeout
    const generator = new DocumentGenerator(forceProvider ? { provider: forceProvider } : undefined)
    
    // Log provider info
    const providerInfo = generator.getProviderInfo()
    console.log('[API] Using LLM Provider:', providerInfo)
    console.log('[API] Selected documents:', selectedDocuments)
    
    // Generate documents without artificial timeout - let Vercel's maxDuration handle it
    const generationStartTime = Date.now()
    const documents = await generator.generateProjectDocuments(projectData, projectId, selectedDocuments)
    const generationTimeMs = Date.now() - generationStartTime

    // Get aggregated metrics from generator
    const metrics = generator.getAggregatedMetrics()
    
    // Create metrics object for storage with all metadata
    const storageMetrics: GenerationMetrics = {
      provider: metrics.provider,
      model: metrics.model,
      inputTokens: metrics.totalInputTokens,
      outputTokens: metrics.totalOutputTokens,
      reasoningTokens: metrics.totalReasoningTokens,
      totalTokens: metrics.totalTokens,
      costUsd: metrics.totalCostUsd,
      generationTimeMs: generationTimeMs,
      success: true,
      // Add prompt parameters from actual provider config
      reasoningEffort: metrics.provider === 'openai' ? 'high' : undefined,
      temperature: providerInfo.temperature || 0.7,
      maxTokens: providerInfo.maxTokens || 4096
    }

    // Store documents in Supabase (only if we have a real user)
    let artifactIds: string[] = []
    
    if (user?.id) {
      // Only store if we have a real authenticated user
      const storage = new DocumentStorage()
      artifactIds = await storage.storeDocuments(documents, user.id, storageMetrics)
    } else {
      // For testing without DB storage
      artifactIds = documents.map(() => `test-artifact-${Date.now()}-${Math.random()}`)
    }

    // Log successful generation
    await sanitizer.logSecurityEvent('DOCUMENT_GENERATION_COMPLETED', {
      projectId,
      userId: user?.id || 'test-user',
      artifactCount: documents.length,
      artifactIds,
      timestamp: new Date().toISOString()
    })

    // Update project status (skip for test mode)
    if (!forceProvider || user) {
      await supabase
        .from('projects')
        .update({ 
          updated_at: new Date().toISOString(),
          rag_status: 'green' // Set to green after successful generation
        })
        .eq('id', projectId)
    }

    // Calculate cost estimate
    const estimatedCost = calculateGenerationCost(
      metrics.model,
      metrics.totalInputTokens,
      metrics.totalOutputTokens,
      metrics.totalReasoningTokens
    )
    
    // Return success response with debug info and metrics
    const debugInfo = generator.getDebugInfo()
    return NextResponse.json({
      success: true,
      message: 'Documents generated successfully',
      artifactIds,
      provider: providerInfo.provider,
      model: providerInfo.model,
      metrics: {
        ...metrics,
        estimatedCostUsd: estimatedCost,
        generationTimeMs,
        documentsGenerated: documents.length
      },
      debugInfo,
      documents: documents.map(doc => ({
        type: doc.metadata.type,
        title: getDocumentTitle(doc.metadata.type),
        version: doc.metadata.version,
        content: doc.content, // Include actual content
        insights: doc.aiInsights,
        usage: doc.metadata.usage, // Include individual doc usage
        generationTimeMs: doc.metadata.generationTimeMs,
        prompt: doc.metadata.prompt // Include prompt for debugging
      }))
    })

  } catch (error) {
    // Extract error details once
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    logger.error('API_ERROR', 'Document generation failed', {
      error: errorMessage,
      type: error?.constructor?.name,
      projectId: request.body ? JSON.parse(await request.text()).projectId : 'unknown'
    }, errorStack)
    
    console.error('[API] Document generation error:', {
      error: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name
    })
    
    // Check if it's a PII error (errorMessage already declared above)
    if (errorMessage.includes('PII detected')) {
      return NextResponse.json(
        { 
          error: 'Security violation: PII detected in request',
          details: 'Personal information was detected and blocked'
        },
        { status: 400 }
      )
    }
    
    // Check if it's an API key error
    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { 
          error: 'Configuration error',
          details: 'LLM provider is not properly configured'
        },
        { status: 500 }
      )
    }
    
    // Generic error
    return NextResponse.json(
      { 
        error: 'Document generation failed',
        details: errorMessage || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      )
    }

    const storage = new DocumentStorage()
    const hasDocuments = await storage.hasDocuments(projectId)
    const documents = hasDocuments ? await storage.getProjectDocuments(projectId) : []

    return NextResponse.json({
      hasDocuments,
      documentCount: documents.length,
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        version: doc.version,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at
      }))
    })

  } catch (error) {
    console.error('Error checking documents:', error)
    return NextResponse.json(
      { error: 'Failed to check documents' },
      { status: 500 }
    )
  }
}

function getDocumentTitle(type: string): string {
  const titles: Record<string, string> = {
    charter: 'Project Charter',
    pid: 'Project Initiation Document (PID)',
    backlog: 'Product Backlog',
    risk_register: 'Risk Register',
    business_case: 'Business Case',
    project_plan: 'Project Plan',
    technical_landscape: 'Technical Landscape Analysis',
    comparable_projects: 'Comparable Projects Analysis'
  }
  return titles[type] || 'Project Document'
}

function calculateGenerationCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  reasoningTokens: number = 0
): number {
  // GPT-5 pricing (per 1M tokens)
  if (model?.includes('gpt-5')) {
    if (model === 'gpt-5-mini' || model === 'gpt-5-nano') {
      // GPT-5-mini/nano: $0.025 input, $0.20 output
      return (inputTokens * 0.000025) + (outputTokens * 0.0002) + (reasoningTokens * 0.0002)
    } else {
      // GPT-5 standard: $0.05 input, $0.40 output (estimated)
      return (inputTokens * 0.00005) + (outputTokens * 0.0004) + (reasoningTokens * 0.0004)
    }
  } else if (model?.includes('gpt-4')) {
    if (model.includes('turbo')) {
      // GPT-4-turbo: $0.01 input, $0.03 output
      return (inputTokens * 0.00001) + (outputTokens * 0.00003)
    } else {
      // GPT-4: $0.03 input, $0.06 output
      return (inputTokens * 0.00003) + (outputTokens * 0.00006)
    }
  } else if (model?.includes('llama') || model?.includes('mixtral')) {
    // Groq models: ~$0.001 per 1K tokens
    return (inputTokens + outputTokens) * 0.000001
  } else {
    // Default/unknown model
    return (inputTokens + outputTokens) * 0.000002
  }
}