/**
 * Kanban Board HTML Formatter
 * Formats kanban board data into professional HTML for PDF generation
 */

import { BaseHTMLFormatter } from './base-formatter'

export class KanbanFormatter extends BaseHTMLFormatter {
  
  formatToHTML(content: any): string {
    const html = `
      ${this.getStyles()}
      
      <div class="document">
        ${this.generateHeader()}
        ${this.generateTableOfContents(content)}
        ${this.generateBoardOverview(content)}
        ${this.generateKanbanBoard(content)}
        ${this.generateWorkInProgress(content)}
        ${this.generateMetrics(content)}
        ${this.generateCycleTime(content)}
        ${this.generateThroughput(content)}
        ${this.generateBlockedItems(content)}
        ${this.generateTeamCapacity(content)}
        ${this.generateUpcomingWork(content)}
        ${this.generateFooter()}
      </div>
    `
    
    return html
  }
  
  protected getDocumentSpecificStyles(): string {
    return `
      .kanban-board {
        display: flex;
        gap: 20px;
        margin: 30px 0;
        min-height: 400px;
        overflow-x: auto;
      }
      
      .kanban-column {
        flex: 1;
        min-width: 250px;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
      }
      
      .kanban-column-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #dee2e6;
      }
      
      .kanban-column-title {
        font-size: 16px;
        font-weight: 600;
        color: #495057;
      }
      
      .kanban-column-count {
        background: #6c757d;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
      }
      
      .kanban-card {
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 10px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      
      .kanban-card-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 8px;
      }
      
      .kanban-card-id {
        font-size: 11px;
        color: #6c757d;
        font-weight: 500;
      }
      
      .kanban-card-priority {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .priority-critical {
        background: #dc3545;
        color: white;
      }
      
      .priority-high {
        background: #fd7e14;
        color: white;
      }
      
      .priority-medium {
        background: #ffc107;
        color: #000;
      }
      
      .priority-low {
        background: #28a745;
        color: white;
      }
      
      .kanban-card-title {
        font-size: 14px;
        font-weight: 500;
        color: #212529;
        margin-bottom: 8px;
        line-height: 1.4;
      }
      
      .kanban-card-meta {
        display: flex;
        gap: 15px;
        font-size: 11px;
        color: #6c757d;
      }
      
      .kanban-card-assignee {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .kanban-card-avatar {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #007bff;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
      }
      
      .kanban-card-labels {
        display: flex;
        gap: 4px;
        margin-top: 8px;
      }
      
      .kanban-label {
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 500;
      }
      
      .label-bug {
        background: #dc3545;
        color: white;
      }
      
      .label-feature {
        background: #007bff;
        color: white;
      }
      
      .label-enhancement {
        background: #17a2b8;
        color: white;
      }
      
      .label-documentation {
        background: #6c757d;
        color: white;
      }
      
      .wip-limit-warning {
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 6px;
        padding: 10px;
        margin: 10px 0;
      }
      
      .wip-limit-exceeded {
        background: #f8d7da;
        border: 1px solid #dc3545;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin: 30px 0;
      }
      
      .metric-card {
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
      }
      
      .metric-value {
        font-size: 32px;
        font-weight: 700;
        color: #007bff;
        margin-bottom: 5px;
      }
      
      .metric-label {
        font-size: 14px;
        color: #6c757d;
        margin-bottom: 5px;
      }
      
      .metric-change {
        font-size: 12px;
        font-weight: 500;
      }
      
      .metric-change.positive {
        color: #28a745;
      }
      
      .metric-change.negative {
        color: #dc3545;
      }
      
      .swimlane {
        border-top: 2px solid #dee2e6;
        margin-top: 20px;
        padding-top: 15px;
      }
      
      .swimlane-header {
        font-size: 14px;
        font-weight: 600;
        color: #495057;
        margin-bottom: 10px;
      }
      
      .blocked-indicator {
        background: #dc3545;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        margin-left: 8px;
      }
      
      .cycle-time-chart {
        margin: 30px 0;
      }
      
      .cumulative-flow {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        margin: 30px 0;
      }
    `
  }
  
