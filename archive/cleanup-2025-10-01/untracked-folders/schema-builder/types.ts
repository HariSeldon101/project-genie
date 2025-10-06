// components/company-intelligence/schema-builder/types.ts
/**
 * Schema Builder Type Definitions
 * CLAUDE.md COMPLIANT - Centralized types for schema builder
 */

import { 
  IntelligenceCategory, 
  IntelligenceDepth,
  ScraperType 
} from '@/lib/company-intelligence/types/intelligence-enums'

export interface SchemaBuilderProps {
  domain: string
  onSchemaComplete: (schema: ExtractedSchema) => Promise<void>
  initialSchema?: ExtractedSchema
  maxCategories?: number
  creditsAvailable?: number
}

export interface ExtractedSchema {
  domain: string
  categories: IntelligenceCategory[]
  depth: IntelligenceDepth
  scraperType?: ScraperType
  customFields?: Record<string, any>
  estimatedCredits: number
  maxPages?: number
  createdAt: string
  updatedAt?: string
}

export interface CategorySelectorProps {
  selectedCategories: IntelligenceCategory[]
  onCategoryToggle: (category: IntelligenceCategory) => void
  maxCategories: number
}

export interface DepthSelectorProps {
  currentDepth: IntelligenceDepth
  onDepthChange: (depth: IntelligenceDepth) => void
  domain: string
}

export interface ScraperSelectorProps {
  currentScraper: ScraperType
  onScraperChange: (scraper: ScraperType) => void
}

export interface CostEstimatorProps {
  selectedCategories: IntelligenceCategory[]
  depth: IntelligenceDepth
  estimatedCredits: number
  domain: string
}

export interface TemplateSelectorProps {
  onTemplateSelect: (categories: IntelligenceCategory[]) => void
  currentCategories: IntelligenceCategory[]
}

export interface SchemaTemplate {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  credits: number
  categories: IntelligenceCategory[]
}