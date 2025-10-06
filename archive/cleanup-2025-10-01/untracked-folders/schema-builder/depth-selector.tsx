// components/company-intelligence/schema-builder/depth-selector.tsx
'use client'

import React from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { 
  IntelligenceDepth,
  DEPTH_DISPLAY_NAMES,
  DEPTH_CREDIT_COSTS,
  DEPTH_PAGE_LIMITS
} from '@/lib/company-intelligence/types/intelligence-enums'
import { Globe, Layers, Database, Trophy, AlertCircle } from 'lucide-react'
import type { DepthSelectorProps } from './types'

/**
 * CLAUDE.md COMPLIANT Depth Selector
 * - Uses correct lowercase enum values (quick, standard, deep, competitive)
 * - All tooltips included
 * - No mock data
 */
export function DepthSelector({
  currentDepth,
  onDepthChange,
  domain
}: DepthSelectorProps) {
  const depthOptions = [
    {
      value: IntelligenceDepth.QUICK,
      label: 'Quick Scan',
      description: 'Homepage and key pages only',
      icon: Globe,
      pages: `~${DEPTH_PAGE_LIMITS[IntelligenceDepth.QUICK]} pages`,
      credits: DEPTH_CREDIT_COSTS[IntelligenceDepth.QUICK],
      color: 'text-blue-600'
    },
    {
      value: IntelligenceDepth.STANDARD,
      label: 'Standard',
      description: 'Main sections and important pages',
      icon: Layers,
      pages: `~${DEPTH_PAGE_LIMITS[IntelligenceDepth.STANDARD]} pages`,
      credits: DEPTH_CREDIT_COSTS[IntelligenceDepth.STANDARD],
      color: 'text-green-600'
    },
    {
      value: IntelligenceDepth.DEEP,
      label: 'Deep Dive',
      description: 'All discoverable pages and subpages',
      icon: Database,
      pages: `~${DEPTH_PAGE_LIMITS[IntelligenceDepth.DEEP]} pages`,
      credits: DEPTH_CREDIT_COSTS[IntelligenceDepth.DEEP],
      color: 'text-orange-600'
    },
    {
      value: IntelligenceDepth.COMPETITIVE,
      label: 'Competitive Analysis',
      description: 'Full site analysis for competitive intelligence',
      icon: Trophy,
      pages: `~${DEPTH_PAGE_LIMITS[IntelligenceDepth.COMPETITIVE]} pages`,
      credits: DEPTH_CREDIT_COSTS[IntelligenceDepth.COMPETITIVE],
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Extraction Depth for {domain}</h4>
        <RadioGroup value={currentDepth} onValueChange={(value) => onDepthChange(value as IntelligenceDepth)}>
          <div className="grid grid-cols-2 gap-3">
            {depthOptions.map(option => {
              const Icon = option.icon
              return (
                <Card 
                  key={option.value}
                  className={currentDepth === option.value ? 'border-primary' : ''}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${option.color}`} />
                          <span className="font-medium">{option.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {option.description}
                        </p>
                        <div className="flex gap-2">
                          <TooltipWrapper content="Approximate number of pages to crawl">
                            <Badge variant="outline" className="text-xs">
                              {option.pages}
                            </Badge>
                          </TooltipWrapper>
                          <TooltipWrapper content="Base credit cost for this depth">
                            <Badge variant="secondary" className="text-xs">
                              {option.credits} credits
                            </Badge>
                          </TooltipWrapper>
                        </div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </RadioGroup>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Selected:</strong> {DEPTH_DISPLAY_NAMES[currentDepth]}<br/>
          <strong>Estimated pages:</strong> {DEPTH_PAGE_LIMITS[currentDepth]}<br/>
          <strong>Base cost:</strong> {DEPTH_CREDIT_COSTS[currentDepth]} credits
        </AlertDescription>
      </Alert>

      <div className="text-sm text-muted-foreground space-y-1">
        <p><strong>Quick:</strong> Best for getting an overview quickly</p>
        <p><strong>Standard:</strong> Recommended for most use cases</p>
        <p><strong>Deep:</strong> Comprehensive extraction for detailed analysis</p>
        <p><strong>Competitive:</strong> Full site crawl for competitive intelligence</p>
      </div>
    </div>
  )
}