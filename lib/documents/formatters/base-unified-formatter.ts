/**
 * Base Unified Formatter
 * 
 * Abstract base class for all document formatters following the unified architecture.
 * Provides common functionality for content normalization, HTML generation, and data extraction.
 * 
 * Key features:
 * - Single source of truth for document formatting
 * - Generates semantic HTML for display, PDF, and future dashboards
 * - Robust content structure normalization
 * - Full support for charts, tables, and visual elements
 */

import {
  calculateQuarterFromDate,
  calculateMilestoneDate,
  formatDateForDisplay,
  generateTimelineEntries,
  calculateProjectDuration,
  formatProjectDurationForTable,
  formatNumberedReasons,
  calculateSprintDates,
  calculatePhaseTimeline,
  calculateBudgetThresholds,
  calculateDelayThresholds
} from './date-utils'

export interface DocumentMetadata {
  projectName: string
  companyName?: string
  version?: string
  date?: string
  author?: string
  methodology?: 'prince2' | 'agile' | 'hybrid'
  // Project context for dynamic date/budget calculations
  startDate?: string
  endDate?: string
  budget?: string
  timeline?: string
}

export interface FormatterOptions {
  includeTableOfContents?: boolean
  includeCharts?: boolean
  includeVisualIndicators?: boolean
  theme?: 'light' | 'dark'
}

export abstract class BaseUnifiedFormatter<T = any> {
  protected data: T
  protected metadata: DocumentMetadata
  protected options: FormatterOptions

  constructor(
    data: any,
    metadata: DocumentMetadata,
    options: FormatterOptions = {}
  ) {
    // Set defaults for metadata
    this.metadata = {
      projectName: metadata.projectName || 'Project',
      companyName: metadata.companyName || metadata.projectName || 'Organization',
      version: metadata.version || '1.0',
      date: metadata.date || new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      author: metadata.author,
      methodology: metadata.methodology || 'prince2',
      // Preserve project context
      startDate: metadata.startDate,
      endDate: metadata.endDate,
      budget: metadata.budget,
      timeline: metadata.timeline
    }

    // Set defaults for options
    this.options = {
      includeTableOfContents: true,
      includeCharts: true,
      includeVisualIndicators: true,
      theme: 'light',
      ...options
    }

    // Normalize the data structure
    this.data = this.ensureStructure(data)
  }

  /**
   * Ensure data has the required structure for this document type
   * Must be implemented by each document formatter
   */
  protected abstract ensureStructure(data: any): T

  /**
   * Generate semantic HTML for the document
   * Must be implemented by each document formatter
   */
  public abstract generateHTML(): string

  /**
   * Generate a table of contents if enabled
   */
  protected abstract generateTableOfContents(): string

  /**
   * Extract array from various formats (string, array, object)
   */
  protected extractArray(value: any, delimiter: string = '\n'): any[] {
    if (!value) return []
    
    if (Array.isArray(value)) {
      return value.filter(item => item != null)
    }
    
    if (typeof value === 'string') {
      if (value.includes(delimiter)) {
        return value.split(delimiter).filter(Boolean).map(s => s.trim())
      }
      return [value]
    }
    
    if (typeof value === 'object') {
      // If it's an object with array-like properties
      if ('items' in value) return this.extractArray(value.items)
      if ('list' in value) return this.extractArray(value.list)
      if ('data' in value) return this.extractArray(value.data)
      
      // Convert object to array of key-value pairs
      return Object.entries(value).map(([key, val]) => ({ key, value: val }))
    }
    
    return []
  }

  /**
   * Extract value with fallback chain
   */
  protected extractValue(obj: any, ...keys: string[]): any {
    if (!obj) return null
    
    for (const key of keys) {
      if (key.includes('.')) {
        // Handle nested keys like 'parent.child'
        const parts = key.split('.')
        let current = obj
        
        for (const part of parts) {
          current = current?.[part]
          if (current === undefined) break
        }
        
        if (current !== undefined) return current
      } else {
        if (obj[key] !== undefined) return obj[key]
      }
    }
    
    return null
  }

  /**
   * Format a section with heading and content
   */
  protected formatSection(
    title: string,
    content: any,
    level: number = 2,
    id?: string
  ): string {
    if (!content || (Array.isArray(content) && content.length === 0)) {
      return ''
    }

    const headingTag = `h${level}`
    const sectionId = id || this.generateId(title)
    
    return `
      <section class="document-section" id="${sectionId}">
        <${headingTag}>${title}</${headingTag}>
        ${this.formatContent(content)}
      </section>
    `
  }

