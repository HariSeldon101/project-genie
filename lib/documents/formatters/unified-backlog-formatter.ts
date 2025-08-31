/**
 * Unified Backlog Formatter
 * Generates HTML for both document viewer and PDF generation
 */

import { BaseUnifiedFormatter } from './base-unified-formatter'

interface BacklogItem {
  id?: string
  title?: string
  description?: string
  priority?: 'Critical' | 'High' | 'Medium' | 'Low'
  effort?: number
  value?: number
  acceptanceCriteria?: string[]
  dependencies?: string[]
  tags?: string[]
  status?: 'Backlog' | 'Ready' | 'In Progress' | 'Done'
  epic?: string
  sprint?: string
}

interface BacklogData {
  projectName?: string
  productVision?: string
  epics?: Array<{
    name?: string
    description?: string
    priority?: string
    items?: number
  }>
  items?: BacklogItem[]
  sprints?: Array<{
    name?: string
    goal?: string
    startDate?: string
    endDate?: string
    velocity?: number
    items?: string[]
  }>
  metrics?: {
    totalItems?: number
    completedItems?: number
    averageVelocity?: number
    totalEffort?: number
    completedEffort?: number
  }
  prioritizationCriteria?: string[]
  definitionOfReady?: string[]
  definitionOfDone?: string[]
}

export class UnifiedBacklogFormatter extends BaseUnifiedFormatter<BacklogData> {
  constructor(content: BacklogData, metadata: any) {
    super(content, metadata)
  }
  
  protected ensureStructure(data: any): BacklogData {
    return {
      projectName: data?.projectName || this.metadata?.projectName || '',
      productVision: data?.productVision || '',
      epics: data?.epics || [],
      items: data?.items || [],
      sprints: data?.sprints || [],
      metrics: data?.metrics || {},
      prioritizationCriteria: data?.prioritizationCriteria || [],
      definitionOfReady: data?.definitionOfReady || [],
      definitionOfDone: data?.definitionOfDone || [],
      ...data
    }
  }

  generateHTML(): string {
    const sections: string[] = []
    
    // Add all sections
    sections.push(this.generateCoverPage())
    sections.push(this.generateTableOfContents())
    sections.push(this.generateExecutiveSummary())
    sections.push(this.generateProductVision())
    sections.push(this.generateEpics())
    sections.push(this.generateBacklogMetrics())
    sections.push(this.generatePriorityMatrix())
    sections.push(this.generateBacklogItems())
    sections.push(this.generateSprints())
    sections.push(this.generateVelocityChart())
    sections.push(this.generateDefinitions())
    sections.push(this.generateRoadmap())
    sections.push(this.generateDocumentControl())
    
    // Return simple div-wrapped HTML like PID does
    return `
      <div class="backlog-document">
        ${sections.join('\n')}
      </div>
    `
  }

  private generateCoverPage(): string {
    return `
      <div class="cover-page">
        <div class="cover-content">
          <h1 class="cover-title">PRODUCT BACKLOG</h1>
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
      { title: 'Product Vision', level: 1 },
      { title: 'Epics', level: 1 },
      { title: 'Backlog Metrics', level: 1 },
      { title: 'Priority Matrix', level: 1 },
      { title: 'Backlog Items', level: 1 },
      { title: 'Sprint Planning', level: 1 },
      { title: 'Velocity Tracking', level: 1 },
      { title: 'Definitions', level: 1 },
      { title: 'Product Roadmap', level: 1 }
    ]

    // Return HTML directly like PID does
    return `
      <nav class="table-of-contents">
        <h2>Table of Contents</h2>
        <ol>
          ${sections.map(s => `<li><a href="#${s.title.toLowerCase().replace(/\s+/g, '-')}">${s.title}</a></li>`).join('')}
        </ol>
      </nav>
    `
  }

  private generateExecutiveSummary(): string {
    const metrics = this.data.metrics || {
      totalItems: this.data.items?.length || 0,
      completedItems: 0,
      averageVelocity: 20,
      totalEffort: 0,
      completedEffort: 0
    }

    const completionRate = metrics.totalItems > 0 
      ? ((metrics.completedItems || 0) / metrics.totalItems * 100).toFixed(1)
      : '0'

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="executive-summary">
        <h2>Executive Summary</h2>
      <div class="executive-summary">
        <p>This Product Backlog document provides a comprehensive view of all features, enhancements, and fixes planned for <strong>${this.data.projectName || this.metadata.projectName}</strong>.</p>
        
        <div class="summary-grid">
          <div class="summary-card">
            <h4>Total Items</h4>
            <div class="metric-value">${metrics.totalItems}</div>
          </div>
          <div class="summary-card">
            <h4>Completion Rate</h4>
            <div class="metric-value">${completionRate}%</div>
          </div>
          <div class="summary-card">
            <h4>Average Velocity</h4>
            <div class="metric-value">${metrics.averageVelocity} points/sprint</div>
          </div>
          <div class="summary-card">
            <h4>Active Epics</h4>
            <div class="metric-value">${this.data.epics?.length || 0}</div>
          </div>
        </div>
        
        <p>The backlog is continuously refined and prioritized based on business value, technical dependencies, and stakeholder feedback.</p>
      </div>
      </section>
    `
  }

