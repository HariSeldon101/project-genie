/**
 * Quality Management HTML Formatter
 * Handles quality metrics, processes, standards, and review procedures
 */

import { BaseHTMLFormatter } from './base-formatter'

export class QualityManagementFormatter extends BaseHTMLFormatter {
  /**
   * Format Quality Management content to HTML
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
    
    // Introduction/Overview
    if (content.introduction || content.overview || content.purpose) {
      sections.push(this.formatSection(
        '1. Introduction',
        content.introduction || content.overview || content.purpose,
        2
      ))
    }
    
    // Quality Policy
    if (content.policy || content.quality_policy) {
      sections.push('<div class="section">')
      sections.push('<h2>2. Quality Policy</h2>')
      sections.push(this.formatQualityPolicy(content.policy || content.quality_policy))
      sections.push('</div>')
    }
    
    // Quality Standards
    if (content.standards || content.quality_standards) {
      sections.push('<div class="section">')
      sections.push('<h2>3. Quality Standards</h2>')
      sections.push(this.formatQualityStandards(content.standards || content.quality_standards))
      sections.push('</div>')
    }
    
    // Quality Processes
    if (content.processes || content.quality_processes) {
      sections.push('<div class="section">')
      sections.push('<h2>4. Quality Processes</h2>')
      sections.push(this.formatQualityProcesses(content.processes || content.quality_processes))
      sections.push('</div>')
    }
    
    // Quality Metrics
    if (content.metrics || content.quality_metrics || content.kpis) {
      sections.push('<div class="section">')
      sections.push('<h2>5. Quality Metrics</h2>')
      sections.push(this.formatQualityMetrics(content.metrics || content.quality_metrics || content.kpis))
      sections.push('</div>')
    }
    
    // Quality Assurance
    if (content.assurance || content.quality_assurance || content.qa) {
      sections.push('<div class="section">')
      sections.push('<h2>6. Quality Assurance</h2>')
      sections.push(this.formatQualityAssurance(content.assurance || content.quality_assurance || content.qa))
      sections.push('</div>')
    }
    
    // Quality Control
    if (content.control || content.quality_control || content.qc) {
      sections.push('<div class="section">')
      sections.push('<h2>7. Quality Control</h2>')
      sections.push(this.formatQualityControl(content.control || content.quality_control || content.qc))
      sections.push('</div>')
    }
    
    // Review Procedures
    if (content.reviews || content.review_procedures) {
      sections.push('<div class="section">')
      sections.push('<h2>8. Review Procedures</h2>')
      sections.push(this.formatReviewProcedures(content.reviews || content.review_procedures))
      sections.push('</div>')
    }
    
    // Roles and Responsibilities
    if (content.roles || content.responsibilities) {
      sections.push('<div class="section">')
      sections.push('<h2>9. Roles and Responsibilities</h2>')
      sections.push(this.formatRolesResponsibilities(content.roles || content.responsibilities))
      sections.push('</div>')
    }
    
    // Quality Tools
    if (content.tools || content.quality_tools) {
      sections.push('<div class="section">')
      sections.push('<h2>10. Quality Tools</h2>')
      sections.push(this.formatQualityTools(content.tools || content.quality_tools))
      sections.push('</div>')
    }
    
    // Continuous Improvement
    if (content.improvement || content.continuous_improvement) {
      sections.push('<div class="section">')
      sections.push('<h2>11. Continuous Improvement</h2>')
      sections.push(this.formatContinuousImprovement(content.improvement || content.continuous_improvement))
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
          <li><a href="#section-1">Introduction</a></li>
          <li><a href="#section-2">Quality Policy</a></li>
          <li><a href="#section-3">Quality Standards</a></li>
          <li><a href="#section-4">Quality Processes</a></li>
          <li><a href="#section-5">Quality Metrics</a></li>
          <li><a href="#section-6">Quality Assurance</a></li>
          <li><a href="#section-7">Quality Control</a></li>
          <li><a href="#section-8">Review Procedures</a></li>
          <li><a href="#section-9">Roles and Responsibilities</a></li>
          <li><a href="#section-10">Quality Tools</a></li>
          <li><a href="#section-11">Continuous Improvement</a></li>
        </ol>
      </div>
      <div style="page-break-after: always;"></div>
    `
  }
  
  /**
   * Format quality policy
   */
  private formatQualityPolicy(policy: any): string {
    const html: string[] = []
    
    if (typeof policy === 'string') {
      html.push(`<div class="policy-box">`)
      html.push(`<p>${policy}</p>`)
      html.push(`</div>`)
    } else if (policy) {
      html.push(`<div class="policy-box">`)
      if (policy.statement) {
        html.push(`<p class="policy-statement">${policy.statement}</p>`)
      }
      if (policy.principles) {
        html.push('<h3>Quality Principles</h3>')
        html.push('<ul>')
        const principles = Array.isArray(policy.principles) ? policy.principles : [policy.principles]
        principles.forEach((principle: any) => {
          html.push(`<li>${principle}</li>`)
        })
        html.push('</ul>')
      }
      if (policy.commitment) {
        html.push(`<p class="commitment">${policy.commitment}</p>`)
      }
      html.push(`</div>`)
    }
    
    return html.join('\n')
  }
  