  /**
   * Format content based on its type
   */
  protected formatContent(content: any): string {
    if (content == null) return ''
    
    if (typeof content === 'string') {
      return `<p>${this.escapeHtml(content)}</p>`
    }
    
    if (Array.isArray(content)) {
      if (content.length === 0) return ''
      
      // Check if it's an array of objects (for tables)
      if (typeof content[0] === 'object' && content[0] !== null) {
        return this.formatTable(content)
      }
      
      // Otherwise format as list
      return this.formatList(content)
    }
    
    if (typeof content === 'object') {
      return this.formatKeyValuePairs(content)
    }
    
    return `<p>${String(content)}</p>`
  }

  /**
   * Format an array as an HTML table
   */
  protected formatTable(data: any[]): string {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    
    return `
      <table class="data-table">
        <thead>
          <tr>
            ${headers.map(h => `<th>${this.formatHeader(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${headers.map(h => `<td>${this.formatCellValue(row[h])}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  }

  /**
   * Format an array as an HTML list
   */
  protected formatList(items: any[], ordered: boolean = false): string {
    const tag = ordered ? 'ol' : 'ul'
    
    return `
      <${tag}>
        ${items.map(item => `<li>${this.formatListItem(item)}</li>`).join('')}
      </${tag}>
    `
  }

  /**
   * Format a single list item
   */
  protected formatListItem(item: any): string {
    if (typeof item === 'object' && item !== null) {
      // Handle object items with special formatting
      if ('title' in item && 'description' in item) {
        return `<strong>${this.escapeHtml(item.title)}:</strong> ${this.escapeHtml(item.description)}`
      }
      
      if ('name' in item) {
        return this.escapeHtml(item.name)
      }
      
      // Default object formatting
      return JSON.stringify(item)
    }
    
    return this.escapeHtml(item)
  }

  /**
   * Format key-value pairs as a definition list
   */
  protected formatKeyValuePairs(data: Record<string, any>): string {
    return `
      <dl class="key-value-list">
        ${Object.entries(data).map(([key, value]) => `
          <dt>${this.formatHeader(key)}</dt>
          <dd>${this.formatCellValue(value)}</dd>
        `).join('')}
      </dl>
    `
  }

  /**
   * Format a cell value for display
   */
  protected formatCellValue(value: any): string {
    if (value == null) return ''
    
    if (typeof value === 'boolean') {
      return value ? '✅' : '❌'
    }
    
    if (typeof value === 'number') {
      // Format numbers with appropriate precision
      if (Number.isInteger(value)) {
        return value.toLocaleString()
      }
      return value.toFixed(2)
    }
    
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    
    return this.escapeHtml(value)
  }

  /**
   * Helper methods for date calculations using project context
   */
  protected getProjectQuarter(dateOffset: number = 0): string {
    const date = this.metadata.startDate 
      ? calculateMilestoneDate(this.metadata.startDate, dateOffset, 'full')
      : undefined
    return calculateQuarterFromDate(date)
  }

  protected getMilestoneDate(monthOffset: number, format: 'full' | 'month' | 'quarter' = 'full'): string {
    return calculateMilestoneDate(this.metadata.startDate, monthOffset, format)
  }

  protected getSprintDates(sprintNumber: number): { start: string; end: string } {
    return calculateSprintDates(this.metadata.startDate, sprintNumber)
  }

  protected getProjectPhases(phaseNames?: string[]): ReturnType<typeof calculatePhaseTimeline> {
    return calculatePhaseTimeline(this.metadata.startDate, this.metadata.endDate, phaseNames)
  }

  protected getTimelineEntries(includePostProject: boolean = true): string[] {
    return generateTimelineEntries(this.metadata.startDate, this.metadata.endDate, includePostProject)
  }

  protected getProjectDuration(): ReturnType<typeof calculateProjectDuration> {
    return calculateProjectDuration(this.metadata.startDate, this.metadata.endDate)
  }

  protected formatProjectTimeline(): string {
    return formatProjectDurationForTable(this.metadata.startDate, this.metadata.endDate, this.metadata.timeline)
  }

  protected formatReasons(text: string): string {
    return formatNumberedReasons(text)
  }

  protected getBudgetThresholds(): ReturnType<typeof calculateBudgetThresholds> {
    return calculateBudgetThresholds(this.metadata.budget)
  }

  protected getDelayThresholds(): ReturnType<typeof calculateDelayThresholds> {
    return calculateDelayThresholds(this.metadata.timeline)
  }

  protected formatDate(date: string | undefined, format: 'short' | 'long' | 'iso' = 'long'): string {
    return formatDateForDisplay(date, format)
  }

  /**
   * Format header text (convert snake_case/camelCase to Title Case)
   */
  protected formatHeader(text: string): string {
    return text
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Generate an ID from text (for anchors)
   */
  protected generateId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
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
   * Create a Mermaid chart
   */
  protected createMermaidChart(type: string, definition: string): string {
    if (!this.options.includeCharts) return ''
    
    return `
      <div class="mermaid-chart" data-chart-type="${type}">
        <pre class="mermaid">
${definition}
        </pre>
      </div>
    `
  }

  /**
   * Create a visual indicator (emoji-based)
   */
  protected createVisualIndicator(type: 'success' | 'warning' | 'error' | 'info'): string {
    if (!this.options.includeVisualIndicators) return ''
    
    const indicators = {
      success: '🟢',
      warning: '🟡',
      error: '🔴',
      info: '🔵'
    }
    
    return indicators[type] || ''
  }

  /**
   * Create a progress bar
   */
  protected createProgressBar(percentage: number, label?: string): string {
    const clampedPercentage = Math.max(0, Math.min(100, percentage))
    
    return `
      <div class="progress-container">
        ${label ? `<div class="progress-label">${label}</div>` : ''}
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${clampedPercentage}%"></div>
        </div>
        <div class="progress-text">${clampedPercentage}%</div>
      </div>
    `
  }

  /**
   * Create a comparison matrix with visual indicators
   */
  protected createComparisonMatrix(
    options: Array<{ name: string; [key: string]: any }>,
    criteria: string[]
  ): string {
    return `
      <table class="comparison-matrix">
        <thead>
          <tr>
            <th>Criteria</th>
            ${options.map(opt => `<th>${opt.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${criteria.map(criterion => `
            <tr>
              <td>${this.formatHeader(criterion)}</td>
              ${options.map(opt => `
                <td>${this.formatComparisonValue(opt[criterion])}</td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  }

  /**
   * Format a value for comparison matrix
   */
  protected formatComparisonValue(value: any): string {
    if (value == null) return '-'
    
    const strValue = String(value).toLowerCase()
    
    // Check for positive indicators
    if (strValue.includes('high') || strValue.includes('good') || strValue.includes('yes')) {
      return `${this.createVisualIndicator('success')} ${this.escapeHtml(value)}`
    }
    
    // Check for negative indicators
    if (strValue.includes('low') || strValue.includes('poor') || strValue.includes('no')) {
      return `${this.createVisualIndicator('error')} ${this.escapeHtml(value)}`
    }
    
    // Check for neutral indicators
    if (strValue.includes('medium') || strValue.includes('moderate')) {
      return `${this.createVisualIndicator('warning')} ${this.escapeHtml(value)}`
    }
    
    return this.escapeHtml(value)
  }

  /**
   * Create a highlight box for important information
   */
  protected createHighlightBox(
    title: string,
    content: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info'
  ): string {
    const typeClasses = {
      info: 'highlight-info',
      warning: 'highlight-warning',
      error: 'highlight-error',
      success: 'highlight-success'
    }
    
    return `
      <div class="highlight-box ${typeClasses[type]}">
        <div class="highlight-title">
          ${this.createVisualIndicator(type)} ${title}
        </div>
        <div class="highlight-content">${content}</div>
      </div>
    `
  }

  /**
   * Get common CSS styles for HTML output
   */
  public getStyles(): string {
    return `
      <style>
        .document-section {
          margin: 2rem 0;
          page-break-inside: avoid;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .data-table th {
          background: #f5f5f5;
          padding: 0.75rem;
          text-align: left;
          border: 1px solid #ddd;
          font-weight: 600;
        }
        
        .data-table td {
          padding: 0.75rem;
          border: 1px solid #ddd;
        }
        
        .data-table tr:nth-child(even) {
          background: #fafafa;
        }
        
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
        
        .key-value-list dt {
          font-weight: 600;
          margin-top: 0.5rem;
        }
        
        .key-value-list dd {
          margin-left: 2rem;
          margin-bottom: 0.5rem;
        }
        
        .progress-container {
          margin: 1rem 0;
        }
        
        .progress-bar {
          width: 100%;
          height: 24px;
          background: #e0e0e0;
          border-radius: 12px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #8bc34a);
          transition: width 0.3s ease;
        }
        
        .progress-text {
          text-align: center;
          margin-top: 0.25rem;
          font-size: 0.875rem;
          color: #666;
        }
        
        .highlight-box {
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 8px;
          border-left: 4px solid;
        }
        
        .highlight-info {
          background: #e3f2fd;
          border-color: #2196f3;
        }
        
        .highlight-warning {
          background: #fff3e0;
          border-color: #ff9800;
        }
        
        .highlight-error {
          background: #ffebee;
          border-color: #f44336;
        }
        
        .highlight-success {
          background: #e8f5e9;
          border-color: #4caf50;
        }
        
        .highlight-title {
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .mermaid-chart {
          margin: 1.5rem 0;
          text-align: center;
        }
        
        pre.mermaid {
          background: transparent;
          border: none;
        }
      </style>
    `
  }
}