  private generateProductVision(): string {
    const vision = this.data.productVision || 
      'To deliver a comprehensive solution that meets user needs and drives business value through iterative development and continuous improvement.'

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="product-vision">
        <h2>Product Vision</h2>
      <div class="product-vision">
        <div class="vision-statement">
          <p>${vision}</p>
        </div>
        
        <h3>Key Objectives</h3>
        <ul>
          <li>Deliver high-value features that meet user needs</li>
          <li>Maintain technical excellence and quality standards</li>
          <li>Ensure continuous delivery of working software</li>
          <li>Adapt to changing requirements and feedback</li>
          <li>Maximize return on investment</li>
        </ul>
      </div>
      </section>
    `
  }

  private generateEpics(): string {
    const epics = this.data.epics || [
      { name: 'User Management', description: 'Complete user authentication and authorization system', priority: 'High', items: 8 },
      { name: 'Core Features', description: 'Essential functionality for MVP release', priority: 'Critical', items: 15 },
      { name: 'Integration', description: 'Third-party service integrations', priority: 'Medium', items: 6 },
      { name: 'Performance', description: 'Optimization and scaling improvements', priority: 'Medium', items: 5 }
    ]

    const epicCards = epics.map(epic => {
      const priorityClass = epic.priority?.toLowerCase() || 'medium'
      return `
        <div class="epic-card priority-${priorityClass}">
          <h4>${epic.name || 'Epic'}</h4>
          <p>${epic.description || 'Epic description'}</p>
          <div class="epic-stats">
            <span class="epic-priority">Priority: ${epic.priority || 'Medium'}</span>
            <span class="epic-items">${epic.items || 0} items</span>
          </div>
        </div>
      `
    }).join('')

    const epicChart = this.createMermaidChart('pie', `
      pie title Epic Distribution
        ${epics.map(e => `"${e.name || 'Epic'}" : ${e.items || 0}`).join('\n        ')}
    `)

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="epics">
        <h2>Epics</h2>
      <div class="epics">
        <div class="epics-grid">
          ${epicCards}
        </div>
        ${epicChart}
      </div>
      </section>
    `
  }

  private generateBacklogMetrics(): string {
    const items = this.data.items || []
    const priorityCount = {
      Critical: items.filter(i => i.priority === 'Critical').length,
      High: items.filter(i => i.priority === 'High').length,
      Medium: items.filter(i => i.priority === 'Medium').length,
      Low: items.filter(i => i.priority === 'Low').length
    }

    const statusCount = {
      Backlog: items.filter(i => !i.status || i.status === 'Backlog').length,
      Ready: items.filter(i => i.status === 'Ready').length,
      'In Progress': items.filter(i => i.status === 'In Progress').length,
      Done: items.filter(i => i.status === 'Done').length
    }

    const priorityChart = this.createMermaidChart('bar', `
      bar
        title Items by Priority
        x-axis [Critical, High, Medium, Low]
        y-axis "Number of Items"
        bar [${priorityCount.Critical}, ${priorityCount.High}, ${priorityCount.Medium}, ${priorityCount.Low}]
    `)

    const statusChart = this.createMermaidChart('pie', `
      pie title Items by Status
        "Backlog" : ${statusCount.Backlog}
        "Ready" : ${statusCount.Ready}
        "In Progress" : ${statusCount['In Progress']}
        "Done" : ${statusCount.Done}
    `)

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="backlog-metrics">
        <h2>Backlog Metrics</h2>
      <div class="backlog-metrics">
        <div class="metrics-grid">
          ${priorityChart}
          ${statusChart}
        </div>
        
        <div class="metrics-summary">
          <h3>Summary Statistics</h3>
          <table class="metrics-table">
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Total Items</td>
              <td>${items.length}</td>
            </tr>
            <tr>
              <td>Total Effort Points</td>
              <td>${items.reduce((sum, i) => sum + (i.effort || 0), 0)}</td>
            </tr>
            <tr>
              <td>Average Effort per Item</td>
              <td>${items.length > 0 ? (items.reduce((sum, i) => sum + (i.effort || 0), 0) / items.length).toFixed(1) : 0}</td>
            </tr>
            <tr>
              <td>Total Business Value</td>
              <td>${items.reduce((sum, i) => sum + (i.value || 0), 0)}</td>
            </tr>
          </table>
        </div>
      </div>
      </section>
    `
  }

  private generatePriorityMatrix(): string {
    const items = this.data.items || []
    
    // Create sample items if none exist
    const matrixItems = items.length > 0 ? items : [
      { title: 'User Authentication', effort: 8, value: 10 },
      { title: 'Dashboard UI', effort: 5, value: 8 },
      { title: 'API Integration', effort: 13, value: 7 },
      { title: 'Performance Optimization', effort: 3, value: 5 }
    ]

    const matrix = this.createMermaidChart('quadrantChart', `
      quadrantChart
        title Value vs Effort Matrix
        x-axis Low Effort --> High Effort
        y-axis Low Value --> High Value
        quadrant-1 High Value, High Effort
        quadrant-2 High Value, Low Effort (Quick Wins)
        quadrant-3 Low Value, Low Effort
        quadrant-4 Low Value, High Effort (Avoid)
        ${matrixItems.slice(0, 10).map(item => {
          const effort = (item.effort || 5) / 20  // Normalize to 0-1
          const value = (item.value || 5) / 10    // Normalize to 0-1
          return `"${item.title || 'Item'}": [${Math.min(effort, 1)}, ${Math.min(value, 1)}]`
        }).join('\n        ')}
    `)

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="priority-matrix">
        <h2>Priority Matrix</h2>
      <div class="priority-matrix">
        ${matrix}
        
        <h3>Prioritization Criteria</h3>
        <ul>
          ${(this.data.prioritizationCriteria || [
            'Business value and ROI',
            'User impact and satisfaction',
            'Technical dependencies',
            'Risk mitigation',
            'Strategic alignment'
          ]).map(criteria => `<li>${criteria}</li>`).join('')}
        </ul>
      </div>
      </section>
    `
  }

