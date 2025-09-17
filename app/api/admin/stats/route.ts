/**
 * Admin Stats API - Aggregate statistics for admin dashboard
 *
 * Technical PM: Uses multiple repositories to gather stats
 * No direct database access - follows repository pattern
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { ProjectsRepository } from '@/lib/repositories/projects-repository'
import { ArtifactsRepository } from '@/lib/repositories/artifacts-repository'
import { AdminSettingsRepository } from '@/lib/repositories/admin-settings-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.admin.stats.get')

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('api', 'Fetching admin stats', {
      userId: user.id,
      timestamp: Date.now()
    })

    // Check if user is admin
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getProfileById(user.id)

    if (!profile.is_admin) {
      timer.stop()
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Gather stats from repositories
    const projectsRepo = ProjectsRepository.getInstance()
    const artifactsRepo = ArtifactsRepository.getInstance()
    const adminSettingsRepo = AdminSettingsRepository.getInstance()

    // Get counts - repositories will need count methods
    // For now, we'll get all and count (not optimal but works)
    const [allProfiles, allProjects, allArtifacts, llmConfig] = await Promise.all([
      profilesRepo.getAllProfiles(), // Need to add this method
      projectsRepo.getAllProjects(), // Need to add this method
      artifactsRepo.getAllArtifacts(), // Need to add this method
      adminSettingsRepo.getSetting('llm_config')
    ])

    const provider = llmConfig?.value?.provider || 'Not configured'
    const model = llmConfig?.value?.model || ''

    const stats = {
      totalUsers: allProfiles.length,
      totalProjects: allProjects.length,
      totalDocuments: allArtifacts.length,
      currentProvider: model ? `${provider} (${model})` : provider,
      // Additional stats for better insights
      activeProjects: allProjects.filter((p: any) => p.status === 'active').length,
      averageDocsPerProject: allProjects.length > 0
        ? Math.round(allArtifacts.length / allProjects.length)
        : 0
    }

    permanentLogger.info('API_ADMIN_STATS', 'Admin stats fetched', {
      userId: user.id,
      stats
    })

    timer.stop()
    return NextResponse.json(stats)
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_ADMIN_STATS', error as Error, {
      endpoint: 'GET /api/admin/stats'
    })

    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    )
  }
}