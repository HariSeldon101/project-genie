/**
 * Project Plan HTML Formatter
 */

import { BaseHTMLFormatter } from './base-formatter'

export class ProjectPlanFormatter extends BaseHTMLFormatter {
  /**
   * Format Project Plan content to HTML
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
    
    // Executive Summary
    if (content.executiveSummary || content.executive_summary || content.overview) {
      sections.push(this.formatSection(
        'Executive Summary',
        content.executiveSummary || content.executive_summary || content.overview,
        2
      ))
    }
    
    // Project Objectives
    if (content.objectives || content.projectObjectives) {
      sections.push(this.formatObjectives(content.objectives || content.projectObjectives))
    }
    
    // Project Scope
    if (content.scope || content.projectScope) {
      sections.push(this.formatScope(content.scope || content.projectScope))
    }
    
    // Project Phases
    if (content.phases || content.projectPhases) {
      sections.push(this.formatPhases(content.phases || content.projectPhases))
    }
    
    // Timeline/Schedule
    if (content.timeline || content.schedule) {
      sections.push(this.formatTimeline(content.timeline || content.schedule))
    }
    
    // Milestones
    if (content.milestones) {
      sections.push(this.formatMilestones(content.milestones))
    }
    
    // Work Breakdown Structure
    if (content.wbs || content.workBreakdownStructure) {
      sections.push(this.formatWBS(content.wbs || content.workBreakdownStructure))
    }
    
    // Resource Plan
    if (content.resources || content.resourcePlan) {
      sections.push(this.formatResourcePlan(content.resources || content.resourcePlan))
    }
    
    // Budget
    if (content.budget || content.financialPlan) {
      sections.push(this.formatBudget(content.budget || content.financialPlan))
    }
    
    // Dependencies
    if (content.dependencies) {
      sections.push(this.formatDependencies(content.dependencies))
    }
    
    // Critical Path
    if (content.criticalPath || content.critical_path) {
      sections.push(this.formatCriticalPath(content.criticalPath || content.critical_path))
    }
    
    // Success Metrics
    if (content.metrics || content.successMetrics || content.kpis) {
      sections.push(this.formatMetrics(content.metrics || content.successMetrics || content.kpis))
    }
    
    // Close container
    sections.push('</div>')
    
    return sections.join('\n')
  }
  
  /**
   * Format objectives
   */
  private formatObjectives(objectives: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Project Objectives</h2>')
    
    if (Array.isArray(objectives)) {
      html.push('<div class="objectives-container">')
      objectives.forEach((objective, index) => {
        html.push(`
          <div class="objective-card">
            <div class="objective-number">${index + 1}</div>
            <div class="objective-content">
              <h3>${this.escapeHtml(objective.title || objective.objective || objective)}</h3>
              ${objective.description ? `<p>${this.escapeHtml(objective.description)}</p>` : ''}
              ${objective.measurable ? `<p class="measurable"><strong>Measurable:</strong> ${this.escapeHtml(objective.measurable)}</p>` : ''}
              ${objective.deadline ? `<p class="deadline"><strong>Deadline:</strong> ${this.escapeHtml(objective.deadline)}</p>` : ''}
            </div>
          </div>
        `)
      })
      html.push('</div>')
    } else {
      html.push(`<p>${this.escapeHtml(objectives)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format scope
   */
  private formatScope(scope: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Project Scope</h2>')
    
    if (typeof scope === 'object' && !Array.isArray(scope)) {
      if (scope.inScope || scope.in_scope) {
        html.push('<div class="scope-section in-scope">')
        html.push('<h3>✓ In Scope</h3>')
        if (Array.isArray(scope.inScope || scope.in_scope)) {
          html.push(this.formatList(scope.inScope || scope.in_scope))
        } else {
          html.push(`<p>${this.escapeHtml(scope.inScope || scope.in_scope)}</p>`)
        }
        html.push('</div>')
      }
      
      if (scope.outOfScope || scope.out_of_scope) {
        html.push('<div class="scope-section out-scope">')
        html.push('<h3>✗ Out of Scope</h3>')
        if (Array.isArray(scope.outOfScope || scope.out_of_scope)) {
          html.push(this.formatList(scope.outOfScope || scope.out_of_scope))
        } else {
          html.push(`<p>${this.escapeHtml(scope.outOfScope || scope.out_of_scope)}</p>`)
        }
        html.push('</div>')
      }
      
      if (scope.deliverables) {
        html.push('<div class="scope-section deliverables">')
        html.push('<h3>📦 Deliverables</h3>')
        if (Array.isArray(scope.deliverables)) {
          html.push(this.formatList(scope.deliverables))
        } else {
          html.push(`<p>${this.escapeHtml(scope.deliverables)}</p>`)
        }
        html.push('</div>')
      }
    } else {
      html.push(`<p>${this.escapeHtml(scope)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format project phases
   */
  private formatPhases(phases: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Project Phases</h2>')
    
    if (Array.isArray(phases)) {
      html.push('<div class="phases-timeline">')
      phases.forEach((phase, index) => {
        const isLast = index === phases.length - 1
        html.push(`
          <div class="phase-item">
            <div class="phase-marker">
              <div class="phase-number">${index + 1}</div>
              ${!isLast ? '<div class="phase-line"></div>' : ''}
            </div>
            <div class="phase-content">
              <h3>${this.escapeHtml(phase.name || phase.phase || phase.title)}</h3>
              <div class="phase-dates">
                ${phase.startDate || phase.start_date ? `<span>Start: ${this.escapeHtml(phase.startDate || phase.start_date)}</span>` : ''}
                ${phase.endDate || phase.end_date ? `<span>End: ${this.escapeHtml(phase.endDate || phase.end_date)}</span>` : ''}
                ${phase.duration ? `<span>Duration: ${this.escapeHtml(phase.duration)}</span>` : ''}
              </div>
              ${phase.description ? `<p>${this.escapeHtml(phase.description)}</p>` : ''}
              ${phase.deliverables ? `
                <div class="phase-deliverables">
                  <strong>Deliverables:</strong>
                  ${this.formatList(phase.deliverables)}
                </div>
              ` : ''}
              ${phase.milestones ? `
                <div class="phase-milestones">
                  <strong>Key Milestones:</strong>
                  ${this.formatList(phase.milestones)}
                </div>
              ` : ''}
            </div>
          </div>
        `)
      })
      html.push('</div>')
    } else {
      html.push(`<p>${this.escapeHtml(phases)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format timeline
   */
  private formatTimeline(timeline: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Project Timeline</h2>')
    
    if (Array.isArray(timeline)) {
      // Create Gantt-style visualization
      html.push('<div class="gantt-chart">')
      html.push('<table class="gantt-table">')
      html.push('<thead><tr><th>Task</th><th>Start</th><th>End</th><th>Duration</th><th>Progress</th></tr></thead>')
      html.push('<tbody>')
      
      timeline.forEach(task => {
        const progress = task.progress || 0
        html.push(`
          <tr>
            <td>${this.escapeHtml(task.name || task.task)}</td>
            <td>${this.escapeHtml(task.startDate || task.start || 'TBD')}</td>
            <td>${this.escapeHtml(task.endDate || task.end || 'TBD')}</td>
            <td>${this.escapeHtml(task.duration || 'TBD')}</td>
            <td>
              <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
                <span class="progress-text">${progress}%</span>
              </div>
            </td>
          </tr>
        `)
      })
      
      html.push('</tbody></table>')
      html.push('</div>')
    } else {
      html.push(`<p>${this.escapeHtml(timeline)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format milestones
   */
  private formatMilestones(milestones: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Key Milestones</h2>')
    
    if (Array.isArray(milestones)) {
      html.push('<table class="pdf-table milestones-table">')
      html.push('<thead><tr><th>Milestone</th><th>Date</th><th>Description</th><th>Status</th><th>Dependencies</th></tr></thead>')
      html.push('<tbody>')
      
      milestones.forEach(milestone => {
        const status = milestone.status || 'Pending'
        const statusClass = this.getMilestoneStatusClass(status)
        
        html.push(`
          <tr>
            <td><strong>${this.escapeHtml(milestone.name || milestone.milestone)}</strong></td>
            <td>${this.escapeHtml(milestone.date || milestone.targetDate || 'TBD')}</td>
            <td>${this.escapeHtml(milestone.description || '')}</td>
            <td><span class="milestone-status ${statusClass}">${status}</span></td>
            <td>${this.escapeHtml(milestone.dependencies || 'None')}</td>
          </tr>
        `)
      })
      
      html.push('</tbody></table>')
    } else {
      html.push(`<p>${this.escapeHtml(milestones)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format Work Breakdown Structure
   */
  private formatWBS(wbs: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Work Breakdown Structure</h2>')
    
    if (Array.isArray(wbs)) {
      html.push('<div class="wbs-tree">')
      this.renderWBSLevel(wbs, html, '1')
      html.push('</div>')
    } else if (typeof wbs === 'object') {
      html.push('<div class="wbs-tree">')
      this.renderWBSObject(wbs, html)
      html.push('</div>')
    } else {
      html.push(`<p>${this.escapeHtml(wbs)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Render WBS level recursively
   */
  private renderWBSLevel(items: any[], html: string[], prefix: string): void {
    items.forEach((item, index) => {
      const itemNumber = `${prefix}.${index + 1}`
      html.push(`
        <div class="wbs-item" style="margin-left: ${(prefix.split('.').length - 1) * 20}px">
          <span class="wbs-number">${itemNumber}</span>
          <span class="wbs-name">${this.escapeHtml(item.name || item.task || item)}</span>
          ${item.duration ? `<span class="wbs-duration">${this.escapeHtml(item.duration)}</span>` : ''}
          ${item.cost ? `<span class="wbs-cost">${this.escapeHtml(item.cost)}</span>` : ''}
        </div>
      `)
      
      if (item.children || item.subtasks) {
        this.renderWBSLevel(item.children || item.subtasks, html, itemNumber)
      }
    })
  }
  
  /**
   * Render WBS object structure
   */
  private renderWBSObject(obj: any, html: string[], level: number = 0): void {
    Object.entries(obj).forEach(([key, value]) => {
      html.push(`
        <div class="wbs-item" style="margin-left: ${level * 20}px">
          <span class="wbs-name"><strong>${this.formatHeader(key)}</strong></span>
        </div>
      `)
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        this.renderWBSObject(value, html, level + 1)
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          html.push(`
            <div class="wbs-item" style="margin-left: ${(level + 1) * 20}px">
              <span class="wbs-name">• ${this.escapeHtml(item)}</span>
            </div>
          `)
        })
      } else {
        html.push(`
          <div class="wbs-item" style="margin-left: ${(level + 1) * 20}px">
            <span class="wbs-name">${this.escapeHtml(value)}</span>
          </div>
        `)
      }
    })
  }
  
  /**
   * Format resource plan
   */
  private formatResourcePlan(resources: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Resource Plan</h2>')
    
    if (Array.isArray(resources)) {
      html.push('<table class="pdf-table resource-table">')
      html.push('<thead><tr><th>Resource</th><th>Role</th><th>Allocation</th><th>Period</th><th>Cost</th></tr></thead>')
      html.push('<tbody>')
      
      resources.forEach(resource => {
        html.push(`
          <tr>
            <td>${this.escapeHtml(resource.name || resource.resource)}</td>
            <td>${this.escapeHtml(resource.role || 'TBD')}</td>
            <td>${this.escapeHtml(resource.allocation || '100%')}</td>
            <td>${this.escapeHtml(resource.period || 'Full Project')}</td>
            <td>${this.escapeHtml(resource.cost || 'TBD')}</td>
          </tr>
        `)
      })
      
      html.push('</tbody></table>')
    } else if (typeof resources === 'object') {
      if (resources.team) {
        html.push('<h3>Team Resources</h3>')
        html.push(this.formatTable(resources.team))
      }
      if (resources.equipment) {
        html.push('<h3>Equipment & Tools</h3>')
        html.push(this.formatTable(resources.equipment))
      }
      if (resources.budget) {
        html.push('<h3>Budget Allocation</h3>')
        html.push(this.formatKeyValuePairs(resources.budget))
      }
    } else {
      html.push(`<p>${this.escapeHtml(resources)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format budget
   */
  private formatBudget(budget: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Project Budget</h2>')
    
    if (typeof budget === 'object' && !Array.isArray(budget)) {
      html.push('<div class="budget-summary">')
      
      const items = [
        { label: 'Total Budget', value: budget.total || budget.totalBudget, highlight: true },
        { label: 'Allocated', value: budget.allocated },
        { label: 'Remaining', value: budget.remaining },
        { label: 'Contingency', value: budget.contingency }
      ]
      
      items.forEach(item => {
        if (item.value) {
          html.push(`
            <div class="budget-item ${item.highlight ? 'highlight' : ''}">
              <span class="budget-label">${item.label}</span>
              <span class="budget-value">${this.escapeHtml(item.value)}</span>
            </div>
          `)
        }
      })
      
      html.push('</div>')
      
      if (budget.breakdown) {
        html.push('<h3>Budget Breakdown</h3>')
        if (Array.isArray(budget.breakdown)) {
          html.push(this.formatTable(budget.breakdown))
        } else {
          html.push(this.formatKeyValuePairs(budget.breakdown))
        }
      }
    } else {
      html.push(`<p>${this.escapeHtml(budget)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format dependencies
   */
  private formatDependencies(dependencies: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Dependencies</h2>')
    
    if (Array.isArray(dependencies)) {
      html.push('<div class="dependencies-list">')
      dependencies.forEach(dep => {
        const typeClass = this.getDependencyTypeClass(dep.type)
        html.push(`
          <div class="dependency-item ${typeClass}">
            <div class="dependency-header">
              <span class="dependency-name">${this.escapeHtml(dep.name || dep.dependency)}</span>
              ${dep.type ? `<span class="dependency-type">${this.escapeHtml(dep.type)}</span>` : ''}
            </div>
            ${dep.description ? `<p>${this.escapeHtml(dep.description)}</p>` : ''}
            ${dep.impact ? `<p class="dependency-impact"><strong>Impact:</strong> ${this.escapeHtml(dep.impact)}</p>` : ''}
            ${dep.mitigation ? `<p class="dependency-mitigation"><strong>Mitigation:</strong> ${this.escapeHtml(dep.mitigation)}</p>` : ''}
          </div>
        `)
      })
      html.push('</div>')
    } else {
      html.push(`<p>${this.escapeHtml(dependencies)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format critical path
   */
  private formatCriticalPath(criticalPath: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Critical Path</h2>')
    
    if (Array.isArray(criticalPath)) {
      html.push('<div class="critical-path">')
      criticalPath.forEach((task, index) => {
        const isLast = index === criticalPath.length - 1
        html.push(`
          <div class="critical-task">
            <div class="critical-marker">
              <div class="critical-number">${index + 1}</div>
              ${!isLast ? '<div class="critical-arrow">→</div>' : ''}
            </div>
            <div class="critical-content">
              <strong>${this.escapeHtml(task.name || task.task || task)}</strong>
              ${task.duration ? `<span class="duration">${this.escapeHtml(task.duration)}</span>` : ''}
            </div>
          </div>
        `)
      })
      html.push('</div>')
    } else {
      html.push(`<p>${this.escapeHtml(criticalPath)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format metrics
   */
  private formatMetrics(metrics: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Success Metrics</h2>')
    
    if (Array.isArray(metrics)) {
      html.push('<div class="metrics-grid">')
      metrics.forEach(metric => {
        html.push(`
          <div class="metric-card">
            <h3>${this.escapeHtml(metric.name || metric.metric || metric.kpi)}</h3>
            ${metric.target ? `<div class="metric-target">Target: ${this.escapeHtml(metric.target)}</div>` : ''}
            ${metric.current ? `<div class="metric-current">Current: ${this.escapeHtml(metric.current)}</div>` : ''}
            ${metric.description ? `<p>${this.escapeHtml(metric.description)}</p>` : ''}
          </div>
        `)
      })
      html.push('</div>')
    } else {
      html.push(`<p>${this.escapeHtml(metrics)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Get milestone status class
   */
  private getMilestoneStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'Completed': 'status-completed',
      'On Track': 'status-on-track',
      'At Risk': 'status-at-risk',
      'Delayed': 'status-delayed',
      'Pending': 'status-pending'
    }
    
    return statusMap[status] || 'status-pending'
  }
  
  /**
   * Get dependency type class
   */
  private getDependencyTypeClass(type: string): string {
    const typeMap: Record<string, string> = {
      'Internal': 'dep-internal',
      'External': 'dep-external',
      'Technical': 'dep-technical',
      'Resource': 'dep-resource'
    }
    
    return typeMap[type] || 'dep-default'
  }
  
  /**
   * Get document-specific styles
   */
  protected getDocumentSpecificStyles(): string {
    return `
      .objectives-container {
        margin: 1.5rem 0;
      }
      
      .objective-card {
        display: flex;
        align-items: flex-start;
        margin: 1rem 0;
        padding: 1rem;
        background: #f9f9f9;
        border-radius: 8px;
      }
      
      .objective-number {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        margin-right: 1rem;
        flex-shrink: 0;
      }
      
      .objective-content {
        flex: 1;
      }
      
      .objective-content h3 {
        margin-top: 0;
      }
      
      .measurable, .deadline {
        font-size: 0.9rem;
        color: #666;
      }
      
      .scope-section {
        margin: 1.5rem 0;
        padding: 1rem;
        border-radius: 8px;
      }
      
      .scope-section.in-scope {
        background: #e8f5e9;
        border-left: 4px solid #4CAF50;
      }
      
      .scope-section.out-scope {
        background: #ffebee;
        border-left: 4px solid #f44336;
      }
      
      .scope-section.deliverables {
        background: #e3f2fd;
        border-left: 4px solid #2196F3;
      }
      
      .phases-timeline {
        margin: 2rem 0;
      }
      
      .phase-item {
        display: flex;
        margin: 2rem 0;
        position: relative;
      }
      
      .phase-marker {
        position: relative;
        margin-right: 2rem;
      }
      
      .phase-number {
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 1.2rem;
      }
      
      .phase-line {
        position: absolute;
        top: 50px;
        left: 24px;
        width: 2px;
        height: 100px;
        background: #ddd;
      }
      
      .phase-content {
        flex: 1;
        padding-bottom: 2rem;
      }
      
      .phase-dates {
        display: flex;
        gap: 1rem;
        margin: 0.5rem 0;
        font-size: 0.9rem;
        color: #666;
      }
      
      .phase-deliverables, .phase-milestones {
        margin-top: 1rem;
        padding: 0.5rem;
        background: #f5f5f5;
        border-radius: 4px;
      }
      
      .gantt-chart {
        overflow-x: auto;
        margin: 1.5rem 0;
      }
      
      .gantt-table {
        width: 100%;
        min-width: 600px;
      }
      
      .progress-bar-container {
        width: 100%;
        height: 20px;
        background: #e0e0e0;
        border-radius: 10px;
        position: relative;
        overflow: hidden;
      }
      
      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #8BC34A);
        transition: width 0.3s ease;
      }
      
      .progress-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 0.75rem;
        font-weight: 600;
      }
      
      .milestones-table .milestone-status {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      
      .status-completed {
        background: #C8E6C9;
        color: #1B5E20;
      }
      
      .status-on-track {
        background: #E3F2FD;
        color: #0D47A1;
      }
      
      .status-at-risk {
        background: #FFF9C4;
        color: #F57C00;
      }
      
      .status-delayed {
        background: #FFCCBC;
        color: #D32F2F;
      }
      
      .status-pending {
        background: #E0E0E0;
        color: #616161;
      }
      
      .wbs-tree {
        margin: 1.5rem 0;
        font-family: monospace;
      }
      
      .wbs-item {
        margin: 0.5rem 0;
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      
      .wbs-number {
        font-weight: bold;
        color: #667eea;
      }
      
      .wbs-duration, .wbs-cost {
        font-size: 0.9rem;
        color: #666;
        margin-left: auto;
      }
      
      .budget-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
      }
      
      .budget-item {
        padding: 1rem;
        background: #f5f5f5;
        border-radius: 8px;
        text-align: center;
      }
      
      .budget-item.highlight {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .budget-label {
        display: block;
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
        opacity: 0.9;
      }
      
      .budget-value {
        display: block;
        font-size: 1.5rem;
        font-weight: bold;
      }
      
      .dependencies-list {
        margin: 1.5rem 0;
      }
      
      .dependency-item {
        margin: 1rem 0;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid;
      }
      
      .dep-internal {
        background: #E3F2FD;
        border-left-color: #2196F3;
      }
      
      .dep-external {
        background: #FFF3E0;
        border-left-color: #FF9800;
      }
      
      .dep-technical {
        background: #F3E5F5;
        border-left-color: #9C27B0;
      }
      
      .dep-resource {
        background: #E8F5E9;
        border-left-color: #4CAF50;
      }
      
      .dep-default {
        background: #F5F5F5;
        border-left-color: #9E9E9E;
      }
      
      .dependency-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      
      .dependency-name {
        font-weight: bold;
      }
      
      .dependency-type {
        padding: 2px 8px;
        background: rgba(0,0,0,0.1);
        border-radius: 12px;
        font-size: 0.85rem;
      }
      
      .critical-path {
        display: flex;
        align-items: center;
        margin: 2rem 0;
        overflow-x: auto;
      }
      
      .critical-task {
        display: flex;
        align-items: center;
        margin: 0 1rem;
      }
      
      .critical-marker {
        display: flex;
        align-items: center;
      }
      
      .critical-number {
        width: 40px;
        height: 40px;
        background: #F44336;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      
      .critical-arrow {
        margin: 0 1rem;
        font-size: 1.5rem;
        color: #F44336;
      }
      
      .critical-content {
        margin-left: 1rem;
      }
      
      .critical-content .duration {
        display: block;
        font-size: 0.9rem;
        color: #666;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
      }
      
      .metric-card {
        padding: 1.5rem;
        background: #f9f9f9;
        border-radius: 8px;
        text-align: center;
      }
      
      .metric-card h3 {
        margin-top: 0;
        color: #667eea;
      }
      
      .metric-target {
        font-size: 1.2rem;
        font-weight: bold;
        color: #4CAF50;
        margin: 0.5rem 0;
      }
      
      .metric-current {
        font-size: 1rem;
        color: #666;
      }
    `
  }
}