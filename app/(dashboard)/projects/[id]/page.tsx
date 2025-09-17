'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Users, 
  FileText,
  Activity,
  Target,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'

interface Project {
  id: string
  name: string
  description: string
  methodology_type: string
  stage: string
  status: string
  start_date: string
  end_date: string
  progress: number
  created_at: string
  updated_at: string
}

interface Stats {
  totalDocuments: number
  totalRisks: number
  teamMembers: number
  completedTasks: number
  totalTasks: number
  daysRemaining: number
}

export default function ProjectOverviewPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    totalRisks: 0,
    teamMembers: 0,
    completedTasks: 0,
    totalTasks: 0,
    daysRemaining: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Load project details
      const { data: projectData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      setProject(projectData)

      // Load stats
      const [docsResult, risksResult, teamResult] = await Promise.all([
        supabase.from('artifacts').select('id').eq('project_id', projectId),
        supabase.from('risks').select('id').eq('project_id', projectId),
        supabase.from('project_members').select('id').eq('project_id', projectId)
      ])

      const endDate = projectData.end_date ? new Date(projectData.end_date) : new Date()
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

      setStats({
        totalDocuments: docsResult.data?.length || 0,
        totalRisks: risksResult.data?.length || 0,
        teamMembers: teamResult.data?.length || 1,
        completedTasks: projectData.progress || 0,
        totalTasks: 100,
        daysRemaining
      })
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground mt-1">{project.description}</p>
          <div className="flex gap-2 mt-3">
            <Badge>{project.methodology_type?.toUpperCase()}</Badge>
            <Badge variant="outline">{project.stage || 'Initiation'}</Badge>
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
              {project.status || 'Active'}
            </Badge>
          </div>
        </div>
        <Button>
          <Activity className="mr-2 h-4 w-4" />
          View Activity
        </Button>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
          <CardDescription>Overall completion status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{project.progress || 0}%</span>
            </div>
            <Progress value={project.progress || 0} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Days Remaining</p>
                <p className="font-medium">{stats.daysRemaining} days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground mt-1">Project artifacts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Risks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRisks}</div>
            <p className="text-xs text-muted-foreground mt-1">Identified risks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Team</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">Team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.completedTasks}/{stats.totalTasks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common project management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => window.location.href = `/projects/${projectId}/documents`}>
              <FileText className="h-5 w-5 mb-2" />
              <span className="text-xs">View Documents</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => window.location.href = `/projects/${projectId}/generate`}>
              <TrendingUp className="h-5 w-5 mb-2" />
              <span className="text-xs">Generate Docs</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => window.location.href = `/projects/${projectId}/risks`}>
              <AlertTriangle className="h-5 w-5 mb-2" />
              <span className="text-xs">Manage Risks</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => window.location.href = `/projects/${projectId}/team`}>
              <Users className="h-5 w-5 mb-2" />
              <span className="text-xs">Team Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest project updates and changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Documents generated</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalDocuments} documents created • Just now
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Project created</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(project.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}