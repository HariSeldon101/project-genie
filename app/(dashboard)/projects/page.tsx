'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Folder, 
  Calendar, 
  Users, 
  FileText,
  MoreHorizontal,
  ArrowRight,
  Filter,
  ChevronRight,
  AlertCircle,
  Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { canCreateProject, getTierLimits, getProjectLimitMessage, type SubscriptionTier } from '@/lib/subscription/tier-limits'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface Project {
  id: string
  name: string
  description: string
  methodology_type: string
  stage: string
  status: string
  progress: number
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
  _count?: {
    artifacts: number
    risks: number
    project_members: number
  }
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [userTier, setUserTier] = useState<SubscriptionTier>('free')
  const [canCreateMore, setCanCreateMore] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const timer = permanentLogger.timing('ui.loadProjects')

    try {
      setLoading(true)

      permanentLogger.breadcrumb('ui', 'Loading projects', {
        timestamp: Date.now()
      })

      // Use API endpoint instead of direct database access
      const response = await fetch('/api/projects?withCounts=true')

      if (response.status === 401) {
        permanentLogger.breadcrumb('ui', 'User not authenticated', {})
        router.push('/login')
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load projects')
      }

      const projectsData = await response.json()

      // NO FALLBACK - if we get here, we have real data
      setProjects(projectsData)

      // Load profile via API
      const profileResponse = await fetch('/api/profiles/current')
      if (profileResponse.ok) {
        const profile = await profileResponse.json()
        const tier = (profile?.subscription_tier || 'free') as SubscriptionTier
        setUserTier(tier)
        setCanCreateMore(canCreateProject(projectsData.length, tier))
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('ui', 'Projects loaded', {
        count: projectsData.length,
        duration
      })

    } catch (error) {
      timer.stop()

      // NO FALLBACK DATA - show the error
      permanentLogger.captureError('UI_PROJECTS', error as Error, {
        component: 'ProjectsPage'
      })

      console.error('Error loading projects:', error)
      setProjects([]) // Empty, not mock data

    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    setIsDeleting(true)
    const timer = permanentLogger.timing('ui.deleteProject')

    try {
      permanentLogger.breadcrumb('ui', 'Deleting project', {
        projectId: projectToDelete.id,
        projectName: projectToDelete.name
      })

      // Use API endpoint for deletion - cascades handled by database
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete project')
      }

      // Remove from local state
      setProjects(projects.filter(p => p.id !== projectToDelete.id))

      // Close dialog
      setDeleteDialogOpen(false)
      setProjectToDelete(null)

      const duration = timer.stop()
      permanentLogger.breadcrumb('ui', 'Project deleted successfully', {
        projectId: projectToDelete.id,
        duration
      })

    } catch (error) {
      timer.stop()

      // NO FALLBACK - show real error
      permanentLogger.captureError('UI_PROJECTS', error as Error, {
        operation: 'deleteProject',
        projectId: projectToDelete.id
      })

      console.error('Failed to delete project:', error)
      alert(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'on_hold':
        return 'bg-yellow-500'
      case 'completed':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getMethodologyColor = (methodology: string) => {
    switch (methodology?.toLowerCase()) {
      case 'agile':
        return 'bg-purple-500'
      case 'prince2':
        return 'bg-blue-500'
      case 'waterfall':
        return 'bg-cyan-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your projects in one place
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {projects.length} / {getProjectLimitMessage(userTier)}
          </div>
          <Button 
            onClick={() => router.push('/projects/new')}
            disabled={!canCreateMore}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>
      
      {/* Project limit alert */}
      {!canCreateMore && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You've reached the project limit for your {userTier} tier. 
            <Button 
              variant="link" 
              className="px-1"
              onClick={() => router.push('/pricing')}
            >
              Upgrade your plan
            </Button>
            to create more projects.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {filterStatus === 'all' ? 'All Status' : filterStatus}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilterStatus('all')}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus('active')}>
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus('on_hold')}>
              On Hold
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus('completed')}>
              Completed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No projects found matching your search' : 'No projects yet'}
            </p>
            <Button onClick={() => router.push('/projects/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/projects/${project.id}`)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {project.description || 'No description'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/projects/${project.id}`)
                      }}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/projects/${project.id}/documents`)
                      }}>
                        View Documents
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/projects/${project.id}/settings`)
                      }}>
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation()
                          setProjectToDelete(project)
                          setDeleteDialogOpen(true)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary" className={`${getMethodologyColor(project.methodology_type)} text-white`}>
                    {project.methodology_type?.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {project.stage || 'Initiation'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{project.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span>{project._count?.artifacts || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{project._count?.project_members || 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{format(new Date(project.created_at), 'MMM d')}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(project.status || 'active')}`} />
                      <span className="text-sm capitalize">{project.status || 'Active'}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter(p => p.status === 'active' || !p.status).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.reduce((acc, p) => acc + (p._count?.artifacts || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.reduce((acc, p) => acc + (p._count?.project_members || 1), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Project"
        description={`Are you sure you want to delete "${projectToDelete?.name}"? This will permanently delete the project and ALL of its documents. This action cannot be undone.`}
        destructive={true}
        confirmText="Delete Project"
        cancelText="Cancel"
        onConfirm={handleDeleteProject}
        isLoading={isDeleting}
      />
    </div>
  )
}