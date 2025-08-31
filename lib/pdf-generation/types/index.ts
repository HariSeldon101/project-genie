/**
 * PDF Generation Types
 */

export interface PDFOptions {
  whiteLabel?: boolean
  watermarkText?: string
  showDraft?: boolean
  classification?: 'CONFIDENTIAL' | 'INTERNAL' | 'PUBLIC'
  headerText?: string
  footerText?: string
  pageNumbers?: boolean
  format?: 'A4' | 'Letter'
  margin?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
  // User profile settings
  userTier?: 'free' | 'basic' | 'premium'
  hideAttribution?: boolean
  watermarkEnabled?: boolean
}

export interface PDFMetadata {
  title: string
  type: string
  projectName: string
  companyName?: string
  version: number
  createdAt: Date
  updatedAt?: Date
  author?: string
}

export interface GeneratedPDF {
  buffer: Buffer
  metadata: PDFMetadata
  pageCount: number
  size: number
}

export interface PDFGenerationResult {
  success: boolean
  pdf?: GeneratedPDF
  error?: string
  cachedUrl?: string
}

export type DocumentType = 
  | 'pid'
  | 'business_case'
  | 'risk_register'
  | 'project_plan'
  | 'communication_plan'
  | 'quality_management'
  | 'technical_landscape'
  | 'comparable_projects'
  | 'backlog'
  | 'charter'
  | 'kanban'

export interface HTMLFormatterOptions {
  includeCharts?: boolean
  includeStyles?: boolean
  theme?: 'light' | 'dark'
}