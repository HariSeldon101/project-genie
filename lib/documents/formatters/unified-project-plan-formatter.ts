/**
 * Unified Project Plan Formatter
 * 
 * This formatter generates HTML output for Project Plan documents
 * that works consistently in both the document viewer and PDF generation.
 */

import { BaseUnifiedFormatter, DocumentMetadata } from './base-unified-formatter'

interface ProjectPlanData {
  phases?: any[]
  milestones?: any[]
  deliverables?: any[]
  timeline?: any
  resources?: any
  dependencies?: any
  criticalPath?: any
  workBreakdownStructure?: any
  ganttChart?: any
  budget?: any
  risks?: any[]
  quality?: any
  communications?: any
  [key: string]: any
}

export class UnifiedProjectPlanFormatter extends BaseUnifiedFormatter<ProjectPlanData> {
  protected ensureStructure(data: any): ProjectPlanData {
    // Handle wrapped content
    if (data?.plan) {
      const plan = data.plan
      
      // If plan is a string, try to parse it
      if (typeof plan === 'string') {
        return this.parseProjectPlanFromText(plan)
      }
      
      // If plan is an object with rawText, parse that
      if (plan.rawText) {
        return this.parseProjectPlanFromText(plan.rawText)
      }
      
      // Otherwise use the plan object
      return {
        overview: plan.overview || {},
        phases: plan.phases || plan.stages || [],
        workBreakdown: plan.workBreakdown || {},
        milestones: plan.milestones || [],
        timeline: plan.timeline || {},
        resources: plan.resources || {},
        budget: plan.budget || {},
        risks: plan.risks || [],
        quality: plan.quality || {},
        communication: plan.communication || {},
        stakeholders: plan.stakeholders || [],
        governance: plan.governance || {},
        changeManagement: plan.changeManagement || {},
        successCriteria: plan.successCriteria || [],
        ...plan,
        ...data
      }
    }
    
    return {
      overview: data?.overview || {},
      phases: data?.phases || [],
      workBreakdown: data?.workBreakdown || {},
      milestones: data?.milestones || [],
      timeline: data?.timeline || {},
      resources: data?.resources || {},
      budget: data?.budget || {},
      risks: data?.risks || [],
      quality: data?.quality || {},
      communication: data?.communication || {},
      stakeholders: data?.stakeholders || [],
      governance: data?.governance || {},
      changeManagement: data?.changeManagement || {},
      successCriteria: data?.successCriteria || [],
      ...data
    }
  }
  
  private parseProjectPlanFromText(text: string): ProjectPlanData {
    // Parse phases
    const phases = this.extractPhases(text)
    
    // Parse milestones
    const milestones = this.extractMilestones(text)
    
    // If no phases found, provide defaults
    const defaultPhases = phases.length === 0 ? [
      { name: 'Initiation', duration: '1 month', status: 'Planned' },
      { name: 'Planning', duration: '2 months', status: 'Planned' },
      { name: 'Execution', duration: '6 months', status: 'Planned' },
      { name: 'Monitoring', duration: 'Continuous', status: 'Planned' },
      { name: 'Closure', duration: '1 month', status: 'Planned' }
    ] : phases
    
    // If no milestones found, provide defaults
    const defaultMilestones = milestones.length === 0 ? [
      { name: 'Project Kickoff', date: 'Month 1', status: 'Pending' },
      { name: 'Requirements Complete', date: 'Month 2', status: 'Pending' },
      { name: 'Design Approval', date: 'Month 3', status: 'Pending' },
      { name: 'Development Complete', date: 'Month 7', status: 'Pending' },
      { name: 'Testing Complete', date: 'Month 9', status: 'Pending' },
      { name: 'Go Live', date: 'Month 10', status: 'Pending' }
    ] : milestones
    
    return {
      overview: {},
      phases: defaultPhases,
      workBreakdown: {},
      milestones: defaultMilestones,
      timeline: {},
      resources: {},
      budget: {},
      risks: [],
      quality: {},
      communication: {},
      stakeholders: [],
      governance: {},
      changeManagement: {},
      successCriteria: [],
      rawText: text
    }
  }
  
