// components/company-intelligence/schema-builder/category-selector.tsx
'use client'

import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { 
  IntelligenceCategory, 
  CATEGORY_DISPLAY_NAMES
} from '@/lib/company-intelligence/types/intelligence-enums'
import { INTELLIGENCE_CATEGORIES } from '@/lib/company-intelligence/types/intelligence-categories'
import type { CategorySelectorProps } from './types'

/**
 * CLAUDE.md COMPLIANT Category Selector
 * - Uses correct lowercase enum values
 * - All categories from intelligence-enums.ts
 * - Tooltips for all UI elements
 */
export function CategorySelector({
  selectedCategories,
  onCategoryToggle,
  maxCategories
}: CategorySelectorProps) {
  // Group categories logically for better UX
  const categoryGroups: Record<string, IntelligenceCategory[]> = {
    'Company Information': [
      IntelligenceCategory.CORPORATE,
      IntelligenceCategory.TEAM,
      IntelligenceCategory.CAREERS
    ],
    'Products & Services': [
      IntelligenceCategory.PRODUCTS,
      IntelligenceCategory.FEATURES,
      IntelligenceCategory.PRICING,
      IntelligenceCategory.INTEGRATIONS
    ],
    'Market & Competition': [
      IntelligenceCategory.COMPETITORS,
      IntelligenceCategory.MARKET_POSITION,
      IntelligenceCategory.PARTNERSHIPS
    ],
    'Customer & Success': [
      IntelligenceCategory.CASE_STUDIES,
      IntelligenceCategory.TESTIMONIALS,
      IntelligenceCategory.CUSTOMER_EXPERIENCE,
      IntelligenceCategory.SOCIAL_PROOF
    ],
    'Technical & Compliance': [
      IntelligenceCategory.TECHNICAL,
      IntelligenceCategory.COMPLIANCE
    ],
    'Content & Resources': [
      IntelligenceCategory.BLOG,
      IntelligenceCategory.RESOURCES,
      IntelligenceCategory.CONTENT,
      IntelligenceCategory.EVENTS
    ],
    'Business & Financial': [
      IntelligenceCategory.INVESTORS,
      IntelligenceCategory.FINANCIAL,
      IntelligenceCategory.COMMERCIAL
    ],
    'Communication': [
      IntelligenceCategory.PRESS,
      IntelligenceCategory.SUPPORT
    ]
  }

  const isMaxReached = selectedCategories.length >= maxCategories

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6">
        {Object.entries(categoryGroups).map(([groupName, categories]) => (
          <div key={groupName} className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              {groupName}
            </h4>
            
            {categories.map(catId => {
              const category = INTELLIGENCE_CATEGORIES[catId]
              if (!category) return null

              const isSelected = selectedCategories.includes(catId)
              const isDisabled = !isSelected && isMaxReached

              return (
                <div
                  key={catId}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border
                    ${isSelected ? 'bg-primary/5 border-primary' : 'border-border'}
                    ${!isDisabled ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50'}
                    transition-colors
                  `}
                  onClick={() => !isDisabled && onCategoryToggle(catId)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    onCheckedChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {CATEGORY_DISPLAY_NAMES[catId]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {category.description}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <TooltipWrapper content={`Base cost: ${category.credits} credits`}>
                      <Badge variant="outline" className="text-xs">
                        {category.credits} credits
                      </Badge>
                    </TooltipWrapper>
                    <TooltipWrapper content={`Priority level ${category.priority}`}>
                      <Badge 
                        variant={category.priority === 1 ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        P{category.priority}
                      </Badge>
                    </TooltipWrapper>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      
      {isMaxReached && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Maximum of {maxCategories} categories reached. Deselect some to add others.
          </p>
        </div>
      )}
    </ScrollArea>
  )
}