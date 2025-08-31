/**
 * PDF Generation Service
 * Orchestrates HTML formatting and PDF generation
 */

import { PuppeteerPDFGenerator } from './generators/puppeteer-generator'
import { createUnifiedFormatter } from './unified-formatter-adapter'
import { 
  BaseHTMLFormatter,
  RiskRegisterFormatter,
  ProjectPlanFormatter,
  CharterFormatter,
  CommunicationPlanFormatter,
  QualityManagementFormatter,
  TechnicalLandscapeFormatter,
  ComparableProjectsFormatter,
  BacklogFormatter,
  KanbanFormatter,
  GenericFormatter
} from './formatters'
import { 
  DocumentType, 
  PDFOptions, 
  PDFMetadata, 
  GeneratedPDF,
  PDFGenerationResult,
  HTMLFormatterOptions 
} from './types'

export class PDFService {
  private generator: PuppeteerPDFGenerator
  private formatters: Map<DocumentType, typeof BaseHTMLFormatter>
  
  constructor() {
    this.generator = new PuppeteerPDFGenerator()
    this.formatters = new Map()
    
    // Register all formatters (PID and Business Case now use unified formatters)
    // These registrations are kept for the hasFormatter check but won't be used
    // this.registerFormatter('pid', PIDFormatter) // Now using unified formatter
    // this.registerFormatter('business_case', BusinessCaseFormatter) // Now using unified formatter
    this.registerFormatter('risk_register', RiskRegisterFormatter)
    this.registerFormatter('project_plan', ProjectPlanFormatter)
    this.registerFormatter('charter', CharterFormatter)
    this.registerFormatter('communication_plan', CommunicationPlanFormatter)
    this.registerFormatter('quality_management', QualityManagementFormatter)
    this.registerFormatter('technical_landscape', TechnicalLandscapeFormatter)
    this.registerFormatter('comparable_projects', ComparableProjectsFormatter)
    this.registerFormatter('backlog', BacklogFormatter)
    this.registerFormatter('kanban', KanbanFormatter)
  }
  
  /**
   * Register a formatter for a document type
   */
  registerFormatter(type: DocumentType, FormatterClass: typeof BaseHTMLFormatter) {
    this.formatters.set(type, FormatterClass)
  }
  
  /**
   * Generate PDF from content
   */
  async generatePDF(
    documentType: DocumentType,
    content: any,
    projectName: string,
    companyName: string,
    options: PDFOptions = {},
    htmlOptions: HTMLFormatterOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      // Create metadata
      const metadata: PDFMetadata = {
        title: this.generateTitle(documentType, projectName),
        type: documentType,
        projectName,
        companyName,
        version: options.version || 1,
        createdAt: new Date(),
        author: options.author || options.generatedBy || 'User'
      }
      
      // Use unified formatter for all document types
      let formatter: any
      if (documentType === 'pid' || documentType === 'business_case' || 
          documentType === 'risk_register' || documentType === 'technical_landscape' ||
          documentType === 'comparable_projects' || documentType === 'project_plan' ||
          documentType === 'communication_plan' || documentType === 'quality_management' ||
          documentType === 'charter' || documentType === 'backlog' || documentType === 'kanban') {
        formatter = createUnifiedFormatter(
          documentType,
          projectName,
          companyName,
          metadata,
          options,
          htmlOptions
        )
      } else {
        // Get formatter for other document types
        const FormatterClass = this.formatters.get(documentType)
        
        if (!FormatterClass) {
          // Fallback to a generic formatter
          return {
            success: false,
            error: `No formatter registered for document type: ${documentType}`
          }
        }
        
        // Create formatter instance
        formatter = new FormatterClass(
          projectName,
          companyName,
          metadata,
          options,
          htmlOptions
        )
      }
      
      // Format content to HTML
      console.log(`[PDF Service] Formatting ${documentType} with ${Object.keys(content).length} content keys`)
      const html = formatter.formatToHTML(content)
      console.log(`[PDF Service] Generated HTML length: ${html.length} characters`)
      
      // Quick check for major sections
      const sectionCount = (html.match(/<h2/g) || []).length
      console.log(`[PDF Service] Found ${sectionCount} H2 sections in HTML`)
      
      // Debug: Save HTML to file for inspection (in development only)
      if (process.env.NODE_ENV === 'development') {
        const fs = await import('fs/promises')
        const debugPath = `/tmp/pdf-debug-${documentType}-${Date.now()}.html`
        try {
          await fs.writeFile(debugPath, html)
          console.log(`[PDF Service] DEBUG: HTML saved to ${debugPath}`)
        } catch (e) {
          console.log('[PDF Service] DEBUG: Could not save HTML file:', e)
        }
      }
      
      // Generate PDF with metadata
      const pdf = await this.generator.generatePDFWithMetadata(html, metadata, options)
      
      return {
        success: true,
        pdf
      }
      
    } catch (error) {
      console.error('PDF generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  
  /**
   * Generate PDF and save to file
   */
  async generatePDFToFile(
    documentType: DocumentType,
    content: any,
    projectName: string,
    companyName: string,
    outputPath: string,
    options: PDFOptions = {},
    htmlOptions: HTMLFormatterOptions = {}
  ): Promise<PDFGenerationResult> {
    const result = await this.generatePDF(
      documentType,
      content,
      projectName,
      companyName,
      options,
      htmlOptions
    )
    
    if (result.success && result.pdf) {
      const fs = await import('fs/promises')
      await fs.writeFile(outputPath, result.pdf.buffer)
    }
    
    return result
  }
  
  /**
   * Generate title for document
   */
  private generateTitle(documentType: DocumentType, projectName: string): string {
    const typeDisplayMap: Record<DocumentType, string> = {
      'pid': 'Project Initiation Document',
      'business_case': 'Business Case',
      'risk_register': 'Risk Register',
      'project_plan': 'Project Plan',
      'communication_plan': 'Communication Plan',
      'quality_management': 'Quality Management Plan',
      'technical_landscape': 'Technical Landscape',
      'comparable_projects': 'Comparable Projects Analysis',
      'backlog': 'Product Backlog',
      'charter': 'Project Charter',
      'kanban': 'Kanban Board'
    }
    
    const typeDisplay = typeDisplayMap[documentType] || 
                       documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    return `${projectName} - ${typeDisplay}`
  }
  
  /**
   * Get available document types
   */
  getAvailableTypes(): DocumentType[] {
    return Array.from(this.formatters.keys())
  }
  
  /**
   * Check if formatter exists for type
   */
  hasFormatter(type: DocumentType): boolean {
    // PID and Business Case now use unified formatters
    if (type === 'pid' || type === 'business_case') {
      return true
    }
    return this.formatters.has(type)
  }
}

/**
 * Singleton instance
 */
let pdfService: PDFService | null = null

/**
 * Get PDF service instance
 */
export function getPDFService(): PDFService {
  if (!pdfService) {
    pdfService = new PDFService()
  }
  return pdfService
}