  private extractPhases(text: string): any[] {
    const phases = []
    
    // Look for phase patterns
    const phaseRegex = /(?:phase|stage)\s*(\d+)[:\s]+([^.\n]+)/gi
    const matches = text.matchAll(phaseRegex)
    
    for (const match of matches) {
      phases.push({
        name: match[2].trim(),
        number: parseInt(match[1]),
        status: 'Planned'
      })
    }
    
    return phases
  }
  
  private extractMilestones(text: string): any[] {
    const milestones = []
    
    // Look for milestone patterns
    const milestoneRegex = /milestone[:\s]+([^.\n]+)/gi
    const matches = text.matchAll(milestoneRegex)
    
    for (const match of matches) {
      milestones.push({
        name: match[1].trim(),
        status: 'Pending'
      })
    }
    
    return milestones
  }
  
  constructor(data: ProjectPlanData, metadata: DocumentMetadata) {
    super(data, metadata)
  }

  generateHTML(): string {
    const sections: string[] = []
    
    sections.push(this.generateCoverPage())
    sections.push(this.generateTableOfContents())
    sections.push(this.generateExecutiveSummary())
    sections.push(this.generateProjectOverview())
    sections.push(this.generateProjectPhases())
    sections.push(this.generateWorkBreakdownStructure())
    sections.push(this.generateTimeline())
    sections.push(this.generateMilestones())
    sections.push(this.generateDeliverables())
    sections.push(this.generateResourcePlan())
    sections.push(this.generateDependencies())
    sections.push(this.generateCriticalPath())
    sections.push(this.generateBudgetPlan())
    sections.push(this.generateRiskManagement())
    sections.push(this.generateQualityPlan())
    sections.push(this.generateCommunicationPlan())
    sections.push(this.generateAppendices())
    
    // Return simple div-wrapped HTML like PID does
    return `
      <div class="project-plan-document">
        ${sections.join('\n')}
      </div>
    `
  }

  private generateCoverPage(): string {
    return `
      <div class="cover-page">
        <div class="cover-logo">
          <svg width="200" height="60" viewBox="0 0 200 60" preserveAspectRatio="xMidYMid meet">
            <text x="100" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#667eea" text-anchor="middle">
              Project Genie 🧞
            </text>
          </svg>
        </div>
        
        <h1 class="cover-title">Project Plan</h1>
        <h2 class="cover-subtitle">${this.metadata.projectName}</h2>
        
        <div class="cover-metadata">
          <p class="cover-metadata-item"><strong>Company:</strong> ${this.metadata.companyName}</p>
          <p class="cover-metadata-item"><strong>Date:</strong> ${this.metadata.date}</p>
          <p class="cover-metadata-item"><strong>Version:</strong> ${this.metadata.version}</p>
          ${this.metadata.author ? `<p class="cover-metadata-item"><strong>Generated by:</strong> ${this.metadata.author}</p>` : ''}
        </div>
      </div>
    `
  }

  protected generateTableOfContents(): string {
    return `
      <section class="table-of-contents">
        <h2>📑 Table of Contents</h2>
        <ol>
          <li><a href="#executive-summary">Executive Summary</a></li>
          <li><a href="#project-overview">Project Overview</a></li>
          <li><a href="#project-phases">Project Phases</a></li>
          <li><a href="#work-breakdown-structure">Work Breakdown Structure</a></li>
          <li><a href="#timeline">Timeline</a></li>
          <li><a href="#milestones">Milestones</a></li>
          <li><a href="#deliverables">Deliverables</a></li>
          <li><a href="#resource-plan">Resource Plan</a></li>
          <li><a href="#dependencies">Dependencies</a></li>
          <li><a href="#critical-path">Critical Path</a></li>
          <li><a href="#budget-plan">Budget Plan</a></li>
          <li><a href="#risk-management">Risk Management</a></li>
          <li><a href="#quality-plan">Quality Plan</a></li>
          <li><a href="#communication-plan">Communication Plan</a></li>
          <li><a href="#appendices">Appendices</a></li>
        </ol>
      </section>
    `
  }

