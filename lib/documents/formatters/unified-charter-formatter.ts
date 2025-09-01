/**
 * Unified Charter Formatter
 * Generates HTML for both document viewer and PDF generation
 */

import { BaseUnifiedFormatter } from './base-unified-formatter'

interface CharterData {
  projectName?: string
  projectDescription?: string
  businessObjectives?: string[]
  projectScope?: {
    inScope?: string[]
    outOfScope?: string[]
    assumptions?: string[]
    constraints?: string[]
  }
  deliverables?: Array<{
    name?: string
    description?: string
    dueDate?: string
  }>
  milestones?: Array<{
    name?: string
    date?: string
    criteria?: string
  }>
  stakeholders?: Array<{
    name?: string
    role?: string
    interest?: string
    influence?: string
  }>
  budget?: {
    total?: number
    breakdown?: Array<{
      category?: string
      amount?: number
    }>
  }
  timeline?: {
    startDate?: string
    endDate?: string
    phases?: Array<{
      name?: string
      startDate?: string
      endDate?: string
    }>
  }
  risks?: Array<{
    description?: string
    impact?: string
    likelihood?: string
    mitigation?: string
  }>
  successCriteria?: string[]
  approvals?: Array<{
    role?: string
    name?: string
    date?: string
  }>
}

export class UnifiedCharterFormatter extends BaseUnifiedFormatter<CharterData> {
  constructor(content: CharterData, metadata: any) {
    super(content, metadata)
  }
  
  protected ensureStructure(data: any): CharterData {
    return {
      projectName: data?.projectName || this.metadata?.projectName || '',
      projectDescription: data?.projectDescription || '',
      businessObjectives: data?.businessObjectives || [],
      projectScope: data?.projectScope || {},
      deliverables: data?.deliverables || [],
      milestones: data?.milestones || [],
      stakeholders: data?.stakeholders || [],
      budget: data?.budget || {},
      timeline: data?.timeline || {},
      risks: data?.risks || [],
      successCriteria: data?.successCriteria || [],
      approvals: data?.approvals || [],
      ...data
    }
  }

  generateHTML(): string {
    const sections: string[] = []
    
    // Add all sections
    sections.push(this.generateCoverPage())
    sections.push(this.generateTableOfContents())
    sections.push(this.generateExecutiveSummary())
    sections.push(this.generateProjectOverview())
    sections.push(this.generateBusinessObjectives())
    sections.push(this.generateProjectScope())
    sections.push(this.generateDeliverables())
    sections.push(this.generateMilestones())
    sections.push(this.generateStakeholders())
    sections.push(this.generateBudget())
    sections.push(this.generateTimeline())
    sections.push(this.generateRisks())
    sections.push(this.generateSuccessCriteria())
    sections.push(this.generateApprovals())
    sections.push(this.generateDocumentControl())
    
    return this.wrapInHTMLDocument(sections.join('\n'))
  }

  private generateCoverPage(): string {
    return `
      <div class="cover-page">
        <div class="cover-content">
          <h1 class="cover-title">PROJECT CHARTER</h1>
          <div class="cover-subtitle">${this.data.projectName || this.metadata.projectName}</div>
          <div class="cover-metadata">
            <div class="cover-company">${this.metadata.companyName}</div>
            <div class="cover-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="cover-version">Version ${this.metadata.version || '1.0'}</div>
          </div>
        </div>
      </div>
      <div class="page-break"></div>
    `
  }

  protected generateTableOfContents(): string {
    const sections = [
      { title: 'Executive Summary', level: 1 },
      { title: 'Project Overview', level: 1 },
      { title: 'Business Objectives', level: 1 },
      { title: 'Project Scope', level: 1 },
      { title: 'Deliverables', level: 1 },
      { title: 'Milestones', level: 1 },
      { title: 'Stakeholders', level: 1 },
      { title: 'Budget', level: 1 },
      { title: 'Timeline', level: 1 },
      { title: 'Risks', level: 1 },
      { title: 'Success Criteria', level: 1 },
      { title: 'Approvals', level: 1 }
    ]

    return this.createTableOfContents(sections)
  }

