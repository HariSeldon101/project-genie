/**
 * Project Charter HTML Formatter
 */

import { BaseHTMLFormatter } from './base-formatter'

export class CharterFormatter extends BaseHTMLFormatter {
  /**
   * Format Charter content to HTML
   */
  formatToHTML(content: any): string {
    const sections: string[] = []
    
    // Add styles
    sections.push(this.getStyles())
    sections.push(this.createWatermark())
    sections.push(this.createHeader())
    sections.push(this.createFooter())
    
    // Start container
    sections.push('<div class="pdf-container">')
    sections.push(this.createCoverPage())
    sections.push('<div style="page-break-after: always;"></div>')
    
    // Project Overview
    if (content.overview || content.projectOverview) {
      sections.push(this.formatSection('Project Overview', content.overview || content.projectOverview, 2))
    }
    
    // Business Case
    if (content.businessCase || content.business_case) {
      sections.push(this.formatSection('Business Case', content.businessCase || content.business_case, 2))
    }
    
    // Project Objectives
    if (content.objectives) {
      sections.push(this.formatSection('Project Objectives', content.objectives, 2))
    }
    
    // Scope
    if (content.scope) {
      sections.push(this.formatSection('Project Scope', content.scope, 2))
    }
    
    // Stakeholders
    if (content.stakeholders) {
      sections.push(this.formatSection('Key Stakeholders', content.stakeholders, 2))
    }
    
    // Success Criteria
    if (content.successCriteria || content.success_criteria) {
      sections.push(this.formatSection('Success Criteria', content.successCriteria || content.success_criteria, 2))
    }
    
    // Risks and Assumptions
    if (content.risks) {
      sections.push(this.formatSection('Major Risks', content.risks, 2))
    }
    
    if (content.assumptions) {
      sections.push(this.formatSection('Key Assumptions', content.assumptions, 2))
    }
    
    // Constraints
    if (content.constraints) {
      sections.push(this.formatSection('Project Constraints', content.constraints, 2))
    }
    
    // Approval
    if (content.approval || content.signatures) {
      sections.push(this.formatApprovalSection(content.approval || content.signatures))
    }
    
    sections.push('</div>')
    return sections.join('\n')
  }
  
  /**
   * Format approval section
   */
  private formatApprovalSection(approval: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Project Approval</h2>')
    
    if (Array.isArray(approval)) {
      html.push('<table class="pdf-table">')
      html.push('<thead><tr><th>Name</th><th>Role</th><th>Signature</th><th>Date</th></tr></thead>')
      html.push('<tbody>')
      
      approval.forEach(person => {
        html.push(`
          <tr>
            <td>${this.escapeHtml(person.name || '')}</td>
            <td>${this.escapeHtml(person.role || '')}</td>
            <td>_____________________</td>
            <td>${this.escapeHtml(person.date || '_____________________')}</td>
          </tr>
        `)
      })
      
      html.push('</tbody></table>')
    } else {
      html.push(`<p>${this.escapeHtml(approval)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
}