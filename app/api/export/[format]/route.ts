import { NextRequest, NextResponse } from 'next/server'
import { ExcelExporter } from '@/lib/export/excel-exporter'
import { createServerClient } from '@/lib/supabase/server'
import { ProjectsRepository } from '@/lib/repositories/projects-repository'
import { TeamRepository } from '@/lib/repositories/team-repository'
import { ArtifactsRepository } from '@/lib/repositories/artifacts-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ format: string }> }
) {
  try {
    const { format } = await params
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      )
    }

    // Validate format
    const supportedFormats = ['xlsx', 'csv', 'pdf']
    if (!supportedFormats.includes(format)) {
      return NextResponse.json(
        { error: `Unsupported format: ${format}` },
        { status: 400 }
      )
    }

    const timer = permanentLogger.timing('api.export.get')

    // Get user session using server client
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      timer.stop()
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    permanentLogger.breadcrumb('api', 'Export request', {
      userId: user.id,
      projectId,
      format,
      timestamp: Date.now()
    })

    // Use repositories instead of direct database access
    const projectsRepo = ProjectsRepository.getInstance()
    const teamRepo = TeamRepository.getInstance()
    const artifactsRepo = ArtifactsRepository.getInstance()

    // Fetch and verify project access
    const project = await projectsRepo.getProject(projectId)

    if (!project) {
      timer.stop()
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this project
    const hasAccess = project.owner_id === user.id ||
                      await teamRepo.isProjectMember(user.id, projectId)

    if (!hasAccess) {
      timer.stop()
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Fetch project data using repositories
    const tasksRepo = (await import('@/lib/repositories/tasks-repository')).TasksRepository.getInstance()
    const risksRepo = (await import('@/lib/repositories/risks-repository')).RisksRepository.getInstance()

    const [artifacts, tasks, risks] = await Promise.all([
      artifactsRepo.getProjectArtifacts(projectId),
      tasksRepo.getProjectTasks(projectId),
      risksRepo.getProjectRisks(projectId)
    ])

    // Generate export based on format
    let exportData: Buffer | string
    let contentType: string
    let filename: string

    switch (format) {
      case 'xlsx':
        const exporter = new ExcelExporter()
        exportData = await exporter.exportProjectPlan(
          project,
          tasks || [],
          risks || [],
          artifacts || []
        )
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}_project_plan.xlsx`
        break
      
      case 'csv':
        // Simple CSV export of tasks
        const csvRows = ['Task,Status,Priority,Due Date']
        tasks?.forEach(task => {
          csvRows.push(
            `"${task.title}","${task.status}","${task.priority || ''}","${task.due_date || ''}"`
          )
        })
        exportData = csvRows.join('\n')
        contentType = 'text/csv'
        filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}_tasks.csv`
        break
      
      case 'pdf':
        // For PDF, we'd use a library like pdfkit or puppeteer
        // For now, return a placeholder
        return NextResponse.json(
          { error: 'PDF export coming soon' },
          { status: 501 }
        )
      
      default:
        return NextResponse.json(
          { error: 'Format not implemented' },
          { status: 501 }
        )
    }

    // Log the export activity
    const activityRepo = (await import('@/lib/repositories/activity-log-repository')).ActivityLogRepository.getInstance()
    await activityRepo.logActivity({
      project_id: projectId,
      user_id: user.id,
      action: 'export',
      entity_type: 'project',
      entity_id: projectId,
      details: {
        format,
        artifactCount: artifacts.length,
        taskCount: tasks.length,
        riskCount: risks.length
      }
    })

    permanentLogger.info('API_EXPORT', 'Project exported', {
      projectId,
      userId: user.id,
      format,
      artifactCount: artifacts.length,
      taskCount: tasks.length,
      riskCount: risks.length
    })

    timer.stop()

    // Return file
    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_EXPORT', error as Error, {
      endpoint: 'GET /api/export/[format]',
      format
    })

    return NextResponse.json(
      {
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}