'use client'

/**
 * MermaidDiagram - Reusable React component for rendering Mermaid diagrams
 * Features error boundaries, lazy loading, and graceful fallbacks
 */

import React, { useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, Download, Loader2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { permanentLogger } from '@/lib/utils/permanent-logger'
// Only import types at module level, not the service itself
import type { MermaidTheme, MermaidRenderResult } from '@/lib/utils/mermaid-types'

export interface MermaidDiagramProps {
  definition: string
  type?: string
  title?: string
  fallback?: ReactNode
  onError?: (error: Error) => void
  onSuccess?: (svg: string) => void
  className?: string
  containerClassName?: string
  theme?: MermaidTheme
  showControls?: boolean
  cache?: boolean
  lazy?: boolean
  height?: string | number
  width?: string | number
}

export function MermaidDiagram({
  definition,
  type = 'auto',
  title,
  fallback,
  onError,
  onSuccess,
  className,
  containerClassName,
  theme,
  showControls = false,
  cache = true,
  lazy = false,
  height,
  width
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [hasRendered, setHasRendered] = useState(false)

  // Simple, robust Mermaid rendering using mermaid.render() to avoid DOM issues
  useEffect(() => {
    if (!definition || !containerRef.current) return

    const renderDiagram = async () => {
      try {
        // Import mermaid
        const mermaid = (await import('mermaid')).default

        // Initialize with safe settings
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          logLevel: 'error'
        })

        // Generate a truly unique ID to avoid conflicts
        const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`

        try {
          // Check if this is a beta diagram that might have rendering issues
          const isBetaDiagram = definition.trim().startsWith('block-beta') ||
                                definition.trim().startsWith('packet-beta') ||
                                definition.trim().startsWith('architecture-beta') ||
                                definition.trim().startsWith('sankey-beta') ||
                                definition.trim().startsWith('xychart-beta')

          // Use mermaid.render() instead of mermaid.run() to avoid circular reference issues
          // This returns SVG directly without querying the DOM
          // Wrap in try-catch with JSON.stringify protection for beta diagrams
          let svg: string

          if (isBetaDiagram) {
            // For beta diagrams, use extra protection against circular references
            try {
              const renderResult = await mermaid.render(uniqueId, definition)
              svg = renderResult.svg
            } catch (betaError: any) {
              // If the beta diagram fails with circular reference, show a fallback
              if (betaError?.message?.includes('circular') || betaError?.message?.includes('Duplicate id')) {
                console.warn(`Beta diagram ${type} rendering issue:`, betaError?.message)
                svg = `
                  <div style="padding: 1rem; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 0.375rem;">
                    <strong>Beta Feature:</strong> This diagram type is experimental and may have rendering issues.
                    <br/><br/>
                    <pre style="background: white; padding: 0.5rem; border-radius: 0.25rem; overflow-x: auto; font-size: 0.75rem;">${definition.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                  </div>
                `
              } else {
                throw betaError
              }
            }
          } else {
            const renderResult = await mermaid.render(uniqueId, definition)
            svg = renderResult.svg
          }

          // Insert the SVG directly into the container
          if (containerRef.current) {
            containerRef.current.innerHTML = svg
            setHasRendered(true)

            if (onSuccess) {
              onSuccess(svg)
            }
          }
        } catch (renderError: any) {
          // Handle duplicate ID error by trying with a new ID
          if (renderError?.message?.includes('Duplicate id')) {
            const retryId = `mermaid-retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            const { svg } = await mermaid.render(retryId, definition)

            if (containerRef.current) {
              containerRef.current.innerHTML = svg
              setHasRendered(true)

              if (onSuccess) {
                onSuccess(svg)
              }
            }
          } else {
            // For other errors, show a simple error message
            if (containerRef.current) {
              containerRef.current.innerHTML = `
                <div style="padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 0.375rem;">
                  <strong>Diagram Error:</strong> ${renderError?.message || 'Failed to render diagram'}
                </div>
              `
            }
            if (onError) onError(renderError as Error)
          }
        }

      } catch (error) {
        console.error('Failed to load Mermaid:', (error as Error)?.message || 'Unknown error')
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 0.375rem;">
              <strong>Loading Error:</strong> ${(error as Error)?.message || 'Failed to load Mermaid library'}
            </div>
          `
        }
        if (onError) onError(error as Error)
      }
    }

    renderDiagram()
  }, [definition]) // Only re-render when definition changes

  // Handle export
  const handleExport = useCallback(async (format: 'svg' | 'png') => {
    // The container now directly contains the SVG
    const svg = containerRef.current?.querySelector('svg') || containerRef.current?.firstElementChild as SVGElement
    if (!svg || !(svg instanceof SVGElement)) return

    try {
      const svgString = svg.outerHTML
      // Dynamically import mermaidService only when needed
      const { mermaidService } = await import('@/lib/services/mermaid-service')
      const blob = await mermaidService.exportToImage(svgString, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || 'diagram'}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      permanentLogger.captureError('MERMAID_COMPONENT', error as Error, {
        stage: 'export',
        format
      })
    }
  }, [title])

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!definition) return

    try {
      await navigator.clipboard.writeText(definition)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      permanentLogger.captureError('MERMAID_COMPONENT', error as Error, {
        stage: 'copy_to_clipboard'
      })
    }
  }, [definition])


  // Render diagram with optional controls
  return (
    <div className={cn('mermaid-diagram-wrapper', containerClassName)}>
      {/* Title */}
      {title && (
        <h3 className="text-lg font-semibold mb-3 text-gray-800">{title}</h3>
      )}

      {/* Controls */}
      {showControls && hasRendered && (
        <div className="flex items-center gap-2 mb-3">
          <TooltipWrapper content="Export diagram as SVG file">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport('svg')}
              className="text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              SVG
            </Button>
          </TooltipWrapper>
          <TooltipWrapper content="Export diagram as PNG image">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport('png')}
              className="text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              PNG
            </Button>
          </TooltipWrapper>
          <TooltipWrapper content="Copy diagram definition to clipboard">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="text-xs"
            >
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </TooltipWrapper>
        </div>
      )}

      {/* Diagram container */}
      <div
        ref={containerRef}
        className={cn(
          'mermaid-container overflow-x-auto',
          className
        )}
        style={{
          height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
          width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined
        }}
      />

      <style jsx>{`
        .mermaid-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
        }

        .mermaid-container svg {
          max-width: 100%;
          height: auto;
        }

        .dark .mermaid-container {
          background: #1f2937;
        }

        /* Override Mermaid default styles */
        .mermaid-container .node rect,
        .mermaid-container .node circle,
        .mermaid-container .node ellipse,
        .mermaid-container .node polygon {
          fill: #f3f4f6;
          stroke: #6b7280;
          stroke-width: 2px;
        }

        .mermaid-container .node.clickable {
          cursor: pointer;
        }

        .mermaid-container .edgeLabel {
          background-color: white;
          padding: 2px 4px;
          border-radius: 2px;
        }

        /* Print styles */
        @media print {
          .mermaid-diagram-wrapper button {
            display: none;
          }

          .mermaid-container {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}

// Error boundary component for additional safety
export class MermaidErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    permanentLogger.captureError('MERMAID_ERROR_BOUNDARY', error, {
      hasComponentStack: !!errorInfo.componentStack,
      stackLength: errorInfo.componentStack?.length || 0,
      component: 'MermaidErrorBoundary'
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card className="border-red-200 bg-red-50 p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Diagram Error</p>
                <p className="text-sm text-red-600 mt-1">
                  {this.state.error?.message || 'An unexpected error occurred while rendering the diagram.'}
                </p>
              </div>
            </div>
          </Card>
        )
      )
    }

    return this.props.children
  }
}

// Wrapper component with error boundary
export function SafeMermaidDiagram(props: MermaidDiagramProps) {
  return (
    <MermaidErrorBoundary fallback={props.fallback}>
      <MermaidDiagram {...props} />
    </MermaidErrorBoundary>
  )
}