  /**
   * Format quality standards
   */
  private formatQualityStandards(standards: any): string {
    const html: string[] = []
    
    html.push('<table class="data-table standards-table">')
    html.push('<thead>')
    html.push('<tr>')
    html.push('<th>Standard</th>')
    html.push('<th>Description</th>')
    html.push('<th>Compliance Level</th>')
    html.push('<th>Status</th>')
    html.push('</tr>')
    html.push('</thead>')
    html.push('<tbody>')
    
    if (Array.isArray(standards)) {
      standards.forEach(standard => {
        if (typeof standard === 'string') {
          html.push(`<tr><td colspan="4">${standard}</td></tr>`)
        } else {
          const statusClass = (standard.status || '').toLowerCase() === 'compliant' ? 'status-compliant' :
                             (standard.status || '').toLowerCase() === 'non-compliant' ? 'status-non-compliant' :
                             'status-partial'
          html.push('<tr>')
          html.push(`<td>${standard.name || standard.standard || 'Unknown'}</td>`)
          html.push(`<td>${standard.description || standard.details || ''}</td>`)
          html.push(`<td>${standard.compliance || standard.level || 'Required'}</td>`)
          html.push(`<td class="${statusClass}">${standard.status || 'In Progress'}</td>`)
          html.push('</tr>')
        }
      })
    } else {
      html.push(`<tr><td colspan="4">${this.formatSection('', standards, 0)}</td></tr>`)
    }
    
    html.push('</tbody>')
    html.push('</table>')
    
    return html.join('\n')
  }
  
  /**
   * Format quality processes
   */
  private formatQualityProcesses(processes: any): string {
    const html: string[] = []
    
    if (Array.isArray(processes)) {
      processes.forEach((process, index) => {
        html.push(`<div class="process-card">`)
        if (typeof process === 'string') {
          html.push(`<h3>Process ${index + 1}</h3>`)
          html.push(`<p>${process}</p>`)
        } else {
          html.push(`<h3>${process.name || process.process || `Process ${index + 1}`}</h3>`)
          if (process.description) {
            html.push(`<p>${process.description}</p>`)
          }
          if (process.steps) {
            html.push('<ol class="process-steps">')
            const steps = Array.isArray(process.steps) ? process.steps : [process.steps]
            steps.forEach((step: any) => {
              html.push(`<li>${step}</li>`)
            })
            html.push('</ol>')
          }
          if (process.inputs || process.outputs) {
            html.push('<div class="process-io">')
            if (process.inputs) {
              html.push(`<div class="process-inputs"><strong>Inputs:</strong> ${process.inputs}</div>`)
            }
            if (process.outputs) {
              html.push(`<div class="process-outputs"><strong>Outputs:</strong> ${process.outputs}</div>`)
            }
            html.push('</div>')
          }
        }
        html.push(`</div>`)
      })
    } else {
      html.push(this.formatSection('', processes, 3))
    }
    
    // Add process flow diagram
    html.push(this.createProcessFlowDiagram())
    
    return html.join('\n')
  }
  
