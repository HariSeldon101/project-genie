'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  AlertTriangle,
  Clock,
  Activity,
  PieChart,
  Calendar,
  Target,
  Zap,
  CheckCircle
} from 'lucide-react'
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns'

interface AnalyticsData {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalDocuments: number
  totalRisks: number
  highRisks: number
  totalTasks: number
  completedTasks: number
  teamMembers: number
  methodologyBreakdown: { name: string; count: number }[]
  documentGenerationTrend: { date: string; count: number }[]
  projectProgress: { name: string; progress: number }[]
  riskTrend: { date: string; count: number; high: number }[]
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d')
  const [data, setData] = useState<AnalyticsData>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalDocuments: 0,
    totalRisks: 0,
    highRisks: 0,
    totalTasks: 0,
    completedTasks: 0,
    teamMembers: 0,
    methodologyBreakdown: [],
    documentGenerationTrend: [],
    projectProgress: [],
    riskTrend: []
  })

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

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

      // Fetch all data
      const [
        { data: projects },
        { data: documents },
        { data: risks },
        { data: tasks },
        { data: members }
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('owner_id', user.user.id),
        supabase.from('artifacts').select('*, project:projects!inner(owner_id)').eq('project.owner_id', user.user.id),
        supabase.from('risks').select('*, project:projects!inner(owner_id)').eq('project.owner_id', user.user.id),
        supabase.from('tasks').select('*, project:projects!inner(owner_id)').eq('project.owner_id', user.user.id),
        supabase.from('project_members').select('*, project:projects!inner(owner_id)').eq('project.owner_id', user.user.id)
      ])

      // Calculate metrics
      const activeProjects = projects?.filter(p => p.status !== 'completed').length || 0
      const completedProjects = projects?.filter(p => p.status === 'completed').length || 0
      const highRisks = risks?.filter(r => r.impact === 'high' || r.impact === 'very_high').length || 0
      const completedTasks = tasks?.filter(t => t.status === 'done').length || 0

      // Methodology breakdown
      const methodologyBreakdown = projects?.reduce((acc: any[], project) => {
        const existing = acc.find(m => m.name === project.methodology_type)
        if (existing) {
          existing.count++
        } else {
          acc.push({ name: project.methodology_type, count: 1 })
        }
        return acc
      }, []) || []

      // Document generation trend (mock data for demo)
      const documentGenerationTrend = Array.from({ length: 7 }, (_, i) => ({
        date: format(subDays(new Date(), 6 - i), 'MMM dd'),
        count: Math.floor(Math.random() * 10) + 1
      }))

      // Project progress
      const projectProgress = projects?.slice(0, 5).map(p => ({
        name: p.name,
        progress: p.progress || Math.floor(Math.random() * 100)
      })) || []

      // Risk trend (mock data for demo)
      const riskTrend = Array.from({ length: 7 }, (_, i) => ({
        date: format(subDays(new Date(), 6 - i), 'MMM dd'),
        count: Math.floor(Math.random() * 5) + 1,
        high: Math.floor(Math.random() * 2)
      }))

      setData({
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
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const completionRate = data.totalTasks > 0 
    ? Math.round((data.completedTasks / data.totalTasks) * 100) 
    : 0

  const riskLevel = data.highRisks > 5 ? 'High' : data.highRisks > 2 ? 'Medium' : 'Low'
  const riskColor = riskLevel === 'High' ? 'text-red-500' : riskLevel === 'Medium' ? 'text-yellow-500' : 'text-green-500'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your project management performance and insights
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.activeProjects} active, {data.completedProjects} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Documents Generated</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDocuments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.completedTasks} of {data.totalTasks} tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${riskColor}`}>{riskLevel}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.highRisks} high priority risks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Methodology Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Methodology Distribution</CardTitle>
                <CardDescription>Projects by methodology type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.methodologyBreakdown.map((method, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium capitalize">{method.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(method.count / data.totalProjects) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{method.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Project Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
                <CardDescription>Top 5 active projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.projectProgress.map((project, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium truncate">{project.name}</span>
                        <span className="text-muted-foreground">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Document Generation Activity</CardTitle>
              <CardDescription>Documents created over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {data.documentGenerationTrend.map((day, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-muted rounded-t flex-1 relative">
                      <div 
                        className="absolute bottom-0 w-full bg-primary rounded-t transition-all"
                        style={{ height: `${(day.count / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{day.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Analytics</CardTitle>
              <CardDescription>Detailed project metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{data.activeProjects}</div>
                  <p className="text-sm text-muted-foreground">Active Projects</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{data.completedProjects}</div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{completionRate}%</div>
                  <p className="text-sm text-muted-foreground">Avg Completion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Generation Stats</CardTitle>
              <CardDescription>AI-powered document creation metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm font-medium">Total Documents</span>
                  <span className="text-2xl font-bold">{data.totalDocuments}</span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm font-medium">Avg per Project</span>
                  <span className="text-2xl font-bold">
                    {data.totalProjects > 0 ? Math.round(data.totalDocuments / data.totalProjects) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm font-medium">This Week</span>
                  <span className="text-2xl font-bold">
                    {data.documentGenerationTrend.reduce((sum, day) => sum + day.count, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Analysis</CardTitle>
              <CardDescription>Risk trends and distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{data.highRisks}</div>
                    <p className="text-sm text-muted-foreground">High Priority</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{data.totalRisks - data.highRisks}</div>
                    <p className="text-sm text-muted-foreground">Medium/Low</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{data.totalRisks}</div>
                    <p className="text-sm text-muted-foreground">Total Risks</p>
                  </div>
                </div>

                {/* Risk Trend Chart */}
                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-3">Risk Trend</h4>
                  <div className="flex items-end gap-2 h-24">
                    {data.riskTrend.map((day, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-muted rounded-t flex-1 relative">
                          <div 
                            className="absolute bottom-0 w-full bg-yellow-500 rounded-t"
                            style={{ height: `${(day.count / 5) * 100}%` }}
                          />
                          <div 
                            className="absolute bottom-0 w-full bg-red-500 rounded-t"
                            style={{ height: `${(day.high / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{day.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Team collaboration metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{data.teamMembers}</div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Activity className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {data.totalProjects > 0 ? Math.round(data.teamMembers / data.totalProjects) : 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Avg per Project</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <CheckCircle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {data.teamMembers > 0 ? Math.round(data.completedTasks / data.teamMembers) : 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Tasks per Member</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}