  private generateExecutiveSummary(): string {
    const projectName = this.data.projectName || this.metadata.projectName
    const description = this.data.projectDescription || 'Project charter document'
    const startDate = this.data.timeline?.startDate || 'TBD'
    const endDate = this.data.timeline?.endDate || 'TBD'
    const budget = this.data.budget?.total ? `$${this.data.budget.total.toLocaleString()}` : 'TBD'

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="executive-summary">
        <h2>Executive Summary</h2>
        <div class="executive-summary">
        <p><strong>${projectName}</strong> is formally authorized through this charter. This document establishes the project's objectives, scope, and authority structure.</p>
        
        <div class="summary-grid">
          <div class="summary-card">
            <h4>Project Duration</h4>
            <p>${startDate} - ${endDate}</p>
          </div>
          <div class="summary-card">
            <h4>Total Budget</h4>
            <p>${budget}</p>
          </div>
          <div class="summary-card">
            <h4>Key Deliverables</h4>
            <p>${this.data.deliverables?.length || 0} deliverables</p>
          </div>
          <div class="summary-card">
            <h4>Milestones</h4>
            <p>${this.data.milestones?.length || 0} major milestones</p>
          </div>
        </div>
        
        <p>${description}</p>
      </div>
      </section>
    `
  }

  private generateProjectOverview(): string {
    const projectName = this.data.projectName || this.metadata.projectName
    const description = this.data.projectDescription || 'A comprehensive project initiative'

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="project-overview">
        <h2>Project Overview</h2>
        <div class="project-overview">
        <h3>Project Name</h3>
        <p><strong>${projectName}</strong></p>
        
        <h3>Project Description</h3>
        <p>${description}</p>
        
        <h3>Business Need</h3>
        <p>This project addresses critical business requirements and strategic objectives that align with organizational goals.</p>
        
        <h3>Project Justification</h3>
        <p>The project is justified based on its potential to deliver significant value through improved efficiency, cost savings, and strategic alignment.</p>
      </div>
      </section>
    `
  }

  private generateBusinessObjectives(): string {
    const objectives = this.data.businessObjectives || [
      'Achieve strategic business goals',
      'Improve operational efficiency',
      'Enhance customer satisfaction',
      'Drive innovation and growth'
    ]

    const objectivesList = objectives.map((obj, index) => `
      <div class="objective-item">
        <div class="objective-number">${index + 1}</div>
        <div class="objective-content">
          <p>${obj}</p>
        </div>
      </div>
    `).join('')

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="business-objectives">
        <h2>Business Objectives</h2>
        <div class="business-objectives">
        <p>The following business objectives will be achieved through successful project completion:</p>
        <div class="objectives-list">
          ${objectivesList}
        </div>
      </div>
      </section>
    `
  }

  private generateProjectScope(): string {
    const scope = this.data.projectScope || {}
    const inScope = scope.inScope || ['Core functionality', 'Integration requirements', 'Documentation']
    const outOfScope = scope.outOfScope || ['Legacy system migration', 'Third-party customization']
    const assumptions = scope.assumptions || ['Resources will be available as planned', 'Stakeholder commitment']
    const constraints = scope.constraints || ['Budget limitations', 'Timeline restrictions']

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="project-scope">
        <h2>Project Scope</h2>
        <div class="project-scope">
        <div class="scope-grid">
          <div class="scope-section">
            <h3>In Scope</h3>
            <ul>
              ${inScope.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          
          <div class="scope-section">
            <h3>Out of Scope</h3>
            <ul>
              ${outOfScope.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          
          <div class="scope-section">
            <h3>Assumptions</h3>
            <ul>
              ${assumptions.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          
          <div class="scope-section">
            <h3>Constraints</h3>
            <ul>
              ${constraints.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
      </section>
    `
  }