  /**
   * Create process flow diagram
   */
  private createProcessFlowDiagram(): string {
    return `
      <div class="process-flow">
        <h3>Quality Process Flow</h3>
        <svg width="600" height="200" viewBox="0 0 600 200">
          <!-- Process boxes -->
          <rect x="10" y="70" width="100" height="60" fill="#e3f2fd" stroke="#1976d2" stroke-width="2" rx="5"/>
          <text x="60" y="100" text-anchor="middle" font-size="12">Plan</text>
          
          <rect x="160" y="70" width="100" height="60" fill="#e3f2fd" stroke="#1976d2" stroke-width="2" rx="5"/>
          <text x="210" y="100" text-anchor="middle" font-size="12">Do</text>
          
          <rect x="310" y="70" width="100" height="60" fill="#e3f2fd" stroke="#1976d2" stroke-width="2" rx="5"/>
          <text x="360" y="100" text-anchor="middle" font-size="12">Check</text>
          
          <rect x="460" y="70" width="100" height="60" fill="#e3f2fd" stroke="#1976d2" stroke-width="2" rx="5"/>
          <text x="510" y="100" text-anchor="middle" font-size="12">Act</text>
          
          <!-- Arrows -->
          <path d="M 110 100 L 160 100" stroke="#1976d2" stroke-width="2" marker-end="url(#arrowhead)"/>
          <path d="M 260 100 L 310 100" stroke="#1976d2" stroke-width="2" marker-end="url(#arrowhead)"/>
          <path d="M 410 100 L 460 100" stroke="#1976d2" stroke-width="2" marker-end="url(#arrowhead)"/>
          <path d="M 510 130 Q 510 160, 480 160 L 90 160 Q 60 160, 60 130" stroke="#1976d2" stroke-width="2" marker-end="url(#arrowhead)" fill="none"/>
          
          <!-- Arrow marker -->
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#1976d2"/>
            </marker>
          </defs>
          
          <text x="300" y="30" text-anchor="middle" font-size="14" font-weight="bold">PDCA Cycle</text>
        </svg>
      </div>
    `
  }
  
