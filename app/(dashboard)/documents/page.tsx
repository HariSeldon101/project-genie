'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Download, 
  Eye, 
  Search,
  Filter,
  Calendar,
  User,
  Folder,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DocumentViewer } from '@/components/documents/document-viewer'
import { ResizableModal } from '@/components/ui/resizable-modal'

interface Document {
  id: string
  type: string
  title: string
  content: Record<string, unknown>
  version: number
  created_by: string
  created_at: string
  updated_at: string
  project_id: string
  // Generation metadata
  generation_provider?: string
  generation_model?: string
  generation_tokens?: number
  generation_cost?: number
  generation_time_ms?: number
  generation_reasoning_level?: string
  generation_temperature?: number
  generation_max_tokens?: number
  generation_input_tokens?: number
  generation_output_tokens?: number
  generation_reasoning_tokens?: number
  // Relations
  project?: {
    id: string
    name: string
    methodology_type: string
  }
  creator?: {
    full_name: string
    email: string
  }
}


export default function AllDocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterProject, setFilterProject] = useState('all')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [currentUser, setCurrentUser] = useState<{ firstName: string; fullName: string } | null>(null)
  
  // Development mode flag - disable caching during development
  const isDevelopment = process.env.NODE_ENV === 'development'

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
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

      // Get user profile for display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user.id)
        .single()

      const fullName = profile?.full_name || user.user.user_metadata?.full_name || user.user.email?.split('@')[0] || 'User'
      const firstName = fullName.split(' ')[0]
      setCurrentUser({ firstName, fullName })

      // Load all projects for the user
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, methodology_type')
        .eq('owner_id', user.user.id)

      if (projectsError) {
        console.error('[AllDocuments] Error loading projects:', {
          message: projectsError.message,
          code: projectsError.code,
          details: projectsError.details,
          hint: projectsError.hint,
          fullError: JSON.stringify(projectsError)
        })
        setProjects([])
        setDocuments([])
        return
      }

      console.log('[AllDocuments] Loaded projects:', projectsData?.length || 0)
      console.log('[AllDocuments] Project IDs:', projectsData?.map(p => p.id) || [])
      setProjects(projectsData || [])

      // Load all documents across all projects
      // Use separate queries to avoid join issues
      let transformedDocs: any[] = []
      
      if (projectsData && projectsData.length > 0) {
        console.log('[AllDocuments] Querying artifacts for project IDs:', projectsData.map(p => p.id))
        
        // Use simple query without join
        const { data: docs, error } = await supabase
          .from('artifacts')
          .select('*')
          .in('project_id', projectsData.map(p => p.id))
          .order('created_at', { ascending: false })
        
        console.log('[AllDocuments] Query result:', { 
          success: !error, 
          count: docs?.length || 0,
          error: error,
          projectIds: projectsData.map(p => p.id),
          documents: docs 
        })

        if (error) {
          console.error('[AllDocuments] Error loading documents:', error)
          setDocuments([])
          return
        }
        
        // Create a project map for quick lookup
        const projectMap = Object.fromEntries(
          projectsData.map(p => [p.id, p])
        )
        
        // Get creator profiles for documents
        const creatorIds = [...new Set(docs?.map(doc => doc.created_by).filter(Boolean))]
        let profilesMap: Record<string, any> = {}
        
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', creatorIds)
          
          if (profiles) {
            profilesMap = Object.fromEntries(
              profiles.map(p => [p.id, p])
            )
          }
        }

        // Transform data to match expected structure
        transformedDocs = (docs || []).map(doc => ({
          ...doc,
          project: projectMap[doc.project_id] || null,
          creator: profilesMap[doc.created_by] || { 
            full_name: fullName || 'User', // Use the logged-in user's name
            email: user.user.email 
          }
        }))
      }

      console.log('[AllDocuments] Loaded documents:', transformedDocs.length)
      if (transformedDocs.length > 0) {
        console.log('[AllDocuments] Sample doc metadata:', {
          type: transformedDocs[0].type,
          model: transformedDocs[0].generation_model,
          tokens: transformedDocs[0].generation_tokens,
          cost: transformedDocs[0].generation_cost,
          time_ms: transformedDocs[0].generation_time_ms
        })
      }
      
      setDocuments(transformedDocs)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  // Define document type order for sorting
  const documentTypeOrder = [
    'pid',
    'business_case', 
    'project_plan',
    'risk_register',
    'communication_plan',
    'quality_management',
    'comparable_projects',
    'technical_landscape',
    'charter',
    'backlog'
  ]

  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.project?.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'all' || doc.type === filterType
      const matchesProject = filterProject === 'all' || doc.project_id === filterProject
      return matchesSearch && matchesType && matchesProject
    })
    .sort((a, b) => {
      // First sort by document type order
      const aIndex = documentTypeOrder.indexOf(a.type)
      const bIndex = documentTypeOrder.indexOf(b.type)
      if (aIndex !== -1 && bIndex !== -1 && aIndex !== bIndex) {
        return aIndex - bIndex
      }
      // Then by created date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const exportDocument = async (doc: Document, format: 'json' | 'markdown' | 'pdf' = 'json') => {
    try {
      if (format === 'pdf') {
        console.log('📥 Exporting PDF for document:', {
          type: doc.type,
          id: doc.id,
          projectName: doc.project?.name
        })
        
        // Use new PDF generation API
        const requestBody = {
          documentType: doc.type, // Already in correct format from DB
          content: doc.content,
          projectName: doc.project?.name || 'Project',  // Use actual project name, not document title
          companyName: 'Your Company',
          options: {
            pageNumbers: true,
            watermarkText: 'Project Genie',
            useCache: !isDevelopment, // Disable caching during development
            forceRegenerate: isDevelopment // Always regenerate during development
          },
          artifactId: doc.id
        }
        
        console.log('📤 Sending PDF request:', requestBody)
        
        const response = await fetch('/api/pdf/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify(requestBody)
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ PDF generation error:', errorData)
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        
        // Get the PDF blob
        const blob = await response.blob()
        console.log('✅ PDF blob received, size:', blob.size)
        
        // Create download link with cleaner filename
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        // Create filename like: "project-name-pid.pdf" or "project-name-business-case.pdf"
        const projectSlug = (doc.project?.name || 'project').replace(/[^a-z0-9]/gi, '-').toLowerCase()
        const docTypeSlug = doc.type.replace(/[^a-z0-9]/gi, '-').toLowerCase()
        link.download = `${projectSlug}-${docTypeSlug}.pdf`
        
        // Trigger download
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up
        URL.revokeObjectURL(url)
        return
      }

      let content: string
      let mimeType: string
      let extension: string

      if (format === 'markdown') {
        // Format the document as markdown
        const formattedContent = await formatDocumentAsMarkdown(doc)
        content = formattedContent
        mimeType = 'text/markdown'
        extension = 'md'
      } else {
        // JSON export
        content = JSON.stringify(doc.content, null, 2)
        mimeType = 'application/json'
        extension = 'json'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.title.replace(/\s+/g, '_')}.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      // Show user-friendly error message
      alert(`Failed to export document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const formatDocumentAsMarkdown = async (doc: Document): Promise<string> => {
    let content = doc.content
    
    // Parse content if it's a string
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content)
      } catch (e) {
        // If parsing fails, return as is
        return content
      }
    }

    // Add metadata header
    let markdown = `# ${doc.title}\n\n`
    markdown += `**Type:** ${doc.type}\n`
    markdown += `**Project:** ${doc.project?.name || 'Unknown'}\n`
    markdown += `**Version:** v${doc.version}\n`
    markdown += `**Created:** ${format(new Date(doc.created_at), 'MMMM d, yyyy, h:mm a')}\n`
    markdown += `**Updated:** ${format(new Date(doc.updated_at), 'MMMM d, yyyy, h:mm a')}\n\n`
    
    // Add generation metadata if available
    if (doc.generation_model) {
      markdown += `**Model:** ${doc.generation_model}\n`
    }
    if (doc.generation_cost) {
      markdown += `**Generation Cost:** $${doc.generation_cost.toFixed(4)}\n`
    }
    
    markdown += `\n---\n\n`

    // For now, just output the content as formatted JSON
    // This avoids the webpack issues with dynamic imports
    markdown += `## Document Content\n\n`
    
    // Try to format the content nicely
    if (typeof content === 'object' && content !== null) {
      // Extract key sections if they exist
      const sections = ['projectDefinition', 'businessJustification', 'projectPlan', 'risks', 'deliverables', 'scope', 'objectives', 'stakeholders']
      
      for (const section of sections) {
        if (content[section]) {
          markdown += `### ${section.charAt(0).toUpperCase() + section.slice(1).replace(/([A-Z])/g, ' $1')}\n\n`
          
          if (typeof content[section] === 'string') {
            markdown += content[section] + '\n\n'
          } else {
            markdown += '```json\n' + JSON.stringify(content[section], null, 2) + '\n```\n\n'
          }
        }
      }
      
      // Add any remaining content
      const handledSections = new Set(sections)
      const remainingKeys = Object.keys(content).filter(k => !handledSections.has(k))
      
      if (remainingKeys.length > 0) {
        markdown += `### Additional Information\n\n`
        markdown += '```json\n'
        const remaining = {}
        for (const key of remainingKeys) {
          remaining[key] = content[key]
        }
        markdown += JSON.stringify(remaining, null, 2)
        markdown += '\n```\n'
      }
    } else {
      // Fallback to raw content
      markdown += '```\n' + String(content) + '\n```'
    }

    return markdown
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'pid': return <FileText className="h-5 w-5 text-purple-500" />
      case 'business_case': return <FileText className="h-5 w-5 text-orange-500" />
      case 'project_plan': return <Calendar className="h-5 w-5 text-indigo-500" />
      case 'risk_register': return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'communication_plan': return <User className="h-5 w-5 text-amber-500" />
      case 'quality_management': return <FileText className="h-5 w-5 text-teal-500" />
      case 'comparable_projects': return <FileText className="h-5 w-5 text-pink-500" />
      case 'technical_landscape': return <FileText className="h-5 w-5 text-cyan-500" />
      case 'charter': return <FileText className="h-5 w-5 text-blue-500" />
      case 'backlog': return <FileSpreadsheet className="h-5 w-5 text-green-500" />
      case 'sprint_plan': return <Calendar className="h-5 w-5 text-violet-500" />
      default: return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getDocumentGradient = (type: string) => {
    switch (type) {
      case 'pid': return 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10'
      case 'business_case': return 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10'
      case 'project_plan': return 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/10'
      case 'risk_register': return 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10'
      case 'communication_plan': return 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10'
      case 'quality_management': return 'bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/20 dark:to-teal-900/10'
      case 'comparable_projects': return 'bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-950/20 dark:to-pink-900/10'
      case 'technical_landscape': return 'bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/20 dark:to-cyan-900/10'
      case 'charter': return 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10'
      case 'backlog': return 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10'
      case 'sprint_plan': return 'bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/20 dark:to-violet-900/10'
      default: return 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950/20 dark:to-gray-900/10'
    }
  }

  const getDocumentTypeName = (type: string): string => {
    switch (type) {
      case 'pid': return 'Project Initiation Document'
      case 'business_case': return 'Business Case'
      case 'project_plan': return 'Project Plan'
      case 'risk_register': return 'Risk Register'
      case 'communication_plan': return 'Communication Plan'
      case 'quality_management': return 'Quality Management'
      case 'comparable_projects': return 'Comparable Projects'
      case 'technical_landscape': return 'Technical Landscape'
      case 'charter': return 'Project Charter'
      case 'backlog': return 'Product Backlog'
      case 'sprint_plan': return 'Sprint Plan'
      default: return 'Project Document'
    }
  }

  const documentTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'pid', label: 'PID' },
    { value: 'business_case', label: 'Business Case' },
    { value: 'project_plan', label: 'Project Plan' },
    { value: 'risk_register', label: 'Risk Register' },
    { value: 'communication_plan', label: 'Communication Plan' },
    { value: 'quality_management', label: 'Quality Management' },
    { value: 'comparable_projects', label: 'Comparable Projects' },
    { value: 'technical_landscape', label: 'Technical Landscape' },
    { value: 'charter', label: 'Charter' },
    { value: 'backlog', label: 'Backlog' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">All Documents</h1>
          <p className="text-muted-foreground mt-1">
            View and manage documents across all your projects
          </p>
        </div>
        <Button variant="outline" onClick={loadDocuments}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Version</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              v{Math.max(...documents.map(d => d.version), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {documents.length > 0 
                ? format(new Date(documents[0].updated_at), 'MMM d')
                : 'No documents'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents or projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {documentTypes.find(t => t.value === filterType)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {documentTypes.map(type => (
              <DropdownMenuItem key={type.value} onClick={() => setFilterType(type.value)}>
                {type.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Folder className="mr-2 h-4 w-4" />
              {filterProject === 'all' ? 'All Projects' : projects.find(p => p.id === filterProject)?.name}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilterProject('all')}>
              All Projects
            </DropdownMenuItem>
            {projects.map(project => (
              <DropdownMenuItem key={project.id} onClick={() => setFilterProject(project.id)}>
                {project.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterType !== 'all' || filterProject !== 'all' 
                ? 'No documents found matching your filters' 
                : 'No documents yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(doc => (
            <Card key={doc.id} className={`hover:shadow-lg transition-all overflow-hidden ${getDocumentGradient(doc.type)}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getDocumentIcon(doc.type)}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{getDocumentTypeName(doc.type)}</CardTitle>
                      <CardDescription>
                        <Link href={`/projects/${doc.project_id}`} className="hover:underline">
                          {doc.project?.name}
                        </Link>
                        {' • '}
                        v{doc.version}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(doc.created_at), 'MMM d, yyyy, h:mm a')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{doc.creator?.full_name || currentUser?.firstName || 'User'}</span>
                  </div>

                  {/* Generation Metadata */}
                  {(doc.generation_model || doc.generation_tokens || doc.generation_cost) && (
                    <div className="bg-muted/50 rounded-lg p-2 mt-2 space-y-1">
                      {doc.generation_model && (
                        <div className="text-xs flex justify-between">
                          <span className="text-muted-foreground">Model:</span>
                          <span className="font-mono">{doc.generation_model}</span>
                        </div>
                      )}
                      {doc.generation_provider && (
                        <div className="text-xs flex justify-between">
                          <span className="text-muted-foreground">Provider:</span>
                          <span>{doc.generation_provider}</span>
                        </div>
                      )}
                      {/* Token Breakdown */}
                      {(doc.generation_input_tokens || doc.generation_output_tokens || doc.generation_reasoning_tokens || doc.generation_tokens) && (
                        <>
                          {doc.generation_input_tokens && (
                            <div className="text-xs flex justify-between">
                              <span className="text-muted-foreground">Input Tokens:</span>
                              <span className="font-mono">{doc.generation_input_tokens.toLocaleString()}</span>
                            </div>
                          )}
                          {doc.generation_output_tokens && (
                            <div className="text-xs flex justify-between">
                              <span className="text-muted-foreground">Output Tokens:</span>
                              <span className="font-mono">{doc.generation_output_tokens.toLocaleString()}</span>
                            </div>
                          )}
                          {doc.generation_reasoning_tokens > 0 && (
                            <div className="text-xs flex justify-between">
                              <span className="text-muted-foreground">Reasoning Tokens:</span>
                              <span className="font-mono">{doc.generation_reasoning_tokens.toLocaleString()}</span>
                            </div>
                          )}
                          {doc.generation_tokens && (
                            <div className="text-xs flex justify-between border-t pt-1">
                              <span className="text-muted-foreground font-semibold">Total:</span>
                              <span className="font-mono font-semibold">{doc.generation_tokens.toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      )}
                      {/* Prompt Parameters */}
                      {doc.generation_reasoning_level && (
                        <div className="text-xs flex justify-between">
                          <span className="text-muted-foreground">Reasoning:</span>
                          <span className="font-mono">{doc.generation_reasoning_level}</span>
                        </div>
                      )}
                      {doc.generation_temperature !== undefined && (
                        <div className="text-xs flex justify-between">
                          <span className="text-muted-foreground">Temperature:</span>
                          <span className="font-mono">{doc.generation_temperature}</span>
                        </div>
                      )}
                      {doc.generation_max_tokens && (
                        <div className="text-xs flex justify-between">
                          <span className="text-muted-foreground">Max Tokens:</span>
                          <span className="font-mono">{doc.generation_max_tokens.toLocaleString()}</span>
                        </div>
                      )}
                      {doc.generation_cost && (
                        <div className="text-xs flex justify-between border-t pt-1">
                          <span className="text-muted-foreground font-semibold">Cost:</span>
                          <span className="font-mono font-semibold">${doc.generation_cost.toFixed(4)}</span>
                        </div>
                      )}
                      {doc.generation_time_ms && (
                        <div className="text-xs flex justify-between">
                          <span className="text-muted-foreground">Gen Time:</span>
                          <span>{(doc.generation_time_ms / 1000).toFixed(1)}s</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-3 border-t mt-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => exportDocument(doc, 'markdown')}>
                          <FileText className="h-4 w-4 mr-2" />
                          Download as Markdown
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportDocument(doc, 'pdf')}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Download as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportDocument(doc, 'json')}>
                          <FileText className="h-4 w-4 mr-2" />
                          Download as JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/projects/${doc.project_id}/documents`)}
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      Project
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
      <ResizableModal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc ? getDocumentTypeName(selectedDoc.type) : undefined}
        defaultWidth={window.innerWidth * 0.85}
        defaultHeight={window.innerHeight * 0.85}
        minWidth={600}
        minHeight={400}
      >
        {selectedDoc && (
          <DocumentViewer
            document={{
              ...selectedDoc,
              project: selectedDoc.project || {
                name: 'Unknown Project',
                methodology_type: 'agile'
              }
            }}
            onClose={() => setSelectedDoc(null)}
            currentUser={currentUser || undefined}
          />
        )}
      </ResizableModal>
    </div>
  )
}