  private generateDeliverables(): string {
    const deliverables = this.data.deliverables || [
      { name: 'Project Plan', description: 'Comprehensive project planning documentation', dueDate: 'Month 1' },
      { name: 'System Design', description: 'Technical architecture and design specifications', dueDate: 'Month 2' },
      { name: 'Implementation', description: 'Fully functional system implementation', dueDate: 'Month 6' }
    ]

    const deliverableCards = deliverables.map(d => `
      <div class="deliverable-card">
        <h4>${d.name || 'Deliverable'}</h4>
        <p>${d.description || 'Deliverable description'}</p>
        <div class="deliverable-date">Due: ${d.dueDate || 'TBD'}</div>
      </div>
    `).join('')

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="deliverables">
        <h2>Deliverables</h2>
        <div class="deliverables">
        <p>The project will produce the following key deliverables:</p>
        <div class="deliverables-grid">
          ${deliverableCards}
        </div>
      </div>
      </section>
    `
  }

  private generateMilestones(): string {
    const milestones = this.data.milestones || [
      { name: 'Project Kickoff', date: 'Week 1', criteria: 'Team assembled, charter approved' },
      { name: 'Design Complete', date: 'Month 2', criteria: 'All design documents approved' },
      { name: 'Phase 1 Complete', date: 'Month 4', criteria: 'Core functionality implemented' },
      { name: 'Project Closure', date: 'Month 6', criteria: 'All deliverables accepted' }
    ]

    const timeline = this.createMermaidChart('gantt', `
      gantt
        title Project Milestones
        dateFormat YYYY-MM-DD
        section Milestones
        ${milestones.map(m => `${m.name} :milestone, ${this.formatDateForGantt(m.date)}, 0d`).join('\n        ')}
    `)

    // Generate table HTML directly like PID does
    const milestoneTable = `
      <table>
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Target Date</th>
            <th>Success Criteria</th>
          </tr>
        </thead>
        <tbody>
          ${milestones.map(m => `
            <tr>
              <td>${m.name || 'Milestone'}</td>
              <td>${m.date || 'TBD'}</td>
              <td>${m.criteria || 'Criteria to be defined'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="milestones">
        <h2>Milestones</h2>
        <div class="milestones">
        ${timeline}
        ${milestoneTable}
      </div>
      </section>
    `
  }

  private generateStakeholders(): string {
    const stakeholders = this.data.stakeholders || [
      { name: 'Project Sponsor', role: 'Executive Sponsor', interest: 'High', influence: 'High' },
      { name: 'Project Manager', role: 'Project Management', interest: 'High', influence: 'High' },
      { name: 'Development Team', role: 'Implementation', interest: 'High', influence: 'Medium' },
      { name: 'End Users', role: 'System Users', interest: 'High', influence: 'Low' }
    ]

    const matrix = this.createMermaidChart('quadrantChart', `
      quadrantChart
        title Stakeholder Analysis Matrix
        x-axis Low Interest --> High Interest
        y-axis Low Influence --> High Influence
        quadrant-1 Manage Closely
        quadrant-2 Keep Satisfied
        quadrant-3 Monitor
        quadrant-4 Keep Informed
        ${stakeholders.map((s, i) => {
          const x = s.interest === 'High' ? 0.7 : s.interest === 'Medium' ? 0.5 : 0.3
          const y = s.influence === 'High' ? 0.7 : s.influence === 'Medium' ? 0.5 : 0.3
          return `"${s.name}": [${x}, ${y}]`
        }).join('\n        ')}
    `)

    // Generate table HTML directly like PID does
    const stakeholderTable = `
      <table>
        <thead>
          <tr>
            <th>Stakeholder</th>
            <th>Role</th>
            <th>Interest</th>
            <th>Influence</th>
          </tr>
        </thead>
        <tbody>
          ${stakeholders.map(s => `
            <tr>
              <td>${s.name || 'Stakeholder'}</td>
              <td>${s.role || 'Role'}</td>
              <td>${s.interest || 'Medium'}</td>
              <td>${s.influence || 'Medium'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="stakeholders">
        <h2>Stakeholders</h2>
        <div class="stakeholders">
        ${matrix}
        ${stakeholderTable}
      </div>
      </section>
    `
  }

  private generateBudget(): string {
    const budget = this.data.budget || {
      total: 500000,
      breakdown: [
        { category: 'Personnel', amount: 300000 },
        { category: 'Technology', amount: 100000 },
        { category: 'Infrastructure', amount: 50000 },
        { category: 'Contingency', amount: 50000 }
      ]
    }

    const total = budget.total || 500000
    const breakdown = budget.breakdown || []

    const budgetChart = this.createMermaidChart('pie', `
      pie title Budget Allocation
        ${breakdown.map(b => `"${b.category || 'Other'}" : ${b.amount || 0}`).join('\n        ')}
    `)

    // Generate table HTML directly like PID does
    const budgetTable = `
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Amount</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${breakdown.map(b => {
            const amount = b.amount || 0
            const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : '0'
            return `
              <tr>
                <td>${b.category || 'Other'}</td>
                <td>$${amount.toLocaleString()}</td>
                <td>${percentage}%</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    `

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="budget">
        <h2>Budget</h2>
        <div class="budget">
        <div class="budget-summary">
          <h3>Total Project Budget: $${total.toLocaleString()}</h3>
        </div>
        ${budgetChart}
        ${budgetTable}
      </div>
      </section>
    `
  }

  private generateTimeline(): string {
    // Use project dates from metadata
    const projectStartDate = this.metadata.startDate ? new Date(this.metadata.startDate) : new Date()
    const projectEndDate = this.metadata.endDate ? new Date(this.metadata.endDate) : new Date(projectStartDate.getTime() + 180 * 24 * 60 * 60 * 1000)
    
    // Calculate phase dates based on project timeline
    const totalDuration = projectEndDate.getTime() - projectStartDate.getTime()
    const initiationEnd = new Date(projectStartDate.getTime() + totalDuration * 0.1)
    const planningEnd = new Date(projectStartDate.getTime() + totalDuration * 0.2)
    const executionEnd = new Date(projectStartDate.getTime() + totalDuration * 0.85)
    
    const timeline = this.data.timeline || {
      startDate: this.formatDateForGantt(projectStartDate),
      endDate: this.formatDateForGantt(projectEndDate),
      phases: [
        { name: 'Initiation', startDate: this.formatDateForGantt(projectStartDate), endDate: this.formatDateForGantt(initiationEnd) },
        { name: 'Planning', startDate: this.formatDateForGantt(initiationEnd), endDate: this.formatDateForGantt(planningEnd) },
        { name: 'Execution', startDate: this.formatDateForGantt(planningEnd), endDate: this.formatDateForGantt(executionEnd) },
        { name: 'Closure', startDate: this.formatDateForGantt(executionEnd), endDate: this.formatDateForGantt(projectEndDate) }
      ]
    }

    const phases = timeline.phases || []

    const ganttChart = this.createMermaidChart('gantt', `
      gantt
        title Project Timeline
        dateFormat YYYY-MM-DD
        section Phases
        ${phases.map(p => `${p.name} :${p.startDate}, ${p.endDate}`).join('\n        ')}
    `)

    // Generate table HTML directly like PID does
    const phaseTable = `
      <table>
        <thead>
          <tr>
            <th>Phase</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${phases.map(p => {
            const start = new Date(p.startDate || this.formatDateForGantt(projectStartDate))
            const end = new Date(p.endDate || this.formatDateForGantt(projectEndDate))
            const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            return `
              <tr>
                <td>${p.name || 'Phase'}</td>
                <td>${p.startDate || 'TBD'}</td>
                <td>${p.endDate || 'TBD'}</td>
                <td>${duration} days</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    `

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="timeline">
        <h2>Timeline</h2>
        <div class="timeline">
        <p>Project Duration: ${timeline.startDate} to ${timeline.endDate}</p>
        ${ganttChart}
        ${phaseTable}
      </div>
      </section>
    `
  }

  private generateRisks(): string {
    const risks = this.data.risks || [
      { description: 'Resource availability', impact: 'High', likelihood: 'Medium', mitigation: 'Early resource planning and backup resources' },
      { description: 'Technical complexity', impact: 'High', likelihood: 'Low', mitigation: 'Technical proof of concept and expert consultation' },
      { description: 'Stakeholder alignment', impact: 'Medium', likelihood: 'Medium', mitigation: 'Regular communication and alignment meetings' }
    ]

    const riskMatrix = this.createMermaidChart('quadrantChart', `
      quadrantChart
        title Risk Assessment Matrix
        x-axis Low Likelihood --> High Likelihood
        y-axis Low Impact --> High Impact
        quadrant-1 Critical Risks
        quadrant-2 High Priority
        quadrant-3 Low Priority
        quadrant-4 Monitor
        ${risks.map((r, i) => {
          const x = r.likelihood === 'High' ? 0.8 : r.likelihood === 'Medium' ? 0.5 : 0.2
          const y = r.impact === 'High' ? 0.8 : r.impact === 'Medium' ? 0.5 : 0.2
          return `"Risk ${i + 1}": [${x}, ${y}]`
        }).join('\n        ')}
    `)

    // Generate table HTML directly like PID does
    const riskTable = `
      <table>
        <thead>
          <tr>
            <th>Risk</th>
            <th>Impact</th>
            <th>Likelihood</th>
            <th>Mitigation Strategy</th>
          </tr>
        </thead>
        <tbody>
          ${risks.map(r => `
            <tr>
              <td>${r.description || 'Risk description'}</td>
              <td>${r.impact || 'Medium'}</td>
              <td>${r.likelihood || 'Medium'}</td>
              <td>${r.mitigation || 'Mitigation strategy'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="risks">
        <h2>Risks</h2>
        <div class="risks">
        ${riskMatrix}
        ${riskTable}
      </div>
      </section>
    `
  }

  private generateSuccessCriteria(): string {
    const criteria = this.data.successCriteria || [
      'All deliverables completed on time and within budget',
      'System meets all functional requirements',
      'User acceptance testing passed with >95% satisfaction',
      'Knowledge transfer completed successfully',
      'Post-implementation support established'
    ]

    const criteriaList = criteria.map((c, index) => `
      <div class="criteria-item">
        <div class="criteria-check">✓</div>
        <div class="criteria-content">${c}</div>
      </div>
    `).join('')

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="success-criteria">
        <h2>Success Criteria</h2>
        <div class="success-criteria">
        <p>Project success will be measured by achieving the following criteria:</p>
        <div class="criteria-list">
          ${criteriaList}
        </div>
      </div>
      </section>
    `
  }

  private generateApprovals(): string {
    const approvals = this.data.approvals || [
      { role: 'Project Sponsor', name: 'Executive Name', date: new Date().toISOString().split('T')[0] },
      { role: 'Project Manager', name: 'PM Name', date: new Date().toISOString().split('T')[0] },
      { role: 'Technical Lead', name: 'Tech Lead Name', date: new Date().toISOString().split('T')[0] }
    ]

    const approvalCards = approvals.map(a => `
      <div class="approval-card">
        <div class="approval-role">${a.role || 'Role'}</div>
        <div class="approval-name">${a.name || 'Name'}</div>
        <div class="approval-signature">_______________________</div>
        <div class="approval-date">Date: ${a.date || 'TBD'}</div>
      </div>
    `).join('')

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="approvals">
        <h2>Approvals</h2>
        <div class="approvals">
        <p>This Project Charter is approved by:</p>
        <div class="approvals-grid">
          ${approvalCards}
        </div>
      </div>
      </section>
    `
  }

  private generateDocumentControl(): string {
    return `
      <div class="document-control">
        <h2>Document Control</h2>
        <table class="control-table">
          <tr>
            <th>Version</th>
            <th>Date</th>
            <th>Author</th>
            <th>Description</th>
          </tr>
          <tr>
            <td>${this.metadata.version || '1.0'}</td>
            <td>${new Date().toLocaleDateString()}</td>
            <td>${this.metadata.author || 'Project Team'}</td>
            <td>Initial Project Charter</td>
          </tr>
        </table>
      </div>
    `
  }

  private formatDateForGantt(date: Date | string | undefined): string {
    if (!date) {
      // Use project start date from metadata as fallback
      const fallbackDate = this.metadata.startDate ? new Date(this.metadata.startDate) : new Date()
      return fallbackDate.toISOString().split('T')[0]
    }
    
    if (date instanceof Date) {
      return date.toISOString().split('T')[0]
    }
    
    // If it's already in YYYY-MM-DD format, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date
    }
    
    // Otherwise, create a date based on the string
    const baseDate = this.metadata.startDate ? new Date(this.metadata.startDate) : new Date()
    if (date.toLowerCase().includes('week')) {
      const weekNum = parseInt(date.match(/\d+/)?.[0] || '1')
      const targetDate = new Date(baseDate.getFullYear(), 0, weekNum * 7)
      return targetDate.toISOString().split('T')[0]
    } else if (date.toLowerCase().includes('month')) {
      const monthNum = parseInt(date.match(/\d+/)?.[0] || '1')
      const targetDate = new Date(baseDate.getFullYear(), monthNum - 1, 15)
      return targetDate.toISOString().split('T')[0]
    }
    
    return baseDate.toISOString().split('T')[0]
  }
}