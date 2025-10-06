import { NextRequest, NextResponse } from 'next/server'
import { ExcelExporter } from '@/lib/export/excel-exporter'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { format: string } }
) {
  try {
    const { format } = params
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

    // Get user session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    
    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this project
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()
    
    if (!member && project.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Fetch project data
    const [
      { data: tasks },
      { data: risks },
      { data: artifacts }
    ] = await Promise.all([
      supabase.from('tasks').select('*').eq('project_id', projectId),
      supabase.from('risks').select('*').eq('project_id', projectId),
      supabase.from('artifacts').select('*').eq('project_id', projectId)
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

    // Log export event
    await supabase
      .from('activity_log')
      .insert({
        project_id: projectId,
        user_id: user.id,
        action: 'export',
        entity_type: 'project',
        entity_id: projectId,
        details: { format }
      })

    // Return file
    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { 
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}