'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { DocumentGenerator } from '@/components/document-generator'
import { AnimatedBackgroundSubtle } from '@/components/animated-background-subtle'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function GenerateDocumentsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Record<string, unknown> | null>(null)
  const [projectData, setProjectData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadProject()
  }, [projectId, supabase])

  const loadProject = async () => {
    try {
      // Get project from database
      const { data: projectRecord, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      setProject(projectRecord)

      // Try to get project data from session (if coming from wizard)
      const storedData = sessionStorage.getItem(`project_data_${projectId}`)
      if (storedData) {
        setProjectData(JSON.parse(storedData))
        // Clean up session storage
        sessionStorage.removeItem(`project_data_${projectId}`)
      } else {
        // Reconstruct project data from database
        const { data: stakeholders } = await supabase
          .from('stakeholders')
          .select('*')
          .eq('project_id', projectId)

        const reconstructedData = {
          name: projectRecord.name,
          description: projectRecord.description,
          vision: projectRecord.vision,
          businessCase: projectRecord.business_case,
          methodology: projectRecord.methodology_type,
          companyWebsite: '', // Would need to be stored in project table
          sector: '', // Would need to be stored in project table
          stakeholders: stakeholders?.map(s => ({
            name: s.name,
            email: s.email || '',
            title: s.role || ''
          })) || []
        }
        setProjectData(reconstructedData)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading project:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const handleComplete = (documents: unknown[]) => {
    // After successful generation, redirect to project dashboard
    setTimeout(() => {
      router.push(`/projects/${projectId}`)
    }, 2000)
  }

  const skipGeneration = () => {
    router.push(`/projects/${projectId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackgroundSubtle />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackgroundSubtle />
        <div className="relative z-10 container mx-auto p-6">
          <Card className="backdrop-blur-md bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Error Loading Project</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackgroundSubtle />
      
      <div className="relative z-10 container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-6">
          <Card className="backdrop-blur-md bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl">
                Welcome to {project?.name}!
              </CardTitle>
              <CardDescription>
                Your project has been created successfully. Now let&apos;s generate your initial 
                project documents using AI.
              </CardDescription>
            </CardHeader>
          </Card>

          <DocumentGenerator
            projectId={projectId}
            projectData={projectData}
            onComplete={handleComplete}
          />

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={skipGeneration}
              className="text-white/50 hover:text-white/70"
            >
              Skip for now - I&apos;ll generate documents later
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}