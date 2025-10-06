// components/company-intelligence/schema-builder/cost-estimator.tsx
'use client'

import React, { useMemo } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { AlertCircle, CheckCircle, XCircle, Zap } from 'lucide-react'
import { 
  IntelligenceCategory, 
  IntelligenceDepth,
  DEPTH_CREDIT_COSTS,
  DEPTH_DISPLAY_NAMES,
  CATEGORY_DISPLAY_NAMES
} from '@/lib/company-intelligence/types/intelligence-enums'
import { INTELLIGENCE_CATEGORIES } from '@/lib/company-intelligence/types/intelligence-categories'
import type { CostEstimatorProps } from './types'

/**
 * CLAUDE.md COMPLIANT Cost Estimator
 * CRITICAL: Credits only, NO dollar signs or monetary amounts per CLAUDE.md
 * - Uses correct lowercase enum values
 * - All tooltips included
 */
export function CostEstimator({
  selectedCategories,
  depth,
  estimatedCredits,
  domain
}: CostEstimatorProps) {
  // Calculate detailed breakdown
  const breakdown = useMemo(() => {
    const depthMultiplier = {
      [IntelligenceDepth.QUICK]: 0.5,
      [IntelligenceDepth.STANDARD]: 1,
      [IntelligenceDepth.DEEP]: 2,
      [IntelligenceDepth.COMPETITIVE]: 3
    }[depth] || 1

    return selectedCategories.map(catId => {
      const category = INTELLIGENCE_CATEGORIES[catId]
      if (!category) return null
      
      const baseCredits = category.credits
      const finalCredits = Math.ceil(baseCredits * depthMultiplier)
      
      return {
        categoryId: catId,
        categoryName: CATEGORY_DISPLAY_NAMES[catId],
        baseCredits,
        depthMultiplier,
        finalCredits
      }
    }).filter(Boolean)
  }, [selectedCategories, depth])

  // Calculate totals
  const totals = useMemo(() => {
    const baseCost = DEPTH_CREDIT_COSTS[depth]
    const categoryCredits = breakdown.reduce((sum, item) => sum + (item?.finalCredits || 0), 0)
    const total = baseCost + categoryCredits
    
    return {
      baseCost,
      categoryCredits,
      totalCredits: total
    }
  }, [depth, breakdown])

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Credit Estimation for {domain}</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Depth Base Cost</span>
                <TooltipWrapper content={`Base cost for ${DEPTH_DISPLAY_NAMES[depth]}`}>
                  <Badge variant="outline">{totals.baseCost} credits</Badge>
                </TooltipWrapper>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Category Costs</span>
                <TooltipWrapper content={`Cost for ${selectedCategories.length} categories`}>
                  <Badge variant="outline">{totals.categoryCredits} credits</Badge>
                </TooltipWrapper>
              </div>
              
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Total Estimated</span>
                  <Badge variant="default" className="font-semibold">
                    {totals.totalCredits} credits
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {breakdown.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium mb-3">Category Breakdown</h4>
            
            <div className="space-y-2">
              {breakdown.map(item => (
                <div key={item!.categoryId} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground truncate flex-1 mr-2">
                    {item!.categoryName}
                  </span>
                  <div className="flex items-center gap-2">
                    <TooltipWrapper content={`Base: ${item!.baseCredits}, Multiplier: ${item!.depthMultiplier}x`}>
                      <span className="text-muted-foreground">
                        {item!.baseCredits} × {item!.depthMultiplier}
                      </span>
                    </TooltipWrapper>
                    <Badge variant="secondary" className="text-xs">
                      {item!.finalCredits}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Depth Information */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-medium mb-3">Depth Configuration</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Selected Depth:</span>
              <Badge variant="outline">{DEPTH_DISPLAY_NAMES[depth]}</Badge>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              {depth === IntelligenceDepth.QUICK && (
                <p>Quick scan focuses on homepage and main pages only</p>
              )}
              {depth === IntelligenceDepth.STANDARD && (
                <p>Standard depth covers main sections comprehensively</p>
              )}
              {depth === IntelligenceDepth.DEEP && (
                <p>Deep dive explores all discoverable content</p>
              )}
              {depth === IntelligenceDepth.COMPETITIVE && (
                <p>Competitive analysis performs exhaustive site crawling</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {selectedCategories.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Select at least one category to see accurate credit estimation
          </AlertDescription>
        </Alert>
      )}
      
      {selectedCategories.length > 5 && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Processing {selectedCategories.length} categories may take longer. Consider prioritizing key categories for faster results.
          </AlertDescription>
        </Alert>
      )}
      
      {totals.totalCredits > 100 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            High credit usage detected ({totals.totalCredits} credits). Consider using a shallower depth or fewer categories to reduce costs.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}