'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Download,
  FileSpreadsheet
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DocumentGeneratorProps {
  projectId: string
  projectData: Record<string, unknown>
  onComplete?: (documents: unknown[]) => void
}

interface DocumentProgress {
  name: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error?: string
}

interface DocumentInfo {
  title: string
  version: string
  insights?: boolean
  prompt?: {
    system: string
    user: string
  }
}

export function DocumentGenerator({ projectId, projectData, onComplete }: DocumentGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [subMessage, setSubMessage] = useState('')
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [documentProgress, setDocumentProgress] = useState<DocumentProgress[]>([])
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string } | null>(null)
  const [viewPrompt, setViewPrompt] = useState<{ doc: string; prompt: { system: string; user: string } } | null>(null)
  
  const generationSteps = [
    { name: 'Initializing', message: 'Setting up document generation...' },
    { name: 'Authenticating', message: 'Verifying user session...' },
    { name: 'Analyzing', message: 'Analyzing project context and requirements...' },
    { name: 'Sanitizing', message: 'Securing data for AI processing...' },
    { name: 'Generating', message: 'Creating project documents with AI...' },
    { name: 'Validating', message: 'Ensuring document quality and completeness...' },
    { name: 'Finalizing', message: 'Preparing documents for download...' }
  ]

  const updateProgress = (step: number, additionalMessage?: string) => {
    setCurrentStep(step)
    const stepData = generationSteps[step]
    setMessage(stepData.name)
    setSubMessage(additionalMessage || stepData.message)
    setProgress(Math.min(95, (step + 1) * (90 / generationSteps.length)))
  }

  const generateDocuments = async () => {
    setGenerating(true)
    setStatus('generating')
    setError(null)
    
    // Initialize document progress tracking
    const docList = getMethodologyDocuments(projectData.methodology as string).map(name => ({
      name,
      status: 'pending' as const
    }))
    setDocumentProgress(docList)
    
    // Step 1: Initialize
    updateProgress(0)
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      // Step 2: Authenticate
      updateProgress(1)
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in.')
      }
      
      const token = session.access_token

      // Step 3: Analyze
      updateProgress(2, `Processing ${projectData.methodology || 'project'} methodology...`)
      await new Promise(resolve => setTimeout(resolve, 800))

      // Step 4: Sanitize
      updateProgress(3, 'Removing personal information for security...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 5: Generate with AI
      updateProgress(4, 'AI is creating your documents... This may take 30-60 seconds')
      console.log('[DocumentGenerator] Starting document generation:', {
        projectId,
        methodology: projectData.methodology,
        timestamp: new Date().toISOString()
      })
      
      // Mark all documents as generating
      setDocumentProgress(prev => prev.map(doc => ({ ...doc, status: 'generating' })))
      
      // Call generation API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 85000) // 85 second timeout
      
      let response
      try {
        response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            projectId,
            projectData
          }),
          signal: controller.signal
        })
      } catch (err: any) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') {
          throw new Error('Document generation timed out. Please try again.')
        }
        throw err
      }
      
      clearTimeout(timeoutId)

      // Parse response body once
      let responseData
      const contentType = response.headers.get('content-type')
      
      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json()
        } else {
          // If not JSON, get as text
          const text = await response.text()
          console.error('Non-JSON response:', text)
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`)
        }
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error(`Failed to parse server response: ${parseError.message}`)
      }

      // Check if request was successful
      if (!response.ok) {
        const errorMessage = responseData?.details || responseData?.error || 'Generation failed'
        console.error('[DocumentGenerator] API Error:', errorMessage, responseData)
        throw new Error(errorMessage)
      }

      const result = responseData
      console.log('[DocumentGenerator] Generation successful:', {
        provider: result.provider,
        model: result.model,
        documentsCount: result.documents?.length,
        debugInfo: result.debugInfo
      })
      
      // Set provider info
      if (result.provider && result.model) {
        setProviderInfo({ provider: result.provider, model: result.model })
      }
      
      // Step 6: Validate
      updateProgress(5, 'Checking document completeness...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 7: Finalize
      updateProgress(6, 'Documents ready!')
      await new Promise(resolve => setTimeout(resolve, 300))

      setDocuments(result.documents.map(doc => ({
        title: doc.title,
        version: doc.version,
        insights: doc.insights,
        prompt: doc.prompt
      })))
      setProgress(100)
      setStatus('success')
      setMessage('Success!')
      setSubMessage(`Generated ${result.documents.length} project documents using ${result.provider}/${result.model}`)
      
      // Mark all documents as completed
      setDocumentProgress(prev => prev.map(doc => ({ ...doc, status: 'completed' })))
      
      if (onComplete) {
        onComplete(result.documents)
      }

    } catch (err) {
      console.error('[DocumentGenerator] Generation failed:', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      })
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to generate documents')
      setMessage('')
    } finally {
      setGenerating(false)
    }
  }

  const exportDocument = async (format: 'xlsx' | 'csv' | 'pdf') => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in.')
      }
      
      const token = session.access_token

      const response = await fetch(`/api/export/${format}?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `project_${format === 'xlsx' ? 'plan.xlsx' : format === 'csv' ? 'data.csv' : 'report.pdf'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'Failed to export document')
    }
  }

  const getMethodologyDocuments = (methodology: string) => {
    switch (methodology) {
      case 'agile':
        return ['Project Charter', 'Product Backlog', 'Sprint Plan']
      case 'prince2':
        return ['Project Initiation Document', 'Business Case', 'Risk Register', 'Project Plan']
      case 'hybrid':
        return ['Hybrid Charter', 'Risk Register', 'Product Backlog']
      default:
        return []
    }
  }

  return (
    <Card className="backdrop-blur-md bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-400" />
          AI Document Generation
        </CardTitle>
        <CardDescription>
          Generate professional project documents tailored to your {projectData.methodology} methodology
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === 'idle' && (
          <>
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <h4 className="font-medium mb-2">Documents to be generated:</h4>
              <ul className="space-y-1">
                {getMethodologyDocuments(projectData.methodology).map((doc, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-blue-400" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>

            <Alert className="bg-amber-500/10 border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <AlertTitle>Privacy Protected</AlertTitle>
              <AlertDescription className="text-sm">
                All personal information is automatically sanitized before AI processing. 
                No names or emails are sent to the AI model.
              </AlertDescription>
            </Alert>
          </>
        )}

        {status === 'generating' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{message}</p>
                  <p className="text-xs text-muted-foreground">{subMessage}</p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            {/* Document Generation Progress */}
            {documentProgress.length > 0 && currentStep >= 4 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Generating Documents:</h4>
                <div className="space-y-2">
                  {documentProgress.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                      {doc.status === 'pending' && (
                        <>
                          <div className="h-5 w-5 rounded-full border-2 border-gray-500" />
                          <span className="text-sm text-gray-400">{doc.name}</span>
                        </>
                      )}
                      {doc.status === 'generating' && (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                          <span className="text-sm text-blue-300">{doc.name}</span>
                        </>
                      )}
                      {doc.status === 'completed' && (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                          <span className="text-sm text-green-300">{doc.name}</span>
                        </>
                      )}
                      {doc.status === 'failed' && (
                        <>
                          <AlertCircle className="h-5 w-5 text-red-400" />
                          <span className="text-sm text-red-300">{doc.name}</span>
                          {doc.error && (
                            <span className="text-xs text-red-400 ml-auto">{doc.error}</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Step indicators */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {generationSteps.slice(0, 4).map((step, i) => (
                <div
                  key={i}
                  className={`text-center p-2 rounded-lg border transition-all duration-300 ${
                    i < currentStep
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : i === currentStep
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse'
                      : 'bg-gray-500/5 border-gray-500/20 text-gray-500'
                  }`}
                >
                  <div className="text-xs font-medium">{step.name}</div>
                </div>
              ))}
            </div>
            
            {currentStep === 4 && (
              <>
                <Alert className="bg-blue-500/10 border-blue-500/20 animate-pulse">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-sm">
                    <strong>AI Working:</strong> Creating customized documents based on your project details. 
                    This typically takes 30-60 seconds.
                  </AlertDescription>
                </Alert>
                {providerInfo && (
                  <div className="mt-2 p-3 bg-gray-800/50 rounded-lg text-xs font-mono">
                    <div>Provider: <span className="text-blue-400">{providerInfo.provider}</span></div>
                    <div>Model: <span className="text-green-400">{providerInfo.model}</span></div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Generated Documents:</h4>
              {providerInfo && (
                <div className="mb-2 p-2 bg-gray-800/30 rounded text-xs">
                  Generated using: <span className="font-mono text-blue-400">{providerInfo.provider}/{providerInfo.model}</span>
                </div>
              )}
              {documents.map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span className="text-sm">{doc.title}</span>
                    <span className="text-xs text-gray-500">v{doc.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.insights && (
                      <span className="text-xs text-green-400">AI Enhanced</span>
                    )}
                    {doc.prompt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() => setViewPrompt({ doc: doc.title, prompt: doc.prompt! })}
                      >
                        View Prompt
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Export Project Plan
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => exportDocument('xlsx')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportDocument('csv')}>
                    <FileText className="mr-2 h-4 w-4" />
                    CSV (.csv)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {status === 'error' && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter>
        {status === 'idle' && (
          <Button 
            onClick={generateDocuments}
            disabled={generating}
            className="w-full"
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
        )}

        {status === 'error' && (
          <Button 
            onClick={generateDocuments}
            variant="outline"
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}

        {status === 'success' && (
          <Button 
            onClick={() => window.location.href = `/projects/${projectId}`}
            className="w-full"
          >
            View Project Dashboard
          </Button>
        )}
      </CardFooter>
      
      {/* Prompt Viewer Dialog */}
      {viewPrompt && (
        <Dialog open={!!viewPrompt} onOpenChange={() => setViewPrompt(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Prompt for {viewPrompt.doc}</DialogTitle>
              <DialogDescription>
                The prompts used to generate this document
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">System Prompt:</h4>
                <pre className="bg-gray-800 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                  {viewPrompt.prompt.system}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">User Prompt:</h4>
                <pre className="bg-gray-800 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                  {viewPrompt.prompt.user}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}