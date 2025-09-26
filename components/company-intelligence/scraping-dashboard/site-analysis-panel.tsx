'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import {
  ChevronDown,
  RefreshCw,
  Download,
  Globe,
  CheckCircle,
  Code,
  Server,
  Shield,
  Search,
  AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SiteAnalyzer, type SiteAnalysis } from '@/components/company-intelligence/site-analyzer'
import { animationVariants } from './types'

interface SiteAnalysisPanelProps {
  domain: string
  analysis: SiteAnalysis | null
  expanded: boolean
  onToggle: () => void
  onAnalysisComplete: (analysis: SiteAnalysis) => void
  onRefresh: () => void
}

export function SiteAnalysisPanel({
  domain,
  analysis,
  expanded,
  onToggle,
  onAnalysisComplete,
  onRefresh
}: SiteAnalysisPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    onRefresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const exportAnalysis = () => {
    if (!analysis) return

    const exportData = {
      timestamp: new Date().toISOString(),
      domain: analysis.domain,
      siteType: analysis.siteType,
      confidence: analysis.confidence,
      technologies: analysis.technologies,
      metadata: analysis.metadata,
      performance: analysis.performance
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `site-analysis-${analysis.domain}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getTechCount = () => {
    if (!analysis) return 0
    return Object.values(analysis.technologies).flat().length
  }

  const getSecurityScore = () => {
    if (!analysis) return 0
    return analysis.technologies.security.length * 20 // Each security header = 20 points
  }

  return (
    <motion.div
      initial={false}
      animate={{
        scale: expanded ? 1 : 0.98,
        opacity: expanded ? 1 : 0.95
      }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "overflow-hidden",
        "bg-gradient-to-br from-blue-50/80 to-blue-50/40",
        "dark:from-blue-950/20 dark:to-blue-950/10",
        "border-blue-200 dark:border-blue-800",
        "shadow-lg shadow-blue-100/50 dark:shadow-blue-900/20"
      )}>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Site Discovery & Analysis</CardTitle>
                <CardDescription className="mt-1">
                  {analysis
                    ? `${analysis.domain} • ${analysis.siteType} • ${getTechCount()} technologies detected`
                    : `Analyze ${domain} to discover technologies and metadata`
                  }
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {analysis && (
                <>
                  {/* Quick stats badges */}
                  <TooltipWrapper content="Detection confidence score">
                    <Badge variant="secondary" className="gap-1">
                      <span className="text-xs">Confidence</span>
                      <span className="font-bold">{Math.round((analysis.confidence || 0) * 100)}%</span>
                    </Badge>
                  </TooltipWrapper>

                  <TooltipWrapper content={`Security score based on ${analysis.technologies.security.length} headers`}>
                    <Badge
                      variant={getSecurityScore() >= 60 ? "default" : "destructive"}
                      className="gap-1"
                    >
                      <Shield className="h-3 w-3" />
                      <span className="font-bold">{getSecurityScore()}%</span>
                    </Badge>
                  </TooltipWrapper>

                  {/* Action buttons */}
                  <TooltipWrapper content="Refresh analysis">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRefresh()
                      }}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={cn(
                        "h-4 w-4",
                        isRefreshing && "animate-spin"
                      )} />
                    </Button>
                  </TooltipWrapper>

                  <TooltipWrapper content="Export analysis data">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        exportAnalysis()
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                </>
              )}

              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </div>
          </div>
        </CardHeader>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="content"
              initial="collapsed"
              animate="open"
              exit="collapsed"
              variants={animationVariants.categoryAnimation}
            >
              <CardContent className="border-t">
                {!analysis ? (
                  // Site analyzer component for initial analysis
                  <div className="py-4">
                    <SiteAnalyzer
                      domain={domain}
                      onAnalysisComplete={onAnalysisComplete}
                    />
                  </div>
                ) : (
                  // Display analysis results in a condensed format
                  <motion.div
                    className="space-y-4 py-4"
                    initial="initial"
                    animate="animate"
                    variants={animationVariants.staggerContainer}
                  >
                    {/* Site Type and Core Info */}
                    <motion.div
                      variants={animationVariants.listItem}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="text-sm px-3 py-1">
                          {analysis.siteType.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {analysis.metadata.title || domain}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Analysis Complete</span>
                      </div>
                    </motion.div>

                    {/* Technology Overview Grid */}
                    <motion.div
                      variants={animationVariants.listItem}
                      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
                    >
                      {Object.entries(analysis.technologies).map(([category, techs]) => {
                        if (techs.length === 0) return null
                        return (
                          <div key={category} className="space-y-1">
                            <span className="text-xs text-muted-foreground capitalize">
                              {category}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {techs.slice(0, 3).map((tech, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tech}
                                </Badge>
                              ))}
                              {techs.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{techs.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </motion.div>

                    {/* SEO & Metadata Summary */}
                    {analysis.metadata.description && (
                      <motion.div
                        variants={animationVariants.listItem}
                        className="p-3 bg-accent/50 rounded-lg"
                      >
                        <span className="text-xs text-muted-foreground">Meta Description</span>
                        <p className="text-sm mt-1 line-clamp-2">
                          {analysis.metadata.description}
                        </p>
                      </motion.div>
                    )}

                    {/* Performance Metrics */}
                    {analysis.performance && (
                      <motion.div
                        variants={animationVariants.listItem}
                        className="flex gap-4 text-sm"
                      >
                        {analysis.performance.loadTime && (
                          <TooltipWrapper content="Page load time">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Load:</span>
                              <span className="font-medium">{analysis.performance.loadTime}ms</span>
                            </div>
                          </TooltipWrapper>
                        )}
                        {analysis.performance.pageSize && (
                          <TooltipWrapper content="Total page size">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Size:</span>
                              <span className="font-medium">
                                {(analysis.performance.pageSize / 1024).toFixed(1)}KB
                              </span>
                            </div>
                          </TooltipWrapper>
                        )}
                        {analysis.performance.requestCount && (
                          <TooltipWrapper content="Number of HTTP requests">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Requests:</span>
                              <span className="font-medium">{analysis.performance.requestCount}</span>
                            </div>
                          </TooltipWrapper>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}