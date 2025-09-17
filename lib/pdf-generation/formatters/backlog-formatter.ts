/**
 * Backlog HTML Formatter
 * Handles user stories, sprint planning, priority matrices, and agile boards
 */

import { BaseHTMLFormatter } from './base-formatter'

export class BacklogFormatter extends BaseHTMLFormatter {
  /**
   * Format Backlog content to HTML
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
    
    // Overview
    if (content.overview || content.summary) {
      sections.push(this.formatSection(
        '1. Backlog Overview',
        content.overview || content.summary,
        2
      ))
    }
    
    // User Stories / Items
    if (content.stories || content.items || content.backlog_items) {
      sections.push('<div class="section">')
      sections.push('<h2>2. User Stories</h2>')
      sections.push(this.formatUserStories(content.stories || content.items || content.backlog_items))
      sections.push('</div>')
    }
    
    // Epics
    if (content.epics) {
      sections.push('<div class="section">')
      sections.push('<h2>3. Epics</h2>')
      sections.push(this.formatEpics(content.epics))
      sections.push('</div>')
    }
    
    // Sprint Planning
    if (content.sprints || content.sprint_planning) {
      sections.push('<div class="section">')
      sections.push('<h2>4. Sprint Planning</h2>')
      sections.push(this.formatSprintPlanning(content.sprints || content.sprint_planning))
      sections.push('</div>')
    }
    
    // Priority Matrix
    if (content.priorities || content.priority_matrix) {
      sections.push('<div class="section">')
      sections.push('<h2>5. Priority Matrix</h2>')
      sections.push(this.formatPriorityMatrix(content.priorities || content.priority_matrix))
      sections.push('</div>')
    }
    
    // Velocity & Metrics
    if (content.velocity || content.metrics) {
      sections.push('<div class="section">')
      sections.push('<h2>6. Velocity & Metrics</h2>')
      sections.push(this.formatVelocityMetrics(content.velocity || content.metrics))
      sections.push('</div>')
    }
    
    // Dependencies
    if (content.dependencies) {
      sections.push('<div class="section">')
      sections.push('<h2>7. Dependencies</h2>')
      sections.push(this.formatDependencies(content.dependencies))
      sections.push('</div>')
    }
    
    // Acceptance Criteria
    if (content.acceptance_criteria || content.definition_of_done) {
      sections.push('<div class="section">')
      sections.push('<h2>8. Acceptance Criteria</h2>')
      sections.push(this.formatAcceptanceCriteria(content.acceptance_criteria || content.definition_of_done))
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
          <li><a href="#section-1">Backlog Overview</a></li>
          <li><a href="#section-2">User Stories</a></li>
          <li><a href="#section-3">Epics</a></li>
          <li><a href="#section-4">Sprint Planning</a></li>
          <li><a href="#section-5">Priority Matrix</a></li>
          <li><a href="#section-6">Velocity & Metrics</a></li>
          <li><a href="#section-7">Dependencies</a></li>
          <li><a href="#section-8">Acceptance Criteria</a></li>
        </ol>
      </div>
      <div style="page-break-after: always;"></div>
    `
  }
  
  /**
   * Format user stories
   */
  private formatUserStories(stories: any): string {
    const html: string[] = []
    
    if (Array.isArray(stories)) {
      html.push('<div class="stories-container">')
      
      stories.forEach((story, index) => {
        if (typeof story === 'string') {
          html.push(`<div class="story-card">`)
          html.push(`<div class="story-header">`)
          html.push(`<span class="story-id">#${index + 1}</span>`)
          html.push(`</div>`)
          html.push(`<div class="story-content">`)
          html.push(`<p>${story}</p>`)
          html.push(`</div>`)
          html.push(`</div>`)
        } else {
          const priorityClass = this.getPriorityClass(story.priority)
          const statusClass = this.getStatusClass(story.status)
          
          html.push(`<div class="story-card ${priorityClass}">`)
          
          // Story Header
          html.push(`<div class="story-header">`)
          html.push(`<span class="story-id">${story.id || `#${index + 1}`}</span>`)
          if (story.type) {
            html.push(`<span class="story-type type-${story.type.toLowerCase()}">${story.type}</span>`)
          }
          if (story.points || story.story_points) {
            html.push(`<span class="story-points">${story.points || story.story_points} pts</span>`)
          }
          if (story.priority) {
            html.push(`<span class="story-priority priority-${story.priority.toLowerCase()}">${story.priority}</span>`)
          }
          html.push(`</div>`)
          
          // Story Title
          html.push(`<div class="story-title">`)
          html.push(`<h4>${story.title || story.name || story.story || 'User Story'}</h4>`)
          html.push(`</div>`)
          
          // Story Content
          html.push(`<div class="story-content">`)
          
          // User Story Format
          if (story.as_a || story.i_want || story.so_that || story.user_story) {
            html.push(`<div class="user-story-format">`)
            if (story.as_a) {
              html.push(`<p><strong>As a</strong> ${story.as_a}</p>`)
            }
            if (story.i_want) {
              html.push(`<p><strong>I want</strong> ${story.i_want}</p>`)
            }
            if (story.so_that) {
              html.push(`<p><strong>So that</strong> ${story.so_that}</p>`)
            }
            if (story.user_story && typeof story.user_story === 'string') {
              html.push(`<p>${story.user_story}</p>`)
            }
            html.push(`</div>`)
          } else if (story.description) {
            html.push(`<p>${story.description}</p>`)
          }
          
          // Acceptance Criteria
          if (story.acceptance_criteria || story.criteria) {
            html.push(`<div class="acceptance-criteria">`)
            html.push(`<h5>Acceptance Criteria:</h5>`)
            html.push(this.formatCriteria(story.acceptance_criteria || story.criteria))
            html.push(`</div>`)
          }
          
          // Tags/Labels
          if (story.tags || story.labels) {
            html.push(`<div class="story-tags">`)
            const tags = Array.isArray(story.tags || story.labels) ? 
              (story.tags || story.labels) : [story.tags || story.labels]
            tags.forEach((tag: any) => {
              html.push(`<span class="tag">${tag}</span>`)
            })
            html.push(`</div>`)
          }
          
          html.push(`</div>`)
          
          // Story Footer
          html.push(`<div class="story-footer">`)
          if (story.assignee) {
            html.push(`<span class="assignee">👤 ${story.assignee}</span>`)
          }
          if (story.sprint) {
            html.push(`<span class="sprint">🔄 Sprint ${story.sprint}</span>`)
          }
          if (story.status) {
            html.push(`<span class="status ${statusClass}">${story.status}</span>`)
          }
          html.push(`</div>`)
          
          html.push(`</div>`)
        }
      })
      
      html.push('</div>')
    } else {
      html.push(this.formatSection('', stories, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format epics
   */
  private formatEpics(epics: any): string {
    const html: string[] = []
    
    if (Array.isArray(epics)) {
      html.push('<div class="epics-container">')
      
      epics.forEach((epic, index) => {
        if (typeof epic === 'string') {
          html.push(`<div class="epic-card">`)
          html.push(`<h3>Epic ${index + 1}</h3>`)
          html.push(`<p>${epic}</p>`)
          html.push(`</div>`)
        } else {
          html.push(`<div class="epic-card">`)
          html.push(`<h3>${epic.name || epic.title || `Epic ${index + 1}`}</h3>`)
          
          if (epic.description) {
            html.push(`<p>${epic.description}</p>`)
          }
          
          if (epic.objectives || epic.goals) {
            html.push(`<h4>Objectives</h4>`)
            html.push(this.formatList(epic.objectives || epic.goals))
          }
          
          if (epic.stories || epic.user_stories) {
            html.push(`<h4>Related Stories</h4>`)
            html.push(this.formatList(epic.stories || epic.user_stories))
          }
          
          if (epic.progress) {
            html.push(this.createProgressBar(epic.progress))
          }
          
          html.push(`</div>`)
        }
      })
      
      html.push('</div>')
    } else {
      html.push(this.formatSection('', epics, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format sprint planning
   */
  private formatSprintPlanning(sprints: any): string {
    const html: string[] = []
    
    if (Array.isArray(sprints)) {
      html.push('<div class="sprints-timeline">')
      
      sprints.forEach((sprint, index) => {
        if (typeof sprint === 'string') {
          html.push(`<div class="sprint-block">`)
          html.push(`<h3>Sprint ${index + 1}</h3>`)
          html.push(`<p>${sprint}</p>`)
          html.push(`</div>`)
        } else {
          const statusClass = sprint.status === 'completed' ? 'sprint-completed' :
                            sprint.status === 'active' ? 'sprint-active' :
                            'sprint-planned'
          
          html.push(`<div class="sprint-block ${statusClass}">`)
          html.push(`<div class="sprint-header">`)
          html.push(`<h3>${sprint.name || `Sprint ${sprint.number || index + 1}`}</h3>`)
          if (sprint.dates || sprint.duration) {
            html.push(`<span class="sprint-dates">${sprint.dates || sprint.duration}</span>`)
          }
          html.push(`</div>`)
          
          if (sprint.goal || sprint.sprint_goal) {
            html.push(`<div class="sprint-goal">`)
            html.push(`<strong>Sprint Goal:</strong> ${sprint.goal || sprint.sprint_goal}`)
            html.push(`</div>`)
          }
          
          if (sprint.stories || sprint.items) {
            html.push(`<div class="sprint-stories">`)
            html.push(`<h4>Committed Stories (${sprint.points || '0'} points)</h4>`)
            html.push(this.formatSprintStories(sprint.stories || sprint.items))
            html.push(`</div>`)
          }
          
          if (sprint.velocity || sprint.metrics) {
            html.push(`<div class="sprint-metrics">`)
            html.push(this.formatSprintMetrics(sprint.velocity || sprint.metrics))
            html.push(`</div>`)
          }
          
          html.push(`</div>`)
        }
      })
      
      html.push('</div>')
      
      // Add burndown chart placeholder
      html.push(this.createBurndownChart())
    } else {
      html.push(this.formatSection('', sprints, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format priority matrix
   */
  private formatPriorityMatrix(priorities: any): string {
    const html: string[] = []
    
    // Create priority quadrant
    html.push(this.createPriorityQuadrant())
    
    if (Array.isArray(priorities)) {
      html.push('<table class="priority-table">')
      html.push('<thead>')
      html.push('<tr>')
      html.push('<th>Item</th>')
      html.push('<th>Priority</th>')
      html.push('<th>Effort</th>')
      html.push('<th>Value</th>')
      html.push('<th>Risk</th>')
      html.push('</tr>')
      html.push('</thead>')
      html.push('<tbody>')
      
      priorities.forEach(item => {
        if (typeof item === 'string') {
          html.push(`<tr><td colspan="5">${item}</td></tr>`)
        } else {
          const priorityClass = this.getPriorityClass(item.priority)
          html.push(`<tr class="${priorityClass}">`)
          html.push(`<td>${item.item || item.name || 'Item'}</td>`)
          html.push(`<td><span class="priority-badge priority-${(item.priority || 'medium').toLowerCase()}">${item.priority || 'Medium'}</span></td>`)
          html.push(`<td>${item.effort || 'Medium'}</td>`)
          html.push(`<td>${item.value || 'Medium'}</td>`)
          html.push(`<td>${item.risk || 'Low'}</td>`)
          html.push(`</tr>`)
        }
      })
      
      html.push('</tbody>')
      html.push('</table>')
    } else {
      html.push(this.formatSection('', priorities, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Create priority quadrant
   */
  private createPriorityQuadrant(): string {
    return `
      <div class="priority-quadrant">
        <h3>Priority Quadrant</h3>
        <svg width="400" height="400" viewBox="0 0 400 400">
          <!-- Grid background -->
          <rect x="50" y="50" width="300" height="300" fill="#f9f9f9" stroke="#ddd"/>
          
          <!-- Quadrants -->
          <rect x="50" y="50" width="150" height="150" fill="#ffebee" opacity="0.5"/>
          <rect x="200" y="50" width="150" height="150" fill="#fff3e0" opacity="0.5"/>
          <rect x="50" y="200" width="150" height="150" fill="#f3e5f5" opacity="0.5"/>
          <rect x="200" y="200" width="150" height="150" fill="#e8f5e9" opacity="0.5"/>
          
          <!-- Grid lines -->
          <line x1="50" y1="200" x2="350" y2="200" stroke="#666" stroke-width="1"/>
          <line x1="200" y1="50" x2="200" y2="350" stroke="#666" stroke-width="1"/>
          
          <!-- Quadrant labels -->
          <text x="125" y="125" text-anchor="middle" font-size="12" fill="#666">Do First</text>
          <text x="125" y="145" text-anchor="middle" font-size="10" fill="#999">(High Value, Low Effort)</text>
          
          <text x="275" y="125" text-anchor="middle" font-size="12" fill="#666">Schedule</text>
          <text x="275" y="145" text-anchor="middle" font-size="10" fill="#999">(High Value, High Effort)</text>
          
          <text x="125" y="275" text-anchor="middle" font-size="12" fill="#666">Delegate</text>
          <text x="125" y="295" text-anchor="middle" font-size="10" fill="#999">(Low Value, Low Effort)</text>
          
          <text x="275" y="275" text-anchor="middle" font-size="12" fill="#666">Eliminate</text>
          <text x="275" y="295" text-anchor="middle" font-size="10" fill="#999">(Low Value, High Effort)</text>
          
          <!-- Axis labels -->
          <text x="200" y="380" text-anchor="middle" font-size="14" font-weight="bold">Effort →</text>
          <text x="20" y="200" text-anchor="middle" font-size="14" font-weight="bold" transform="rotate(-90 20 200)">Value →</text>
        </svg>
      </div>
    `
  }
  
  /**
   * Create burndown chart
   */
  private createBurndownChart(): string {
    return `
      <div class="burndown-chart">
        <h3>Sprint Burndown</h3>
        <svg width="500" height="300" viewBox="0 0 500 300">
          <!-- Axes -->
          <line x1="50" y1="250" x2="450" y2="250" stroke="#333" stroke-width="2"/>
          <line x1="50" y1="50" x2="50" y2="250" stroke="#333" stroke-width="2"/>
          
          <!-- Grid lines -->
          <line x1="50" y1="100" x2="450" y2="100" stroke="#eee" stroke-width="1"/>
          <line x1="50" y1="150" x2="450" y2="150" stroke="#eee" stroke-width="1"/>
          <line x1="50" y1="200" x2="450" y2="200" stroke="#eee" stroke-width="1"/>
          
          <!-- Ideal line -->
          <line x1="50" y1="50" x2="450" y2="250" stroke="#4caf50" stroke-width="2" stroke-dasharray="5,5"/>
          
          <!-- Actual line -->
          <polyline points="50,50 150,80 250,120 350,180 450,220" 
                    fill="none" stroke="#2196f3" stroke-width="2"/>
          
          <!-- Points -->
          <circle cx="50" cy="50" r="4" fill="#2196f3"/>
          <circle cx="150" cy="80" r="4" fill="#2196f3"/>
          <circle cx="250" cy="120" r="4" fill="#2196f3"/>
          <circle cx="350" cy="180" r="4" fill="#2196f3"/>
          <circle cx="450" cy="220" r="4" fill="#2196f3"/>
          
          <!-- Labels -->
          <text x="250" y="30" text-anchor="middle" font-size="14" font-weight="bold">Sprint Burndown Chart</text>
          <text x="250" y="280" text-anchor="middle" font-size="12">Days</text>
          <text x="20" y="150" text-anchor="middle" font-size="12" transform="rotate(-90 20 150)">Story Points</text>
          
          <!-- Legend -->
          <line x1="300" y1="70" x2="330" y2="70" stroke="#4caf50" stroke-width="2" stroke-dasharray="5,5"/>
          <text x="335" y="75" font-size="10">Ideal</text>
          
          <line x1="300" y1="90" x2="330" y2="90" stroke="#2196f3" stroke-width="2"/>
          <text x="335" y="95" font-size="10">Actual</text>
        </svg>
      </div>
    `
  }
  
  /**
   * Format velocity metrics
   */
  private formatVelocityMetrics(metrics: any): string {
    const html: string[] = []
    
    if (typeof metrics === 'object' && !Array.isArray(metrics)) {
      html.push('<div class="velocity-dashboard">')
      
      // Velocity chart
      html.push(this.createVelocityChart())
      
      // Metrics cards
      html.push('<div class="metrics-cards">')
      
      if (metrics.average_velocity || metrics.average) {
        html.push(`<div class="metric-card">`)
        html.push(`<h4>Average Velocity</h4>`)
        html.push(`<div class="metric-value">${metrics.average_velocity || metrics.average}</div>`)
        html.push(`<div class="metric-unit">points/sprint</div>`)
        html.push(`</div>`)
      }
      
      if (metrics.last_sprint || metrics.current) {
        html.push(`<div class="metric-card">`)
        html.push(`<h4>Last Sprint</h4>`)
        html.push(`<div class="metric-value">${metrics.last_sprint || metrics.current}</div>`)
        html.push(`<div class="metric-unit">points completed</div>`)
        html.push(`</div>`)
      }
      
      if (metrics.predictability) {
        html.push(`<div class="metric-card">`)
        html.push(`<h4>Predictability</h4>`)
        html.push(`<div class="metric-value">${metrics.predictability}%</div>`)
        html.push(`<div class="metric-unit">commitment met</div>`)
        html.push(`</div>`)
      }
      
      html.push('</div>')
      html.push('</div>')
    } else {
      html.push(this.formatSection('', metrics, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Create velocity chart
   */
  private createVelocityChart(): string {
    return `
      <div class="velocity-chart">
        <h4>Velocity Trend</h4>
        <svg width="500" height="200" viewBox="0 0 500 200">
          <!-- Axes -->
          <line x1="50" y1="150" x2="450" y2="150" stroke="#333" stroke-width="1"/>
          
          <!-- Bars -->
          <rect x="80" y="100" width="40" height="50" fill="#4caf50" opacity="0.8"/>
          <text x="100" y="95" text-anchor="middle" font-size="10">40</text>
          
          <rect x="140" y="90" width="40" height="60" fill="#4caf50" opacity="0.8"/>
          <text x="160" y="85" text-anchor="middle" font-size="10">48</text>
          
          <rect x="200" y="85" width="40" height="65" fill="#4caf50" opacity="0.8"/>
          <text x="220" y="80" text-anchor="middle" font-size="10">52</text>
          
          <rect x="260" y="95" width="40" height="55" fill="#4caf50" opacity="0.8"/>
          <text x="280" y="90" text-anchor="middle" font-size="10">44</text>
          
          <rect x="320" y="80" width="40" height="70" fill="#2196f3" opacity="0.8"/>
          <text x="340" y="75" text-anchor="middle" font-size="10">56</text>
          
          <rect x="380" y="85" width="40" height="65" fill="#2196f3" opacity="0.8"/>
          <text x="400" y="80" text-anchor="middle" font-size="10">52</text>
          
          <!-- Average line -->
          <line x1="50" y1="92" x2="450" y2="92" stroke="#ff9800" stroke-width="2" stroke-dasharray="5,5"/>
          <text x="460" y="95" font-size="10" fill="#ff9800">Avg</text>
          
          <!-- Sprint labels -->
          <text x="100" y="165" text-anchor="middle" font-size="10">S1</text>
          <text x="160" y="165" text-anchor="middle" font-size="10">S2</text>
          <text x="220" y="165" text-anchor="middle" font-size="10">S3</text>
          <text x="280" y="165" text-anchor="middle" font-size="10">S4</text>
          <text x="340" y="165" text-anchor="middle" font-size="10">S5</text>
          <text x="400" y="165" text-anchor="middle" font-size="10">S6</text>
        </svg>
      </div>
    `
  }
  
  /**
   * Format dependencies
   */
  private formatDependencies(dependencies: any): string {
    const html: string[] = []
    
    if (Array.isArray(dependencies)) {
      html.push('<table class="dependencies-table">')
      html.push('<thead>')
      html.push('<tr>')
      html.push('<th>Item</th>')
      html.push('<th>Depends On</th>')
      html.push('<th>Type</th>')
      html.push('<th>Status</th>')
      html.push('</tr>')
      html.push('</thead>')
      html.push('<tbody>')
      
      dependencies.forEach(dep => {
        if (typeof dep === 'string') {
          html.push(`<tr><td colspan="4">${dep}</td></tr>`)
        } else {
          const statusClass = dep.status === 'resolved' ? 'status-resolved' :
                            dep.status === 'blocked' ? 'status-blocked' :
                            'status-pending'
          html.push('<tr>')
          html.push(`<td>${dep.item || dep.from || 'Item'}</td>`)
          html.push(`<td>${dep.depends_on || dep.to || 'Dependency'}</td>`)
          html.push(`<td>${dep.type || 'Hard'}</td>`)
          html.push(`<td class="${statusClass}">${dep.status || 'Pending'}</td>`)
          html.push('</tr>')
        }
      })
      
      html.push('</tbody>')
      html.push('</table>')
    } else {
      html.push(this.formatSection('', dependencies, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format acceptance criteria
   */
  private formatAcceptanceCriteria(criteria: any): string {
    const html: string[] = []
    
    if (typeof criteria === 'string') {
      html.push(`<p>${criteria}</p>`)
    } else if (Array.isArray(criteria)) {
      html.push('<div class="criteria-checklist">')
      criteria.forEach(criterion => {
        if (typeof criterion === 'string') {
          html.push(`<div class="criterion">☐ ${criterion}</div>`)
        } else {
          const checked = criterion.completed || criterion.done ? '☑' : '☐'
          html.push(`<div class="criterion ${criterion.completed ? 'completed' : ''}">`)
          html.push(`${checked} ${criterion.criterion || criterion.criteria || criterion}`)
          html.push(`</div>`)
        }
      })
      html.push('</div>')
    } else if (typeof criteria === 'object') {
      Object.entries(criteria).forEach(([key, value]) => {
        html.push(`<h4>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>`)
        html.push(this.formatSection('', value, 0))
      })
    }
    
    return html.join('\n')
  }
  
  // Helper methods
  
  private formatCriteria(criteria: any): string {
    if (!criteria) return ''
    
    const html: string[] = []
    const items = Array.isArray(criteria) ? criteria : [criteria]
    
    html.push('<ul class="criteria-list">')
    items.forEach(item => {
      html.push(`<li>${item}</li>`)
    })
    html.push('</ul>')
    
    return html.join('\n')
  }
  
  private formatList(items: any): string {
    if (!items) return ''
    
    const html: string[] = []
    const itemList = Array.isArray(items) ? items : [items]
    
    html.push('<ul>')
    itemList.forEach(item => {
      html.push(`<li>${item}</li>`)
    })
    html.push('</ul>')
    
    return html.join('\n')
  }
  
  private formatSprintStories(stories: any): string {
    if (!stories) return ''
    
    const html: string[] = []
    const storyList = Array.isArray(stories) ? stories : [stories]
    
    html.push('<ul class="sprint-stories-list">')
    storyList.forEach(story => {
      if (typeof story === 'string') {
        html.push(`<li>${story}</li>`)
      } else {
        const statusIcon = story.status === 'done' ? '✓' : 
                          story.status === 'in_progress' ? '⏳' : '○'
        html.push(`<li>`)
        html.push(`${statusIcon} ${story.title || story.name || story}`)
        if (story.points) {
          html.push(` (${story.points} pts)`)
        }
        html.push(`</li>`)
      }
    })
    html.push('</ul>')
    
    return html.join('\n')
  }
  
  private formatSprintMetrics(metrics: any): string {
    if (!metrics) return ''
    
    const html: string[] = []
    
    if (typeof metrics === 'object') {
      html.push('<div class="sprint-metric-row">')
      if (metrics.committed) {
        html.push(`<span>Committed: ${metrics.committed}</span>`)
      }
      if (metrics.completed) {
        html.push(`<span>Completed: ${metrics.completed}</span>`)
      }
      if (metrics.velocity) {
        html.push(`<span>Velocity: ${metrics.velocity}</span>`)
      }
      html.push('</div>')
    } else {
      html.push(`<p>${metrics}</p>`)
    }
    
    return html.join('\n')
  }
  
  private createProgressBar(progress: number | string): string {
    const percentage = typeof progress === 'string' ? 
      parseFloat(progress.replace('%', '')) : progress
    
    return `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
        <span class="progress-text">${percentage}%</span>
      </div>
    `
  }
  
  private getPriorityClass(priority: string | undefined): string {
    if (!priority) return ''
    const p = priority.toLowerCase()
    if (p === 'fatal' || p === 'highest') return 'priority-critical'
    if (p === 'high') return 'priority-high'
    if (p === 'low') return 'priority-low'
    return 'priority-medium'
  }
  
  private getStatusClass(status: string | undefined): string {
    if (!status) return ''
    const s = status.toLowerCase()
    if (s === 'done' || s === 'completed') return 'status-done'
    if (s === 'in_progress' || s === 'in progress') return 'status-in-progress'
    if (s === 'blocked') return 'status-blocked'
    return 'status-todo'
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
      .stories-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
      }
      
      .story-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1rem;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .story-card.priority-critical { border-left: 4px solid #d32f2f; }
      .story-card.priority-high { border-left: 4px solid #f57c00; }
      .story-card.priority-medium { border-left: 4px solid #fbc02d; }
      .story-card.priority-low { border-left: 4px solid #689f38; }
      
      .story-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .story-id {
        font-weight: bold;
        color: #666;
      }
      
      .story-type {
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        text-transform: uppercase;
      }
      
      .type-story { background: #e3f2fd; color: #1976d2; }
      .type-bug { background: #ffebee; color: #c62828; }
      .type-task { background: #f3e5f5; color: #7b1fa2; }
      .type-epic { background: #e8f5e9; color: #388e3c; }
      
      .story-points {
        background: #fff3e0;
        color: #e65100;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.9rem;
        font-weight: bold;
      }
      
      .story-priority {
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: bold;
      }
      
      .priority-critical { background: #ffcdd2; color: #b71c1c; }
      .priority-high { background: #ffe0b2; color: #e65100; }
      .priority-medium { background: #fff9c4; color: #f57f17; }
      .priority-low { background: #dcedc8; color: #33691e; }
      
      .story-title h4 {
        margin: 0.5rem 0;
        color: #333;
      }
      
      .story-content {
        margin: 1rem 0;
      }
      
      .user-story-format {
        background: #f5f5f5;
        padding: 0.75rem;
        border-radius: 4px;
        font-style: italic;
      }
      
      .user-story-format p {
        margin: 0.25rem 0;
      }
      
      .acceptance-criteria {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e0e0e0;
      }
      
      .acceptance-criteria h5 {
        margin: 0 0 0.5rem 0;
        color: #666;
      }
      
      .criteria-list {
        list-style-type: none;
        padding-left: 0;
      }
      
      .criteria-list li {
        position: relative;
        padding-left: 1.5rem;
        margin: 0.25rem 0;
      }
      
      .criteria-list li::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: #4caf50;
      }
      
      .story-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-top: 0.5rem;
      }
      
      .tag {
        display: inline-block;
        padding: 0.15rem 0.5rem;
        background: #e0e0e0;
        color: #666;
        border-radius: 10px;
        font-size: 0.8rem;
      }
      
      .story-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e0e0e0;
        font-size: 0.9rem;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .assignee { color: #666; }
      .sprint { color: #1976d2; }
      
      .status {
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
      }
      
      .status-done { background: #c8e6c9; color: #1b5e20; }
      .status-in-progress { background: #bbdefb; color: #0d47a1; }
      .status-blocked { background: #ffcdd2; color: #b71c1c; }
      .status-todo { background: #e0e0e0; color: #666; }
      
      .epics-container {
        margin: 2rem 0;
      }
      
      .epic-card {
        border: 2px solid #3f51b5;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
        background: #e8eaf6;
      }
      
      .epic-card h3 {
        color: #3f51b5;
        margin-bottom: 1rem;
      }
      
      .progress-bar {
        position: relative;
        width: 100%;
        height: 24px;
        background: #e0e0e0;
        border-radius: 12px;
        overflow: hidden;
        margin: 1rem 0;
      }
      
      .progress-fill {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        background: linear-gradient(90deg, #4caf50, #8bc34a);
        transition: width 0.3s ease;
      }
      
      .progress-text {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        font-size: 0.9rem;
        font-weight: bold;
        color: #333;
      }
      
      .sprints-timeline {
        margin: 2rem 0;
      }
      
      .sprint-block {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
        background: white;
      }
      
      .sprint-completed { background: #e8f5e9; border-color: #4caf50; }
      .sprint-active { background: #e3f2fd; border-color: #2196f3; }
      .sprint-planned { background: #fafafa; border-color: #e0e0e0; }
      
      .sprint-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      
      .sprint-dates {
        color: #666;
        font-size: 0.9rem;
      }
      
      .sprint-goal {
        background: #fff3e0;
        padding: 0.75rem;
        border-radius: 4px;
        margin: 1rem 0;
      }
      
      .sprint-stories {
        margin: 1rem 0;
      }
      
      .sprint-stories h4 {
        color: #666;
        margin-bottom: 0.5rem;
      }
      
      .sprint-stories-list {
        list-style: none;
        padding-left: 0;
      }
      
      .sprint-stories-list li {
        padding: 0.25rem 0;
      }
      
      .sprint-metrics {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e0e0e0;
      }
      
      .sprint-metric-row {
        display: flex;
        gap: 2rem;
        font-size: 0.9rem;
      }
      
      .sprint-metric-row span {
        color: #666;
      }
      
      .priority-quadrant {
        margin: 2rem 0;
        text-align: center;
      }
      
      .priority-table th {
        background: #f5f5f5;
      }
      
      .priority-badge {
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: bold;
      }
      
      .burndown-chart {
        margin: 2rem 0;
        text-align: center;
      }
      
      .velocity-dashboard {
        margin: 2rem 0;
      }
      
      .velocity-chart {
        margin: 1rem 0;
        text-align: center;
      }
      
      .metrics-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
        color: #666;
        font-size: 0.9rem;
      }
      
      .metric-value {
        font-size: 2rem;
        font-weight: bold;
        color: #2196f3;
      }
      
      .metric-unit {
        font-size: 0.8rem;
        color: #999;
      }
      
      .dependencies-table th {
        background: #fce4ec;
      }
      
      .status-resolved { color: #2e7d32; }
      .status-blocked { color: #c62828; }
      .status-pending { color: #f57c00; }
      
      .criteria-checklist {
        margin: 1rem 0;
      }
      
      .criterion {
        padding: 0.5rem 0;
        font-family: monospace;
      }
      
      .criterion.completed {
        color: #2e7d32;
        text-decoration: line-through;
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