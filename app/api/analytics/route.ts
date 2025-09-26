/**
 * Analytics API - Provides analytics data for dashboard
 *
 * Technical PM: Centralizes analytics queries through repositories
 * UI components MUST use this endpoint, not direct database access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProjectsRepository } from '@/lib/repositories/projects-repository'
import { ArtifactsRepository } from '@/lib/repositories/artifacts-repository'
import { TeamRepository } from '@/lib/repositories/team-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { format, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.analytics.get')

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || '7d'

    permanentLogger.breadcrumb('api', 'Fetching analytics', {
      userId: user.id,
      dateRange,
      timestamp: Date.now()
    })

    // Get date range
    const endDate = new Date()
    let startDate = new Date()
    switch (dateRange) {
      case '7d':
        startDate = subDays(endDate, 7)
        break
      case '30d':
        startDate = subDays(endDate, 30)
        break
      case '90d':
        startDate = subDays(endDate, 90)
        break
      case 'all':
        startDate = new Date('2024-01-01')
        break
    }

    // Use repositories instead of direct database access
    const projectsRepo = ProjectsRepository.getInstance()
    const artifactsRepo = ArtifactsRepository.getInstance()
    const teamRepo = TeamRepository.getInstance()

    // Fetch user's projects
    const projects = await projectsRepo.getUserProjects(user.id)

    let documents: any[] = []
    let members: any[] = []

    // If user has projects, fetch related data
    if (projects && projects.length > 0) {
      // Fetch artifacts and team members for all user's projects
      const projectDataPromises = projects.map(async (project) => ({
        artifacts: await artifactsRepo.getProjectArtifacts(project.id),
        members: await teamRepo.getProjectMembers(project.id)
      }))

      const projectData = await Promise.all(projectDataPromises)

      // Flatten the arrays
      documents = projectData.flatMap(pd => pd.artifacts || [])
      members = projectData.flatMap(pd => pd.members || [])
    }

    // Note: risks and tasks tables don't exist yet, using empty arrays
    const risks: any[] = []
    const tasks: any[] = []

    // Calculate metrics
    const activeProjects = projects?.filter(p => p.status !== 'completed').length || 0
    const completedProjects = projects?.filter(p => p.status === 'completed').length || 0
    const highRisks = risks?.filter(r => r.impact === 'high' || r.impact === 'very_high').length || 0
    const completedTasks = tasks?.filter(t => t.status === 'done').length || 0

    // Methodology breakdown
    const methodologyBreakdown = projects?.reduce((acc: { name: string; count: number }[], project) => {
      const existing = acc.find(m => m.name === project.methodology_type)
      if (existing) {
        existing.count++
      } else {
        acc.push({ name: project.methodology_type, count: 1 })
      }
      return acc
    }, []) || []

    // Document generation trend (using real data from artifacts)
    const documentGenerationTrend = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      const dayDocuments = documents.filter(doc => {
        const docDate = new Date(doc.created_at)
        return docDate.toDateString() === date.toDateString()
      })
      return {
        date: format(date, 'MMM dd'),
        count: dayDocuments.length
      }
    })

    // Project progress
    const projectProgress = projects?.slice(0, 5).map(p => ({
      name: p.name,
      progress: p.progress || 0
    })) || []

    // Risk trend (mock data until risks table exists)
    const riskTrend = Array.from({ length: 7 }, (_, i) => ({
      date: format(subDays(new Date(), 6 - i), 'MMM dd'),
      count: 0,
      high: 0
    }))

    const analyticsData = {
      totalProjects: projects?.length || 0,
      activeProjects,
      completedProjects,
      totalDocuments: documents?.length || 0,
      totalRisks: risks?.length || 0,
      highRisks,
      totalTasks: tasks?.length || 0,
      completedTasks,
      teamMembers: members?.length || 0,
      methodologyBreakdown,
      documentGenerationTrend,
      projectProgress,
      riskTrend
    }

    permanentLogger.info('API_ANALYTICS', 'Analytics data fetched', {
      userId: user.id,
      projectCount: projects.length,
      documentCount: documents.length,
      memberCount: members.length
    })

    timer.stop()
    return NextResponse.json(analyticsData)

  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_ANALYTICS', error as Error, {
      endpoint: 'GET /api/analytics'
    })

    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}