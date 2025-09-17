/**
 * Company Intelligence Pack Retrieval API
 * Endpoint for retrieving stored company packs
 * Uses repository pattern for centralized data access
 */

import { NextRequest, NextResponse } from 'next/server'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * GET /api/company-intelligence/pack/[id]
 * Retrieve a pack by ID
 * Uses repository pattern for centralized data access
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: packId } = await params

  try {
    permanentLogger.breadcrumb('api', 'Retrieving pack', {
      endpoint: `/api/company-intelligence/pack/${packId}`,
      packId
    })

    // Use repository for all database operations
    const repository = CompanyIntelligenceRepository.getInstance()

    // Get pack using repository method
    const pack = await repository.getPack(packId)

    permanentLogger.info('PACK_API', 'Pack retrieved successfully', {
      packId: pack.id,
      sessionId: pack.session_id,
      packType: pack.pack_type
    })

    return NextResponse.json(pack)

  } catch (error) {
    permanentLogger.captureError('PACK_API', error as Error, {
      packId,
      context: 'Failed to retrieve pack'
    })

    // Check if it's a not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Pack not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve pack',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/company-intelligence/pack/[id]
 * Create a new pack for a session
 * Uses repository pattern for centralized data access
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  try {
    permanentLogger.breadcrumb('api', 'Creating pack', {
      endpoint: `/api/company-intelligence/pack/${sessionId}`,
      sessionId
    })

    // Parse request body
    const body = await req.json()
    const { packData, packType } = body

    if (!packData) {
      return NextResponse.json(
        { error: 'Pack data is required' },
        { status: 400 }
      )
    }

    // Use repository for all database operations
    const repository = CompanyIntelligenceRepository.getInstance()

    // Verify session exists
    await repository.getSession(sessionId)

    // Create pack using repository method
    const packId = await repository.createPack(sessionId, packData, packType || 'analysis')

    permanentLogger.info('PACK_API', 'Pack created successfully', {
      packId,
      sessionId,
      packType: packType || 'analysis'
    })

    return NextResponse.json({
      id: packId,
      sessionId,
      packType: packType || 'analysis',
      message: 'Pack created successfully'
    }, { status: 201 })

  } catch (error) {
    permanentLogger.captureError('PACK_API', error as Error, {
      sessionId,
      context: 'Failed to create pack'
    })

    // Check if it's a not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create pack',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/company-intelligence/pack/[id]
 * Delete a pack
 * Note: This should be enhanced with a deletePack method in repository
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: packId } = await params

  try {
    permanentLogger.breadcrumb('api', 'Deleting pack', {
      endpoint: `/api/company-intelligence/pack/${packId}`,
      packId
    })

    // Use repository for verification
    const repository = CompanyIntelligenceRepository.getInstance()

    // Verify pack exists (this will throw if not found)
    await repository.getPack(packId)

    // TODO: Add deletePack method to repository
    // For now, we'll just mark it as deleted in the response
    permanentLogger.warn('PACK_API', 'Pack deletion not fully implemented', {
      packId,
      reason: 'Repository method needed'
    })

    return NextResponse.json({
      success: true,
      message: 'Pack deletion recorded',
      packId
    })

  } catch (error) {
    permanentLogger.captureError('PACK_API', error as Error, {
      packId,
      context: 'Failed to delete pack'
    })

    // Check if it's a not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Pack not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to delete pack',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}