  /**
   * Format quality metrics
   */
  private formatQualityMetrics(metrics: any): string {
    const html: string[] = []
    
    html.push('<div class="metrics-dashboard">')
    
    if (Array.isArray(metrics)) {
      html.push('<div class="metrics-grid">')
      metrics.forEach(metric => {
        if (typeof metric === 'string') {
          html.push(`<div class="metric-card"><p>${metric}</p></div>`)
        } else {
          const statusClass = this.getMetricStatusClass(metric.current, metric.target)
          html.push(`<div class="metric-card ${statusClass}">`)
          html.push(`<h4>${metric.name || metric.metric || 'Metric'}</h4>`)
          html.push(`<div class="metric-value">${metric.current || metric.value || 'N/A'}</div>`)
          if (metric.target) {
            html.push(`<div class="metric-target">Target: ${metric.target}</div>`)
          }
          if (metric.unit) {
            html.push(`<div class="metric-unit">${metric.unit}</div>`)
          }
          html.push(`</div>`)
        }
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', metrics, 3))
    }
    
    // Add metrics table
    if (Array.isArray(metrics) && metrics.length > 0) {
      html.push(this.createMetricsTable(metrics))
    }
    
    html.push('</div>')
    
    return html.join('\n')
  }
  
  /**
   * Create metrics table
   */
  private createMetricsTable(metrics: any[]): string {
    const html: string[] = []
    
    html.push('<h3>Metrics Summary</h3>')
    html.push('<table class="data-table metrics-table">')
    html.push('<thead>')
    html.push('<tr>')
    html.push('<th>Metric</th>')
    html.push('<th>Current</th>')
    html.push('<th>Target</th>')
    html.push('<th>Status</th>')
    html.push('<th>Trend</th>')
    html.push('</tr>')
    html.push('</thead>')
    html.push('<tbody>')
    
    metrics.forEach(metric => {
      if (typeof metric === 'object') {
        const status = this.calculateMetricStatus(metric.current, metric.target)
        html.push('<tr>')
        html.push(`<td>${metric.name || metric.metric || 'Unknown'}</td>`)
        html.push(`<td>${metric.current || metric.value || 'N/A'}</td>`)
        html.push(`<td>${metric.target || 'N/A'}</td>`)
        html.push(`<td class="${status.class}">${status.text}</td>`)
        html.push(`<td>${metric.trend || '→'}</td>`)
        html.push('</tr>')
      }
    })
    
    html.push('</tbody>')
    html.push('</table>')
    
    return html.join('\n')
  }
  
  /**
   * Format quality assurance
   */
  private formatQualityAssurance(qa: any): string {
    const html: string[] = []
    
    if (typeof qa === 'string') {
      html.push(`<p>${qa}</p>`)
    } else if (qa) {
      if (qa.activities) {
        html.push('<h3>QA Activities</h3>')
        html.push('<ul>')
        const activities = Array.isArray(qa.activities) ? qa.activities : [qa.activities]
        activities.forEach((activity: any) => {
          html.push(`<li>${activity}</li>`)
        })
        html.push('</ul>')
      }
      
      if (qa.schedule) {
        html.push('<h3>QA Schedule</h3>')
        html.push(this.formatSection('', qa.schedule, 0))
      }
      
      if (qa.checklist) {
        html.push('<h3>QA Checklist</h3>')
        html.push(this.createChecklist(qa.checklist))
      }
    }
    
    return html.join('\n')
  }
  
  /**
   * Format quality control
   */
  private formatQualityControl(qc: any): string {
    const html: string[] = []
    
    if (typeof qc === 'string') {
      html.push(`<p>${qc}</p>`)
    } else if (qc) {
      if (qc.methods) {
        html.push('<h3>QC Methods</h3>')
        html.push('<ul>')
        const methods = Array.isArray(qc.methods) ? qc.methods : [qc.methods]
        methods.forEach((method: any) => {
          html.push(`<li>${method}</li>`)
        })
        html.push('</ul>')
      }
      
      if (qc.criteria) {
        html.push('<h3>Acceptance Criteria</h3>')
        html.push(this.formatSection('', qc.criteria, 0))
      }
      
      if (qc.procedures) {
        html.push('<h3>QC Procedures</h3>')
        html.push(this.formatSection('', qc.procedures, 0))
      }
    }
    
    return html.join('\n')
  }
  
  /**
   * Format review procedures
   */
  private formatReviewProcedures(reviews: any): string {
    const html: string[] = []
    
    if (Array.isArray(reviews)) {
      html.push('<table class="data-table review-table">')
      html.push('<thead>')
      html.push('<tr>')
      html.push('<th>Review Type</th>')
      html.push('<th>Frequency</th>')
      html.push('<th>Participants</th>')
      html.push('<th>Deliverables</th>')
      html.push('</tr>')
      html.push('</thead>')
      html.push('<tbody>')
      
      reviews.forEach(review => {
        if (typeof review === 'string') {
          html.push(`<tr><td colspan="4">${review}</td></tr>`)
        } else {
          html.push('<tr>')
          html.push(`<td>${review.type || review.name || 'Review'}</td>`)
          html.push(`<td>${review.frequency || 'As needed'}</td>`)
          html.push(`<td>${review.participants || review.attendees || 'Team'}</td>`)
          html.push(`<td>${review.deliverables || review.outputs || 'Review report'}</td>`)
          html.push('</tr>')
        }
      })
      
      html.push('</tbody>')
      html.push('</table>')
    } else {
      html.push(this.formatSection('', reviews, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format roles and responsibilities
   */
  private formatRolesResponsibilities(roles: any): string {
    const html: string[] = []
    
    if (Array.isArray(roles)) {
      html.push('<div class="roles-grid">')
      roles.forEach(role => {
        if (typeof role === 'string') {
          html.push(`<div class="role-card"><p>${role}</p></div>`)
        } else {
          html.push('<div class="role-card">')
          html.push(`<h4>${role.role || role.name || 'Role'}</h4>`)
          if (role.responsibilities) {
            html.push('<ul>')
            const responsibilities = Array.isArray(role.responsibilities) ? 
              role.responsibilities : [role.responsibilities]
            responsibilities.forEach((resp: any) => {
              html.push(`<li>${resp}</li>`)
            })
            html.push('</ul>')
          }
          html.push('</div>')
        }
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', roles, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format quality tools
   */
  private formatQualityTools(tools: any): string {
    const html: string[] = []
    
    if (Array.isArray(tools)) {
      html.push('<div class="tools-list">')
      tools.forEach(tool => {
        if (typeof tool === 'string') {
          html.push(`<div class="tool-item">• ${tool}</div>`)
        } else {
          html.push('<div class="tool-item">')
          html.push(`<strong>${tool.name || tool.tool}:</strong> `)
          html.push(`${tool.description || tool.purpose || ''}`)
          html.push('</div>')
        }
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', tools, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format continuous improvement
   */
  private formatContinuousImprovement(improvement: any): string {
    const html: string[] = []
    
    if (typeof improvement === 'string') {
      html.push(`<p>${improvement}</p>`)
    } else if (improvement) {
      if (improvement.approach) {
        html.push('<h3>Improvement Approach</h3>')
        html.push(this.formatSection('', improvement.approach, 0))
      }
      
      if (improvement.initiatives) {
        html.push('<h3>Improvement Initiatives</h3>')
        html.push('<ul>')
        const initiatives = Array.isArray(improvement.initiatives) ? 
          improvement.initiatives : [improvement.initiatives]
        initiatives.forEach((initiative: any) => {
          html.push(`<li>${initiative}</li>`)
        })
        html.push('</ul>')
      }
      
      if (improvement.process) {
        html.push('<h3>Improvement Process</h3>')
        html.push(this.formatSection('', improvement.process, 0))
      }
    }
    
    return html.join('\n')
  }
  
  /**
   * Create checklist
   */
  private createChecklist(items: any): string {
    const html: string[] = []
    
    html.push('<div class="checklist">')
    const checkItems = Array.isArray(items) ? items : [items]
    checkItems.forEach((item: any) => {
      if (typeof item === 'string') {
        html.push(`<div class="checklist-item">☐ ${item}</div>`)
      } else if (item.item || item.check) {
        const checked = item.completed || item.checked ? '☑' : '☐'
        html.push(`<div class="checklist-item">${checked} ${item.item || item.check}</div>`)
      }
    })
    html.push('</div>')
    
    return html.join('\n')
  }
  
  /**
   * Get metric status class
   */
  private getMetricStatusClass(current: any, target: any): string {
    if (!current || !target) return ''
    const currentNum = parseFloat(current)
    const targetNum = parseFloat(target)
    if (isNaN(currentNum) || isNaN(targetNum)) return ''
    
    const percentage = (currentNum / targetNum) * 100
    if (percentage >= 95) return 'metric-green'
    if (percentage >= 80) return 'metric-yellow'
    return 'metric-red'
  }
  
  /**
   * Calculate metric status
   */
  private calculateMetricStatus(current: any, target: any): { text: string, class: string } {
    if (!current || !target) return { text: 'N/A', class: '' }
    const currentNum = parseFloat(current)
    const targetNum = parseFloat(target)
    if (isNaN(currentNum) || isNaN(targetNum)) return { text: 'N/A', class: '' }
    
    const percentage = (currentNum / targetNum) * 100
    if (percentage >= 95) return { text: 'On Track', class: 'status-green' }
    if (percentage >= 80) return { text: 'At Risk', class: 'status-yellow' }
    return { text: 'Off Track', class: 'status-red' }
  }
  
  /**
   * Format a section with proper handling
   */
  private formatSection(title: string, content: any, level: number = 2): string {
    const html: string[] = []
    
    if (title && level > 0) {
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
    } else if (typeof content === 'object' && content !== null) {
      Object.entries(content).forEach(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        if (level > 0) {
          html.push(`<h${Math.min(level + 1, 6)}>${formattedKey}</h${Math.min(level + 1, 6)}>`)
        }
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
      .policy-box {
        background: #f0f4f8;
        border-left: 4px solid #1976d2;
        padding: 1.5rem;
        margin: 1rem 0;
      }
      
      .policy-statement {
        font-size: 1.1rem;
        font-style: italic;
        margin-bottom: 1rem;
      }
      
      .commitment {
        font-weight: 500;
        margin-top: 1rem;
      }
      
      .standards-table .status-compliant { color: #2e7d32; font-weight: bold; }
      .standards-table .status-non-compliant { color: #c62828; font-weight: bold; }
      .standards-table .status-partial { color: #f57c00; font-weight: bold; }
      
      .process-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
        background: #fafafa;
      }
      
      .process-steps {
        margin: 1rem 0;
        padding-left: 2rem;
      }
      
      .process-io {
        display: flex;
        gap: 2rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e0e0e0;
      }
      
      .process-flow {
        margin: 2rem 0;
        text-align: center;
      }
      
      .metrics-dashboard {
        margin: 2rem 0;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
      }
      
      .metric-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1rem;
        text-align: center;
        background: white;
      }
      
      .metric-card h4 {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        color: #666;
      }
      
      .metric-value {
        font-size: 2rem;
        font-weight: bold;
        color: #333;
      }
      
      .metric-target {
        font-size: 0.9rem;
        color: #666;
        margin-top: 0.5rem;
      }
      
      .metric-unit {
        font-size: 0.8rem;
        color: #999;
      }
      
      .metric-green { border-left: 4px solid #4caf50; }
      .metric-yellow { border-left: 4px solid #ff9800; }
      .metric-red { border-left: 4px solid #f44336; }
      
      .status-green { color: #2e7d32; }
      .status-yellow { color: #f57c00; }
      .status-red { color: #c62828; }
      
      .review-table th { background: #e8f5e9; }
      
      .roles-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
      }
      
      .role-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1rem;
        background: #f5f5f5;
      }
      
      .role-card h4 {
        margin: 0 0 0.5rem 0;
        color: #1976d2;
      }
      
      .tools-list {
        margin: 1rem 0;
      }
      
      .tool-item {
        padding: 0.5rem 0;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .checklist {
        margin: 1rem 0;
        padding: 1rem;
        background: #f9f9f9;
        border-radius: 4px;
      }
      
      .checklist-item {
        padding: 0.25rem 0;
        font-family: monospace;
      }
      
      .toc {
        margin-bottom: 2rem;
      }
      
      .toc-list {
        list-style-type: decimal;
        padding-left: 2rem;
      }
      
      .toc-list li {
        margin: 0.5rem 0;
      }
      
      .toc-list a {
        color: #1976d2;
        text-decoration: none;
      }
      
      .toc-list a:hover {
        text-decoration: underline;
      }
    `
  }
}