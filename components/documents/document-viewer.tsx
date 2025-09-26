'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { MermaidDiagram } from '@/components/mermaid-diagram'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { 
  FileText, Globe, GitCompare, Calendar, Users, AlertCircle, 
  FileSpreadsheet, Download, Copy, Check, Eye, Code, Hash,
  Cpu, DollarSign, Clock, HardDrive, Zap, Info, Trash2
} from 'lucide-react'
import { saveAs } from 'file-saver'
import DOMPurify from 'dompurify'
import { DirectPDFDownloadButton } from './pdf-download-button'
import { UnifiedPIDFormatter } from '@/lib/documents/formatters/unified-pid-formatter'
import { UnifiedBusinessCaseFormatter } from '@/lib/documents/formatters/unified-business-case-formatter'
import { UnifiedRiskRegisterFormatter } from '@/lib/documents/formatters/unified-risk-register-formatter'
import { UnifiedTechnicalLandscapeFormatter } from '@/lib/documents/formatters/unified-technical-landscape-formatter'
import { UnifiedComparableProjectsFormatter } from '@/lib/documents/formatters/unified-comparable-projects-formatter'
import { UnifiedProjectPlanFormatter } from '@/lib/documents/formatters/unified-project-plan-formatter'
import { UnifiedCommunicationPlanFormatter } from '@/lib/documents/formatters/unified-communication-plan-formatter'
import { UnifiedQualityManagementFormatter } from '@/lib/documents/formatters/unified-quality-management-formatter'
import { UnifiedCharterFormatter } from '@/lib/documents/formatters/unified-charter-formatter'
import { UnifiedBacklogFormatter } from '@/lib/documents/formatters/unified-backlog-formatter'
import { safeFormatDocument } from '@/lib/documents/formatters/document-formatter-utils'

interface DocumentViewerProps {
  document: {
    id: string
    type: string
    title: string
    content: any
    version: number
    created_at: string
    updated_at: string
    created_by?: string
    // Generation metadata
    generation_model?: string
    generation_provider?: string
    generation_tokens?: number
    generation_cost?: number
    generation_time_ms?: number
    generation_reasoning_level?: string
    generation_temperature?: number
    generation_max_tokens?: number
    generation_input_tokens?: number
    generation_output_tokens?: number
    generation_reasoning_tokens?: number
    // Project metadata
    project?: {
      name: string
      methodology_type: string
    }
    // Creator metadata
    creator?: {
      full_name: string
      email: string
    }
  }
  onClose?: () => void
  currentUser?: {
    firstName: string
    fullName: string
  }
}

// Helper component to render HTML content with mermaid diagrams
function HTMLContentWithMermaid({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      // Parse the HTML and find mermaid blocks
      const parser = new DOMParser()
      const doc = parser.parseFromString(content, 'text/html')
      const mermaidElements = doc.querySelectorAll('.mermaid-chart, pre.mermaid')

      // Replace mermaid elements with placeholders
      mermaidElements.forEach((element, index) => {
        const placeholder = doc.createElement('div')
        placeholder.className = 'mermaid-placeholder'
        placeholder.dataset.mermaidIndex = index.toString()
        placeholder.dataset.mermaidDefinition = element.textContent || ''
        placeholder.dataset.chartType = element.getAttribute('data-chart-type') || 'auto'
        element.parentNode?.replaceChild(placeholder, element)
      })

      // Set the modified HTML
      containerRef.current.innerHTML = DOMPurify.sanitize(doc.body.innerHTML, {
        ADD_TAGS: ['style'],
        ADD_ATTR: ['class', 'id', 'href', 'target', 'data-mermaid-index', 'data-mermaid-definition', 'data-chart-type'],
        ALLOW_DATA_ATTR: true,
        KEEP_CONTENT: true
      })

      // Now render MermaidDiagram components in the placeholders
      const placeholders = containerRef.current.querySelectorAll('.mermaid-placeholder')
      placeholders.forEach(placeholder => {
        const definition = placeholder.getAttribute('data-mermaid-definition') || ''
        const chartType = placeholder.getAttribute('data-chart-type') || 'auto'

        if (definition) {
          // Create a container for the React component
          const container = document.createElement('div')
          placeholder.parentNode?.replaceChild(container, placeholder)

          // Render the MermaidDiagram component
          import('react-dom/client').then(({ createRoot }) => {
            const root = createRoot(container)
            root.render(
              <MermaidDiagram
                definition={definition}
                type={chartType}
                showControls={true}
                lazy={true}
                cache={true}
              />
            )
          })
        }
      })
    }
  }, [content])

  return <div ref={containerRef} className="document-html-content" />
}

