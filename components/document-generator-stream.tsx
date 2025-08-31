'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  FileText,
  ArrowRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DocumentGeneratorStreamProps {
  projectId: string
  projectData: Record<string, unknown>
  onComplete?: (documents: unknown[]) => void
}

interface DocumentProgress {
  type: string
  title: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error?: string
  generationTimeMs?: number
  usage?: any
}

export function DocumentGeneratorStream({ 
  projectId, 
  projectData, 
  onComplete 
}: DocumentGeneratorStreamProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'partial' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [documents, setDocuments] = useState<DocumentProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string } | null>(null)
  const [failedDocuments, setFailedDocuments] = useState<string[]>([])
  const [successfulCount, setSuccessfulCount] = useState(0)
  const [metrics, setMetrics] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)

  const generateDocuments = async () => {
    console.log('[DocumentGeneratorStream] Starting generation with:', {
      projectId,
      methodology: projectData?.methodology,
      projectData
    })
    
    setGenerating(true)
    setStatus('generating')
    setError(null)
    setDocuments([])
    setFailedDocuments([])
    setSuccessfulCount(0)
    setMetrics(null)
    setProgress(0)

    try {
      // Get authentication token
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in.')
      }
      
      const token = session.access_token

      // Start SSE connection
      const response = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          projectData
        })
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim()
          } else if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5))
              // Add the event type to the data object
              handleStreamEvent({ ...data, event: currentEvent || data.event })
            } catch (e) {
              console.error('Failed to parse SSE data:', e, line)
            }
          }
        }
      }

    } catch (err) {
      console.error('Generation failed:', err)
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to generate documents')
      setMessage('')
    } finally {
      setGenerating(false)
    }
  }

  const handleStreamEvent = (event: any) => {
    console.log('[DocumentGeneratorStream] Received event:', event.event || event.type, event)
    
    switch (event.event || event.type) {
      case 'start':
        console.log('[DocumentGeneratorStream] Start event - methodology:', event.methodology)
        setMessage(`Starting ${event.methodology} document generation...`)
        // Initialize document list
        const docList = getDocumentTypes(event.methodology)
        console.log('[DocumentGeneratorStream] Document list:', docList)
        setDocuments(docList.map((title, i) => ({
          type: getDocumentType(title),
          title,
          status: 'pending'
        })))
        break

      case 'provider':
        setProviderInfo(event)
        setMessage(`Using ${event.provider}/${event.model}`)
        break

      case 'document_start':
        setMessage(`Generating ${event.title}...`)
        setDocuments(prev => prev.map((doc, i) => 
          i === event.index 
            ? { ...doc, status: 'generating' }
            : doc
        ))
        // Update progress based on document index
        const startProgress = (event.index / event.total) * 90
        setProgress(startProgress)
        break

      case 'document_complete':
        setMessage(`✅ ${event.title} completed in ${(event.generationTimeMs / 1000).toFixed(1)}s`)
        setDocuments(prev => prev.map((doc, i) => 
          i === event.index 
            ? { 
                ...doc, 
                status: 'completed', 
                generationTimeMs: event.generationTimeMs,
                usage: event.usage
              }
            : doc
        ))
        setSuccessfulCount(prev => prev + 1)
        // Update progress
        const completeProgress = ((event.index + 1) / event.total) * 90
        setProgress(completeProgress)
        break

      case 'document_failed':
        setMessage(`❌ ${event.title} failed`)
        setDocuments(prev => prev.map((doc, i) => 
          i === event.index 
            ? { ...doc, status: 'failed', error: event.error }
            : doc
        ))
        setFailedDocuments(prev => [...prev, event.title])
        break

      case 'storage_complete':
        setMessage(`Stored ${event.count} documents`)
        break

      case 'complete':
        setProgress(100)
        setMetrics(event.metrics)
        
        if (event.successCount === event.totalDocuments) {
          setStatus('success')
          setMessage(`Successfully generated all ${event.successCount} documents!`)
        } else if (event.successCount > 0) {
          setStatus('partial')
          setMessage(`Generated ${event.successCount} of ${event.totalDocuments} documents`)
        } else {
          setStatus('error')
          setMessage('Failed to generate documents')
        }

        if (onComplete && event.successCount > 0) {
          onComplete(event.artifactIds)
        }
        break

      case 'error':
        setStatus('error')
        setError(event.error)
        setMessage('')
        break
    }
  }

  const retryFailed = async () => {
    if (failedDocuments.length === 0) return
    
    setGenerating(true)
    setStatus('generating')
    setMessage('Retrying failed documents...')
    
    try {
      // Get authentication token
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in.')
      }
      
      const token = session.access_token

      // Get failed document types
      const failedTypes = documents
        .filter(doc => doc.status === 'failed')
        .map(doc => doc.type)

      // Start SSE connection for retry
      const response = await fetch('/api/generate-retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          projectData,
          failedDocuments: failedTypes
        })
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            continue
          }

          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5))
              handleRetryEvent(data)
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }

    } catch (err) {
      console.error('Retry failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to retry documents')
    } finally {
      setGenerating(false)
    }
  }

  const handleRetryEvent = (event: any) => {
    switch (event.event || event.type) {
      case 'retry_start':
        setMessage(`Retrying ${event.totalDocuments} failed documents...`)
        break

      case 'retry_document_start':
        setMessage(`Retrying ${event.title}...`)
        // Find the document and update its status
        setDocuments(prev => prev.map(doc => 
          doc.type === event.type 
            ? { ...doc, status: 'generating' }
            : doc
        ))
        break

      case 'retry_document_complete':
        setMessage(`✅ ${event.title} retry successful!`)
        setDocuments(prev => prev.map(doc => 
          doc.type === event.type 
            ? { 
                ...doc, 
                status: 'completed', 
                generationTimeMs: event.generationTimeMs,
                usage: event.usage,
                error: undefined
              }
            : doc
        ))
        setSuccessfulCount(prev => prev + 1)
        setFailedDocuments(prev => prev.filter(d => d !== event.title))
        break

      case 'retry_document_failed':
        setMessage(`❌ ${event.title} retry failed`)
        setDocuments(prev => prev.map(doc => 
          doc.type === event.type 
            ? { ...doc, status: 'failed', error: event.error }
            : doc
        ))
        break

      case 'retry_complete':
        setMetrics(event.metrics)
        
        if (event.failureCount === 0) {
          setStatus('success')
          setMessage('All documents successfully generated after retry!')
        } else {
          setStatus('partial')
          setMessage(`Retry complete: ${event.successCount} succeeded, ${event.failureCount} still failed`)
        }
        break

      case 'error':
        setStatus('error')
        setError(event.error)
        break
    }
  }

  const getDocumentTypes = (methodology: string) => {
    switch (methodology?.toLowerCase()) {
      case 'agile':
        return [
          'Project Charter',
          'Product Backlog', 
          'Sprint Plan',
          'Technical Landscape Analysis',
          'Comparable Projects Analysis'
        ]
      case 'prince2':
        return [
          'Project Initiation Document (PID)',
          'Business Case',
          'Project Plan',
          'Risk Register',
          'Technical Landscape Analysis',
          'Comparable Projects Analysis'
        ]
      default:
        return []
    }
  }

  const getDocumentType = (title: string): string => {
    const typeMap: Record<string, string> = {
      'Project Charter': 'charter',
      'Product Backlog': 'backlog',
      'Sprint Plan': 'sprint_plan',
      'Project Initiation Document (PID)': 'pid',
      'Business Case': 'business_case',
      'Project Plan': 'project_plan',
      'Risk Register': 'risk_register',
      'Technical Landscape Analysis': 'technical_landscape',
      'Comparable Projects Analysis': 'comparable_projects'
    }
    return typeMap[title] || title.toLowerCase().replace(/\s+/g, '_')
  }

  const getStatusIcon = (status: DocumentProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = (status: DocumentProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500'
      case 'generating':
        return 'text-blue-600'
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
    }
  }

  return (
    <Card className="backdrop-blur-md bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            AI Document Generation
          </div>
          {providerInfo && (
            <Badge variant="secondary" className="text-xs">
              {providerInfo.provider}/{providerInfo.model}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Generate comprehensive project documentation using advanced AI
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Document Progress List */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium mb-2">Document Progress:</div>
            <div className="space-y-1">
              {documents.map((doc, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.status)}
                    <span className={`text-sm ${getStatusColor(doc.status)}`}>
                      {doc.title}
                    </span>
                  </div>
                  {doc.generationTimeMs && (
                    <span className="text-xs text-gray-400">
                      {(doc.generationTimeMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {doc.error && (
                    <span className="text-xs text-red-400 ml-2">
                      {doc.error.substring(0, 50)}...
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {generating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-400">{message}</p>
          </div>
        )}

        {/* Success Message */}
        {status === 'success' && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              All {successfulCount} documents generated successfully.
              {metrics && (
                <div className="mt-2 text-xs">
                  <div>Total time: {(metrics.generationTimeMs / 1000).toFixed(1)}s</div>
                  <div>Estimated cost: ${metrics.estimatedCostUsd?.toFixed(4)}</div>
                  <div>Tokens used: {metrics.totalTokens?.toLocaleString()}</div>
                </div>
              )}
              <div className="mt-3">
                <Button 
                  size="sm"
                  onClick={() => router.push(`/projects/${projectId}/documents`)}
                  className="flex items-center gap-1"
                >
                  View Documents
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Partial Success Message */}
        {status === 'partial' && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>Partial Success</AlertTitle>
            <AlertDescription>
              Generated {successfulCount} documents successfully. 
              {failedDocuments.length} document(s) failed to generate.
              <div className="mt-2 flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={retryFailed}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry Failed
                </Button>
                <Button 
                  size="sm"
                  onClick={() => router.push(`/projects/${projectId}/documents`)}
                  className="flex items-center gap-1"
                >
                  View Successful
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {status === 'error' && error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          onClick={generateDocuments}
          disabled={generating}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Documents
            </>
          )}
        </Button>

        {(status === 'success' || status === 'partial') && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <FileText className="mr-1 h-4 w-4" />
              View Details
            </Button>
          </div>
        )}
      </CardFooter>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generation Details</DialogTitle>
            <DialogDescription>
              Detailed information about the document generation process
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {metrics && (
              <div className="space-y-2">
                <h4 className="font-semibold">Metrics</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Provider: {metrics.provider}</div>
                  <div>Model: {metrics.model}</div>
                  <div>Total Time: {(metrics.generationTimeMs / 1000).toFixed(1)}s</div>
                  <div>Cost: ${metrics.estimatedCostUsd?.toFixed(4)}</div>
                  <div>Input Tokens: {metrics.totalInputTokens?.toLocaleString()}</div>
                  <div>Output Tokens: {metrics.totalOutputTokens?.toLocaleString()}</div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="font-semibold">Documents</h4>
              <div className="space-y-1">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-white/5">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(doc.status)}
                      <span>{doc.title}</span>
                    </div>
                    {doc.usage && (
                      <span className="text-xs text-gray-400">
                        {doc.usage.totalTokens?.toLocaleString()} tokens
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}