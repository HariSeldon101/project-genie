/**
 * Communication Plan HTML Formatter
 * Handles stakeholder matrices, RACI charts, and communication strategies
 */

import { BaseHTMLFormatter } from './base-formatter'

export class CommunicationPlanFormatter extends BaseHTMLFormatter {
  /**
   * Format Communication Plan content to HTML
   */
  formatToHTML(content: any): string {
    const sections: string[] = []
    
    // Add styles
    sections.push(this.getStyles())
    
    // Add watermark if needed
    sections.push(this.createWatermark())
    
    // Add header/footer
    sections.push(this.createHeader())
    sections.push(this.createFooter())
    
    // Start container
    sections.push('<div class="pdf-container">')
    
    // Cover page
    sections.push(this.createCoverPage())
    
    // Page break after cover
    sections.push('<div style="page-break-after: always;"></div>')
    
    // Table of Contents
    sections.push(this.createTableOfContents())
    
    // Executive Summary
    if (content.executiveSummary || content.executive_summary || content.overview) {
      sections.push(this.formatSection(
        '1. Executive Summary',
        content.executiveSummary || content.executive_summary || content.overview,
        2
      ))
    }
    
    // Communication Objectives
    if (content.objectives || content.communication_objectives) {
      sections.push(this.formatSection(
        '2. Communication Objectives',
        content.objectives || content.communication_objectives,
        2
      ))
    }
    
    // Stakeholder Analysis
    if (content.stakeholderAnalysis || content.stakeholder_analysis || content.stakeholders) {
      sections.push('<div class="section">')
      sections.push('<h2>3. Stakeholder Analysis</h2>')
      
      const stakeholders = content.stakeholderAnalysis || content.stakeholder_analysis || content.stakeholders
      
      if (Array.isArray(stakeholders)) {
        sections.push(this.formatStakeholderMatrix(stakeholders))
      } else {
        if (stakeholders.groups || stakeholders.list) {
          sections.push(this.formatStakeholderMatrix(stakeholders.groups || stakeholders.list))
        }
        if (stakeholders.analysis) {
          sections.push(this.formatSection('Analysis', stakeholders.analysis, 3))
        }
      }
      sections.push('</div>')
    }
    
    // Communication Methods
    if (content.methods || content.communication_methods || content.channels) {
      sections.push('<div class="section">')
      sections.push('<h2>4. Communication Methods</h2>')
      
      const methods = content.methods || content.communication_methods || content.channels
      if (Array.isArray(methods)) {
        sections.push(this.formatCommunicationMethods(methods))
      } else {
        sections.push(this.formatSection('', methods, 3))
      }
      sections.push('</div>')
    }
    
    // Communication Matrix/Schedule
    if (content.schedule || content.communication_schedule || content.matrix) {
      sections.push('<div class="section">')
      sections.push('<h2>5. Communication Schedule</h2>')
      
      const schedule = content.schedule || content.communication_schedule || content.matrix
      if (Array.isArray(schedule)) {
        sections.push(this.formatCommunicationSchedule(schedule))
      } else {
        sections.push(this.formatSection('', schedule, 3))
      }
      sections.push('</div>')
    }
    
    // RACI Matrix
    if (content.raci || content.responsibilities || content.raci_matrix) {
      sections.push('<div class="section">')
      sections.push('<h2>6. RACI Matrix</h2>')
      sections.push(this.formatRACIMatrix(content.raci || content.responsibilities || content.raci_matrix))
      sections.push('</div>')
    }
    
    // Key Messages
    if (content.keyMessages || content.key_messages || content.messages) {
      sections.push('<div class="section">')
      sections.push('<h2>7. Key Messages</h2>')
      
      const messages = content.keyMessages || content.key_messages || content.messages
      if (Array.isArray(messages)) {
        sections.push('<ul>')
        messages.forEach(msg => {
          if (typeof msg === 'string') {
            sections.push(`<li>${msg}</li>`)
          } else if (msg.message) {
            sections.push(`<li><strong>${msg.audience || 'All'}:</strong> ${msg.message}</li>`)
          }
        })
        sections.push('</ul>')
      } else {
        sections.push(this.formatSection('', messages, 3))
      }
      sections.push('</div>')
    }
    
    // Communication Risks
    if (content.risks || content.communication_risks) {
      sections.push('<div class="section">')
      sections.push('<h2>8. Communication Risks</h2>')
      
      const risks = content.risks || content.communication_risks
      if (Array.isArray(risks)) {
        sections.push(this.formatCommunicationRisks(risks))
      } else {
        sections.push(this.formatSection('', risks, 3))
      }
      sections.push('</div>')
    }
    
    // Success Metrics
    if (content.metrics || content.success_metrics || content.kpis) {
      sections.push('<div class="section">')
      sections.push('<h2>9. Success Metrics</h2>')
      sections.push(this.formatSection('', content.metrics || content.success_metrics || content.kpis, 3))
      sections.push('</div>')
    }
    
    // Close container
    sections.push('</div>')
    
    return sections.join('\n')
  }
  
