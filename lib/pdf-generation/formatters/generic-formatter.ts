/**
 * Generic HTML Formatter for unsupported document types
 */

import { BaseHTMLFormatter } from './base-formatter'

export class GenericFormatter extends BaseHTMLFormatter {
  /**
   * Format any content to HTML generically
   */
  formatToHTML(content: any): string {
    const sections: string[] = []
    
    sections.push(this.getStyles())
    sections.push(this.createWatermark())
    sections.push(this.createHeader())
    sections.push(this.createFooter())
    sections.push('<div class="pdf-container">')
    sections.push(this.createCoverPage())
    sections.push('<div style="page-break-after: always;"></div>')
    
    // Try to format content generically
    if (typeof content === 'string') {
      sections.push(`<div class="content">${this.escapeHtml(content)}</div>`)
    } else if (Array.isArray(content)) {
      sections.push('<div class="content">')
      sections.push(this.formatList(content))
      sections.push('</div>')
    } else if (typeof content === 'object' && content !== null) {
      // Format object properties as sections
      Object.entries(content).forEach(([key, value]) => {
        // Skip metadata fields
        if (key.startsWith('_') || key === 'id' || key === 'created_at' || key === 'updated_at') {
          return
        }
        
        const title = this.formatHeader(key)
        sections.push(this.formatSection(title, value, 2))
      })
    } else {
      sections.push(`<div class="content">${this.escapeHtml(String(content))}</div>`)
    }
    
    sections.push('</div>')
    return sections.join('\n')
  }
}