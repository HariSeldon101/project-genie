/**
 * Generation Stage Component
 * 
 * Handles the final report generation phase of the research process.
 * This component manages the generation of research reports with
 * progress tracking and action controls.
 * 
 * Features:
 * - Report generation initiation
 * - Real-time progress tracking
 * - Success/error state handling
 * - Preview and download capabilities
 * 
 * @component
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  Sparkles
} from 'lucide-react'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { cn } from '@/lib/utils'

interface GenerationStageProps {
  /** Whether generation is in progress */
  isGenerating: boolean
  /** Generated report data */
  reportData?: {
    id?: string
    title?: string
    format?: string
    size?: number
    url?: string
  }
  /** Error message if generation failed */
  error?: string
  /** Callback to start generation */
  onGenerate: () => void
  /** Callback to download the report */
  onDownload?: () => void
  /** Callback to preview the report */
  onPreview?: () => void
  /** Number of data points collected */
  dataPointsCount?: number
  /** Custom className for styling */
  className?: string
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Render generation progress state
 */
function GenerationProgress() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
          <div className="space-y-1">
            <p className="font-medium text-gray-900">Generating Research Report</p>
            <p className="text-sm text-gray-600">
              Analyzing data and creating comprehensive insights...
            </p>
          </div>
        </div>
      </div>
      
      {/* Progress indicators */}
      <div className="px-4 pb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing collected data...</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Generating insights and recommendations...</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Formatting final report...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Render successful generation state
 */
function GenerationSuccess({ 
  reportData, 
  onDownload, 
  onPreview 
}: {
  reportData: GenerationStageProps['reportData']
  onDownload?: () => void
  onPreview?: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
          <div className="space-y-1">
            <p className="font-medium text-gray-900">Report Generated Successfully!</p>
            <p className="text-sm text-gray-600">
              Your research report is ready for review
            </p>
          </div>
        </div>
      </div>

      {/* Report details */}
      {reportData && (
        <div className="px-4 pb-4 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Report Title:</span>
              <span className="text-sm font-medium">
                {reportData.title || 'Research Report'}
              </span>
            </div>
            {reportData.format && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Format:</span>
                <Badge variant="secondary" className="text-xs">
                  {reportData.format.toUpperCase()}
                </Badge>
              </div>
            )}
            {reportData.size && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Size:</span>
                <span className="text-sm">
                  {formatFileSize(reportData.size)}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {onPreview && (
              <TooltipWrapper content="Preview the report in your browser">
                <Button 
                  onClick={onPreview}
                  variant="outline"
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </TooltipWrapper>
            )}
            {onDownload && (
              <TooltipWrapper content="Download the report to your device">
                <Button 
                  onClick={onDownload}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </TooltipWrapper>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function GenerationStage({
  isGenerating,
  reportData,
  error,
  onGenerate,
  onDownload,
  onPreview,
  dataPointsCount = 0,
  className
}: GenerationStageProps) {
  // Show generation in progress
  if (isGenerating) {
    return (
      <Card className={cn("border-blue-200 shadow-sm", className)}>
        <CardHeader className="border-b bg-blue-50/50">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Generating Intelligence Report
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <GenerationProgress />
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className={cn("border-red-200 shadow-sm", className)}>
        <CardHeader className="border-b bg-red-50/50">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            Generation Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={onGenerate}
            variant="outline"
            className="w-full mt-4"
          >
            Retry Generation
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Show success state
  if (reportData) {
    return (
      <Card className={cn("border-green-200 shadow-sm", className)}>
        <CardHeader className="border-b bg-green-50/50">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            Report Ready
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <GenerationSuccess 
            reportData={reportData}
            onDownload={onDownload}
            onPreview={onPreview}
          />
        </CardContent>
      </Card>
    )
  }

  // Default state - ready to generate
  return (
    <Card className={cn("border-gray-200 shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          Ready to Generate Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data summary */}
        {dataPointsCount > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <span className="font-medium">{dataPointsCount} data points</span> collected and ready for analysis
            </AlertDescription>
          </Alert>
        )}

        {/* Generation info */}
        <div className="space-y-2 text-sm text-gray-600">
          <p>The final report will include:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Executive summary and key findings</li>
            <li>Detailed company analysis</li>
            <li>Market positioning and competitive landscape</li>
            <li>Technology stack and digital presence</li>
            <li>Strategic recommendations</li>
          </ul>
        </div>

        {/* Generate button */}
        <TooltipWrapper content="Generate comprehensive research report from collected data">
          <Button 
            onClick={onGenerate}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Intelligence Report
          </Button>
        </TooltipWrapper>
      </CardContent>
    </Card>
  )
}