  /**
   * Create table of contents
   */
  private createTableOfContents(): string {
    return `
      <div class="section toc">
        <h2>Table of Contents</h2>
        <ol class="toc-list">
          <li><a href="#section-1">Executive Summary</a></li>
          <li><a href="#section-2">Communication Objectives</a></li>
          <li><a href="#section-3">Stakeholder Analysis</a></li>
          <li><a href="#section-4">Communication Methods</a></li>
          <li><a href="#section-5">Communication Schedule</a></li>
          <li><a href="#section-6">RACI Matrix</a></li>
          <li><a href="#section-7">Key Messages</a></li>
          <li><a href="#section-8">Communication Risks</a></li>
          <li><a href="#section-9">Success Metrics</a></li>
        </ol>
      </div>
      <div style="page-break-after: always;"></div>
    `
  }
  
  /**
   * Format stakeholder matrix
   */
  private formatStakeholderMatrix(stakeholders: any[]): string {
    const html: string[] = []
    
    html.push('<div class="stakeholder-matrix">')
    html.push('<h3>3.1 Stakeholder Matrix</h3>')
    html.push('<table class="data-table">')
    html.push('<thead>')
    html.push('<tr>')
    html.push('<th>Stakeholder</th>')
    html.push('<th>Interest</th>')
    html.push('<th>Influence</th>')
    html.push('<th>Strategy</th>')
    html.push('<th>Frequency</th>')
    html.push('</tr>')
    html.push('</thead>')
    html.push('<tbody>')
    
    stakeholders.forEach(stakeholder => {
      if (typeof stakeholder === 'string') {
        html.push(`<tr><td colspan="5">${stakeholder}</td></tr>`)
      } else {
        html.push('<tr>')
        html.push(`<td>${stakeholder.name || stakeholder.stakeholder || 'Unknown'}</td>`)
        html.push(`<td>${stakeholder.interest || stakeholder.interest_level || 'Medium'}</td>`)
        html.push(`<td>${stakeholder.influence || stakeholder.influence_level || 'Medium'}</td>`)
        html.push(`<td>${stakeholder.strategy || stakeholder.engagement_strategy || 'Keep Informed'}</td>`)
        html.push(`<td>${stakeholder.frequency || stakeholder.communication_frequency || 'Weekly'}</td>`)
        html.push('</tr>')
      }
    })
    
    html.push('</tbody>')
    html.push('</table>')
    
    // Add influence/interest grid visualization
    html.push(this.createInfluenceInterestGrid())
    
    html.push('</div>')
    
    return html.join('\n')
  }
  
  /**
   * Create influence/interest grid
   */
  private createInfluenceInterestGrid(): string {
    return `
      <div class="influence-interest-grid">
        <h3>3.2 Stakeholder Engagement Strategy</h3>
        <div class="grid-container">
          <svg width="400" height="400" viewBox="0 0 400 400">
            <!-- Grid background -->
            <rect x="50" y="50" width="300" height="300" fill="#f9f9f9" stroke="#ddd"/>
            
            <!-- Grid lines -->
            <line x1="50" y1="200" x2="350" y2="200" stroke="#ddd" stroke-dasharray="5,5"/>
            <line x1="200" y1="50" x2="200" y2="350" stroke="#ddd" stroke-dasharray="5,5"/>
            
            <!-- Quadrant labels -->
            <text x="125" y="125" text-anchor="middle" font-size="12" fill="#666">Keep Satisfied</text>
            <text x="275" y="125" text-anchor="middle" font-size="12" fill="#666">Manage Closely</text>
            <text x="125" y="275" text-anchor="middle" font-size="12" fill="#666">Monitor</text>
            <text x="275" y="275" text-anchor="middle" font-size="12" fill="#666">Keep Informed</text>
            
            <!-- Axis labels -->
            <text x="200" y="380" text-anchor="middle" font-size="14" font-weight="bold">Interest →</text>
            <text x="20" y="200" text-anchor="middle" font-size="14" font-weight="bold" transform="rotate(-90 20 200)">Influence →</text>
          </svg>
        </div>
      </div>
    `
  }
  
