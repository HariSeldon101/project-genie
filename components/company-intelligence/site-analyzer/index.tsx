'use client'

import React, { useState } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import {
  Globe,
  Loader2,
  CheckCircle,
  Code,
  Server,
  Layers,
  Shield,
  FileText,
  AlertCircle,
  Search,
  Sparkles,
  Database,
  Lock,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Technology Logo Mapping
 * Maps technology names to display icons
 */
const getTechIcon = (tech: string) => {
  const techLower = tech.toLowerCase()

  // Frontend frameworks
  if (techLower.includes('react')) return '⚛️'
  if (techLower.includes('next')) return '▲'
  if (techLower.includes('vue')) return '💚'
  if (techLower.includes('angular')) return '🔺'
  if (techLower.includes('svelte')) return '🔥'
  if (techLower.includes('gatsby')) return '🟣'
  if (techLower.includes('nuxt')) return '💚'

  // Backend technologies
  if (techLower.includes('node')) return '🟢'
  if (techLower.includes('python')) return '🐍'
  if (techLower.includes('php')) return '🐘'
  if (techLower.includes('ruby')) return '💎'
  if (techLower.includes('java')) return '☕'
  if (techLower.includes('go')) return '🐹'

  // CMS platforms
  if (techLower.includes('wordpress')) return '🔵'
  if (techLower.includes('drupal')) return '💧'
  if (techLower.includes('joomla')) return '🟠'
  if (techLower.includes('shopify')) return '🛍️'
  if (techLower.includes('wix')) return '⚡'
  if (techLower.includes('squarespace')) return '⬛'

  // Databases
  if (techLower.includes('mysql')) return '🐬'
  if (techLower.includes('postgres')) return '🐘'
  if (techLower.includes('mongodb')) return '🍃'
  if (techLower.includes('redis')) return '🔴'

  // Default
  return '🔧'
}

interface SiteAnalyzerProps {
  initialDomain?: string
  onAnalysisComplete?: (analysis: any) => void
  disabled?: boolean
}

export function SiteAnalyzer({
  initialDomain = '',
  onAnalysisComplete = () => {},
  disabled = false
}: SiteAnalyzerProps) {
  const [domain, setDomain] = useState(initialDomain)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [analysisData, setAnalysisData] = useState<any>(null)

  const handleAnalyze = async () => {
    setError('')
    setIsAnalyzing(true)

    try {
      permanentLogger.info('SITE_ANALYZER', 'Starting analysis', { domain })

      // Call the API endpoint
      const response = await fetch('/api/company-intelligence/v4/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Analysis failed: ${response.statusText}`)
      }

      const data = await response.json()

      permanentLogger.info('SITE_ANALYZER', 'Analysis completed', {
        domain,
        technologiesFound: data.technologies
      })

      // Store the analysis data locally for display
      setAnalysisData(data)

      // Pass to parent component
      onAnalysisComplete(data)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed'
      permanentLogger.captureError('SITE_ANALYZER', err as Error, { domain })
      setError(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Analysis Input Section */}
      {!analysisData && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Site Technology Analysis</CardTitle>
                <CardDescription>
                  Discover technologies, frameworks, and infrastructure
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter domain (e.g., example.com)"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={disabled || isAnalyzing}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && domain && !isAnalyzing) {
                      handleAnalyze()
                    }
                  }}
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={!domain || isAnalyzing || disabled}
                  className="min-w-[120px]"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results Display */}
      {analysisData && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Success Header */}
            <Card className="overflow-hidden border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold">Analysis Complete</h3>
                      <p className="text-sm text-muted-foreground">
                        Successfully analyzed {analysisData.domain}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    <Sparkles className="h-4 w-4 mr-1" />
                    {Object.values(analysisData.technologies || {}).flat().length} Technologies
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Technology Stack Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Detected Technology Stack
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Frontend Technologies */}
                {analysisData.technologies?.frontend?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Code className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium">Frontend Technologies</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.technologies.frontend.map((tech: string) => (
                        <TooltipWrapper key={tech} content={`Frontend framework: ${tech}`}>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 rounded-full border border-blue-200 dark:border-blue-800">
                            <span className="text-lg">{getTechIcon(tech)}</span>
                            <span className="text-sm font-medium">{tech}</span>
                          </div>
                        </TooltipWrapper>
                      ))}
                    </div>
                  </div>
                )}

                {/* Backend Technologies */}
                {analysisData.technologies?.backend?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Server className="h-4 w-4 text-purple-600" />
                      <h4 className="font-medium">Backend Technologies</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.technologies.backend.map((tech: string) => (
                        <TooltipWrapper key={tech} content={`Backend technology: ${tech}`}>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/20 rounded-full border border-purple-200 dark:border-purple-800">
                            <span className="text-lg">{getTechIcon(tech)}</span>
                            <span className="text-sm font-medium">{tech}</span>
                          </div>
                        </TooltipWrapper>
                      ))}
                    </div>
                  </div>
                )}

                {/* CMS Platforms */}
                {analysisData.technologies?.cms?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4 text-orange-600" />
                      <h4 className="font-medium">Content Management System</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.technologies.cms.map((tech: string) => (
                        <TooltipWrapper key={tech} content={`CMS platform: ${tech}`}>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/20 rounded-full border border-orange-200 dark:border-orange-800">
                            <span className="text-lg">{getTechIcon(tech)}</span>
                            <span className="text-sm font-medium">{tech}</span>
                          </div>
                        </TooltipWrapper>
                      ))}
                    </div>
                  </div>
                )}

                {/* Security Headers */}
                {analysisData.technologies?.security?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium">Security Headers Detected</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.technologies.security.map((header: string) => (
                        <TooltipWrapper key={header} content={`Security header: ${header}`}>
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            {header}
                          </Badge>
                        </TooltipWrapper>
                      ))}
                    </div>
                  </div>
                )}

                {/* No technologies detected */}
                {(!analysisData.technologies ||
                  Object.values(analysisData.technologies).flat().length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No specific technologies detected</p>
                    <p className="text-sm mt-1">The site may be using custom or unrecognized technology</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Site Metadata */}
            {analysisData.metadata && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Site Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    {analysisData.metadata.title && (
                      <div className="flex justify-between items-start gap-4">
                        <dt className="text-sm font-medium text-muted-foreground min-w-[100px]">Title</dt>
                        <dd className="text-sm flex-1 text-right">{analysisData.metadata.title}</dd>
                      </div>
                    )}
                    {analysisData.metadata.description && (
                      <div className="flex justify-between items-start gap-4">
                        <dt className="text-sm font-medium text-muted-foreground min-w-[100px]">Description</dt>
                        <dd className="text-sm flex-1 text-right">{analysisData.metadata.description}</dd>
                      </div>
                    )}
                    {analysisData.metadata.generator && (
                      <div className="flex justify-between items-start gap-4">
                        <dt className="text-sm font-medium text-muted-foreground min-w-[100px]">Generator</dt>
                        <dd className="text-sm flex-1 text-right">
                          <Badge variant="outline">{analysisData.metadata.generator}</Badge>
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Performance Metrics */}
            {analysisData.performance && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {analysisData.performance.loadTime && (
                      <div className="text-center">
                        <div className="text-2xl font-bold">{analysisData.performance.loadTime}ms</div>
                        <div className="text-xs text-muted-foreground">Load Time</div>
                      </div>
                    )}
                    {analysisData.performance.pageSize && (
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {(analysisData.performance.pageSize / 1024).toFixed(1)}KB
                        </div>
                        <div className="text-xs text-muted-foreground">Page Size</div>
                      </div>
                    )}
                    {analysisData.performance.requestCount && (
                      <div className="text-center">
                        <div className="text-2xl font-bold">{analysisData.performance.requestCount}</div>
                        <div className="text-xs text-muted-foreground">Requests</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

export default SiteAnalyzer