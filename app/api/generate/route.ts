import { NextRequest, NextResponse } from 'next/server'
import { DocumentGenerator } from '@/lib/documents/generator'
import { DocumentStorage } from '@/lib/documents/storage'
import { DataSanitizer } from '@/lib/llm/sanitizer'
import { createClient } from '@supabase/supabase-js'

// Use edge runtime to avoid Node.js issues on Vercel
export const runtime = 'edge'

// Set a maximum time for the entire route (90 seconds)
export const maxDuration = 90

export async function POST(request: NextRequest) {
  console.log('[API] Generate endpoint called')
  console.log('[API] Environment check:', {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasGroqKey: !!process.env.GROQ_API_KEY,
    groqKeyPrefix: process.env.GROQ_API_KEY?.substring(0, 10)
  })
  
  try {
    // Get user session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const authHeader = request.headers.get('authorization')
    let user = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: authData, error: authError } = await supabase.auth.getUser(token)
      user = authData?.user
    }
    
    // Parse request body
    const { projectId, projectData, forceProvider } = await request.json()
    
    // For testing purposes, allow unauthenticated requests with forceProvider
    if (!user && !forceProvider) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Document generation timed out after 80 seconds')), 80000)
    })
    
    // Race between generation and timeout
    const documents = await Promise.race([
      generator.generateProjectDocuments(projectData, projectId),
      timeoutPromise
    ]) as any

    // Store documents in Supabase (skip for test mode)
    let artifactIds: string[] = []
    
    if (!forceProvider || user) {
      const storage = new DocumentStorage()
      // Use a valid UUID for test user
      const userId = user?.id || '00000000-0000-0000-0000-000000000000'
      artifactIds = await storage.storeDocuments(documents, userId)
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

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Documents generated successfully',
      artifactIds,
      provider: generator.getProvider?.() || 'unknown',
      documents: documents.map(doc => ({
        type: doc.metadata.type,
        title: getDocumentTitle(doc.metadata.type),
        version: doc.metadata.version,
        insights: doc.aiInsights
      }))
    })

  } catch (error) {
    console.error('Document generation error:', error)
    
    // Check if it's a PII error
    const errorMessage = error instanceof Error ? error.message : ''
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
    project_plan: 'Project Plan'
  }
  return titles[type] || 'Project Document'
}