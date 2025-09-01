/**
 * Unified Formatter Adapter for PDF Generation
 * 
 * This adapter allows the PDF service to use our new unified formatters
 * while maintaining compatibility with the existing PDF generation system.
 * 
 * It wraps the unified formatters to match the interface expected by the PDF service.
 */

import { BaseHTMLFormatter } from './formatters/base-formatter'
import { PDFMetadata, PDFOptions, HTMLFormatterOptions } from './types'

// Import unified formatters
import { UnifiedPIDFormatter } from '../documents/formatters/unified-pid-formatter'
import { UnifiedBusinessCaseFormatter } from '../documents/formatters/unified-business-case-formatter'
import { UnifiedRiskRegisterFormatter } from '../documents/formatters/unified-risk-register-formatter'
import { UnifiedTechnicalLandscapeFormatter } from '../documents/formatters/unified-technical-landscape-formatter'
import { UnifiedComparableProjectsFormatter } from '../documents/formatters/unified-comparable-projects-formatter'
import { UnifiedProjectPlanFormatter } from '../documents/formatters/unified-project-plan-formatter'
import { UnifiedCommunicationPlanFormatter } from '../documents/formatters/unified-communication-plan-formatter'
import { UnifiedQualityManagementFormatter } from '../documents/formatters/unified-quality-management-formatter'
import { UnifiedCharterFormatter } from '../documents/formatters/unified-charter-formatter'
import { UnifiedBacklogFormatter } from '../documents/formatters/unified-backlog-formatter'

/**
 * Adapter class that wraps unified formatters for PDF generation
 */
export class UnifiedFormatterAdapter extends BaseHTMLFormatter {
  private unifiedFormatter: any
  private documentType: string
  
  constructor(
    documentType: string,
    projectName: string,
    companyName: string,
    metadata: PDFMetadata,
    options: PDFOptions = {},
    htmlOptions: HTMLFormatterOptions = {}
  ) {
    super(projectName, companyName, metadata, options, htmlOptions)
    this.documentType = documentType
  }
  
  /**
   * Initialize the appropriate unified formatter based on document type
   */
  private initializeFormatter(content: any) {
    const formatterMetadata = {
      projectName: this.projectName,
      companyName: this.companyName,
      version: this.metadata.version?.toString() || '1',
      date: this.metadata.createdAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      author: this.metadata.author,
      // Pass project dates and budget from options
      startDate: this.options.startDate,
      endDate: this.options.endDate,
      budget: this.options.budget,
      timeline: this.options.timeline
    }
    
    switch (this.documentType) {
      case 'pid':
        this.unifiedFormatter = new UnifiedPIDFormatter(content, formatterMetadata)
        break
      case 'business_case':
        this.unifiedFormatter = new UnifiedBusinessCaseFormatter(content, formatterMetadata)
        break
      case 'risk_register':
        this.unifiedFormatter = new UnifiedRiskRegisterFormatter(content, formatterMetadata)
        break
      case 'technical_landscape':
        this.unifiedFormatter = new UnifiedTechnicalLandscapeFormatter(content, formatterMetadata)
        break
      case 'comparable_projects':
        this.unifiedFormatter = new UnifiedComparableProjectsFormatter(content, formatterMetadata)
        break
      case 'project_plan':
        this.unifiedFormatter = new UnifiedProjectPlanFormatter(content, formatterMetadata)
        break
      case 'communication_plan':
        this.unifiedFormatter = new UnifiedCommunicationPlanFormatter(content, formatterMetadata)
        break
      case 'quality_management':
        this.unifiedFormatter = new UnifiedQualityManagementFormatter(content, formatterMetadata)
        break
      case 'charter':
        this.unifiedFormatter = new UnifiedCharterFormatter(content, formatterMetadata)
        break
      case 'backlog':
        this.unifiedFormatter = new UnifiedBacklogFormatter(content, formatterMetadata)
        break
      default:
        throw new Error(`No unified formatter available for document type: ${this.documentType}`)
    }
  }
  
