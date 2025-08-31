/**
 * Base HTML Formatter for PDF Generation
 */

import { PDFMetadata, PDFOptions, HTMLFormatterOptions } from '../types'

export abstract class BaseHTMLFormatter {
  protected projectName: string
  protected companyName: string
  protected metadata: PDFMetadata
  protected options: PDFOptions
  protected htmlOptions: HTMLFormatterOptions

  constructor(
    projectName: string,
    companyName: string,
    metadata: PDFMetadata,
    options: PDFOptions = {},
    htmlOptions: HTMLFormatterOptions = {}
  ) {
    this.projectName = projectName
    this.companyName = companyName
    this.metadata = metadata
    this.options = options
    this.htmlOptions = {
      includeCharts: true,
      includeStyles: true,
      theme: 'light',
      ...htmlOptions
    }
  }

  /**
   * Format content to HTML
   */
  abstract formatToHTML(content: any): string

  /**
   * Get CSS styles
   */
  protected getStyles(): string {
    if (!this.htmlOptions.includeStyles) return ''
    
    return `
      <style>
        ${this.getBaseStyles()}
        ${this.getDocumentSpecificStyles()}
      </style>
    `
  }

  /**
   * Get common styles (alias for backward compatibility)
   */
  protected getCommonStyles(): string {
    return this.getBaseStyles()
  }

