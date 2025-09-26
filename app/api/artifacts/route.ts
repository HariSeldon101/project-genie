/**
 * Artifacts API - RESTful endpoints for document artifacts
 *
 * Technical PM: Provides access to generated documents
 * UI components MUST NOT access database directly
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ArtifactsRepository } from '@/lib/repositories/artifacts-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.artifacts.get')

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')

    permanentLogger.breadcrumb('api', 'Fetching artifacts', {
      userId: user.id,
      projectId,
      type,
      timestamp: Date.now()
    })

    const artifactsRepo = ArtifactsRepository.getInstance()

    let artifacts
    if (projectId && type) {
      artifacts = await artifactsRepo.getProjectArtifactsByType(projectId, type)
    } else if (projectId) {
      artifacts = await artifactsRepo.getProjectArtifacts(projectId)
    } else {
      // Get all artifacts for user's projects
      const projectsRepo = (await import('@/lib/repositories/projects-repository')).ProjectsRepository.getInstance()
      const projects = await projectsRepo.getUserProjects()
      const projectIds = projects.map(p => p.id)

      if (projectIds.length === 0) {
        artifacts = []
      } else {
        // Get artifacts for all projects
        const allArtifacts = await Promise.all(
          projectIds.map(id => artifactsRepo.getProjectArtifacts(id))
        )
        artifacts = allArtifacts.flat()
      }
    }

    permanentLogger.info('API_ARTIFACTS', 'Artifacts fetched', {
      userId: user.id,
      projectId,
      type,
      artifactCount: artifacts.length
    })

    timer.stop()
    return NextResponse.json(artifacts)
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_ARTIFACTS', error as Error, {
      endpoint: 'GET /api/artifacts'
    })

    return NextResponse.json(
      { error: 'Failed to fetch artifacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const timer = permanentLogger.timing('api.artifacts.post')

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id, type, title, content, version } = body

    permanentLogger.breadcrumb('api', 'Creating artifact', {
      projectId: project_id,
      type,
      title,
      version,
      userId: user.id,
      timestamp: Date.now()
    })

    // Validate that the user owns the project
    const projectsRepo = (await import('@/lib/repositories/projects-repository')).ProjectsRepository.getInstance()
    const project = await projectsRepo.getProject(project_id)

    if (!project || project.owner_id !== user.id) {
      timer.stop()
      return NextResponse.json(
        { error: 'Not authorized to create artifacts for this project' },
        { status: 403 }
      )
    }

    const artifactsRepo = ArtifactsRepository.getInstance()
    const artifact = await artifactsRepo.createArtifact({
      project_id,
      type,
      title,
      content,
      version: version || 1,
      created_by: user.id
    })

    permanentLogger.info('API_ARTIFACTS', 'Artifact created', {
      artifactId: artifact.id,
      projectId: project_id,
      type,
      title
    })

    timer.stop()
    return NextResponse.json(artifact, { status: 201 })
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_ARTIFACTS', error as Error, {
      endpoint: 'POST /api/artifacts'
    })

    return NextResponse.json(
      { error: 'Failed to create artifact' },
      { status: 500 }
    )
  }
}