  private generateExecutiveSummary(): string {
    const phases = this.data.phases || []
    const milestones = this.data.milestones || []
    
    return `
      <section class="document-section" id="executive-summary">
        <h2>1. Executive Summary</h2>
        
        <p>This Project Plan outlines the comprehensive approach for delivering the ${this.metadata.projectName} project. 
        The plan encompasses ${phases.length} major phases and ${milestones.length} key milestones, providing a structured 
        roadmap for successful project execution.</p>
        
        <div class="key-highlights">
          <h3>🎯 Key Highlights</h3>
          <ul>
            <li><strong>Phases:</strong> ${phases.length} structured project phases</li>
            <li><strong>Milestones:</strong> ${milestones.length} critical milestones</li>
            <li><strong>Duration:</strong> ${this.calculateDuration()}</li>
            <li><strong>Methodology:</strong> ${this.data.methodology || 'Agile/Waterfall Hybrid'}</li>
          </ul>
        </div>
        
        ${this.data.executiveSummary ? this.formatContent(this.data.executiveSummary) : ''}
      </section>
    `
  }

  private generateProjectOverview(): string {
    return `
      <section class="document-section" id="project-overview">
        <h2>2. Project Overview</h2>
        
        ${this.data.overview ? this.formatContent(this.data.overview) : `
          <h3>2.1 Project Scope</h3>
          <p>The project encompasses the design, development, and deployment of the ${this.metadata.projectName} solution.</p>
          
          <h3>2.2 Objectives</h3>
          <ul>
            <li>Deliver a fully functional solution meeting all requirements</li>
            <li>Complete within budget and timeline constraints</li>
            <li>Achieve quality standards and performance targets</li>
            <li>Ensure stakeholder satisfaction</li>
          </ul>
          
          <h3>2.3 Success Criteria</h3>
          <ul>
            <li>All deliverables completed to specification</li>
            <li>Budget variance within ±10%</li>
            <li>Timeline adherence within critical milestones</li>
            <li>User acceptance achieved</li>
          </ul>
        `}
      </section>
    `
  }

  private generateProjectPhases(): string {
    const phases = this.data.phases || []
    
    let content = `
      <section class="document-section" id="project-phases">
        <h2>3. Project Phases</h2>
    `

    if (phases.length > 0) {
      if (this.options.includeCharts) {
        content += this.createMermaidChart('timeline', `
timeline
    title Project Phases
${phases.map((phase, i) => `    Phase ${i + 1} : ${phase.name || phase}`).join('\n')}
        `)
      }

      phases.forEach((phase, index) => {
        content += `
          <div class="phase-card">
            <h3>Phase ${index + 1}: ${phase.name || phase}</h3>
            ${phase.description ? `<p>${phase.description}</p>` : ''}
            ${phase.duration ? `<p><strong>Duration:</strong> ${phase.duration}</p>` : ''}
            ${phase.objectives ? `
              <h4>Objectives</h4>
              <ul>${this.formatList(phase.objectives)}</ul>
            ` : ''}
            ${phase.deliverables ? `
              <h4>Deliverables</h4>
              <ul>${this.formatList(phase.deliverables)}</ul>
            ` : ''}
          </div>
        `
      })
    } else {
      content += `<p>Project phases will be defined during planning.</p>`
    }

    content += `</section>`
    return content
  }