  /**
   * Format content to HTML using the unified formatter
   */
  formatToHTML(content: any): string {
    // Initialize the appropriate formatter with the content
    this.initializeFormatter(content)
    
    // Generate HTML from the unified formatter
    const htmlContent = this.unifiedFormatter.generateHTML()
    
    // Wrap the content with PDF-specific container and styles
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${this.metadata.title}</title>
          ${this.getPDFStyles()}
        </head>
        <body>
          <div class="pdf-content">
            ${htmlContent}
          </div>
        </body>
      </html>
    `
  }
  
  /**
   * Get PDF-specific styles
   */
  private getPDFStyles(): string {
    return `
      <style>
        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #333;
          background: white;
        }
        
        /* PDF container */
        .pdf-content {
          padding: 20mm 12mm 30mm 12mm; /* Reduced left/right margins from 20mm to 12mm */
          max-width: 210mm;
          margin: 0 auto;
        }
        
        /* Headers */
        h1 {
          font-size: 24pt;
          margin: 1.5rem 0 1rem;
          color: #1a1a1a;
          page-break-after: avoid;
        }
        
        h2 {
          font-size: 18pt;
          margin: 1.25rem 0 0.75rem;
          color: #333;
          page-break-after: avoid;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 0.5rem;
        }
        
        h3 {
          font-size: 14pt;
          margin: 1rem 0 0.5rem;
          color: #444;
          page-break-after: avoid;
        }
        
        h4 {
          font-size: 12pt;
          margin: 0.75rem 0 0.5rem;
          color: #555;
          page-break-after: avoid;
        }
        
        /* Paragraphs and lists */
        p {
          margin: 0.75rem 0;
          text-align: justify;
        }
        
        ul, ol {
          margin: 0.75rem 0;
          padding-left: 2rem;
        }
        
        li {
          margin: 0.25rem 0;
        }
        
        /* Cover page styles */
        .cover-page {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          page-break-after: always;
          text-align: center;
          padding: 2rem;
        }
        
        .cover-logo {
          margin-bottom: 3rem;
        }
        
        .cover-title {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 1rem;
          color: #1a202c;
        }
        
        .cover-subtitle {
          font-size: 1.5rem;
          color: #4a5568;
          margin-bottom: 3rem;
        }
        
        .cover-metadata {
          margin-top: auto;
          padding: 2rem;
          border-top: 1px solid #e2e8f0;
        }
        