  private generateTableOfContents(content: any): string {
    return `
      <div class="toc">
        <h2>Contents</h2>
        <ol>
          <li><a href="#overview">Board Overview</a></li>
          <li><a href="#kanban">Kanban Board</a></li>
          <li><a href="#wip">Work In Progress</a></li>
          <li><a href="#metrics">Key Metrics</a></li>
          <li><a href="#cycle-time">Cycle Time Analysis</a></li>
          <li><a href="#throughput">Throughput</a></li>
          <li><a href="#blocked">Blocked Items</a></li>
          <li><a href="#capacity">Team Capacity</a></li>
          <li><a href="#upcoming">Upcoming Work</a></li>
        </ol>
      </div>
    `
  }
  
  private generateBoardOverview(content: any): string {
    const overview = content.overview || {}
    
    return `
      <section id="overview" class="section">
        <h2>Board Overview</h2>
        
        <div class="content-block">
          <p><strong>Board Name:</strong> ${overview.boardName || 'Sprint Board'}</p>
          <p><strong>Sprint:</strong> ${overview.sprint || 'Current Sprint'}</p>
          <p><strong>Period:</strong> ${overview.startDate || 'TBD'} - ${overview.endDate || 'TBD'}</p>
          <p><strong>Team:</strong> ${overview.team || 'Development Team'}</p>
        </div>
        
        <div class="highlight-box">
          <h3>Sprint Goal</h3>
          <p>${overview.sprintGoal || 'Deliver key features and improvements'}</p>
        </div>
      </section>
    `
  }
  
  private generateKanbanBoard(content: any): string {
    const columns = content.columns || this.getDefaultColumns()
    
    return `
      <section id="kanban" class="section">
        <h2>Kanban Board</h2>
        
        <div class="kanban-board">
          ${columns.map((column: any) => this.generateKanbanColumn(column)).join('')}
        </div>
        
        ${this.generateWIPLimitWarnings(columns)}
      </section>
    `
  }
  
  private generateKanbanColumn(column: any): string {
    const cards = column.cards || []
    const wipLimit = column.wipLimit
    const isOverLimit = wipLimit && cards.length > wipLimit
    
    return `
      <div class="kanban-column ${isOverLimit ? 'over-limit' : ''}">
        <div class="kanban-column-header">
          <span class="kanban-column-title">
            ${column.name}
            ${wipLimit ? `<small>(WIP: ${wipLimit})</small>` : ''}
          </span>
          <span class="kanban-column-count ${isOverLimit ? 'over-limit' : ''}">${cards.length}</span>
        </div>
        
        <div class="kanban-column-cards">
          ${cards.map((card: any) => this.generateKanbanCard(card)).join('')}
        </div>
      </div>
    `
  }
  