  private generateWorkBreakdownStructure(): string {
    let content = `
      <section class="document-section" id="work-breakdown-structure">
        <h2>4. Work Breakdown Structure (WBS)</h2>
    `

    if (this.data.workBreakdownStructure) {
      content += this.formatContent(this.data.workBreakdownStructure)
    } else {
      content += `
        <p>The Work Breakdown Structure decomposes the project into manageable work packages:</p>
        
        <div class="wbs-structure">
          <ul>
            <li><strong>1.0 Project Management</strong>
              <ul>
                <li>1.1 Planning</li>
                <li>1.2 Monitoring & Control</li>
                <li>1.3 Reporting</li>
              </ul>
            </li>
            <li><strong>2.0 Requirements & Design</strong>
              <ul>
                <li>2.1 Requirements Gathering</li>
                <li>2.2 System Design</li>
                <li>2.3 Design Validation</li>
              </ul>
            </li>
            <li><strong>3.0 Development</strong>
              <ul>
                <li>3.1 Implementation</li>
                <li>3.2 Testing</li>
                <li>3.3 Integration</li>
              </ul>
            </li>
            <li><strong>4.0 Deployment</strong>
              <ul>
                <li>4.1 Deployment Planning</li>
                <li>4.2 Production Release</li>
                <li>4.3 Post-Deployment Support</li>
              </ul>
            </li>
          </ul>
        </div>
      `
    }

    content += `</section>`
    return content
  }

  private generateTimeline(): string {
    let content = `
      <section class="document-section" id="timeline">
        <h2>5. Timeline</h2>
    `

    if (this.data.timeline) {
      content += this.formatContent(this.data.timeline)
    } else if (this.options.includeCharts && this.data.phases) {
      // Calculate dates based on project timeline
      const startDate = this.metadata.startDate ? new Date(this.metadata.startDate) : new Date()
      const startDateStr = startDate.toISOString().split('T')[0]
      
      content += this.createMermaidChart('gantt', `
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Requirements :a1, ${startDateStr}, 30d
    Design :a2, after a1, 20d
    section Development
    Implementation :b1, after a2, 60d
    Testing :b2, after b1, 30d
    section Deployment
    Release Prep :c1, after b2, 15d
    Go-Live :milestone, after c1, 0d
      `)
    }

    content += `</section>`
    return content
  }

