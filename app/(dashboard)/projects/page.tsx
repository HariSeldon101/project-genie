'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
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
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        router.push('/login')
        return
      }

      // Get user profile to check subscription tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.user.id)
        .single()

      const tier = (profile?.subscription_tier || 'free') as SubscriptionTier
      setUserTier(tier)

      // Load projects first (without complex joins)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.user.id)
        .order('created_at', { ascending: false })

      if (projectsError) {
        console.error('Error loading projects:', {
          message: projectsError.message,
          code: projectsError.code,
          details: projectsError.details
        })
        setProjects([])
        setCanCreateMore(canCreateProject(0, tier))
        return
      }

      console.log(`Projects page: Loaded ${projectsData?.length || 0} projects for user ${user.user.id}`)

      // Get counts for each project separately
      const projectsWithCounts = []
      
      for (const project of (projectsData || [])) {
        // Get counts for each project
        const [artifactsResult, membersResult] = await Promise.all([
          supabase
            .from('artifacts')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', project.id),
          supabase
            .from('project_members')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', project.id)
        ])
        
        projectsWithCounts.push({
          ...project,
          _count: {
            artifacts: artifactsResult.count || 0,
            risks: 0, // Risks table doesn't exist
            project_members: membersResult.count || 0
          }
        })
      }

      setProjects(projectsWithCounts)
      
      // Check if user can create more projects
      const projectCount = projectsWithCounts?.length || 0
      setCanCreateMore(canCreateProject(projectCount, tier))
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return
    
    setIsDeleting(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Delete all documents (artifacts) first
      const { error: artifactsError } = await supabase
        .from('artifacts')
        .delete()
        .eq('project_id', projectToDelete.id)

      if (artifactsError) {
        console.error('Error deleting project documents:', artifactsError)
        throw artifactsError
      }

      // Delete the project
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.id)

      if (projectError) {
        console.error('Error deleting project:', projectError)
        throw projectError
      }

      // Remove from local state
      setProjects(projects.filter(p => p.id !== projectToDelete.id))
      
      // Close dialog
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert('Failed to delete project. Please try again.')
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