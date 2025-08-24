'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FolderOpen, Users, AlertCircle, TrendingUp, Clock, Target } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string
  methodology_type: string
  status: string
  progress: number
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Load projects (simplified query like projects page)
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading projects:', error)
      } else {
        console.log(`Dashboard: Loaded ${projectsData?.length || 0} projects for user ${currentUser.id}`)
        setProjects(projectsData || [])
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'text-green-600 bg-green-50'
      case 'at_risk':
        return 'text-amber-600 bg-amber-50'
      case 'delayed':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getMethodologyColor = (methodology: string) => {
    switch (methodology) {
      case 'agile':
        return 'bg-blue-100 text-blue-800'
      case 'waterfall':
        return 'bg-purple-100 text-purple-800'
      case 'hybrid':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Calculate statistics
  const stats = {
    total: projects.length,
    onTrack: projects.filter(p => p.status === 'on_track').length,
    atRisk: projects.filter(p => p.status === 'at_risk').length,
    delayed: projects.filter(p => p.status === 'delayed').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your projects and documentation with AI-powered assistance
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Active projects</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.onTrack}</div>
            <p className="text-xs text-muted-foreground">Projects on schedule</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.atRisk}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.delayed}</div>
            <p className="text-xs text-muted-foreground">Behind schedule</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Section */}
      {projects.length === 0 ? (
        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20">
          <CardHeader className="text-center py-12">
            <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
              <FolderOpen className="h-full w-full" />
            </div>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              Create your first project to get started with AI-powered documentation generation. 
              Projects help you manage requirements, track progress, and generate professional documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-12">
            <Link href="/projects/new">
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Projects
            </h3>
            <div className="flex gap-2">
              <Link href="/projects">
                <Button variant="outline">
                  View All
                </Button>
              </Link>
              <Link href="/projects/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20 hover:shadow-lg transition-all cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {project.description || 'No description provided'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Badge className={getMethodologyColor(project.methodology_type)}>
                        {project.methodology_type}
                      </Badge>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {project.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      Updated {new Date(project.updated_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/projects/new">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
            <Link href="/documents">
              <Button variant="outline" className="w-full justify-start">
                <FolderOpen className="mr-2 h-4 w-4" />
                Documents
              </Button>
            </Link>
            <Link href="/team">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Team
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline" className="w-full justify-start">
                <Target className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}