  private generateMilestones(): string {
    const milestones = this.data.milestones || []
    
    let content = `
      <section class="document-section" id="milestones">
        <h2>6. Milestones</h2>
    `

    if (milestones.length > 0) {
      content += `
        <table class="milestones-table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Date</th>
              <th>Criteria</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${milestones.map(m => `
              <tr>
                <td><strong>${m.name || m}</strong></td>
                <td>${m.date || 'TBD'}</td>
                <td>${m.criteria || 'To be defined'}</td>
                <td><span class="status-badge status-${(m.status || 'pending').toLowerCase()}">${m.status || 'Pending'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    } else {
      content += `<p>Key milestones will be established during project planning.</p>`
    }

    content += `</section>`
    return content
  }

  private generateDeliverables(): string {
    const deliverables = this.data.deliverables || []
    
    let content = `
      <section class="document-section" id="deliverables">
        <h2>7. Deliverables</h2>
    `

    if (deliverables.length > 0) {
      content += `
        <table class="deliverables-table">
          <thead>
            <tr>
              <th>Deliverable</th>
              <th>Type</th>
              <th>Due Date</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            ${deliverables.map(d => `
              <tr>
                <td><strong>${d.name || d}</strong></td>
                <td>${d.type || 'Document'}</td>
                <td>${d.dueDate || 'TBD'}</td>
                <td>${d.owner || 'Project Team'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    } else {
      content += `
        <p>Key project deliverables include:</p>
        <ul>
          <li>Project documentation</li>
          <li>System design specifications</li>
          <li>Implemented solution</li>
          <li>Test results and reports</li>
          <li>User documentation</li>
          <li>Training materials</li>
        </ul>
      `
    }

    content += `</section>`
    return content
  }

  private generateResourcePlan(): string {
    return `
      <section class="document-section" id="resource-plan">
        <h2>8. Resource Plan</h2>
        
        ${this.data.resources ? this.formatContent(this.data.resources) : `
          <h3>8.1 Team Structure</h3>
          <ul>
            <li><strong>Project Manager:</strong> Overall project coordination</li>
            <li><strong>Technical Lead:</strong> Technical architecture and guidance</li>
            <li><strong>Development Team:</strong> Implementation and testing</li>
            <li><strong>QA Team:</strong> Quality assurance and testing</li>
            <li><strong>Business Analyst:</strong> Requirements and documentation</li>
          </ul>
          
          <h3>8.2 Resource Allocation</h3>
          <p>Resources will be allocated based on project phases and workload requirements.</p>
          
          <h3>8.3 Skills Matrix</h3>
          <p>Team members possess the required skills for successful project delivery.</p>
        `}
      </section>
    `
  }

  private generateDependencies(): string {
    return `
      <section class="document-section" id="dependencies">
        <h2>9. Dependencies</h2>
        
        ${this.data.dependencies ? this.formatContent(this.data.dependencies) : `
          <h3>9.1 Internal Dependencies</h3>
          <ul>
            <li>Availability of key resources</li>
            <li>Completion of prerequisite projects</li>
            <li>Infrastructure readiness</li>
            <li>Budget approval</li>
          </ul>
          
          <h3>9.2 External Dependencies</h3>
          <ul>
            <li>Third-party service availability</li>
            <li>Vendor deliverables</li>
            <li>Regulatory approvals</li>
            <li>Customer feedback and approval</li>
          </ul>
        `}
      </section>
    `
  }

  private generateCriticalPath(): string {
    return `
      <section class="document-section" id="critical-path">
        <h2>10. Critical Path</h2>
        
        ${this.data.criticalPath ? this.formatContent(this.data.criticalPath) : `
          <p>The critical path represents the sequence of activities that determines the minimum project duration:</p>
          
          <ol>
            <li>Requirements Definition</li>
            <li>System Design</li>
            <li>Core Development</li>
            <li>Integration Testing</li>
            <li>User Acceptance Testing</li>
            <li>Production Deployment</li>
          </ol>
          
          <div class="alert-box">
            <strong>⚠️ Note:</strong> Any delay in critical path activities will directly impact the project completion date.
          </div>
        `}
      </section>
    `
  }

  private generateBudgetPlan(): string {
    return `
      <section class="document-section" id="budget-plan">
        <h2>11. Budget Plan</h2>
        
        ${this.data.budget ? this.formatContent(this.data.budget) : `
          <h3>11.1 Budget Breakdown</h3>
          <table class="budget-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Estimated Cost</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Personnel</td>
                <td>$XXX,XXX</td>
                <td>60%</td>
              </tr>
              <tr>
                <td>Infrastructure</td>
                <td>$XXX,XXX</td>
                <td>15%</td>
              </tr>
              <tr>
                <td>Software & Licenses</td>
                <td>$XXX,XXX</td>
                <td>10%</td>
              </tr>
              <tr>
                <td>Training</td>
                <td>$XXX,XXX</td>
                <td>5%</td>
              </tr>
              <tr>
                <td>Contingency</td>
                <td>$XXX,XXX</td>
                <td>10%</td>
              </tr>
            </tbody>
          </table>
        `}
      </section>
    `
  }

  private generateRiskManagement(): string {
    const risks = this.data.risks || []
    
    return `
      <section class="document-section" id="risk-management">
        <h2>12. Risk Management</h2>
        
        ${risks.length > 0 ? `
          <table class="risk-table">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Probability</th>
                <th>Impact</th>
                <th>Mitigation</th>
              </tr>
            </thead>
            <tbody>
              ${risks.map(r => `
                <tr>
                  <td>${r.risk || r.description || r}</td>
                  <td>${r.probability || 'Medium'}</td>
                  <td>${r.impact || 'Medium'}</td>
                  <td>${r.mitigation || 'TBD'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <p>Risk management strategies will be developed and maintained throughout the project lifecycle.</p>
        `}
      </section>
    `
  }

  private generateQualityPlan(): string {
    return `
      <section class="document-section" id="quality-plan">
        <h2>13. Quality Plan</h2>
        
        ${this.data.quality ? this.formatContent(this.data.quality) : `
          <h3>13.1 Quality Standards</h3>
          <ul>
            <li>Code review for all changes</li>
            <li>Automated testing coverage > 80%</li>
            <li>Performance benchmarks met</li>
            <li>Security standards compliance</li>
          </ul>
          
          <h3>13.2 Quality Assurance Activities</h3>
          <ul>
            <li>Regular code reviews</li>
            <li>Continuous integration testing</li>
            <li>User acceptance testing</li>
            <li>Performance testing</li>
            <li>Security audits</li>
          </ul>
        `}
      </section>
    `
  }

  private generateCommunicationPlan(): string {
    return `
      <section class="document-section" id="communication-plan">
        <h2>14. Communication Plan</h2>
        
        ${this.data.communications ? this.formatContent(this.data.communications) : `
          <table class="communication-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Frequency</th>
                <th>Audience</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Status Report</td>
                <td>Weekly</td>
                <td>Stakeholders</td>
                <td>Email</td>
              </tr>
              <tr>
                <td>Team Meeting</td>
                <td>Daily</td>
                <td>Project Team</td>
                <td>Stand-up</td>
              </tr>
              <tr>
                <td>Steering Committee</td>
                <td>Monthly</td>
                <td>Executives</td>
                <td>Presentation</td>
              </tr>
              <tr>
                <td>Risk Review</td>
                <td>Bi-weekly</td>
                <td>Risk Committee</td>
                <td>Meeting</td>
              </tr>
            </tbody>
          </table>
        `}
      </section>
    `
  }

  private generateAppendices(): string {
    return `
      <section class="document-section page-break-before" id="appendices">
        <h2>15. Appendices</h2>
        
        <h3>Document Control</h3>
        <table>
          <tr>
            <th>Version</th>
            <th>Date</th>
            <th>Author</th>
            <th>Changes</th>
          </tr>
          <tr>
            <td>${this.metadata.version || '1.0'}</td>
            <td>${this.metadata.date}</td>
            <td>${this.metadata.author || 'User'}</td>
            <td>Initial document generation</td>
          </tr>
        </table>
      </section>
    `
  }

  private calculateDuration(): string {
    const phases = this.data.phases || []
    if (phases.length > 0 && phases[0].duration) {
      return phases.map(p => p.duration).join(' + ')
    }
    return 'TBD'
  }

  private formatList(items: any): string {
    if (Array.isArray(items)) {
      return items.map(item => `<li>${item}</li>`).join('')
    }
    return `<li>${items}</li>`
  }

  protected getDocumentSpecificStyles(): string {
    return `
      .phase-card {
        background: #f9f9f9;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1.5rem 0;
        border-left: 4px solid #667eea;
      }
      
      .milestones-table,
      .deliverables-table,
      .budget-table,
      .risk-table,
      .communication-table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.5rem 0;
      }
      
      .milestones-table th,
      .deliverables-table th,
      .budget-table th,
      .risk-table th,
      .communication-table th {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.75rem;
        text-align: left;
      }
      
      .milestones-table td,
      .deliverables-table td,
      .budget-table td,
      .risk-table td,
      .communication-table td {
        padding: 0.75rem;
        border: 1px solid #e0e0e0;
      }
      
      .status-badge {
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      
      .status-pending {
        background: #FFF3E0;
        color: #E65100;
      }
      
      .status-complete {
        background: #E8F5E9;
        color: #1B5E20;
      }
      
      .wbs-structure {
        background: #f5f5f5;
        padding: 1.5rem;
        border-radius: 8px;
        margin: 1.5rem 0;
      }
      
      .wbs-structure ul {
        margin-left: 1.5rem;
      }
      
      .alert-box {
        background: #fff3e0;
        border-left: 4px solid #ff9800;
        padding: 1rem;
        margin: 1.5rem 0;
        border-radius: 4px;
      }
    `
  }
}

export interface ProjectPlanMetadata extends DocumentMetadata {}