  /**
   * Format communication methods
   */
  private formatCommunicationMethods(methods: any[]): string {
    const html: string[] = []
    
    html.push('<table class="data-table">')
    html.push('<thead>')
    html.push('<tr>')
    html.push('<th>Method</th>')
    html.push('<th>Purpose</th>')
    html.push('<th>Audience</th>')
    html.push('<th>Frequency</th>')
    html.push('</tr>')
    html.push('</thead>')
    html.push('<tbody>')
    
    methods.forEach(method => {
      if (typeof method === 'string') {
        html.push(`<tr><td colspan="4">${method}</td></tr>`)
      } else {
        html.push('<tr>')
        html.push(`<td>${method.method || method.channel || method.name || 'Unknown'}</td>`)
        html.push(`<td>${method.purpose || method.use_case || 'General communication'}</td>`)
        html.push(`<td>${method.audience || method.target || 'All stakeholders'}</td>`)
        html.push(`<td>${method.frequency || method.timing || 'As needed'}</td>`)
        html.push('</tr>')
      }
    })
    
    html.push('</tbody>')
    html.push('</table>')
    
    return html.join('\n')
  }
  
  /**
   * Format communication schedule
   */
  private formatCommunicationSchedule(schedule: any[]): string {
    const html: string[] = []
    
    html.push('<table class="data-table schedule-table">')
    html.push('<thead>')
    html.push('<tr>')
    html.push('<th>Communication</th>')
    html.push('<th>Audience</th>')
    html.push('<th>Method</th>')
    html.push('<th>Frequency</th>')
    html.push('<th>Owner</th>')
    html.push('</tr>')
    html.push('</thead>')
    html.push('<tbody>')
    
    schedule.forEach(item => {
      if (typeof item === 'string') {
        html.push(`<tr><td colspan="5">${item}</td></tr>`)
      } else {
        html.push('<tr>')
        html.push(`<td>${item.communication || item.message || item.name || 'Unknown'}</td>`)
        html.push(`<td>${item.audience || item.recipients || 'All'}</td>`)
        html.push(`<td>${item.method || item.channel || 'Email'}</td>`)
        html.push(`<td>${item.frequency || item.timing || 'Weekly'}</td>`)
        html.push(`<td>${item.owner || item.responsible || 'Project Manager'}</td>`)
        html.push('</tr>')
      }
    })
    
    html.push('</tbody>')
    html.push('</table>')
    
    return html.join('\n')
  }
  
  /**
   * Format RACI matrix
   */
  private formatRACIMatrix(raci: any): string {
    const html: string[] = []
    
    html.push('<div class="raci-matrix">')
    html.push('<p class="raci-legend">')
    html.push('<strong>R</strong> = Responsible | ')
    html.push('<strong>A</strong> = Accountable | ')
    html.push('<strong>C</strong> = Consulted | ')
    html.push('<strong>I</strong> = Informed')
    html.push('</p>')
    
    if (Array.isArray(raci)) {
      html.push('<table class="data-table raci-table">')
      html.push('<thead>')
      html.push('<tr>')
      html.push('<th>Activity</th>')
      html.push('<th>Project Manager</th>')
      html.push('<th>Team Lead</th>')
      html.push('<th>Team Members</th>')
      html.push('<th>Stakeholders</th>')
      html.push('</tr>')
      html.push('</thead>')
      html.push('<tbody>')
      
      raci.forEach(item => {
        if (typeof item === 'string') {
          html.push(`<tr><td colspan="5">${item}</td></tr>`)
        } else {
          html.push('<tr>')
          html.push(`<td>${item.activity || item.task || 'Unknown'}</td>`)
          html.push(`<td class="raci-cell">${item.project_manager || item.pm || 'R'}</td>`)
          html.push(`<td class="raci-cell">${item.team_lead || item.lead || 'A'}</td>`)
          html.push(`<td class="raci-cell">${item.team_members || item.team || 'C'}</td>`)
          html.push(`<td class="raci-cell">${item.stakeholders || 'I'}</td>`)
          html.push('</tr>')
        }
      })
      
      html.push('</tbody>')
      html.push('</table>')
    } else {
      html.push(this.formatSection('', raci, 3))
    }
    
    html.push('</div>')
    
    return html.join('\n')
  }
  
