/**
 * API Route for PDF Generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPDFService } from '@/lib/pdf-generation/pdf-service'
import { getPDFCacheService } from '@/lib/pdf-generation/services/pdf-cache-service'
import { DocumentType, PDFOptions } from '@/lib/pdf-generation/types'
import { createClient } from '@/lib/supabase/server'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { ArtifactsRepository } from '@/lib/repositories/artifacts-repository'
import { ProjectsRepository } from '@/lib/repositories/projects-repository'
import { TeamRepository } from '@/lib/repositories/team-repository'

export async function POST(request: NextRequest) {
  console.log('\n' + '='.repeat(60))
  console.log('📥 PDF Generation Request Received')
  console.log('='.repeat(60))
  
  try {
    // Get request body
    const body = await request.json()
    const {
      documentType,
      content,
      projectName,
      companyName,
      options = {},
      artifactId
    } = body
    
    console.log('📋 Request Details:')
    console.log(`  Document Type: ${documentType}`)
    console.log(`  Project Name: ${projectName}`)
    console.log(`  Artifact ID: ${artifactId}`)
    console.log(`  Use Cache: ${options.useCache}`)
    console.log(`  Force Regenerate: ${options.forceRegenerate || false}`)
    console.log(`  Content Keys: ${Object.keys(content || {}).join(', ')}`)
    
    // Validate required fields
    if (!documentType || !content || !projectName) {
      console.error('❌ Missing required fields:', { documentType: !!documentType, content: !!content, projectName: !!projectName })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Fetch user profile to get subscription tier, PDF settings, and user name using repository
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getProfile(user.id)
    
    // Get the user's name for document author
    const authorName = profile?.full_name || profile?.email || user.email || 'User'
    
    // If artifactId provided, verify ownership using repositories
    if (artifactId) {
      const artifactsRepo = ArtifactsRepository.getInstance()
      const projectsRepo = ProjectsRepository.getInstance()
      const teamRepo = TeamRepository.getInstance()

      // Check artifacts table
      const artifact = await artifactsRepo.getArtifact(artifactId)

      if (!artifact) {
        return NextResponse.json(
          { error: 'Artifact not found or unauthorized' },
          { status: 403 }
        )
      }

      // Verify user has access to this artifact via project ownership
      const project = await projectsRepo.getProject(artifact.project_id)

      if (!project || project.owner_id !== user.id) {
        // Check if user is a project member
        const isMember = await teamRepo.isProjectMember(user.id, artifact.project_id)

        if (!isMember) {
          return NextResponse.json(
            { error: 'Artifact not found or unauthorized' },
            { status: 403 }
          )
        }
      }
    }
    
    // Get services
    const pdfService = getPDFService()
    const cacheService = getPDFCacheService()
    
    // Check if formatter exists for document type
    if (!pdfService.hasFormatter(documentType as DocumentType)) {
      return NextResponse.json(
        { error: `Unsupported document type: ${documentType}` },
        { status: 400 }
      )
    }
    
    // Configure PDF options with user tier and settings
    const userTier = profile?.subscription_tier as 'free' | 'basic' | 'premium' || 'free'
    
    const pdfOptions: PDFOptions = {
      whiteLabel: options.whiteLabel || false,
      watermarkText: userTier !== 'free' && profile?.pdf_watermark_text 
        ? profile.pdf_watermark_text 
        : options.watermarkText,
      showDraft: options.showDraft || false,
      classification: options.classification,
      headerText: options.headerText,
      footerText: options.footerText,
      pageNumbers: options.pageNumbers !== false, // Default true
      format: options.format || 'A4',
      // Pass user tier and settings
      userTier: userTier,
      hideAttribution: userTier !== 'free' ? profile?.pdf_hide_attribution || false : false,
      watermarkEnabled: userTier !== 'free' ? profile?.pdf_watermark_enabled !== false : true,
      // Add author information from logged-in user
      author: authorName,
      generatedBy: authorName
    }
    
    // Check cache first if enabled
    if (options.useCache !== false && artifactId && !options.forceRegenerate) {
      console.log('🔍 Checking cache...')
      const cached = await cacheService.getCachedPDF(
        user.id,
        artifactId,
        documentType,
        content,
        pdfOptions,
        { forceRegenerate: options.forceRegenerate }
      )
      
      if (cached) {
        console.log('✅ Returning cached PDF:', cached.url)
        console.log('='.repeat(60) + '\n')
        
        // If storing was requested and we have a cached URL, return it
        if (options.store) {
          return NextResponse.json({
            success: true,
            url: cached.url,
            cached: true
          })
        }
        
        // Otherwise, fetch and return the cached PDF
        const response = await fetch(cached.url)
        const buffer = await response.arrayBuffer()
        
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${projectName}-${documentType}.pdf"`,
            'X-PDF-Cached': 'true',
            'Cache-Control': 'public, max-age=3600'
          }
        })
      }
    }
    
    // Generate PDF
    console.log('🔨 Generating new PDF...')
    console.log(`  Using formatter for: ${documentType}`)
    
    const result = await pdfService.generatePDF(
      documentType as DocumentType,
      content,
      projectName,
      companyName || 'Your Company',
      pdfOptions
    )
    
    if (!result.success || !result.pdf) {
      console.error('❌ PDF generation failed:', result.error)
      return NextResponse.json(
        { error: result.error || 'PDF generation failed' },
        { status: 500 }
      )
    }
    
    console.log('✅ PDF generated successfully')
    console.log(`  Size: ${(result.pdf.size / 1024).toFixed(2)} KB`)
    console.log(`  Pages: ${result.pdf.pageCount}`)
    
    // Store PDF in cache if enabled
    if (options.useCache !== false && artifactId) {
      const cacheResult = await cacheService.savePDFToCache(
        user.id,
        artifactId,
        documentType,
        content,
        pdfOptions,
        result.pdf.buffer
      )
      
      if (cacheResult) {
        console.log('PDF cached successfully:', cacheResult.url)
        
        // If storing was requested, return the URL
        if (options.store && artifactId) {
          // Update artifact with PDF URL using repository
          const artifactsRepo = ArtifactsRepository.getInstance()
          await artifactsRepo.updateArtifact(artifactId, {
            pdf_url: cacheResult.url
          })

          return NextResponse.json({
            success: true,
            url: cacheResult.url,
            metadata: result.pdf.metadata,
            pageCount: result.pdf.pageCount,
            size: result.pdf.size,
            cached: false
          })
        }
      }
    }
    
    // Return PDF as binary response
    return new NextResponse(result.pdf.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${projectName}-${documentType}.pdf"`,
        'Content-Length': result.pdf.size.toString(),
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check PDF generation status
 */
export async function GET(request: NextRequest) {
  const pdfService = getPDFService()
  const availableTypes = pdfService.getAvailableTypes()
  
  return NextResponse.json({
    status: 'ready',
    availableTypes,
    features: {
      htmlToPdf: true,
      watermarking: true,
      whiteLabel: true,
      storage: true,
      thumbnails: false // Not implemented yet
    }
  })
}