  private generateBacklogItems(): string {
    const items = this.data.items || [
      {
        id: 'US-001',
        title: 'User Registration',
        description: 'As a user, I want to register for an account',
        priority: 'High',
        effort: 5,
        value: 8,
        status: 'Ready',
        epic: 'User Management'
      },
      {
        id: 'US-002',
        title: 'Dashboard View',
        description: 'As a user, I want to see my dashboard',
        priority: 'High',
        effort: 8,
        value: 9,
        status: 'In Progress',
        epic: 'Core Features'
      },
      {
        id: 'US-003',
        title: 'Export Data',
        description: 'As a user, I want to export my data',
        priority: 'Medium',
        effort: 3,
        value: 5,
        status: 'Backlog',
        epic: 'Core Features'
      }
    ]

    const itemRows = items.slice(0, 20).map(item => {
      const priorityClass = `priority-${(item.priority || 'Medium').toLowerCase()}`
      const statusClass = `status-${(item.status || 'Backlog').toLowerCase().replace(' ', '-')}`
      
      return `
        <tr class="${priorityClass}">
          <td>${item.id || 'ID'}</td>
          <td>${item.title || 'Title'}</td>
          <td class="${priorityClass}">${item.priority || 'Medium'}</td>
          <td>${item.effort || 0}</td>
          <td>${item.value || 0}</td>
          <td class="${statusClass}">${item.status || 'Backlog'}</td>
          <td>${item.epic || '-'}</td>
        </tr>
      `
    }).join('')

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="backlog-items">
        <h2>Backlog Items</h2>
      <div class="backlog-items">
        <p>The following table shows the top priority items in the product backlog:</p>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Effort</th>
              <th>Value</th>
              <th>Status</th>
              <th>Epic</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        
        ${items.length > 20 ? `<p class="note">Showing top 20 items of ${items.length} total items</p>` : ''}
      </div>
      </section>
    `
  }

  private generateSprints(): string {
    const sprints = this.data.sprints || [
      {
        name: 'Sprint 1',
        goal: 'Complete user authentication',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        velocity: 21,
        items: ['US-001', 'US-004', 'US-007']
      },
      {
        name: 'Sprint 2',
        goal: 'Implement core dashboard',
        startDate: '2024-01-15',
        endDate: '2024-01-28',
        velocity: 18,
        items: ['US-002', 'US-005', 'US-008']
      },
      {
        name: 'Sprint 3',
        goal: 'Add data export functionality',
        startDate: '2024-01-29',
        endDate: '2024-02-11',
        velocity: 0,
        items: ['US-003', 'US-006', 'US-009']
      }
    ]

    const sprintCards = sprints.map(sprint => `
      <div class="sprint-card">
        <h4>${sprint.name || 'Sprint'}</h4>
        <p class="sprint-goal">${sprint.goal || 'Sprint goal'}</p>
        <div class="sprint-details">
          <div>Duration: ${sprint.startDate} to ${sprint.endDate}</div>
          <div>Velocity: ${sprint.velocity || 0} points</div>
          <div>Items: ${sprint.items?.length || 0}</div>
        </div>
      </div>
    `).join('')

    const timeline = this.createMermaidChart('gantt', `
      gantt
        title Sprint Timeline
        dateFormat YYYY-MM-DD
        section Sprints
        ${sprints.map(s => `${s.name} :${s.startDate}, ${s.endDate}`).join('\n        ')}
    `)

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="sprint-planning">
        <h2>Sprint Planning</h2>
      <div class="sprints">
        ${timeline}
        
        <div class="sprints-grid">
          ${sprintCards}
        </div>
      </div>
      </section>
    `
  }