  /**
   * Get base CSS styles
   */
  protected getBaseStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        background: white;
      }
      
      .pdf-container {
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
        padding: 20mm 20mm 20mm 20mm; /* Reduced top padding as headers are handled properly */
      }
      
      h1 { font-size: 2rem; margin: 1.5rem 0 1rem; color: #1a1a1a; }
      h2 { font-size: 1.5rem; margin: 1.25rem 0 0.75rem; color: #333; }
      h3 { font-size: 1.25rem; margin: 1rem 0 0.5rem; color: #444; }
      h4 { font-size: 1.1rem; margin: 0.75rem 0 0.5rem; color: #555; }
      
      p { margin: 0.75rem 0; }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
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
      
      ul, ol {
        margin: 0.75rem 0;
        padding-left: 2rem;
      }
      
      li {
        margin: 0.25rem 0;
      }
      
      .section {
        margin: 2rem 0;
        page-break-inside: avoid;
      }
      
      .highlight-box {
        background: #f0f8ff;
        border-left: 4px solid #2196F3;
        padding: 1rem;
        margin: 1rem 0;
      }
      
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 6rem;
        color: rgba(0, 0, 0, 0.05);
        font-weight: bold;
        z-index: -1;
        pointer-events: none;
      }
      
      /* Cover page styles */
      .cover-page {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: calc(100vh - 70mm); /* Account for increased margins */
        text-align: center;
        page-break-after: always;
        padding: 10mm 20mm; /* Reduced vertical padding to fit content */
      }
      
      .cover-logo {
        margin-bottom: 2rem;
        max-width: 90%;
        display: flex;
        justify-content: center;
      }
      
      .cover-title {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1a1a1a;
        margin: 2rem 0 1rem;
        max-width: 80%;
      }
      
      .cover-subtitle {
        font-size: 1.5rem;
        color: #666;
        margin-bottom: 3rem;
      }
      
      .cover-metadata {
        margin-top: auto;
        padding: 2rem;
        background: #f9f9f9;
        border-radius: 8px;
        min-width: 400px;
      }
      
      .cover-metadata-item {
        margin: 0.5rem 0;
        font-size: 1rem;
        color: #555;
      }
      
      .cover-metadata-item strong {
        color: #333;
        margin-right: 0.5rem;
      }
      
      /* Header and footer styles - removed as Puppeteer handles these */
      .pdf-header {
        display: none; /* Headers are handled by Puppeteer */
      }
      
      .pdf-footer {
        display: none; /* Footers are handled by Puppeteer */
      }
      
      /* Ensure content doesn't overlap with Puppeteer-generated headers/footers */
      @media print {
        .pdf-container {
          padding-top: 30mm; /* Space for header */
          padding-bottom: 30mm; /* Space for footer */
        }
        
        .cover-page {
          min-height: calc(100vh - 60mm); /* Account for header and footer space */
        }
      }
      
      /* Table of contents styles */
      .toc {
        margin: 2rem 0;
      }
      
      .toc h2 {
        margin-bottom: 1.5rem;
        color: #1a1a1a;
      }
      
      .toc-item {
        display: flex;
        justify-content: space-between;
        margin: 0.5rem 0;
        padding: 0.25rem 0;
        border-bottom: 1px dotted #ddd;
      }
      
      .toc-title {
        color: #333;
      }
      
      .toc-page {
        color: #666;
      }
      
      /* Subsection styles */
      .subsection {
        margin-left: 2rem;
        margin-top: 1.5rem;
      }
      
      .subsection h3 {
        color: #444;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 0.5rem;
      }
      
      .subsection h4 {
        color: #666;
        margin-top: 1rem;
      }
    `
  }

  /**
   * Get document-specific styles (override in subclasses)
   */
  protected getDocumentSpecificStyles(): string {
    return ''
  }

  /**
   * Create cover page HTML
   */
  protected createCoverPage(): string {
    const date = new Date(this.metadata.createdAt).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return `
      <div class="cover-page">
        ${!this.options.whiteLabel ? `
          <div class="cover-logo">
            <svg width="200" height="60" viewBox="0 0 200 60" preserveAspectRatio="xMidYMid meet">
              <text x="100" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#667eea" text-anchor="middle">
                Project Genie 🧞
              </text>
            </svg>
          </div>
        ` : ''}
        
        <h1 class="cover-title">${this.getDocumentTypeDisplay()}</h1>
        <p class="cover-subtitle">${this.projectName}</p>
        
        <div class="cover-metadata">
          <p class="cover-metadata-item"><strong>Company:</strong> ${this.companyName}</p>
          <p class="cover-metadata-item"><strong>Date:</strong> ${date}</p>
          <p class="cover-metadata-item"><strong>Version:</strong> ${this.metadata.version}</p>
          ${this.metadata.author ? `<p class="cover-metadata-item"><strong>Author:</strong> ${this.metadata.author}</p>` : ''}
        </div>
      </div>
    `
  }

  /**
   * Get display name for document type
   */
  protected getDocumentTypeDisplay(): string {
    const typeMap: Record<string, string> = {
      'pid': 'Project Initiation Document',
      'business_case': 'Business Case',
      'risk_register': 'Risk Register',
      'project_plan': 'Project Plan',
      'communication_plan': 'Communication Plan',
      'quality_management': 'Quality Management Plan',
      'technical_landscape': 'Technical Landscape',
      'comparable_projects': 'Comparable Projects Analysis',
      'backlog': 'Product Backlog',
      'charter': 'Project Charter'
    }
    
    return typeMap[this.metadata.type] || this.metadata.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * Create watermark HTML
   */
  protected createWatermark(): string {
    // Check if watermark is disabled for paid users
    if (this.options.userTier && this.options.userTier !== 'free' && this.options.watermarkEnabled === false) {
      return ''
    }
    
    let watermarkText: string
    
    // Determine watermark text based on user tier
    if (this.options.userTier === 'free') {
      // Free tier always shows Project Genie watermark
      watermarkText = 'Project Genie'
    } else if (this.options.userTier === 'basic' || this.options.userTier === 'premium') {
      // Paid tiers can customize watermark
      watermarkText = this.options.watermarkText || 'Strictly Private & Confidential'
    } else {
      // Default fallback
      watermarkText = this.options.watermarkText || 'Project Genie'
    }
    
    // Override for draft or classification
    if (this.options.showDraft) {
      watermarkText = `DRAFT v${this.metadata.version}`
    }
    
    if (this.options.classification) {
      watermarkText = this.options.classification
    }
    
    return `<div class="watermark">${watermarkText}</div>`
  }

  /**
   * Create header HTML
   */
  protected createHeader(): string {
    // Don't create a header if no custom text is specified
    // The document type and project name are already on the cover page
    if (!this.options.headerText && !this.options.pageNumbers) return ''
    
    return `
      <div class="pdf-header">
        <span>${this.projectName}</span>
        ${this.options.headerText ? `<span>${this.options.headerText}</span>` : ''}
        <span>${this.getDocumentTypeDisplay()}</span>
      </div>
    `
  }

  /**
   * Create footer HTML
   */
  protected createFooter(): string {
    const footerItems = []
    
    if (this.options.footerText) {
      footerItems.push(this.options.footerText)
    }
    
    if (this.options.pageNumbers) {
      footerItems.push('<span class="page-number"></span>')
    }
    
    // Add Project Genie attribution
    // Free tier: always shown
    // Paid tiers: can be hidden via hideAttribution setting
    const showAttribution = this.options.userTier === 'free' || !this.options.hideAttribution
    
    if (showAttribution) {
      footerItems.push('<span style="font-size: 0.7rem; opacity: 0.7;">Created by <a href="https://projectgenie.com" style="color: #667eea; text-decoration: none;">Project Genie</a></span>')
    }
    
    if (footerItems.length === 0) return ''
    
    return `
      <div class="pdf-footer">
        ${footerItems.join(' | ')}
      </div>
    `
  }

  /**
   * Format content based on its type (string, array, object)
   * This is the generic content formatter used throughout formatters
   */
  protected formatContent(content: any): string {
    if (content == null) return ''
    
    if (typeof content === 'string') {
      return `<p>${this.escapeHtml(content)}</p>`
    } else if (Array.isArray(content)) {
      if (content.length > 0 && typeof content[0] === 'object') {
        return this.formatTable(content)
      } else {
        return this.formatList(content)
      }
    } else if (typeof content === 'object') {
      return this.formatKeyValuePairs(content)
    }
    
    return ''
  }

  /**
   * Format a section with title and content
   */
  protected formatSection(title: string, content: any, level: number = 2): string {
    const heading = `h${level}`
    const formattedContent = this.formatContent(content)
    
    return `
      <div class="section">
        <${heading}>${title}</${heading}>
        ${formattedContent}
      </div>
    `
  }

  /**
   * Format a table from array of objects
   */
  protected formatTable(data: any[]): string {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    
    return `
      <table class="pdf-table">
        <thead>
          <tr>
            ${headers.map(h => `<th>${this.formatHeader(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${headers.map(h => `<td>${this.escapeHtml(row[h] || '')}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  }

  /**
   * Format a list
   */
  protected formatList(items: any[], ordered: boolean = false): string {
    const tag = ordered ? 'ol' : 'ul'
    return `
      <${tag}>
        ${items.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
      </${tag}>
    `
  }

  /**
   * Format key-value pairs
   */
  protected formatKeyValuePairs(data: Record<string, any>): string {
    return `
      <div class="key-value-table">
        ${Object.entries(data).map(([key, value]) => `
          <div class="key-value-row">
            <div class="key-value-key">${this.formatHeader(key)}</div>
            <div class="key-value-value">${this.escapeHtml(value)}</div>
          </div>
        `).join('')}
      </div>
    `
  }

  /**
   * Format header text (convert snake_case/camelCase to Title Case)
   */
  protected formatHeader(text: string): string {
    return text
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * Escape HTML characters
   */
  protected escapeHtml(text: any): string {
    if (text == null) return ''
    
    const str = String(text)
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
    
    return str.replace(/[&<>"'/]/g, char => escapeMap[char])
  }

  /**
   * Create a highlight box
   */
  protected createHighlightBox(title: string, content: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): string {
    const classMap = {
      info: 'highlight-box',
      warning: 'warning-box',
      error: 'error-box',
      success: 'success-box'
    }
    
    return `
      <div class="${classMap[type]}">
        <div class="highlight-box-title">${title}</div>
        <div>${content}</div>
      </div>
    `
  }

  /**
   * Create a progress bar
   */
  protected createProgressBar(percentage: number, label?: string): string {
    return `
      <div class="progress-container">
        ${label ? `<div class="progress-label">${label}</div>` : ''}
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-text">${percentage}%</div>
      </div>
    `
  }

  /**
   * Create a checklist
   */
  protected createChecklist(items: { text: string; checked: boolean }[]): string {
    return `
      <ul class="checklist">
        ${items.map(item => `
          <li class="checklist-item">
            <div class="checklist-checkbox ${item.checked ? 'checked' : ''}"></div>
            <span>${this.escapeHtml(item.text)}</span>
          </li>
        `).join('')}
      </ul>
    `
  }
}