export function DocumentViewer({ document, onClose, currentUser }: DocumentViewerProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted')
  const [copied, setCopied] = useState(false)
  const [formattedContent, setFormattedContent] = useState<string>('')
  const [contentType, setContentType] = useState<'html' | 'markdown'>('markdown')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Helper function to extract company name from project
  const getCompanyName = () => {
    if (document.project?.company_info && typeof document.project.company_info === 'object') {
      const companyInfo = document.project.company_info as any
      return companyInfo.name || companyInfo.companyName || 'Your Company'
    }
    return 'Your Company'
  }
  
  // Helper function to create metadata with project context
  const createMetadata = () => {
    const project = document.project as any
    return {
      projectName: project?.name || 'Project',
      companyName: getCompanyName(),
      version: document.version?.toString() || '1.0',
      date: new Date(document.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      author: document.creator?.full_name || currentUser?.fullName || 'User',
      // Add project dates and budget
      startDate: project?.start_date || undefined,
      endDate: project?.end_date || undefined,
      budget: project?.budget || undefined,
      timeline: project?.timeline || undefined
    }
  }

  // Note: Mermaid diagrams are now handled by the MermaidDiagram component

  // Calculate document size
  const getDocumentSize = () => {
    const contentStr = JSON.stringify(document.content)
    const bytes = new Blob([contentStr]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Format the document content based on type
  useEffect(() => {
    const formatDocument = () => {
      try {
        let formatted = ''
        let content = document.content
        
        // Parse content if it's a string
        if (typeof content === 'string') {
          try {
            // Try to fix common JSON issues before parsing
            let fixedContent = content
            
            // Remove trailing commas
            fixedContent = fixedContent.replace(/,\s*([}\]])/g, '$1')
            
            // Try to complete truncated JSON
            const openBraces = (fixedContent.match(/{/g) || []).length
            const closeBraces = (fixedContent.match(/}/g) || []).length
            const openBrackets = (fixedContent.match(/\[/g) || []).length
            const closeBrackets = (fixedContent.match(/\]/g) || []).length
            
            // Add missing closing braces/brackets
            fixedContent += ']'.repeat(Math.max(0, openBrackets - closeBrackets))
            fixedContent += '}'.repeat(Math.max(0, openBraces - closeBraces))
            
            content = JSON.parse(fixedContent)
          } catch (e) {
            // If JSON parse still fails, try to extract any valid structure
            console.warn('Failed to parse content as JSON:', e)
            
            // Attempt to extract partial data
            try {
              // Look for specific patterns in the string
              const projectDefMatch = content.match(/"projectDefinition"\s*:\s*({[^}]*})/);
              const scopeMatch = content.match(/"scope"\s*:\s*({[^}]*})/);
              
              content = {
                projectDefinition: projectDefMatch ? JSON.parse(projectDefMatch[1]) : {},
                raw: content
              }
            } catch (extractError) {
              // If all else fails, create a minimal structure
              content = { raw: content }
            }
          }
        }

        // Add metadata to content if available
        const enrichedContent = typeof content === 'object' ? {
          ...content,
          projectName: document.project?.name || content.projectName,
          lastUpdated: document.updated_at 
            ? new Date(document.updated_at).toLocaleDateString()
            : new Date().toLocaleDateString(),
          version: document.version?.toString() || '1'
        } : content

        // Use appropriate formatter based on document type
        switch (document.type.toLowerCase()) {
          case 'pid':
          case 'project initiation document':
          case 'project initiation document (pid)':
            // Use unified PID formatter
            if (typeof enrichedContent === 'object' && enrichedContent !== null) {
              const metadata = createMetadata()
              
              try {
                const formatter = new UnifiedPIDFormatter(enrichedContent, metadata)
                const htmlContent = formatter.generateHTML()
                
                // Set content type to HTML for unified formatter output
                setContentType('html')
                formatted = htmlContent
              } catch (error) {
                console.error('Error formatting PID with unified formatter:', error)
                setContentType('markdown')
                formatted = '## Error\n\nFailed to format document content.'
              }
            } else {
              // Fallback for incorrect structure
              setContentType('markdown')
              formatted = `# Project Initiation Document\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          case 'business_case':
          case 'business case':
            // Use unified Business Case formatter
            if (typeof enrichedContent === 'object' && enrichedContent !== null) {
              const metadata = createMetadata()
              
              try {
                const formatter = new UnifiedBusinessCaseFormatter(enrichedContent, metadata)
                const htmlContent = formatter.generateHTML()
                
                // Set content type to HTML for unified formatter output
                setContentType('html')
                formatted = htmlContent
              } catch (error) {
                console.error('Error formatting Business Case with unified formatter:', error)
                setContentType('markdown')
                formatted = '## Error\n\nFailed to format document content.'
              }
            } else {
              // Fallback for incorrect structure
              setContentType('markdown')
              formatted = `# Business Case\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          case 'risk_register':
          case 'risk register':
            // Use unified Risk Register formatter
            if (typeof enrichedContent === 'object' && enrichedContent !== null) {
              const metadata = createMetadata()
              
              try {
                const formatter = new UnifiedRiskRegisterFormatter(enrichedContent, metadata)
                const htmlContent = formatter.generateHTML()
                
                // Set content type to HTML for unified formatter output
                setContentType('html')
                formatted = htmlContent
              } catch (error) {
                console.error('Error formatting Risk Register with unified formatter:', error)
                setContentType('markdown')
                formatted = '## Error\n\nFailed to format document content.'
              }
            } else {
              // Fallback for incorrect structure
              setContentType('markdown')
              formatted = `# Risk Register\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          case 'project_plan':
          case 'project plan':
            // Use unified Project Plan formatter
            if (typeof enrichedContent === 'object' && enrichedContent !== null) {
              const metadata = createMetadata()
              
              try {
                const formatter = new UnifiedProjectPlanFormatter(enrichedContent, metadata)
                const htmlContent = formatter.generateHTML()
                
                // Set content type to HTML for unified formatter output
                setContentType('html')
                formatted = htmlContent
              } catch (error) {
                console.error('Error formatting Project Plan with unified formatter:', error)
                setContentType('markdown')
                formatted = '## Error\n\nFailed to format document content.'
              }
            } else {
              // Fallback for incorrect structure
              setContentType('markdown')
              formatted = `# Project Plan\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          case 'charter':
          case 'project charter':
            // Use unified Charter formatter
            if (typeof enrichedContent === 'object' && enrichedContent !== null) {
              const metadata = createMetadata()
              
              try {
                const formatter = new UnifiedCharterFormatter(enrichedContent, metadata)
                const htmlContent = formatter.generateHTML()
                
                // Set content type to HTML for unified formatter output
                setContentType('html')
                formatted = htmlContent
              } catch (error) {
                console.error('Error formatting Charter with unified formatter:', error)
                setContentType('markdown')
                formatted = '## Error\n\nFailed to format document content.'
              }
            } else {
              // Fallback for incorrect structure
              setContentType('markdown')
              formatted = `# Project Charter\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          case 'backlog':
          case 'product backlog':
            // Use unified Backlog formatter
            if (typeof enrichedContent === 'object' && enrichedContent !== null) {
              const metadata = createMetadata()
              
              try {
                const formatter = new UnifiedBacklogFormatter(enrichedContent, metadata)
                const htmlContent = formatter.generateHTML()
                
                // Set content type to HTML for unified formatter output
                setContentType('html')
                formatted = htmlContent
              } catch (error) {
                console.error('Error formatting Backlog with unified formatter:', error)
                setContentType('markdown')
                formatted = '## Error\n\nFailed to format document content.'
              }
            } else {
              // Fallback for incorrect structure
              setContentType('markdown')
              formatted = `# Product Backlog\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          case 'technical_landscape':
          case 'technical landscape analysis':
            // Use unified Technical Landscape formatter
            if (typeof enrichedContent === 'object' && enrichedContent !== null) {
              const metadata = createMetadata()
              
              try {
                const formatter = new UnifiedTechnicalLandscapeFormatter(enrichedContent, metadata)
                const htmlContent = formatter.generateHTML()
                
                // Set content type to HTML for unified formatter output
                setContentType('html')
                formatted = htmlContent
              } catch (error) {
                console.error('Error formatting Technical Landscape with unified formatter:', error)
                setContentType('markdown')
                formatted = '## Error\n\nFailed to format document content.'
              }
            } else {
              // Fallback for incorrect structure
              setContentType('markdown')
              formatted = `# Technical Landscape\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          case 'comparable_projects':
          case 'comparable projects analysis':
            // Use unified Comparable Projects formatter
            if (typeof enrichedContent === 'object' && enrichedContent !== null) {
              const metadata = createMetadata()
              
              try {
                const formatter = new UnifiedComparableProjectsFormatter(enrichedContent, metadata)
                const htmlContent = formatter.generateHTML()
                
                // Set content type to HTML for unified formatter output
                setContentType('html')
                formatted = htmlContent
              } catch (error) {
                console.error('Error formatting Comparable Projects with unified formatter:', error)
                setContentType('markdown')
                formatted = '## Error\n\nFailed to format document content.'
              }
            } else {
              // Fallback for incorrect structure
              setContentType('markdown')
              formatted = `# Comparable Projects\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          case 'quality_management':
          case 'quality management strategy':
            // Use unified Quality Management formatter
            if (typeof enrichedContent === 'object' && enrichedContent !== null) {
              const metadata = createMetadata()
              
              try {
                const formatter = new UnifiedQualityManagementFormatter(enrichedContent, metadata)
                const htmlContent = formatter.generateHTML()
                
                // Set content type to HTML for unified formatter output
                setContentType('html')
                formatted = htmlContent
              } catch (error) {
                console.error('Error formatting Quality Management with unified formatter:', error)
                setContentType('markdown')
                formatted = '## Error\n\nFailed to format document content.'
              }
            } else {
              // Fallback for incorrect structure
              setContentType('markdown')
              formatted = `# Quality Management Strategy\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          case 'communication_plan':
          case 'communication management approach':
            // Use unified Communication Plan formatter
            if (typeof enrichedContent === 'object' && enrichedContent !== null) {
              const metadata = createMetadata()
              
              try {
                const formatter = new UnifiedCommunicationPlanFormatter(enrichedContent, metadata)
                const htmlContent = formatter.generateHTML()
                
                // Set content type to HTML for unified formatter output
                setContentType('html')
                formatted = htmlContent
              } catch (error) {
                console.error('Error formatting Communication Plan with unified formatter:', error)
                setContentType('markdown')
                formatted = '## Error\n\nFailed to format document content.'
              }
            } else {
              // Fallback for incorrect structure
              setContentType('markdown')
              formatted = `# Communication Management Approach\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          case 'sprint_plan':
            // Sprint plan is typically text-based
            setContentType('markdown')
            if (typeof content === 'string') {
              formatted = content
            } else if (content.plan) {
              formatted = content.plan
            } else {
              formatted = `# Sprint Plan\n\n${JSON.stringify(content, null, 2)}`
            }
            break
          default:
            // For unknown types, try to display as formatted JSON
            setContentType('markdown')
            if (typeof content === 'object') {
              formatted = `# ${document.title || document.type}\n\n`
              formatted += '```json\n'
              formatted += JSON.stringify(content, null, 2)
              formatted += '\n```'
            } else {
              formatted = content.toString()
            }
        }

        setFormattedContent(formatted)
      } catch (error) {
        console.error('Error formatting document:', error)
        setFormattedContent(`# Error Formatting Document\n\nUnable to format document content. Please check the document structure.\n\n## Raw Content\n\`\`\`json\n${JSON.stringify(document.content, null, 2)}\n\`\`\``)
      }
    }

    formatDocument()
  }, [document])

  const handleCopy = async () => {
    try {
      const content = viewMode === 'formatted' 
        ? formattedContent 
        : JSON.stringify(document.content, null, 2)
      
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleDownload = () => {
    const content = viewMode === 'formatted' 
      ? formattedContent 
      : JSON.stringify(document.content, null, 2)
    
    const blob = new Blob([content], { 
      type: viewMode === 'formatted' ? 'text/markdown' : 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${document.title || document.type}.${viewMode === 'formatted' ? 'md' : 'json'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase
        .from('artifacts')
        .delete()
        .eq('id', document.id)

      if (error) {
        console.error('Failed to delete document:', error)
        alert('Failed to delete document. Please try again.')
      } else {
        // Close the viewer and refresh the page
        if (onClose) onClose()
        router.refresh()
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('An error occurred while deleting the document.')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }


  const downloadAsMarkdown = () => {
    try {
      // Get the formatted markdown content
      const markdownContent = formattedContent || ''
      
      // Add document metadata at the top
      const metadata = `# ${document.title}

**Type:** ${document.type}
**Version:** ${document.version}
**Created:** ${new Date(document.created_at).toLocaleDateString()}
**Updated:** ${new Date(document.updated_at).toLocaleDateString()}

---

`
      
      // Combine metadata with content
      const fullContent = metadata + markdownContent
      
      // Create blob and download
      const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' })
      saveAs(blob, `${document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`)
    } catch (error) {
      console.error('Error downloading markdown:', error)
      alert('Failed to download markdown. Please try again.')
    }
  }

  const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'charter': return <FileText className="h-5 w-5 text-blue-500" />
      case 'pid': return <FileText className="h-5 w-5 text-purple-500" />
      case 'backlog': return <FileSpreadsheet className="h-5 w-5 text-green-500" />
      case 'risk_register': return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'business_case': return <FileText className="h-5 w-5 text-orange-500" />
      case 'project_plan': return <Calendar className="h-5 w-5 text-indigo-500" />
      case 'technical_landscape': return <Globe className="h-5 w-5 text-cyan-500" />
      case 'comparable_projects': return <GitCompare className="h-5 w-5 text-pink-500" />
      case 'sprint_plan': return <Zap className="h-5 w-5 text-yellow-500" />
      default: return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Document Header with Metadata */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getDocumentIcon(document.type)}
              <div>
                <CardTitle className="text-xl">{document.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {document.project?.name} • {document.project?.methodology_type?.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={isDownloading}>
                    <Download className="h-4 w-4 mr-1" />
                    {isDownloading ? 'Generating...' : 'Download'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={downloadAsMarkdown}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      <DirectPDFDownloadButton 
                        document={document}
                        size="sm"
                        variant="ghost"
                        showIcon={false}
                        buttonText="Download as PDF"
                      />
                    </div>
                  </DropdownMenuItem>
                  {/* Temporary: Force regenerate for testing */}
                  <DropdownMenuItem asChild>
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      <DirectPDFDownloadButton 
                        document={document}
                        size="sm"
                        variant="ghost"
                        showIcon={false}
                        buttonText="Regenerate PDF (Force)"
                        forceRegenerate={true}
                      />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownload}>
                    <Code className="h-4 w-4 mr-2" />
                    Download as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {onClose && (
                <Button size="sm" variant="ghost" onClick={onClose}>
                  ✕
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Document ID */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                Document ID
              </div>
              <p className="text-xs font-mono truncate" title={document.id}>
                {document.id.substring(0, 8)}...
              </p>
            </div>

            {/* Model */}
            {document.generation_model && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Cpu className="h-3 w-3" />
                  Model
                </div>
                <p className="text-xs font-medium">{document.generation_model}</p>
              </div>
            )}

            {/* Provider */}
            {document.generation_provider && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  Provider
                </div>
                <p className="text-xs font-medium">{document.generation_provider}</p>
              </div>
            )}

            {/* Tokens */}
            {document.generation_tokens !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  Tokens
                </div>
                <p className="text-xs font-medium">
                  {document.generation_tokens.toLocaleString()}
                </p>
              </div>
            )}

            {/* Cost */}
            {document.generation_cost !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  Cost
                </div>
                <p className="text-xs font-medium">
                  ${document.generation_cost?.toFixed(4) || '0.0000'}
                </p>
              </div>
            )}

            {/* Generation Time */}
            {document.generation_time_ms && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Gen Time
                </div>
                <p className="text-xs font-medium">
                  {(document.generation_time_ms / 1000).toFixed(1)}s
                </p>
              </div>
            )}

            {/* Document Size */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                Size
              </div>
              <p className="text-xs font-medium">{getDocumentSize()}</p>
            </div>

            {/* Document Type */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                Type
              </div>
              <Badge variant="outline" className="text-xs">
                {document.type.replace('_', ' ')}
              </Badge>
            </div>

            {/* Reasoning Level */}
            {document.generation_reasoning_level && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Cpu className="h-3 w-3" />
                  Reasoning
                </div>
                <p className="text-xs font-medium">
                  {document.generation_reasoning_level}
                </p>
              </div>
            )}

            {/* Temperature */}
            {document.generation_temperature !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  Temperature
                </div>
                <p className="text-xs font-medium">
                  {document.generation_temperature}
                </p>
              </div>
            )}

            {/* Max Tokens */}
            {document.generation_max_tokens && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  Max Tokens
                </div>
                <p className="text-xs font-medium">
                  {document.generation_max_tokens.toLocaleString()}
                </p>
              </div>
            )}

            {/* Version */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                Version
              </div>
              <Badge variant="secondary" className="text-xs">v{document.version}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Content */}
      <Card className="flex-1">
        <CardHeader>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'formatted' | 'raw')}>
            <TabsList>
              <TabsTrigger value="formatted">
                <Eye className="h-4 w-4 mr-1" />
                Formatted View
              </TabsTrigger>
              <TabsTrigger value="raw">
                <Code className="h-4 w-4 mr-1" />
                Raw Data
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none" ref={contentRef}>
            {viewMode === 'formatted' ? (
              contentType === 'html' ? (
                // Render HTML content with MermaidDiagram components
                <HTMLContentWithMermaid content={formattedContent} />
              ) : (
                // Render Markdown content
                <MarkdownRenderer 
                  content={formattedContent}
                  enableMermaid={true}
                  className="max-w-none"
                />
              )
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(document.content, null, 2)}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Document"
        description={`Are you sure you want to delete "${document.title}"?\nThis action cannot be undone.`}
        destructive={true}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}