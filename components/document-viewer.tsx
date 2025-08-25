'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { 
  FileText, 
  Download, 
  Printer, 
  Share2, 
  Eye, 
  Code,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPID } from '@/lib/documents/formatters/pid-formatter'
import { formatBusinessCase } from '@/lib/documents/formatters/business-case-formatter'
import { formatRiskRegister } from '@/lib/documents/formatters/risk-register-formatter'

interface DocumentViewerProps {
  document: {
    id: string
    type: string
    content: any
    title?: string
    status?: 'draft' | 'review' | 'approved' | 'generated'
    metadata?: {
      created_at?: string
      updated_at?: string
      version?: string
      author?: string
      projectName?: string
      companyName?: string
      companyWebsite?: string
    }
  }
  className?: string
  onRefresh?: () => void
  onApprove?: () => void
  isLoading?: boolean
}

export function DocumentViewer({
  document,
  className,
  onRefresh,
  onApprove,
  isLoading = false
}: DocumentViewerProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted')
  const [formattedContent, setFormattedContent] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Format the document content based on type
  useEffect(() => {
    const formatDocument = () => {
      try {
        let formatted = ''
        const content = typeof document.content === 'string' 
          ? JSON.parse(document.content) 
          : document.content

        // Add metadata to content if available
        const enrichedContent = {
          ...content,
          projectName: document.metadata?.projectName || content.projectName,
          companyName: document.metadata?.companyName || content.companyName,
          companyWebsite: document.metadata?.companyWebsite || content.companyWebsite,
          lastUpdated: document.metadata?.updated_at 
            ? new Date(document.metadata.updated_at).toLocaleDateString()
            : new Date().toLocaleDateString(),
          version: document.metadata?.version || '1.0',
          documentOwner: document.metadata?.author || 'Project Manager'
        }

        switch (document.type.toLowerCase()) {
          case 'pid':
          case 'project initiation document':
            formatted = formatPID(enrichedContent)
            break
          case 'business_case':
          case 'business case':
            formatted = formatBusinessCase(enrichedContent)
            break
          case 'risk_register':
          case 'risk register':
            formatted = formatRiskRegister(enrichedContent)
            break
          default:
            // For unknown types, try to display as formatted JSON or raw content
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

  const handlePrint = () => {
    window.print()
  }

  const getStatusIcon = () => {
    switch (document.status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'review':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'draft':
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
        return <FileText className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = () => {
    switch (document.status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Document Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                {document.title || document.type}
              </CardTitle>
              <CardDescription>
                {document.metadata?.projectName && (
                  <span className="block">Project: {document.metadata.projectName}</span>
                )}
                {document.metadata?.updated_at && (
                  <span className="text-xs">
                    Last updated: {new Date(document.metadata.updated_at).toLocaleString()}
                  </span>
                )}
              </CardDescription>
            </div>
            <Badge className={getStatusColor()}>
              {document.status || 'Generated'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
            {onRefresh && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            )}
            {onApprove && document.status !== 'approved' && (
              <Button
                size="sm"
                variant="default"
                onClick={onApprove}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Content */}
      <Card className="min-h-[600px]">
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
          <div className="prose prose-gray dark:prose-invert max-w-none">
            {viewMode === 'formatted' ? (
              <MarkdownRenderer content={formattedContent} />
            ) : (
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">
                  {JSON.stringify(document.content, null, 2)}
                </code>
              </pre>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Export a simple viewer for inline use
export function SimpleDocumentViewer({ content, type }: { content: any, type: string }) {
  const [formattedContent, setFormattedContent] = useState<string>('')

  useEffect(() => {
    try {
      let formatted = ''
      const data = typeof content === 'string' ? JSON.parse(content) : content

      switch (type.toLowerCase()) {
        case 'pid':
          formatted = formatPID(data)
          break
        case 'business_case':
          formatted = formatBusinessCase(data)
          break
        case 'risk_register':
          formatted = formatRiskRegister(data)
          break
        default:
          formatted = `# ${type}\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
      }

      setFormattedContent(formatted)
    } catch (error) {
      console.error('Error formatting:', error)
      setFormattedContent('Error formatting document')
    }
  }, [content, type])

  return <MarkdownRenderer content={formattedContent} />
}