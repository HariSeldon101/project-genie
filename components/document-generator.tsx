'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Download,
  FileSpreadsheet,
  Info,
  Terminal,
  CheckSquare,
  Square,
  DollarSign
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
import { useGenerationStream } from '@/lib/hooks/use-generation-stream'
import { GenerationLogViewer, GenerationLogViewerCompact } from './generation-log-viewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

// Helper function to get documents based on methodology
// For PRINCE2, research documents (Stage 1) come first
function getMethodologyDocuments(methodology: string) {
  switch (methodology) {
    case 'agile':
      // Agile doesn't use two-stage, so keep original order
      return ['Project Charter', 'Product Backlog', 'Sprint Plan', 'Technical Landscape', 'Comparable Projects']
    case 'prince2':
      // PRINCE2 uses two-stage: Research documents first (Stage 1), then main documents (Stage 2)
      return ['Technical Landscape', 'Comparable Projects', 'Project Initiation Document', 'Business Case', 'Risk Register', 'Project Plan', 'Quality Management Strategy', 'Communication Plan']
    case 'hybrid':
      // Hybrid also benefits from research first
      return ['Technical Landscape', 'Comparable Projects', 'Hybrid Charter', 'Risk Register', 'Product Backlog']
    default:
      return []
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
  const [selectedDocInfo, setSelectedDocInfo] = useState<string | null>(null)
  
  // Project details for better document generation
  const [budget, setBudget] = useState<string>('')
  const [timeline, setTimeline] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  // Document selection state - all selected by default
  const allDocuments = getMethodologyDocuments(projectData.methodology as string)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set(allDocuments))
  
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
    // Check if any documents are selected
    if (selectedDocuments.size === 0) {
      setError('Please select at least one document to generate')
      setStatus('error')
      return
    }
    
    setGenerating(true)
    setStatus('generating')
    setError(null)
    
    // Initialize document progress tracking for selected documents only
    // Order them according to methodology (research docs first for PRINCE2)
    const methodologyOrder = getMethodologyDocuments(projectData.methodology as string)
    const orderedSelectedDocs = methodologyOrder.filter(doc => selectedDocuments.has(doc))
    
    const docList = orderedSelectedDocs.map(name => ({
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
      updateProgress(4, 'AI is creating your documents... This may take 2-5 minutes for complex documents')
      console.log('[DocumentGenerator] Starting document generation:', {
        projectId,
        methodology: projectData.methodology,
        timestamp: new Date().toISOString()
      })
      
      // Mark all documents as generating
      setDocumentProgress(prev => prev.map(doc => ({ ...doc, status: 'generating' })))
      
      // Call generation API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        // Don't immediately abort - give a warning first
        console.warn('[DocumentGenerator] Generation taking longer than expected...')
        controller.abort()
      }, 600000) // 600 second (10 minute) timeout to match API maxDuration
      
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
            projectData: {
              ...projectData,
              budget: budget || undefined,
              timeline: timeline || undefined,
              startDate: startDate || undefined,
              endDate: endDate || undefined
            },
            selectedDocuments: Array.from(selectedDocuments)
          }),
          signal: controller.signal
        })
      } catch (err: any) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') {
          // More graceful timeout handling
          throw new Error('Document generation is taking longer than expected (over 10 minutes). The server may still be processing. Please check your documents page in a few minutes to see if they completed.')
        }
        console.error('[DocumentGenerator] Fetch error:', err)
        throw new Error(`Network error: ${err.message || 'Failed to connect to server'}`)
      }
      
      clearTimeout(timeoutId)

      // Check response status FIRST before trying to parse
      if (!response.ok) {
        console.error('[DocumentGenerator] HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        })
        
        // Try to get error details from response
        const contentType = response.headers.get('content-type')
        let errorMessage = `Request failed with status ${response.status}`
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            errorMessage = errorData.details || errorData.error || errorMessage
          } else if (contentType && contentType.includes('text/html')) {
            // Vercel returns HTML error pages in production
            console.warn('[DocumentGenerator] Received HTML error page instead of JSON')
            if (response.status === 405) {
              errorMessage = 'Method not allowed. This may be due to Vercel deployment protection.'
            } else if (response.status === 401) {
              errorMessage = 'Authentication required. Please log in and try again.'
            }
          } else {
            const text = await response.text()
            console.error('[DocumentGenerator] Non-JSON error response:', text.substring(0, 200))
          }
        } catch (parseError) {
          console.error('[DocumentGenerator] Could not parse error response:', parseError)
        }
        
        throw new Error(errorMessage)
      }

      // Now parse successful response
      let responseData
      const contentType = response.headers.get('content-type')
      
      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json()
        } else {
          // This shouldn't happen for successful responses
          const text = await response.text()
          console.error('[DocumentGenerator] Unexpected non-JSON success response:', text.substring(0, 200))
          throw new Error('Server returned successful response but not in JSON format')
        }
      } catch (parseError) {
        console.error('[DocumentGenerator] Failed to parse successful response:', parseError)
        throw new Error(`Failed to parse server response: ${parseError.message}`)
      }

      const result = responseData
      console.log('[DocumentGenerator] Generation response:', {
        provider: result.provider,
        model: result.model,
        documentsCount: result.documents?.length,
        debugInfo: result.debugInfo
      })
      
      // Set provider info
      if (result.provider && result.model) {
        setProviderInfo({ provider: result.provider, model: result.model })
      }
      
      // Check for partial success
      const successfulDocs = result.documents?.filter(doc => !doc.error) || []
      const failedDocs = result.documents?.filter(doc => doc.error) || []
      
      // Step 6: Validate
      updateProgress(5, 'Checking document completeness...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 7: Finalize
      updateProgress(6, 'Documents ready!')
      await new Promise(resolve => setTimeout(resolve, 300))

      // Store successful documents
      if (successfulDocs.length > 0) {
        setDocuments(successfulDocs.map(doc => ({
          title: doc.title,
          version: doc.version,
          insights: doc.insights,
          prompt: doc.prompt
        })))
      }
      
      // Update progress based on success/failure
      setDocumentProgress(prev => prev.map(doc => {
        const successful = successfulDocs.find(d => d.title === doc.name || d.type === doc.name.toLowerCase().replace(/ /g, '_'))
        const failed = failedDocs.find(d => d.title === doc.name || d.type === doc.name.toLowerCase().replace(/ /g, '_'))
        
        if (successful) {
          return { ...doc, status: 'completed' }
        } else if (failed) {
          return { ...doc, status: 'failed', error: 'Generation failed' }
        }
        return doc
      }))
      
      setProgress(100)
      
      // Determine overall status
      if (successfulDocs.length === 0) {
        setStatus('error')
        setMessage('Generation Failed')
        setSubMessage('No documents were generated successfully. Please try again.')
      } else if (failedDocs.length > 0) {
        setStatus('success')
        setMessage('Partial Success')
        setSubMessage(`Generated ${successfulDocs.length} of ${result.documents.length} documents. ${failedDocs.length} failed.`)
      } else {
        setStatus('success')
        setMessage('Success!')
        setSubMessage(`Generated ${successfulDocs.length} project documents using ${result.provider}/${result.model}`)
      }
      
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

  
  const toggleDocument = (docName: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(docName)) {
        newSet.delete(docName)
      } else {
        newSet.add(docName)
      }
      return newSet
    })
  }
  
  const toggleAllDocuments = () => {
    if (selectedDocuments.size === allDocuments.length) {
      // If all selected, deselect all
      setSelectedDocuments(new Set())
    } else {
      // Otherwise, select all
      setSelectedDocuments(new Set(allDocuments))
    }
  }

  const documentDescriptions: Record<string, { brief: string; full: string; purpose: string; structure: string[] }> = {
    'Project Charter': {
      brief: 'High-level project scope and objectives',
      full: 'The Project Charter is a formal document that authorizes the project and provides the project manager with the authority to apply organizational resources.',
      purpose: 'To formally authorize the project, define high-level requirements, and establish project boundaries and success criteria.',
      structure: ['Project Vision & Objectives', 'Scope Statement', 'Key Stakeholders', 'Success Criteria', 'High-level Timeline', 'Initial Risk Assessment']
    },
    'Product Backlog': {
      brief: 'Prioritized list of features and user stories',
      full: 'The Product Backlog is a prioritized list of features, functions, requirements, enhancements, and fixes that constitute the changes to be made to the product.',
      purpose: 'To provide a single source of requirements for any changes to be made to the product, ordered by priority and business value.',
      structure: ['User Stories', 'Acceptance Criteria', 'Priority Rankings', 'Story Points/Estimates', 'Dependencies', 'Sprint Allocation']
    },
    'Sprint Plan': {
      brief: 'Detailed plan for upcoming sprint iterations',
      full: 'The Sprint Plan outlines the work to be performed during the sprint, including selected backlog items and the plan for delivering them.',
      purpose: 'To define what can be delivered in the sprint and how that work will be achieved by the development team.',
      structure: ['Sprint Goals', 'Selected User Stories', 'Task Breakdown', 'Resource Allocation', 'Definition of Done', 'Sprint Timeline']
    },
    'Project Initiation Document': {
      brief: 'Comprehensive project definition and approach',
      full: 'The Project Initiation Document (PID) defines the project and is the basis for managing and controlling the project under PRINCE2 methodology.',
      purpose: 'To define the project, provide justification for undertaking it, and establish the management structure and controls.',
      structure: ['Project Definition', 'Business Case Summary', 'Project Organization', 'Quality Management Strategy', 'Risk Management Strategy', 'Communication Plan', 'Project Controls']
    },
    'Business Case': {
      brief: 'Financial justification and expected benefits',
      full: 'The Business Case provides justification for undertaking a project, evaluating the benefit, cost, and risk of alternative options.',
      purpose: 'To establish whether the project is desirable, viable, and achievable, and continues to be so throughout the project lifecycle.',
      structure: ['Executive Summary', 'Strategic Alignment', 'Options Analysis', 'Expected Benefits', 'Cost-Benefit Analysis', 'Investment Appraisal', 'Risk Assessment']
    },
    'Risk Register': {
      brief: 'Identified risks with mitigation strategies',
      full: 'The Risk Register is a document that contains information about identified risks, their analysis, and response plans.',
      purpose: 'To record details of all identified risks, their assessment, and the measures to manage them throughout the project.',
      structure: ['Risk Description', 'Risk Category', 'Probability Assessment', 'Impact Analysis', 'Risk Score', 'Mitigation Strategies', 'Contingency Plans', 'Risk Owner']
    },
    'Project Plan': {
      brief: 'Timeline, milestones, and resource allocation',
      full: 'The Project Plan provides a comprehensive roadmap of how and when the project objectives will be achieved.',
      purpose: 'To communicate the project approach, timeline, resources, and controls to stakeholders and guide project execution.',
      structure: ['Work Breakdown Structure', 'Gantt Chart/Timeline', 'Milestone Schedule', 'Resource Plan', 'Budget Allocation', 'Quality Checkpoints', 'Critical Path']
    },
    'Hybrid Charter': {
      brief: 'Blended approach combining Agile and PRINCE2',
      full: 'The Hybrid Charter combines elements of both Agile and PRINCE2 methodologies to provide flexibility with governance.',
      purpose: 'To establish a project framework that balances agility with structured governance and control mechanisms.',
      structure: ['Governance Framework', 'Agile Principles', 'Sprint Cadence', 'Stage Gates', 'Stakeholder Engagement', 'Change Control Process']
    },
    'Technical Landscape': {
      brief: 'Current and future technology architecture',
      full: 'The Technical Landscape document provides a comprehensive view of the current technology environment and proposed architecture.',
      purpose: 'To document existing technical infrastructure, identify gaps, and define the target architecture and technology stack.',
      structure: ['Current State Architecture', 'Technology Stack Analysis', 'Integration Points', 'Security Architecture', 'Scalability Plan', 'Technical Debt Assessment', 'Migration Strategy']
    },
    'Comparable Projects': {
      brief: 'Analysis of similar projects and lessons learned',
      full: 'The Comparable Projects analysis examines similar initiatives to identify best practices, risks, and success factors.',
      purpose: 'To leverage insights from similar projects, avoid common pitfalls, and apply proven strategies for success.',
      structure: ['Project Comparisons', 'Industry Benchmarks', 'Success Factors', 'Common Challenges', 'Lessons Learned', 'Best Practices', 'Risk Patterns']
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
            {/* Project Budget and Timeline Inputs */}
            <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Project Details for Enhanced Generation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="budget" className="block text-sm font-medium mb-1">
                    Project Budget (Optional)
                  </label>
                  <input
                    type="text"
                    id="budget"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g., $500,000 or £2.5M"
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Helps generate realistic cost estimates and resource plans
                  </p>
                </div>
                <div>
                  <label htmlFor="timeline" className="block text-sm font-medium mb-1">
                    Project Timeline (Optional)
                  </label>
                  <input
                    type="text"
                    id="timeline"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    placeholder="e.g., 6 months, Q2 2025 - Q1 2026"
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Improves milestone planning and phase definitions
                  </p>
                </div>
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium mb-1">
                    Target End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Documents to be generated:</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllDocuments}
                  className="text-xs h-7 px-2"
                >
                  {selectedDocuments.size === allDocuments.length ? (
                    <><CheckSquare className="h-3.5 w-3.5 mr-1" /> Deselect All</>
                  ) : (
                    <><Square className="h-3.5 w-3.5 mr-1" /> Select All</>
                  )}
                </Button>
              </div>
              <ul className="space-y-2">
                {getMethodologyDocuments(projectData.methodology).map((doc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Checkbox
                      id={`doc-${i}`}
                      checked={selectedDocuments.has(doc)}
                      onCheckedChange={() => toggleDocument(doc)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor={`doc-${i}`}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{doc}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setSelectedDocInfo(doc)
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            aria-label={`View details for ${doc}`}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {documentDescriptions[doc]?.brief}
                        </p>
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
              {selectedDocuments.size > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-muted-foreground">
                    {selectedDocuments.size} of {allDocuments.length} documents selected
                  </p>
                </div>
              )}
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
                    This typically takes 2-5 minutes depending on document complexity.
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
          <div className="space-y-3">
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertTitle>Generation Issues</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{error}</p>
                {error?.includes('timeout') && (
                  <div className="mt-2 p-2 bg-amber-500/10 rounded text-sm">
                    <p className="font-medium text-amber-400">💡 Tip:</p>
                    <ul className="list-disc list-inside mt-1 text-amber-300">
                      <li>Complex documents may take longer to generate</li>
                      <li>Check your documents page - they may still complete</li>
                      <li>Try generating fewer documents at once</li>
                      <li>Ensure your project description is clear and concise</li>
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
            
            {/* Show any partial results */}
            {documents.length > 0 && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <AlertTitle>Partial Success</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">{documents.length} document(s) were generated successfully:</p>
                  <ul className="list-disc list-inside">
                    {documents.map((doc, i) => (
                      <li key={i} className="text-sm">{doc.title}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
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
      
      {/* Document Details Dialog */}
      {selectedDocInfo && documentDescriptions[selectedDocInfo] && (
        <Dialog open={!!selectedDocInfo} onOpenChange={() => setSelectedDocInfo(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                {selectedDocInfo}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {documentDescriptions[selectedDocInfo].brief}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div>
                <h4 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Overview</h4>
                <p className="text-sm leading-relaxed">
                  {documentDescriptions[selectedDocInfo].full}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Purpose</h4>
                <p className="text-sm leading-relaxed">
                  {documentDescriptions[selectedDocInfo].purpose}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Document Structure</h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <ul className="space-y-2">
                    {documentDescriptions[selectedDocInfo].structure.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  This document will be generated using AI based on your project details and will be fully customized to your specific requirements.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}

// Export the streaming version as well
export { DocumentGeneratorStream } from './document-generator-stream'