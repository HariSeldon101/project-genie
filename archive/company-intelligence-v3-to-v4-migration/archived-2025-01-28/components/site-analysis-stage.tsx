/**
 * Site Analysis Stage Component
 * 
 * Handles the initial website analysis phase of the research process.
 * This component manages site validation, corporate structure detection,
 * and provides approval/rejection controls.
 * 
 * Features:
 * - Domain validation and site analysis
 * - Corporate structure detection
 * - Approval/rejection workflow
 * - Real-time analysis status updates
 * 
 * @component
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Globe,
  Building2,
  AlertCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { cn } from '@/lib/utils'

interface SiteAnalysisResult {
  status: 'valid' | 'invalid' | 'error'
  url?: string
  title?: string
  description?: string
  screenshot?: string
  technologies?: string[]
  corporateIndicators?: {
    hasSubsidiaries?: boolean
    hasBrands?: boolean
    hasLocations?: boolean
    parentCompany?: string
    subsidiaries?: string[]
  }
  error?: string
}

interface SiteAnalysisStageProps {
  /** Analysis results from the API */
  analysisData: SiteAnalysisResult | null
  /** Whether analysis is in progress */
  isAnalyzing: boolean
  /** Callback when user approves the analysis */
  onApprove: () => void
  /** Callback when user rejects the analysis */
  onReject: () => void
  /** Whether approval action is in progress */
  isApproving?: boolean
  /** Custom className for styling */
  className?: string
}

/**
 * Render technology badges with tooltips
 */
function TechnologyBadges({ technologies }: { technologies: string[] }) {
  if (!technologies || technologies.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Detected Technologies:</p>
      <div className="flex flex-wrap gap-2">
        {technologies.map((tech, index) => (
          <TooltipWrapper 
            key={index} 
            content={`Technology stack component: ${tech}`}
          >
            <Badge variant="secondary" className="text-xs">
              {tech}
            </Badge>
          </TooltipWrapper>
        ))}
      </div>
    </div>
  )
}

/**
 * Render corporate structure indicators
 */
function CorporateIndicators({ 
  indicators 
}: { 
  indicators: SiteAnalysisResult['corporateIndicators'] 
}) {
  if (!indicators) return null

  const hasAnyIndicators = 
    indicators.hasSubsidiaries || 
    indicators.hasBrands || 
    indicators.hasLocations

  if (!hasAnyIndicators) return null

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Building2 className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">
        Corporate Structure Detected
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p className="text-sm text-blue-800">
          This appears to be a corporate entity with:
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {indicators.hasSubsidiaries && (
            <TooltipWrapper content="Company has subsidiary companies">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                <Building2 className="w-3 h-3 mr-1" />
                Subsidiaries
              </Badge>
            </TooltipWrapper>
          )}
          {indicators.hasBrands && (
            <TooltipWrapper content="Company manages multiple brands">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                <Sparkles className="w-3 h-3 mr-1" />
                Multiple Brands
              </Badge>
            </TooltipWrapper>
          )}
          {indicators.hasLocations && (
            <TooltipWrapper content="Company has multiple office locations">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                <Globe className="w-3 h-3 mr-1" />
                Multiple Locations
              </Badge>
            </TooltipWrapper>
          )}
        </div>
        {indicators.parentCompany && (
          <p className="text-xs text-blue-700 mt-2">
            Parent Company: <span className="font-medium">{indicators.parentCompany}</span>
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function SiteAnalysisStage({
  analysisData,
  isAnalyzing,
  onApprove,
  onReject,
  isApproving = false,
  className
}: SiteAnalysisStageProps) {
  // Show loading state during analysis
  if (isAnalyzing) {
    return (
      <Card className={cn("border-gray-200 shadow-sm", className)}>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Analyzing website...</p>
          <p className="text-sm text-gray-500 mt-2">
            This may take a few moments
          </p>
        </CardContent>
      </Card>
    )
  }

  // Show error state if analysis failed
  if (analysisData?.status === 'error' || analysisData?.status === 'invalid') {
    return (
      <Card className={cn("border-red-200 shadow-sm", className)}>
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Site Analysis Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {analysisData.error || 'Unable to analyze the website. Please check the URL and try again.'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={onReject} 
            variant="outline"
            className="w-full"
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Show analysis results
  if (analysisData?.status === 'valid') {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Main analysis card */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Site Analysis Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Site details */}
            <div className="space-y-2">
              <p className="font-medium text-gray-900">
                {analysisData.title || 'Website'}
              </p>
              {analysisData.description && (
                <p className="text-sm text-gray-600">
                  {analysisData.description}
                </p>
              )}
              {analysisData.url && (
                <TooltipWrapper content="Analyzed website URL">
                  <a 
                    href={analysisData.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    {analysisData.url}
                  </a>
                </TooltipWrapper>
              )}
            </div>

            {/* Technologies */}
            {analysisData.technologies && (
              <TechnologyBadges technologies={analysisData.technologies} />
            )}

            {/* Screenshot preview */}
            {analysisData.screenshot && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Screenshot:
                </p>
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={analysisData.screenshot} 
                    alt="Website screenshot"
                    className="w-full h-48 object-cover object-top"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Corporate structure detection */}
        {analysisData.corporateIndicators && (
          <CorporateIndicators indicators={analysisData.corporateIndicators} />
        )}

        {/* Action buttons */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <TooltipWrapper content="Reject this analysis and start over">
                <Button 
                  onClick={onReject}
                  variant="outline"
                  className="flex-1"
                  disabled={isApproving}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject & Restart
                </Button>
              </TooltipWrapper>
              
              <TooltipWrapper content="Approve and continue to sitemap discovery">
                <Button 
                  onClick={onApprove}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve & Continue
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </TooltipWrapper>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default empty state
  return (
    <Card className={cn("border-gray-200 shadow-sm", className)}>
      <CardContent className="p-12 text-center text-gray-500">
        <Globe className="w-8 h-8 mx-auto mb-4 text-gray-400" />
        <p>No analysis data available</p>
      </CardContent>
    </Card>
  )
}