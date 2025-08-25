'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Download, 
  Eye, 
  Edit3, 
  Trash2, 
  RefreshCw,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  FilePlus
} from 'lucide-react'
import { format } from 'date-fns'

interface Document {
  id: string
  type: string
  title: string
  content: any
  version: number
  created_by: string
  created_at: string
  updated_at: string
  project?: {
    name: string
    methodology_type: string
  }
  creator?: {
    full_name: string
    email: string
  }
}

export default function DocumentsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [project, setProject] = useState<any>(null)

  useEffect(() => {
    loadDocuments()
  }, [projectId])

  const loadDocuments = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Load project details
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      setProject(projectData)

      // Load documents (simplified query without join)
      const { data: docs, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(docs || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportDocument = async (doc: Document, format: 'json' | 'pdf' | 'xlsx') => {
    try {
      const content = JSON.stringify(doc.content, null, 2)
      const blob = new Blob([content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.title.replace(/\s+/g, '_')}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const regenerateDocument = async (docType: string) => {
    // Trigger regeneration for a specific document type
    console.log('Regenerating:', docType)
    // Implementation would call the generate API with specific document type
  }

  const deleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase
        .from('artifacts')
        .delete()
        .eq('id', docId)

      if (!error) {
        setDocuments(docs => docs.filter(d => d.id !== docId))
        if (selectedDoc?.id === docId) setSelectedDoc(null)
      }
    } catch (error) {
      console.error('Delete error:', error)
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

  const getDocumentsByType = (type: string) => {
    if (type === 'all') return documents
    return documents.filter(doc => doc.type === type)
  }

  const documentTypes = ['all', 'charter', 'pid', 'backlog', 'risk_register', 'business_case', 'project_plan']

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
          <h1 className="text-3xl font-bold">Project Documents</h1>
          <p className="text-muted-foreground mt-1">
            {project?.name} • {project?.methodology_type?.toUpperCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = `/projects/${projectId}/generate`}>
            <FilePlus className="mr-2 h-4 w-4" />
            Generate New
          </Button>
          <Button variant="outline" onClick={loadDocuments}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
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
                ? format(new Date(documents[0].updated_at), 'MMM d, yyyy')
                : 'No documents'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">DeepSeek Active</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Document Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full">
          {documentTypes.map(type => (
            <TabsTrigger key={type} value={type} className="capitalize">
              {type.replace('_', ' ')}
            </TabsTrigger>
          ))}
        </TabsList>

        {documentTypes.map(type => (
          <TabsContent key={type} value={type} className="space-y-4">
            {getDocumentsByType(type).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No {type === 'all' ? '' : type.replace('_', ' ')} documents found</p>
                  <Button 
                    className="mt-4" 
                    variant="outline"
                    onClick={() => window.location.href = `/projects/${projectId}/generate`}
                  >
                    Generate Documents
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getDocumentsByType(type).map(doc => (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getDocumentIcon(doc.type)}
                          <div>
                            <CardTitle className="text-lg">{doc.title}</CardTitle>
                            <CardDescription>
                              Version {doc.version} • {format(new Date(doc.created_at), 'MMM d, yyyy')}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>AI Generated</span>
                        </div>
                        
                        {/* Quick preview of content */}
                        <div className="bg-muted/50 rounded p-2 text-xs">
                          <pre className="truncate">
                            {JSON.stringify(doc.content, null, 2).substring(0, 100)}...
                          </pre>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedDoc(doc)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => exportDocument(doc, 'json')}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => regenerateDocument(doc.type)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Regen
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => deleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedDoc.title}</CardTitle>
                <CardDescription>Version {selectedDoc.version}</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedDoc(null)}>✕</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => exportDocument(selectedDoc, 'json')}>
                    <Download className="h-4 w-4 mr-1" />
                    Export JSON
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(selectedDoc.content, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}