  private generateKanbanCard(card: any): string {
    const priorityClass = `priority-${(card.priority || 'medium').toLowerCase()}`
    const labels = card.labels || []
    
    return `
      <div class="kanban-card">
        <div class="kanban-card-header">
          <span class="kanban-card-id">${card.id || 'TASK-001'}</span>
          <span class="kanban-card-priority ${priorityClass}">${card.priority || 'Medium'}</span>
        </div>
        
        <div class="kanban-card-title">
          ${card.title || 'Task Title'}
          ${card.blocked ? '<span class="blocked-indicator">BLOCKED</span>' : ''}
        </div>
        
        <div class="kanban-card-meta">
          ${card.assignee ? `
            <div class="kanban-card-assignee">
              <div class="kanban-card-avatar">${this.getInitials(card.assignee)}</div>
              <span>${card.assignee}</span>
            </div>
          ` : ''}
          
          ${card.estimate ? `
            <div class="kanban-card-estimate">
              <span>${card.estimate} pts</span>
            </div>
          ` : ''}
          
          ${card.daysInColumn ? `
            <div class="kanban-card-age">
              <span>${card.daysInColumn}d</span>
            </div>
          ` : ''}
        </div>
        
        ${labels.length > 0 ? `
          <div class="kanban-card-labels">
            ${labels.map((label: string) => `
              <span class="kanban-label label-${label.toLowerCase()}">${label}</span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `
  }
  
  private generateWIPLimitWarnings(columns: any[]): string {
    const warnings: string[] = []
    
    columns.forEach(column => {
      if (column.wipLimit && column.cards && column.cards.length > column.wipLimit) {
        warnings.push(`
          <div class="wip-limit-warning wip-limit-exceeded">
            <strong>⚠️ WIP Limit Exceeded:</strong> ${column.name} has ${column.cards.length} items (limit: ${column.wipLimit})
          </div>
        `)
      } else if (column.wipLimit && column.cards && column.cards.length === column.wipLimit) {
        warnings.push(`
          <div class="wip-limit-warning">
            <strong>⚠️ WIP Limit Reached:</strong> ${column.name} is at capacity (${column.wipLimit} items)
          </div>
        `)
      }
    })
    
    return warnings.join('')
  }
  
  private generateWorkInProgress(content: any): string {
    const wip = content.workInProgress || {}
    
    return `
      <section id="wip" class="section">
        <h2>Work In Progress</h2>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${wip.totalWIP || 0}</div>
            <div class="metric-label">Total WIP</div>
            <div class="metric-change ${wip.wipChange > 0 ? 'negative' : 'positive'}">
              ${wip.wipChange || 0} from yesterday
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${wip.blockedItems || 0}</div>
            <div class="metric-label">Blocked Items</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${wip.avgAge || 0}d</div>
            <div class="metric-label">Average Age</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${wip.oldestItem || 0}d</div>
            <div class="metric-label">Oldest Item</div>
          </div>
        </div>
      </section>
    `
  }
  
  private generateMetrics(content: any): string {
    const metrics = content.metrics || {}
    
    return `
      <section id="metrics" class="section">
        <h2>Key Metrics</h2>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${metrics.velocity || 0}</div>
            <div class="metric-label">Velocity (pts/sprint)</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${metrics.throughput || 0}</div>
            <div class="metric-label">Throughput (items/week)</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${metrics.leadTime || 0}d</div>
            <div class="metric-label">Lead Time</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${metrics.cycleTime || 0}d</div>
            <div class="metric-label">Cycle Time</div>
          </div>
        </div>
      </section>
    `
  }
  
  private generateCycleTime(content: any): string {
    const cycleTime = content.cycleTime || {}
    
    return `
      <section id="cycle-time" class="section">
        <h2>Cycle Time Analysis</h2>
        
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Average Time</th>
                <th>Min</th>
                <th>Max</th>
                <th>85th Percentile</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>To Do → In Progress</td>
                <td>${cycleTime.todoToProgress || '2d'}</td>
                <td>${cycleTime.todoToProgressMin || '0.5d'}</td>
                <td>${cycleTime.todoToProgressMax || '5d'}</td>
                <td>${cycleTime.todoToProgress85 || '3d'}</td>
              </tr>
              <tr>
                <td>In Progress → Review</td>
                <td>${cycleTime.progressToReview || '3d'}</td>
                <td>${cycleTime.progressToReviewMin || '1d'}</td>
                <td>${cycleTime.progressToReviewMax || '7d'}</td>
                <td>${cycleTime.progressToReview85 || '4d'}</td>
              </tr>
              <tr>
                <td>Review → Done</td>
                <td>${cycleTime.reviewToDone || '1d'}</td>
                <td>${cycleTime.reviewToDoneMin || '0.5d'}</td>
                <td>${cycleTime.reviewToDoneMax || '3d'}</td>
                <td>${cycleTime.reviewToDone85 || '2d'}</td>
              </tr>
              <tr class="table-total">
                <td><strong>Total</strong></td>
                <td><strong>${cycleTime.total || '6d'}</strong></td>
                <td><strong>${cycleTime.totalMin || '2d'}</strong></td>
                <td><strong>${cycleTime.totalMax || '15d'}</strong></td>
                <td><strong>${cycleTime.total85 || '9d'}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="highlight-box">
          <h3>Cycle Time Trend</h3>
          <p>Average cycle time has ${cycleTime.trend || 'decreased'} by ${cycleTime.trendValue || '15%'} over the last 4 weeks.</p>
        </div>
      </section>
    `
  }
  
  private generateThroughput(content: any): string {
    const throughput = content.throughput || {}
    const weekly = throughput.weekly || []
    
    return `
      <section id="throughput" class="section">
        <h2>Throughput</h2>
        
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Items Started</th>
                <th>Items Completed</th>
                <th>Net Flow</th>
              </tr>
            </thead>
            <tbody>
              ${weekly.map((week: any) => `
                <tr>
                  <td>${week.week || 'Week 1'}</td>
                  <td>${week.started || 0}</td>
                  <td>${week.completed || 0}</td>
                  <td class="${week.netFlow >= 0 ? 'positive' : 'negative'}">
                    ${week.netFlow >= 0 ? '+' : ''}${week.netFlow || 0}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="content-block">
          <p><strong>Average Weekly Throughput:</strong> ${throughput.average || 12} items</p>
          <p><strong>Peak Week:</strong> ${throughput.peak || 18} items (${throughput.peakWeek || 'Week 3'})</p>
          <p><strong>Predictability:</strong> ${throughput.predictability || '85%'}</p>
        </div>
      </section>
    `
  }
  
  private generateBlockedItems(content: any): string {
    const blocked = content.blockedItems || []
    
    if (blocked.length === 0) {
      return `
        <section id="blocked" class="section">
          <h2>Blocked Items</h2>
          <div class="success-box">
            <p>✅ No blocked items at this time</p>
          </div>
        </section>
      `
    }
    
    return `
      <section id="blocked" class="section">
        <h2>Blocked Items</h2>
        
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Blocked Since</th>
                <th>Days Blocked</th>
                <th>Reason</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              ${blocked.map((item: any) => `
                <tr>
                  <td><strong>${item.id}</strong>: ${item.title}</td>
                  <td>${item.blockedSince || 'Unknown'}</td>
                  <td>${item.daysBlocked || 0}</td>
                  <td>${item.reason || 'Dependency'}</td>
                  <td>${item.owner || 'Unassigned'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="warning-box">
          <p><strong>Action Required:</strong> ${blocked.length} items are currently blocked and need attention</p>
        </div>
      </section>
    `
  }
  
  private generateTeamCapacity(content: any): string {
    const capacity = content.teamCapacity || {}
    const members = capacity.members || []
    
    return `
      <section id="capacity" class="section">
        <h2>Team Capacity</h2>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${capacity.totalCapacity || 100}%</div>
            <div class="metric-label">Team Utilization</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${capacity.availableHours || 160}h</div>
            <div class="metric-label">Available Hours</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${capacity.allocatedHours || 140}h</div>
            <div class="metric-label">Allocated Hours</div>
          </div>
        </div>
        
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Current WIP</th>
                <th>Capacity</th>
                <th>Utilization</th>
              </tr>
            </thead>
            <tbody>
              ${members.map((member: any) => `
                <tr>
                  <td>${member.name || 'Team Member'}</td>
                  <td>${member.wip || 0} items</td>
                  <td>${member.capacity || 40}h/week</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${member.utilization || 0}%"></div>
                      <span>${member.utilization || 0}%</span>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `
  }
  
  private generateUpcomingWork(content: any): string {
    const upcoming = content.upcomingWork || []
    
    return `
      <section id="upcoming" class="section">
        <h2>Upcoming Work</h2>
        
        <div class="content-block">
          <h3>Ready for Development</h3>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Item</th>
                  <th>Estimate</th>
                  <th>Dependencies</th>
                  <th>Target Sprint</th>
                </tr>
              </thead>
              <tbody>
                ${upcoming.map((item: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td><strong>${item.id}</strong>: ${item.title}</td>
                    <td>${item.estimate || '?'} pts</td>
                    <td>${item.dependencies || 'None'}</td>
                    <td>${item.targetSprint || 'Next'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="highlight-box">
          <h3>Backlog Health</h3>
          <p><strong>Ready Items:</strong> ${content.backlogHealth?.readyItems || 15}</p>
          <p><strong>Refined Items:</strong> ${content.backlogHealth?.refinedItems || 25}</p>
          <p><strong>Estimated Coverage:</strong> ${content.backlogHealth?.coverage || '3 sprints'}</p>
        </div>
      </section>
    `
  }
  
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  private getDefaultColumns(): any[] {
    return [
      {
        name: 'Backlog',
        cards: []
      },
      {
        name: 'To Do',
        wipLimit: 10,
        cards: []
      },
      {
        name: 'In Progress',
        wipLimit: 5,
        cards: []
      },
      {
        name: 'Review',
        wipLimit: 3,
        cards: []
      },
      {
        name: 'Done',
        cards: []
      }
    ]
  }
}