        .cover-metadata-item {
          margin: 0.5rem 0;
          font-size: 1rem;
          color: #718096;
        }
        
        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          page-break-inside: avoid;
        }
        
        th {
          background: #f5f5f5;
          padding: 0.75rem;
          text-align: left;
          border: 1px solid #ddd;
          font-weight: 600;
        }
        
        td {
          padding: 0.75rem;
          border: 1px solid #ddd;
        }
        
        tr:nth-child(even) {
          background: #fafafa;
        }
        
        /* Sections */
        .document-section {
          margin: 2rem 0;
          page-break-inside: avoid;
        }
        
        .pid-section {
          margin: 2rem 0;
          page-break-inside: avoid;
        }
        
        /* Table of contents */
        .table-of-contents {
          background: #f9f9f9;
          padding: 1.5rem;
          border-radius: 8px;
          margin: 2rem 0;
          page-break-after: always;
        }
        
        .table-of-contents h2 {
          border-bottom: none;
          margin-bottom: 1rem;
        }
        
        .table-of-contents ol {
          list-style-type: decimal;
        }
        
        .table-of-contents a {
          color: #2196f3;
          text-decoration: none;
        }
        
        /* Visual indicators */
        .key-metrics {
          background: #f0f8ff;
        }
        
        .key-metrics th {
          background: #e3f2fd;
          border-color: #90caf9;
        }
        
        /* Highlight boxes */
        .highlight-box {
          background: #f0f8ff;
          border-left: 4px solid #2196f3;
          padding: 1rem;
          margin: 1rem 0;
        }
        
        .highlight-success {
          background: #e8f5e9;
          border-color: #4caf50;
        }
        
        .highlight-warning {
          background: #fff3e0;
          border-color: #ff9800;
        }
        
        .highlight-error {
          background: #ffebee;
          border-color: #f44336;
        }
        
        /* PDF-specific adjustments */
        @page {
          size: A4;
          margin: 20mm 15mm 25mm 15mm;
        }
        
        @media print {
          /* Removed inline headers/footers - using Puppeteer's header/footer templates instead */
        }
        
        /* Mermaid diagrams in PDF */
        .mermaid-chart {
          margin: 1.5rem -12mm; /* Negative margins to extend to page edges */
          padding: 0.5rem 6mm; /* Reduced padding for more chart space */
          background: #f9f9f9;
          border-radius: 8px;
          page-break-inside: avoid;
          width: calc(100% + 24mm); /* Full width plus margins */
          overflow-x: visible; /* Allow content to be visible */
        }
        
        .mermaid-chart pre {
          margin: 0;
          background: white;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 10pt; /* Reduced from default */
        }
        
        .mermaid-chart svg {
          max-width: 100%;
          height: auto;
        }
        
        /* Mermaid specific text sizing */
        .mermaid text {
          font-size: 9pt !important; /* Smaller text in charts */
        }
        
        .mermaid .nodeLabel {
          font-size: 8pt !important; /* Even smaller for node labels */
        }
        
        /* Timeline specific styles */
        .mermaid[data-chart-type="timeline"] text,
        .mermaid .timeline-text {
          font-size: 7pt !important;
        }
        
        /* Make timeline charts even wider */
        .mermaid-chart[data-chart-type="timeline"] {
          margin: 1rem -15mm !important; /* Even more negative margins */
          width: calc(100% + 30mm) !important; /* Full width plus extra margins */
          font-size: 7pt !important;
        }
        
        .mermaid-chart[data-chart-type="timeline"] .mermaid {
          font-size: 7pt !important;
        }
        
        /* Gantt specific styles */
        .mermaid[data-chart-type="gantt"] text {
          font-size: 8pt !important;
        }
        
        .mermaid .taskText {
          font-size: 7pt !important; /* Very small for task labels */
        }
        
        .mermaid .taskTextOutsideRight,
        .mermaid .taskTextOutsideLeft {
          font-size: 7pt !important;
        }
        
        /* Page break styles */
        .page-break-before {
          page-break-before: always;
        }
        
        .page-break-after {
          page-break-after: always;
        }
        
        /* Progress bars */
        .progress-container {
          margin: 1rem 0;
        }
        
        .progress-bar {
          width: 100%;
          height: 20px;
          background: #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: #4caf50;
        }
        
        /* Comparison matrices */
        .comparison-matrix {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .comparison-matrix th {
          background: #e3f2fd;
          padding: 0.75rem;
          text-align: center;
          border: 1px solid #90caf9;
          font-weight: 600;
        }
        
        .comparison-matrix td {
          padding: 0.75rem;
          text-align: center;
          border: 1px solid #e1f5fe;
        }
      </style>
    `
  }
  
  /**
   * Create PDF header
   */
  private createPDFHeader(): string {
    if (!this.options.pageNumbers && !this.options.headerText) return ''
    
    return `
      <div class="pdf-header">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>${this.projectName}</span>
          <span>${this.documentType.replace(/_/g, ' ').toUpperCase()}</span>
        </div>
      </div>
    `
  }
  
  /**
   * Create PDF footer
   */
  private createPDFFooter(): string {
    const footerItems = []
    
    if (this.options.footerText) {
      footerItems.push(this.options.footerText)
    }
    
    if (!this.options.whiteLabel) {
      footerItems.push('Generated by Project Genie')
    }
    
    if (footerItems.length === 0 && !this.options.pageNumbers) return ''
    
    return `
      <div class="pdf-footer">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>${footerItems.join(' | ')}</span>
          ${this.options.pageNumbers ? '<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>' : ''}
        </div>
      </div>
    `
  }
}

/**
 * Factory function to create the appropriate formatter
 */
export function createUnifiedFormatter(
  documentType: string,
  projectName: string,
  companyName: string,
  metadata: PDFMetadata,
  options: PDFOptions = {},
  htmlOptions: HTMLFormatterOptions = {}
): UnifiedFormatterAdapter {
  return new UnifiedFormatterAdapter(
    documentType,
    projectName,
    companyName,
    metadata,
    options,
    htmlOptions
  )
}