  private generateVelocityChart(): string {
    const sprints = this.data.sprints || []
    const velocityData = sprints.map(s => s.velocity || 0)
    const avgVelocity = velocityData.length > 0 
      ? velocityData.reduce((a, b) => a + b, 0) / velocityData.length 
      : 20

    const velocityChart = this.createMermaidChart('line', `
      line
        title Team Velocity Trend
        x-axis [${sprints.map(s => `"${s.name || 'Sprint'}"`).join(', ')}]
        y-axis "Story Points"
        line [${velocityData.join(', ')}]
    `)

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="velocity-tracking">
        <h2>Velocity Tracking</h2>
      <div class="velocity">
        ${velocityChart}
        
        <div class="velocity-stats">
          <h3>Velocity Statistics</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <h4>Average Velocity</h4>
              <div class="stat-value">${avgVelocity.toFixed(1)} points</div>
            </div>
            <div class="stat-card">
              <h4>Last Sprint</h4>
              <div class="stat-value">${velocityData[velocityData.length - 1] || 0} points</div>
            </div>
            <div class="stat-card">
              <h4>Trend</h4>
              <div class="stat-value">${velocityData.length > 1 && velocityData[velocityData.length - 1] > velocityData[velocityData.length - 2] ? '↑' : '↓'} ${Math.abs((velocityData[velocityData.length - 1] || 0) - (velocityData[velocityData.length - 2] || 0))} points</div>
            </div>
          </div>
        </div>
      </div>
      </section>
    `
  }

  private generateDefinitions(): string {
    const definitionOfReady = this.data.definitionOfReady || [
      'User story is clearly defined with acceptance criteria',
      'Dependencies are identified and resolved',
      'Story is estimated by the team',
      'Story fits within a single sprint',
      'Test scenarios are defined'
    ]

    const definitionOfDone = this.data.definitionOfDone || [
      'Code is complete and checked into version control',
      'Unit tests are written and passing',
      'Code has been peer reviewed',
      'Documentation is updated',
      'Feature is deployed to staging environment',
      'Acceptance criteria are met',
      'Product Owner has accepted the story'
    ]

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="definitions">
        <h2>Definitions</h2>
      <div class="definitions">
        <div class="definition-grid">
          <div class="definition-card">
            <h3>Definition of Ready</h3>
            <p>A story is ready for sprint planning when:</p>
            <ul>
              ${definitionOfReady.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          
          <div class="definition-card">
            <h3>Definition of Done</h3>
            <p>A story is considered done when:</p>
            <ul>
              ${definitionOfDone.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
      </section>
    `
  }

  private generateRoadmap(): string {
    const quarters = [
      { name: 'Q1 2024', focus: 'Foundation & Core Features', items: 25 },
      { name: 'Q2 2024', focus: 'Integration & Enhancement', items: 20 },
      { name: 'Q3 2024', focus: 'Optimization & Scaling', items: 15 },
      { name: 'Q4 2024', focus: 'Advanced Features', items: 18 }
    ]

    const roadmap = this.createMermaidChart('timeline', `
      timeline
        title Product Roadmap 2024
        
        Q1 2024 : Foundation
                : Core Features
                : User Management
        
        Q2 2024 : Integration
                : Third-party Services
                : API Development
        
        Q3 2024 : Optimization
                : Performance
                : Scaling
        
        Q4 2024 : Advanced Features
                : Analytics
                : AI/ML Features
    `)

    const quarterCards = quarters.map(q => `
      <div class="quarter-card">
        <h4>${q.name}</h4>
        <p>${q.focus}</p>
        <div class="quarter-items">Estimated: ${q.items} items</div>
      </div>
    `).join('')

    // Return HTML directly like PID does
    return `
      <section class="document-section" id="product-roadmap">
        <h2>Product Roadmap</h2>
      <div class="roadmap">
        ${roadmap}
        
        <div class="quarters-grid">
          ${quarterCards}
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
            <td>${this.metadata.author || 'Product Team'}</td>
            <td>Current Product Backlog</td>
          </tr>
        </table>
      </div>
    `
  }
}