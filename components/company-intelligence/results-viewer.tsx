/**
 * Results Viewer Component
 * Displays research results in various formats
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Eye,
  Download,
  Copy,
  Code,
  FileText,
  BarChart3,
  Globe,
  Building2,
  Users,
  Package,
  TrendingUp,
  DollarSign,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { UnifiedPackFormatter } from '@/lib/documents/formatters/unified-pack-formatter'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'

interface ResultsViewerProps {
  result: any
  format?: 'html' | 'json' | 'structured'
  onDownload?: (format: string) => void
  onCopy?: () => void
  className?: string
}

export function ResultsViewer({
  result,
  format = 'html',
  onDownload,
  onCopy,
  className
}: ResultsViewerProps) {
  const [viewFormat, setViewFormat] = useState(format)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [htmlContent, setHtmlContent] = useState('')
  const [mermaidInitialized, setMermaidInitialized] = useState(false)

  // Initialize Mermaid
  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        themeVariables: {
          primaryColor: '#10b981',
          primaryBorderColor: '#059669',
          primaryTextColor: '#fff',
          lineColor: '#6b7280',
          secondaryColor: '#3b82f6',
          tertiaryColor: '#8b5cf6',
          background: '#ffffff',
          mainBkg: '#f3f4f6',
          secondBkg: '#e5e7eb',
          tertiaryBkg: '#d1d5db'
        }
      })
      setMermaidInitialized(true)
    }
  }, [mermaidInitialized])

  // Format result as HTML
  useEffect(() => {
    if (result && viewFormat === 'html') {
      const formatter = new UnifiedPackFormatter()
      const formatted = formatter.format(result, { format: 'html' })
      
      // Sanitize HTML
      const sanitized = DOMPurify.sanitize(formatted, {
        ADD_TAGS: ['style'],
        ADD_ATTR: ['class', 'style'],
        ALLOW_DATA_ATTR: true
      })
      
      setHtmlContent(sanitized)

      // Render Mermaid diagrams
      setTimeout(() => {
        mermaid.run()
      }, 100)
    }
  }, [result, viewFormat])

  // Handle download
  const handleDownload = (downloadFormat: string) => {
    if (onDownload) {
      onDownload(downloadFormat)
    } else {
      // Default download implementation
      let content = ''
      let filename = `research-${Date.now()}`
      let mimeType = 'text/plain'

      switch (downloadFormat) {
        case 'html':
          content = htmlContent
          filename += '.html'
          mimeType = 'text/html'
          break
        case 'json':
          content = JSON.stringify(result, null, 2)
          filename += '.json'
          mimeType = 'application/json'
          break
        case 'pdf':
          // PDF generation would require additional library
          console.warn('PDF export not yet implemented')
          return
        default:
          content = JSON.stringify(result, null, 2)
          filename += '.txt'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Handle copy
  const handleCopy = () => {
    if (onCopy) {
      onCopy()
    } else {
      const content = viewFormat === 'html' ? htmlContent : JSON.stringify(result, null, 2)
      navigator.clipboard.writeText(content)
    }
  }

  // Get data quality badge
  const getDataQualityBadge = () => {
    if (!result?.metadata?.dataQuality) return null
    
    const quality = result.metadata.dataQuality
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline'
    let icon = <AlertCircle className="w-3 h-3" />
    
    if (quality >= 80) {
      variant = 'default'
      icon = <CheckCircle2 className="w-3 h-3" />
    } else if (quality >= 60) {
      variant = 'secondary'
    } else if (quality >= 40) {
      variant = 'outline'
    } else {
      variant = 'destructive'
    }

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        {quality}% Quality
      </Badge>
    )
  }

  // Render structured view
  const renderStructuredView = () => {
    if (!result) return null

    return (
      <div className="space-y-6">
        {/* Company Overview */}
        {result.basics && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <CardTitle>{result.companyName || result.domain}</CardTitle>
                </div>
                {getDataQualityBadge()}
              </div>
              <CardDescription>{result.basics.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {result.basics.industry && (
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{result.basics.industry}</p>
                  </div>
                )}
                {result.basics.founded && (
                  <div>
                    <p className="text-sm text-muted-foreground">Founded</p>
                    <p className="font-medium">{result.basics.founded}</p>
                  </div>
                )}
                {result.basics.headquarters && (
                  <div>
                    <p className="text-sm text-muted-foreground">Headquarters</p>
                    <p className="font-medium">{result.basics.headquarters}</p>
                  </div>
                )}
                {result.basics.website && (
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <a 
                      href={result.basics.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {result.domain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products & Services */}
        {result.productsServices && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                <CardTitle>Products & Services</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="products">
                <TabsList>
                  <TabsTrigger value="products">
                    Products ({result.productsServices.products?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="services">
                    Services ({result.productsServices.services?.length || 0})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="products">
                  <div className="space-y-3">
                    {result.productsServices.products?.map((product: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="services">
                  <div className="space-y-3">
                    {result.productsServices.services?.map((service: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Market Position */}
        {result.marketPosition && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <CardTitle>Market Position</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.marketPosition.strengths && (
                  <div>
                    <h4 className="font-medium mb-2">Strengths</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.marketPosition.strengths.map((strength: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.marketPosition.competitors && result.marketPosition.competitors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Key Competitors</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.marketPosition.competitors.map((competitor: any, index: number) => (
                        <Badge key={index} variant="outline">
                          {competitor.name || competitor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        {result.metadata && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <CardTitle>Research Metadata</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data Quality</p>
                  <p className="font-medium">{result.metadata.dataQuality}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="font-medium">{result.metadata.confidence}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sources</p>
                  <p className="font-medium">{result.metadata.sources?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {new Date(result.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (!result) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">No results to display</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <CardTitle>Research Results</CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Format Selector */}
            <Tabs value={viewFormat} onValueChange={setViewFormat}>
              <TabsList>
                <TabsTrigger value="structured">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Structured
                </TabsTrigger>
                <TabsTrigger value="html">
                  <FileText className="w-4 h-4 mr-1" />
                  Report
                </TabsTrigger>
                <TabsTrigger value="json">
                  <Code className="w-4 h-4 mr-1" />
                  JSON
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Action Buttons */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy to clipboard</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownload(viewFormat)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download {viewFormat.toUpperCase()}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className={isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[600px]'}>
          {viewFormat === 'structured' && renderStructuredView()}
          
          {viewFormat === 'html' && (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
          
          {viewFormat === 'json' && (
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}