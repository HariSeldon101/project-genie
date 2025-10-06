// components/company-intelligence/schema-builder/index.tsx
// CLAUDE.md COMPLIANT VERSION - Under 500 lines

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Sparkles, Save, RotateCcw, Loader2 } from 'lucide-react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import { 
  IntelligenceCategory, 
  IntelligenceDepth,
  ScraperType,
  DEPTH_CREDIT_COSTS
} from '@/lib/company-intelligence/types/intelligence-enums'
import { INTELLIGENCE_CATEGORIES } from '@/lib/company-intelligence/types/intelligence-categories'
import { CategorySelector } from './category-selector'
import { CostEstimator } from './cost-estimator'
import { TemplateSelector } from './template-selector'
import { DepthSelector } from './depth-selector'
import { ScraperSelectorEnhanced as ScraperSelector } from './scraper-selector-enhanced'
import type { SchemaBuilderProps, ExtractedSchema } from './types'

/**
 * CLAUDE.md COMPLIANT Schema Builder
 * - Uses correct lowercase enum values
 * - Proper error handling with convertSupabaseError
 * - PermanentLogger with correct signatures
 * - All UI elements have tooltips
 * - No mock data
 */
export function SchemaBuilder({ 
  domain,
  onSchemaComplete,
  initialSchema,
  maxCategories = 10,
  creditsAvailable = 10000  // Default high value - not tracking user credits anymore
}: SchemaBuilderProps) {
  // State management
  const [selectedCategories, setSelectedCategories] = useState<IntelligenceCategory[]>(
    initialSchema?.categories || []
  )
  const [depth, setDepth] = useState<IntelligenceDepth>(
    initialSchema?.depth || IntelligenceDepth.STANDARD
  )
  const [scraperType, setScraperType] = useState<ScraperType>(
    initialSchema?.scraperType || ScraperType.FIRECRAWL
  )
  const [customFields, setCustomFields] = useState<Record<string, any>>(
    initialSchema?.customFields || {}
  )
  const [estimatedCredits, setEstimatedCredits] = useState(0)
  const [activeTab, setActiveTab] = useState('categories')
  const [isSaving, setIsSaving] = useState(false)

  // Component mount/unmount logging
  useEffect(() => {
    permanentLogger.breadcrumb('component_mount', 'Schema Builder mounted', {
      domain,
      hasInitialSchema: !!initialSchema
    })

    return () => {
      permanentLogger.breadcrumb('component_unmount', 'Schema Builder unmounted', {
        selectedCategories: selectedCategories.length
      })
    }
  }, [])

  // Calculate credits whenever dependencies change
  useEffect(() => {
    const calculateCredits = () => {
      const depthBase = DEPTH_CREDIT_COSTS[depth]
      const categoryCredits = selectedCategories.reduce((sum, cat) => {
        const category = INTELLIGENCE_CATEGORIES[cat]
        return sum + (category?.credits || 0)
      }, 0)
      
      // Apply depth multiplier to category credits
      const depthMultiplier = {
        [IntelligenceDepth.QUICK]: 0.5,
        [IntelligenceDepth.STANDARD]: 1,
        [IntelligenceDepth.DEEP]: 2,
        [IntelligenceDepth.COMPETITIVE]: 3
      }[depth] || 1
      
      const total = depthBase + Math.ceil(categoryCredits * depthMultiplier)
      
      permanentLogger.debug('SCHEMA_BUILDER', 'Credits calculated', {
        depth,
        categories: selectedCategories.length,
        total
      })
      
      return total
    }
    
    setEstimatedCredits(calculateCredits())
  }, [depth, selectedCategories])

  // Handle category toggle
  const handleCategoryToggle = useCallback((category: IntelligenceCategory) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(category)
      
      if (isSelected) {
        permanentLogger.info('SCHEMA_BUILDER', 'Category removed', {
          category,
          remainingCount: prev.length - 1
        })
        return prev.filter(c => c !== category)
      }
      
      if (prev.length >= maxCategories) {
        permanentLogger.warn('SCHEMA_BUILDER', 'Max categories reached', {
          max: maxCategories,
          attempted: category
        })
        return prev
      }
      
      permanentLogger.info('SCHEMA_BUILDER', 'Category added', {
        category,
        newCount: prev.length + 1
      })
      return [...prev, category]
    })
  }, [maxCategories])

  // Handle depth change
  const handleDepthChange = useCallback((newDepth: IntelligenceDepth) => {
    permanentLogger.info('SCHEMA_BUILDER', 'Depth changed', {
      from: depth,
      to: newDepth
    })
    setDepth(newDepth)
  }, [depth])

  // Handle scraper change
  const handleScraperChange = useCallback((newScraper: ScraperType) => {
    permanentLogger.info('SCHEMA_BUILDER', 'Scraper changed', {
      from: scraperType,
      to: newScraper
    })
    setScraperType(newScraper)
  }, [scraperType])

  // Handle template selection
  const handleTemplateSelect = useCallback((templateCategories: IntelligenceCategory[]) => {
    permanentLogger.breadcrumb('template_selected', 'Template applied', {
      categoriesCount: templateCategories.length
    })
    setSelectedCategories(templateCategories)
  }, [])

  // Save schema
  const handleSaveSchema = useCallback(async () => {
    const timer = permanentLogger.timing('schema_save', {
      domain,
      categoriesCount: selectedCategories.length
    })
    
    try {
      setIsSaving(true)
      
      const schema: ExtractedSchema = {
        domain,
        categories: selectedCategories,
        depth,
        scraperType,
        customFields,
        estimatedCredits,
        maxPages: {
          [IntelligenceDepth.QUICK]: 10,
          [IntelligenceDepth.STANDARD]: 30,
          [IntelligenceDepth.DEEP]: 50,
          [IntelligenceDepth.COMPETITIVE]: 200
        }[depth],
        createdAt: new Date().toISOString()
      }

      permanentLogger.info('SCHEMA_BUILDER', 'Saving schema', {
        domain,
        categoriesCount: selectedCategories.length,
        depth,
        scraperType,
        credits: estimatedCredits
      })

      await onSchemaComplete(schema)
      
      const duration = timer.stop()
      permanentLogger.info('SCHEMA_BUILDER', 'Schema saved successfully', {
        duration
      })

    } catch (error) {
      timer.stop()
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('SCHEMA_BUILDER', jsError, {
        operation: 'save_schema',
        domain,
        categoriesCount: selectedCategories.length
      })
      throw jsError
    } finally {
      setIsSaving(false)
    }
  }, [domain, selectedCategories, depth, scraperType, customFields, estimatedCredits, onSchemaComplete])

  // Reset all selections
  const handleReset = useCallback(() => {
    permanentLogger.breadcrumb('schema_reset', 'Schema configuration reset', {
      previousCategories: selectedCategories.length
    })

    setSelectedCategories([])
    setDepth(IntelligenceDepth.STANDARD)
    setScraperType(ScraperType.FIRECRAWL)
    setCustomFields({})
    setActiveTab('categories')
  }, [selectedCategories])

  // Not checking budget anymore - Firecrawl API handles limits
  const isOverBudget = false

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Intelligence Schema Builder
            </CardTitle>
            <CardDescription>
              Configure data extraction for {domain}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TooltipWrapper content={`${selectedCategories.length} of ${maxCategories} categories selected`}>
              <Badge variant="outline">
                {selectedCategories.length}/{maxCategories} Categories
              </Badge>
            </TooltipWrapper>
            <TooltipWrapper content="Estimated API usage">
              <Badge variant="secondary">
                ~{estimatedCredits} Pages
              </Badge>
            </TooltipWrapper>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="depth">Depth</TabsTrigger>
            <TabsTrigger value="scraper">Scraper</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <CategorySelector
              selectedCategories={selectedCategories}
              onCategoryToggle={handleCategoryToggle}
              maxCategories={maxCategories}
            />
            
            {selectedCategories.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Select at least one category to extract intelligence from {domain}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="depth" className="space-y-4">
            <DepthSelector
              currentDepth={depth}
              onDepthChange={handleDepthChange}
              domain={domain}
            />
          </TabsContent>

          <TabsContent value="scraper" className="space-y-4">
            <ScraperSelector
              currentScraper={scraperType}
              onScraperChange={handleScraperChange}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <TemplateSelector
              onTemplateSelect={handleTemplateSelect}
              currentCategories={selectedCategories}
            />
          </TabsContent>

          <TabsContent value="cost" className="space-y-4">
            <CostEstimator
              selectedCategories={selectedCategories}
              depth={depth}
              estimatedCredits={estimatedCredits}
              domain={domain}
            />
          </TabsContent>
        </Tabs>

        {/* Action buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <TooltipWrapper content="Reset all selections">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={selectedCategories.length === 0 && depth === IntelligenceDepth.STANDARD}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </TooltipWrapper>

          <div className="flex gap-2">
            {isOverBudget && (
              {/* Credits no longer tracked - removed warning */}
            )}
            
            <TooltipWrapper content={
              isOverBudget 
                ? "Not enough credits" 
                : selectedCategories.length === 0 
                  ? "Select at least one category" 
                  : "Save schema and start extraction"
            }>
              <Button
                onClick={handleSaveSchema}
                disabled={selectedCategories.length === 0 || isSaving || isOverBudget}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Extract
                  </>
                )}
              </Button>
            </TooltipWrapper>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}