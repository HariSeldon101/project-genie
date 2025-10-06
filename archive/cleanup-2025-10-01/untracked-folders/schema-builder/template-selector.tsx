// components/company-intelligence/schema-builder/template-selector.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { 
  IntelligenceCategory,
  CATEGORY_DISPLAY_NAMES
} from '@/lib/company-intelligence/types/intelligence-enums'
import { 
  Briefcase, 
  ShoppingCart, 
  Users, 
  Code, 
  TrendingUp,
  Building
} from 'lucide-react'
import type { TemplateSelectorProps, SchemaTemplate } from './types'

/**
 * CLAUDE.md COMPLIANT Template Selector
 * - Uses correct lowercase enum values
 * - All templates use valid categories from intelligence-enums.ts
 * - All UI elements have tooltips
 */
export function TemplateSelector({
  onTemplateSelect,
  currentCategories
}: TemplateSelectorProps) {
  const templates: SchemaTemplate[] = [
    {
      id: 'basic',
      name: 'Basic Overview',
      description: 'Essential company information',
      icon: Building,
      credits: 5,
      categories: [
        IntelligenceCategory.CORPORATE,
        IntelligenceCategory.TEAM,
        IntelligenceCategory.PRODUCTS
      ]
    },
    {
      id: 'product',
      name: 'Product Focus',
      description: 'Products, pricing, and features',
      icon: ShoppingCart,
      credits: 10,
      categories: [
        IntelligenceCategory.PRODUCTS,
        IntelligenceCategory.PRICING,
        IntelligenceCategory.FEATURES,
        IntelligenceCategory.INTEGRATIONS
      ]
    },
    {
      id: 'competitive',
      name: 'Competitive Analysis',
      description: 'Market position and competitors',
      icon: TrendingUp,
      credits: 15,
      categories: [
        IntelligenceCategory.COMPETITORS,
        IntelligenceCategory.MARKET_POSITION,
        IntelligenceCategory.PRICING,
        IntelligenceCategory.PRODUCTS,
        IntelligenceCategory.FEATURES
      ]
    },
    {
      id: 'customer',
      name: 'Customer Intelligence',
      description: 'Target market and testimonials',
      icon: Users,
      credits: 12,
      categories: [
        IntelligenceCategory.CASE_STUDIES,
        IntelligenceCategory.TESTIMONIALS,
        IntelligenceCategory.CUSTOMER_EXPERIENCE,
        IntelligenceCategory.SOCIAL_PROOF
      ]
    },
    {
      id: 'technical',
      name: 'Technical Deep Dive',
      description: 'Technology stack and compliance',
      icon: Code,
      credits: 10,
      categories: [
        IntelligenceCategory.TECHNICAL,
        IntelligenceCategory.INTEGRATIONS,
        IntelligenceCategory.COMPLIANCE,
        IntelligenceCategory.FEATURES
      ]
    },
    {
      id: 'investor',
      name: 'Investor Research',
      description: 'Funding, revenue, and growth',
      icon: Briefcase,
      credits: 18,
      categories: [
        IntelligenceCategory.INVESTORS,
        IntelligenceCategory.FINANCIAL,
        IntelligenceCategory.COMMERCIAL,
        IntelligenceCategory.PARTNERSHIPS,
        IntelligenceCategory.TEAM,
        IntelligenceCategory.PRESS
      ]
    }
  ]

  const isCurrentTemplate = (templateCategories: IntelligenceCategory[]) => {
    if (currentCategories.length !== templateCategories.length) return false
    return templateCategories.every(cat => currentCategories.includes(cat))
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {templates.map(template => {
        const Icon = template.icon
        const isCurrent = isCurrentTemplate(template.categories)
        
        return (
          <Card 
            key={template.id}
            className={isCurrent ? 'border-primary' : ''}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {template.name}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
              
              <div className="flex flex-wrap gap-1">
                {template.categories.slice(0, 3).map(cat => (
                  <TooltipWrapper key={cat} content={CATEGORY_DISPLAY_NAMES[cat]}>
                    <Badge variant="secondary" className="text-xs truncate max-w-[120px]">
                      {CATEGORY_DISPLAY_NAMES[cat].split(' ')[0]}
                    </Badge>
                  </TooltipWrapper>
                ))}
                {template.categories.length > 3 && (
                  <TooltipWrapper content={`${template.categories.length - 3} more categories included`}>
                    <Badge variant="outline" className="text-xs">
                      +{template.categories.length - 3} more
                    </Badge>
                  </TooltipWrapper>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <TooltipWrapper content="Estimated credit cost for this template">
                  <Badge variant="outline">
                    {template.credits} credits
                  </Badge>
                </TooltipWrapper>
                
                <TooltipWrapper content={isCurrent ? 'This template is currently selected' : 'Apply this template'}>
                  <Button
                    size="sm"
                    variant={isCurrent ? "secondary" : "default"}
                    onClick={() => onTemplateSelect(template.categories)}
                    disabled={isCurrent}
                  >
                    {isCurrent ? 'Current' : 'Use Template'}
                  </Button>
                </TooltipWrapper>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}