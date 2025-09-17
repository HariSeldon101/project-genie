import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { PDFService } from '@/lib/pdf-generation/pdf-service'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { ArtifactsRepository } from '@/lib/repositories/artifacts-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json()
    const { 
      content, 
      documentType, 
      projectName, 
      companyName,
      options = {} 
    } = body

    // Validate required fields
    if (!content || !documentType || !projectName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the current user
    const supabase = createServerComponentClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile for the author name using repository
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getProfile(user.id)

    // Use the user's name or email as the author
    const authorName = profile?.full_name || profile?.email || user.email || 'User'

    // Add author to options
    const pdfOptions = {
      ...options,
      author: authorName,
      generatedBy: authorName // For cover page
    }

    // Generate the PDF
    const pdfService = new PDFService()
    const pdfResult = await pdfService.generatePDF(
      documentType,
      content,
      projectName,
      companyName || 'Your Company',
      pdfOptions
    )

    // Check if PDF generation was successful
    if (!pdfResult.success || !pdfResult.pdf) {
      return NextResponse.json(
        { error: pdfResult.error || 'Failed to generate PDF' },
        { status: 500 }
      )
    }

    // Create the response with the PDF buffer
    const response = new NextResponse(pdfResult.pdf.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${projectName}-${documentType}.pdf"`,
        'Content-Length': pdfResult.pdf.buffer.length.toString(),
      },
    })

    return response
  } catch (error) {
    console.error('PDF generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also support GET for direct downloads with query params
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const documentId = searchParams.get('id')
    const documentType = searchParams.get('type')

    if (!documentId || !documentType) {
      return NextResponse.json(
        { error: 'Missing document ID or type' },
        { status: 400 }
      )
    }

    // Get the current user
    const supabase = createServerComponentClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch the document from the database using repository
    // Note: generated_documents table doesn't exist - using artifacts instead
    const artifactsRepo = ArtifactsRepository.getInstance()
    const document = await artifactsRepo.getArtifact(documentId)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this document
    if (document.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get user profile for the author name using repository
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getProfile(user.id)

    const authorName = profile?.full_name || profile?.email || user.email || 'User'

    // Generate the PDF
    const pdfService = new PDFService()
    const pdfResult = await pdfService.generatePDF(
      document.type,
      document.content,
      document.project_name,
      document.company_name || 'Your Company',
      {
        author: authorName,
        generatedBy: authorName,
        version: document.version || '1.0'
      }
    )

    // Check if PDF generation was successful
    if (!pdfResult.success || !pdfResult.pdf) {
      return NextResponse.json(
        { error: pdfResult.error || 'Failed to generate PDF' },
        { status: 500 }
      )
    }

    // Create the response with the PDF buffer
    const response = new NextResponse(pdfResult.pdf.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${document.project_name}-${document.type}.pdf"`,
        'Content-Length': pdfResult.pdf.buffer.length.toString(),
      },
    })

    return response
  } catch (error) {
    console.error('PDF download error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to download PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}