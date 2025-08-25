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
import { DocumentViewer } from '@/components/document-viewer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Document {
  id: string
  type: string
  title: string
  content: any
  version: number
  created_by: string
  created_at: string
  updated_at: string
  project_id: string
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
  const [projects, setProjects] = useState<any[]>([])

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

      // Load all projects for the user
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, methodology_type')
        .eq('owner_id', user.user.id)

      setProjects(projectsData || [])

      // Load all documents across all projects
      const { data: docs, error } = await supabase
        .from('artifacts')
        .select(`
          *,
          project:projects!artifacts_project_id_fkey(id, name, methodology_type),
          creator:users!artifacts_created_by_fkey(full_name, email)
        `)
        .in('project_id', projectsData?.map(p => p.id) || [])
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(docs || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.project?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || doc.type === filterType
    const matchesProject = filterProject === 'all' || doc.project_id === filterProject
    return matchesSearch && matchesType && matchesProject
  })

  const exportDocument = async (doc: Document) => {
    try {
      const content = JSON.stringify(doc.content, null, 2)
      const blob = new Blob([content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.title.replace(/\s+/g, '_')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'charter': return <FileText className="h-5 w-5 text-blue-500" />
      case 'pid': return <FileText className="h-5 w-5 text-purple-500" />
      case 'backlog': return <FileSpreadsheet className="h-5 w-5 text-green-500" />
      case 'risk_register': return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'business_case': return <FileText className="h-5 w-5 text-orange-500" />
      case 'project_plan': return <Calendar className="h-5 w-5 text-indigo-500" />
      default: return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const documentTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'charter', label: 'Charter' },
    { value: 'pid', label: 'PID' },
    { value: 'backlog', label: 'Backlog' },
    { value: 'risk_register', label: 'Risk Register' },
    { value: 'business_case', label: 'Business Case' },
    { value: 'project_plan', label: 'Project Plan' }
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
            <Card key={doc.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getDocumentIcon(doc.type)}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{doc.title}</CardTitle>
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
                    <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{doc.creator?.full_name || 'AI Generated'}</span>
                  </div>
                  
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
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => exportDocument(doc)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
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
      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Document Viewer</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <DocumentViewer
              document={{
                id: selectedDoc.id,
                type: selectedDoc.type,
                content: selectedDoc.content,
                title: selectedDoc.title,
                status: 'generated',
                metadata: {
                  created_at: selectedDoc.created_at,
                  updated_at: selectedDoc.updated_at,
                  version: selectedDoc.version.toString(),
                  author: selectedDoc.creator?.full_name || 'AI Generated',
                  projectName: selectedDoc.project?.name,
                  companyName: 'Your Company', // You might want to fetch this from project data
                }
              }}
              onRefresh={() => {
                // Optionally implement document regeneration
                console.log('Regenerate document:', selectedDoc.id)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}