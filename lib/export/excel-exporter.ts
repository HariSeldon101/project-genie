import ExcelJS from 'exceljs'
import { DataSanitizer } from '../llm/sanitizer'
import { DocumentGenerator } from '../documents/generator'

interface Project {
  id: string
  name: string
  methodology_type: string
  start_date?: string
  end_date?: string
  rag_status?: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  assignee_id?: string
  due_date?: string
  story_points?: number
  priority?: number
}

interface Risk {
  id: string
  title: string
  description: string
  impact: string
  probability: string
  risk_score?: number
  mitigation_plan?: string
  status: string
}

export class ExcelExporter {
  private sanitizer: DataSanitizer
  private docGenerator: DocumentGenerator

  constructor() {
    this.sanitizer = new DataSanitizer()
    this.docGenerator = new DocumentGenerator()
  }

  /**
   * Export project plan to Excel
   */
  async exportProjectPlan(
    project: Project,
    tasks: Task[],
    risks: Risk[],
    artifacts: any[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    
    // Set workbook properties
    workbook.creator = 'Project Genie'
    workbook.created = new Date()
    workbook.modified = new Date()
    
    // Add sheets
    this.addOverviewSheet(workbook, project, artifacts)
    this.addWBSSheet(workbook, tasks)
    this.addGanttDataSheet(workbook, tasks)
    this.addRiskRegisterSheet(workbook, risks)
    
    if (project.methodology_type === 'agile') {
      this.addBacklogSheet(workbook, tasks)
      this.addSprintSheet(workbook, tasks)
    }
    
    if (project.methodology_type === 'prince2') {
      this.addStagesSheet(workbook, artifacts)
    }
    
    // Generate buffer
    return await workbook.xlsx.writeBuffer() as Buffer
  }

  /**
   * Add Project Overview sheet
   */
  private addOverviewSheet(
    workbook: ExcelJS.Workbook,
    project: Project,
    artifacts: any[]
  ): void {
    const sheet = workbook.addWorksheet('Project Overview')
    
    // Set column widths
    sheet.getColumn(1).width = 25
    sheet.getColumn(2).width = 50
    
    // Add header
    sheet.addRow(['PROJECT OVERVIEW']).font = { bold: true, size: 16 }
    sheet.addRow([])
    
    // Add project details
    sheet.addRow(['Project Name', project.name])
    sheet.addRow(['Methodology', project.methodology_type.toUpperCase()])
    sheet.addRow(['Start Date', project.start_date || 'TBD'])
    sheet.addRow(['End Date', project.end_date || 'TBD'])
    sheet.addRow(['RAG Status', project.rag_status || 'Green'])
    sheet.addRow([])
    
    // Add document status
    sheet.addRow(['GENERATED DOCUMENTS']).font = { bold: true, size: 14 }
    artifacts.forEach(artifact => {
      sheet.addRow([artifact.title, `Version ${artifact.version}`])
    })
    
    // Apply styling
    this.applyHeaderStyle(sheet.getRow(1))
    this.applyHeaderStyle(sheet.getRow(9))
    
    // Add borders
    const lastRow = sheet.lastRow?.number || 1
    for (let i = 3; i <= lastRow; i++) {
      if (i === 3 || i === 9) continue
      sheet.getRow(i).eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    }
  }

  /**
   * Add Work Breakdown Structure sheet
   */
  private addWBSSheet(
    workbook: ExcelJS.Workbook,
    tasks: Task[]
  ): void {
    const sheet = workbook.addWorksheet('WBS')
    
    // Define columns
    sheet.columns = [
      { header: 'Task ID', key: 'id', width: 15 },
      { header: 'Task Name', key: 'name', width: 40 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Due Date', key: 'dueDate', width: 12 },
      { header: 'Story Points', key: 'points', width: 12 },
      { header: 'Assigned To', key: 'assignee', width: 20 }
    ]
    
    // Add tasks
    tasks.forEach((task, index) => {
      sheet.addRow({
        id: `T${String(index + 1).padStart(3, '0')}`,
        name: task.title,
        description: task.description || '',
        status: this.formatStatus(task.status),
        priority: task.priority || 3,
        dueDate: task.due_date || '',
        points: task.story_points || '',
        assignee: '[TEAM_MEMBER]' // Sanitized
      })
    })
    
    // Apply styling
    this.applyTableStyle(sheet)
    
    // Add conditional formatting for status
    const statusColumn = sheet.getColumn('status')
    statusColumn.eachCell((cell, rowNumber) => {
      if (rowNumber === 1) return
      
      switch (cell.value) {
        case 'Done':
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF90EE90' } // Light green
          }
          break
        case 'In Progress':
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFE0' } // Light yellow
          }
          break
        case 'Blocked':
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCCCB' } // Light red
          }
          break
      }
    })
  }

  /**
   * Add Gantt Chart Data sheet
   */
  private addGanttDataSheet(
    workbook: ExcelJS.Workbook,
    tasks: Task[]
  ): void {
    const sheet = workbook.addWorksheet('Gantt Data')
    
    sheet.columns = [
      { header: 'Task', key: 'task', width: 40 },
      { header: 'Start Date', key: 'start', width: 12 },
      { header: 'End Date', key: 'end', width: 12 },
      { header: 'Duration (days)', key: 'duration', width: 15 },
      { header: 'Progress %', key: 'progress', width: 12 },
      { header: 'Dependencies', key: 'dependencies', width: 20 }
    ]
    
    // Generate Gantt data from tasks
    const startDate = new Date()
    tasks.forEach((task, index) => {
      const taskStart = new Date(startDate)
      taskStart.setDate(startDate.getDate() + index * 7) // Stagger by week
      
      const taskEnd = new Date(taskStart)
      const duration = task.story_points ? task.story_points * 2 : 5 // Days based on points
      taskEnd.setDate(taskStart.getDate() + duration)
      
      sheet.addRow({
        task: task.title,
        start: taskStart.toISOString().split('T')[0],
        end: taskEnd.toISOString().split('T')[0],
        duration,
        progress: task.status === 'done' ? 100 : task.status === 'in_progress' ? 50 : 0,
        dependencies: index > 0 ? `T${String(index).padStart(3, '0')}` : ''
      })
    })
    
    this.applyTableStyle(sheet)
  }

  /**
   * Add Risk Register sheet
   */
  private addRiskRegisterSheet(
    workbook: ExcelJS.Workbook,
    risks: Risk[]
  ): void {
    const sheet = workbook.addWorksheet('Risk Register')
    
    sheet.columns = [
      { header: 'Risk ID', key: 'id', width: 10 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Impact', key: 'impact', width: 12 },
      { header: 'Probability', key: 'probability', width: 12 },
      { header: 'Risk Score', key: 'score', width: 10 },
      { header: 'Mitigation', key: 'mitigation', width: 50 },
      { header: 'Owner', key: 'owner', width: 20 },
      { header: 'Status', key: 'status', width: 10 }
    ]
    
    risks.forEach((risk, index) => {
      sheet.addRow({
        id: `R${String(index + 1).padStart(3, '0')}`,
        description: risk.description,
        impact: this.capitalize(risk.impact),
        probability: this.capitalize(risk.probability),
        score: risk.risk_score || this.calculateRiskScore(risk.impact, risk.probability),
        mitigation: risk.mitigation_plan || 'TBD',
        owner: '[RISK_OWNER]', // Sanitized
        status: this.capitalize(risk.status)
      })
    })
    
    this.applyTableStyle(sheet)
    
    // Add conditional formatting for risk scores
    const scoreColumn = sheet.getColumn('score')
    scoreColumn.eachCell((cell, rowNumber) => {
      if (rowNumber === 1 || !cell.value) return
      
      const score = Number(cell.value)
      if (score >= 15) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' } // Red
        }
      } else if (score >= 10) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFA500' } // Orange
        }
      } else if (score >= 5) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' } // Yellow
        }
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' } // Green
        }
      }
    })
  }

  /**
   * Add Product Backlog sheet (Agile only)
   */
  private addBacklogSheet(
    workbook: ExcelJS.Workbook,
    tasks: Task[]
  ): void {
    const sheet = workbook.addWorksheet('Product Backlog')
    
    sheet.columns = [
      { header: 'Story ID', key: 'id', width: 10 },
      { header: 'User Story', key: 'story', width: 50 },
      { header: 'Acceptance Criteria', key: 'criteria', width: 50 },
      { header: 'Story Points', key: 'points', width: 12 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Sprint', key: 'sprint', width: 10 }
    ]
    
    tasks.forEach((task, index) => {
      sheet.addRow({
        id: `US${String(index + 1).padStart(3, '0')}`,
        story: `As a user, I want ${task.title}`,
        criteria: task.description || 'TBD',
        points: task.story_points || 0,
        priority: this.getPriorityLabel(task.priority || 3),
        sprint: Math.ceil((index + 1) / 5) // 5 stories per sprint
      })
    })
    
    this.applyTableStyle(sheet)
  }

  /**
   * Add Sprint Planning sheet (Agile only)
   */
  private addSprintSheet(
    workbook: ExcelJS.Workbook,
    tasks: Task[]
  ): void {
    const sheet = workbook.addWorksheet('Sprint Planning')
    
    // Calculate sprints
    const sprintCount = Math.ceil(tasks.length / 5)
    
    for (let sprint = 1; sprint <= sprintCount; sprint++) {
      sheet.addRow([`SPRINT ${sprint}`]).font = { bold: true, size: 14 }
      sheet.addRow(['Story', 'Points', 'Status'])
      
      const sprintTasks = tasks.slice((sprint - 1) * 5, sprint * 5)
      let sprintPoints = 0
      
      sprintTasks.forEach(task => {
        const points = task.story_points || 3
        sprintPoints += points
        sheet.addRow([task.title, points, task.status])
      })
      
      sheet.addRow(['Sprint Velocity:', sprintPoints, ''])
      sheet.addRow([]) // Empty row between sprints
    }
  }

  /**
   * Add Stages sheet (Prince2 only)
   */
  private addStagesSheet(
    workbook: ExcelJS.Workbook,
    artifacts: any[]
  ): void {
    const sheet = workbook.addWorksheet('Project Stages')
    
    sheet.columns = [
      { header: 'Stage', key: 'stage', width: 20 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Start Date', key: 'start', width: 12 },
      { header: 'End Date', key: 'end', width: 12 },
      { header: 'Deliverables', key: 'deliverables', width: 50 },
      { header: 'Status', key: 'status', width: 12 }
    ]
    
    // Define Prince2 stages
    const stages = [
      {
        stage: 'Initiation',
        description: 'Project setup and PID creation',
        deliverables: 'PID, Business Case, Risk Register',
        status: 'Complete'
      },
      {
        stage: 'Stage 2',
        description: 'Core development phase',
        deliverables: 'Main project deliverables',
        status: 'In Progress'
      },
      {
        stage: 'Stage 3',
        description: 'Testing and validation',
        deliverables: 'Test reports, Quality assurance',
        status: 'Planned'
      },
      {
        stage: 'Closure',
        description: 'Project handover and closure',
        deliverables: 'End project report, Lessons learned',
        status: 'Planned'
      }
    ]
    
    const startDate = new Date()
    stages.forEach((stage, index) => {
      const stageStart = new Date(startDate)
      stageStart.setMonth(startDate.getMonth() + index * 2)
      
      const stageEnd = new Date(stageStart)
      stageEnd.setMonth(stageStart.getMonth() + 2)
      
      sheet.addRow({
        ...stage,
        start: stageStart.toISOString().split('T')[0],
        end: stageEnd.toISOString().split('T')[0]
      })
    })
    
    this.applyTableStyle(sheet)
  }

  /**
   * Apply table styling
   */
  private applyTableStyle(sheet: ExcelJS.Worksheet): void {
    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 20
    
    // Add borders to all cells
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    })
    
    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  /**
   * Apply header styling
   */
  private applyHeaderStyle(row: ExcelJS.Row): void {
    row.font = { bold: true, size: 14 }
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
  }

  /**
   * Helper functions
   */
  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'done': 'Done',
      'blocked': 'Blocked'
    }
    return statusMap[status] || status
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
  }

  private calculateRiskScore(impact: string, probability: string): number {
    const scores: Record<string, number> = {
      'very_low': 1,
      'low': 2,
      'medium': 3,
      'high': 4,
      'very_high': 5
    }
    return (scores[impact] || 3) * (scores[probability] || 3)
  }

  private getPriorityLabel(priority: number): string {
    const labels = ['Critical', 'High', 'Medium', 'Low', 'Nice to have']
    return labels[priority - 1] || 'Medium'
  }
}