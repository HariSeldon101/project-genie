import { getUser } from '@/lib/auth/auth-helpers'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FolderOpen, Users, AlertCircle } from 'lucide-react'
import Link from 'next/link'

async function getProjects(userId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .or(`owner_id.eq.${userId},id.in.(select project_id from project_members where user_id='${userId}')`)
    .order('created_at', { ascending: false })

  return projects || []
}

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) return null

  const projects = await getProjects(user.id)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your projects and documentation with AI-powered assistance
        </p>
      </div>

      {projects.length === 0 ? (
        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20">
          <CardHeader className="text-center py-12">
            <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
              <FolderOpen className="h-full w-full" />
            </div>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>
              Create your first project to get started with automated documentation
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
              Your Projects
            </h3>
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {project.methodology_type.charAt(0).toUpperCase() + project.methodology_type.slice(1)}
                        </CardDescription>
                      </div>
                      <div className={`h-3 w-3 rounded-full ${
                        project.rag_status === 'green' ? 'bg-green-500' :
                        project.rag_status === 'amber' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {project.description || 'No description provided'}
                    </p>
                    <div className="mt-4 flex items-center text-xs text-gray-500">
                      <Users className="mr-1 h-3 w-3" />
                      <span>Team Project</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20">
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-gray-500">Active Projects</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20">
          <CardHeader>
            <CardTitle className="text-base font-medium">At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {projects.filter(p => p.rag_status === 'amber').length}
            </div>
            <p className="text-xs text-gray-500">Projects need attention</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20">
          <CardHeader>
            <CardTitle className="text-base font-medium">On Track</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {projects.filter(p => p.rag_status === 'green').length}
            </div>
            <p className="text-xs text-gray-500">Projects running smoothly</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}