  /**
   * Format communication risks
   */
  private formatCommunicationRisks(risks: any[]): string {
    const html: string[] = []
    
    html.push('<table class="data-table risk-table">')
    html.push('<thead>')
    html.push('<tr>')
    html.push('<th>Risk</th>')
    html.push('<th>Impact</th>')
    html.push('<th>Likelihood</th>')
    html.push('<th>Mitigation</th>')
    html.push('</tr>')
    html.push('</thead>')
    html.push('<tbody>')
    
    risks.forEach(risk => {
      if (typeof risk === 'string') {
        html.push(`<tr><td colspan="4">${risk}</td></tr>`)
      } else {
        const impactClass = (risk.impact || '').toLowerCase() === 'high' ? 'high-impact' : 
                           (risk.impact || '').toLowerCase() === 'low' ? 'low-impact' : 'medium-impact'
        html.push('<tr>')
        html.push(`<td>${risk.risk || risk.description || 'Unknown'}</td>`)
        html.push(`<td class="${impactClass}">${risk.impact || 'Medium'}</td>`)
        html.push(`<td>${risk.likelihood || risk.probability || 'Medium'}</td>`)
        html.push(`<td>${risk.mitigation || risk.strategy || 'To be determined'}</td>`)
        html.push('</tr>')
      }
    })
    
    html.push('</tbody>')
    html.push('</table>')
    
    return html.join('\n')
  }
  
  /**
   * Format a section with proper handling
   */
  private formatSection(title: string, content: any, level: number = 2): string {
    const html: string[] = []
    
    if (title) {
      html.push(`<h${level}>${title}</h${level}>`)
    }
    
    if (typeof content === 'string') {
      html.push(`<p>${content}</p>`)
    } else if (Array.isArray(content)) {
      html.push('<ul>')
      content.forEach(item => {
        if (typeof item === 'string') {
          html.push(`<li>${item}</li>`)
        } else if (item.name || item.title) {
          html.push(`<li><strong>${item.name || item.title}:</strong> ${item.description || item.value || ''}</li>`)
        }
      })
      html.push('</ul>')
    } else if (typeof content === 'object') {
      Object.entries(content).forEach(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        html.push(`<h${level + 1}>${formattedKey}</h${level + 1}>`)
        if (typeof value === 'string') {
          html.push(`<p>${value}</p>`)
        } else if (Array.isArray(value)) {
          html.push('<ul>')
          value.forEach((item: any) => {
            html.push(`<li>${typeof item === 'string' ? item : JSON.stringify(item)}</li>`)
          })
          html.push('</ul>')
        }
      })
    }
    
    return html.join('\n')
  }
  
  /**
   * Get document-specific styles
   */
  protected getDocumentSpecificStyles(): string {
    return `
      .stakeholder-matrix { margin: 2rem 0; }
      .influence-interest-grid { margin: 2rem 0; text-align: center; }
      .grid-container { display: inline-block; }
      
      .raci-matrix { margin: 2rem 0; }
      .raci-legend { 
        background: #f5f5f5; 
        padding: 0.5rem; 
        margin-bottom: 1rem;
        border-left: 3px solid #2196F3;
      }
      .raci-cell { 
        text-align: center; 
        font-weight: bold;
        background: #f9f9f9;
      }
      
      .schedule-table th { background: #e3f2fd; }
      .risk-table .high-impact { color: #d32f2f; font-weight: bold; }
      .risk-table .medium-impact { color: #f57c00; }
      .risk-table .low-impact { color: #388e3c; }
      
      .toc { margin-bottom: 2rem; }
      .toc-list { 
        list-style-type: decimal;
        padding-left: 2rem;
      }
      .toc-list li { margin: 0.5rem 0; }
      .toc-list a { 
        color: #1976d2;
        text-decoration: none;
      }
      .toc-list a:hover { text-decoration: underline; }
    `
  }
}