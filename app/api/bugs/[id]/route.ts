/**
 * Bug Detail API - Individual bug operations
 *
 * Technical PM: Handles GET, PATCH, DELETE for individual bugs
 * BETA: Global visibility - all users can see/update all bugs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BugsRepository } from '@/lib/repositories/bugs-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const timer = permanentLogger.timing('api.bugs.get_single')
  const bugId = params.id

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('api', 'Fetching bug', {
      bugId,
      userId: user.id,
      timestamp: Date.now()
    })

    const bugsRepo = BugsRepository.getInstance()
    const bug = await bugsRepo.getBug(bugId)

    if (!bug) {
      timer.stop()
      return NextResponse.json({ error: 'Bug not found' }, { status: 404 })
    }

    permanentLogger.info('API_BUGS', 'Bug fetched', {
      bugId,
      userId: user.id
    })

    timer.stop()
    return NextResponse.json(bug)
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_BUGS', error as Error, {
      endpoint: `GET /api/bugs/${bugId}`
    })

    return NextResponse.json(
      { error: 'Failed to fetch bug' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const timer = permanentLogger.timing('api.bugs.patch')
  const bugId = params.id

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()

    permanentLogger.breadcrumb('api', 'Updating bug', {
      bugId,
      updates,
      userId: user.id,
      timestamp: Date.now()
    })

    const bugsRepo = BugsRepository.getInstance()

    // BETA: In production, check if user has permission to update
    // For now, all authenticated users can update any bug (collaborative debugging)

    const bug = await bugsRepo.updateBug(bugId, updates)

    permanentLogger.info('API_BUGS', 'Bug updated', {
      bugId,
      userId: user.id,
      updates: Object.keys(updates)
    })

    timer.stop()
    return NextResponse.json(bug)
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_BUGS', error as Error, {
      endpoint: `PATCH /api/bugs/${bugId}`
    })

    return NextResponse.json(
      { error: 'Failed to update bug' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const timer = permanentLogger.timing('api.bugs.delete')
  const bugId = params.id

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('api', 'Deleting bug', {
      bugId,
      userId: user.id,
      timestamp: Date.now()
    })

    const bugsRepo = BugsRepository.getInstance()

    // BETA: In production, check if user has permission to delete
    // For now, all authenticated users can delete any bug (collaborative debugging)

    await bugsRepo.deleteBug(bugId)

    permanentLogger.info('API_BUGS', 'Bug deleted', {
      bugId,
      userId: user.id
    })

    timer.stop()
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_BUGS', error as Error, {
      endpoint: `DELETE /api/bugs/${bugId}`
    })

    return NextResponse.json(
      { error: 'Failed to delete bug' },
      { status: 500 }
    )
  }
}