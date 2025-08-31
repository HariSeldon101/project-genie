interface Stage {
  id: string
  name: string
  start_date: string
  end_date: string
  objective: string
  deliverables: string[]
  tolerance?: {
    time?: string
    cost?: string
  }
}

interface ProjectPlanData {
  plan?: {
    stages?: Stage[]
  }
  stages?: Stage[]
  projectName?: string
  companyName?: string
  lastUpdated?: string
  version?: string
  [key: string]: any
}

export function formatProjectPlan(data: ProjectPlanData): string {
  // Extract stages from various possible locations
  const stages = data.plan?.stages || data.stages || []
  
  let markdown = `# 📋 Project Plan\n\n`
  
  // Project header
  if (data.projectName) {
    markdown += `**Project:** ${data.projectName}\n\n`
  }
  
  markdown += `**Document Version:** ${data.version || '1'}\n`
  markdown += `**Last Updated:** ${data.lastUpdated || new Date().toLocaleDateString()}\n`
  markdown += `**Status:** Draft\n\n`
  
  if (data.companyName) {
    markdown += `**Organization:** ${data.companyName}\n\n`
  }
  
  markdown += `---\n\n`
  
  // Table of Contents
  markdown += `## 📑 Table of Contents\n\n`
  markdown += `1. [Executive Summary](#executive-summary)\n`
  markdown += `2. [Project Stages](#project-stages)\n`
  markdown += `3. [Timeline Overview](#timeline-overview)\n`
  markdown += `4. [Key Deliverables](#key-deliverables)\n`
  markdown += `5. [Tolerances](#tolerances)\n\n`
  
  // Executive Summary
  markdown += `## 1. Executive Summary\n\n`
  markdown += `This project plan outlines the structured approach for delivering the ${data.projectName || 'project'} through ${stages.length} defined stages. Each stage has clear objectives, deliverables, and success criteria.\n\n`
  
  // Project Stages
  markdown += `## 2. Project Stages\n\n`
  
  if (stages.length > 0) {
    stages.forEach((stage, index) => {
      markdown += `### Stage ${index + 1}: ${stage.name || `Stage ${stage.id}`}\n\n`
      
      markdown += `**Duration:** ${stage.start_date || 'TBD'} to ${stage.end_date || 'TBD'}\n\n`
      
      if (stage.objective) {
        markdown += `**Objective:**\n${stage.objective}\n\n`
      }
      
      if (stage.deliverables && stage.deliverables.length > 0) {
        markdown += `**Deliverables:**\n`
        stage.deliverables.forEach(deliverable => {
          markdown += `- ${deliverable}\n`
        })
        markdown += `\n`
      }
      
      if (stage.tolerance) {
        markdown += `**Tolerances:**\n`
        if (stage.tolerance.time) markdown += `- Time: ${stage.tolerance.time}\n`
        if (stage.tolerance.cost) markdown += `- Cost: ${stage.tolerance.cost}\n`
        markdown += `\n`
      }
      
      markdown += `---\n\n`
    })
  } else {
    markdown += `*No stages defined yet*\n\n`
  }
  
  // Timeline Overview
  markdown += `## 3. Timeline Overview\n\n`
  markdown += `| Stage | Start Date | End Date | Duration |\n`
  markdown += `|-------|------------|----------|----------|\n`
  
  if (stages.length > 0) {
    stages.forEach((stage, index) => {
      const start = stage.start_date || 'TBD'
      const end = stage.end_date || 'TBD'
      markdown += `| ${stage.name || `Stage ${index + 1}`} | ${start} | ${end} | - |\n`
    })
  } else {
    markdown += `| *No stages defined* | - | - | - |\n`
  }
  
  markdown += `\n`
  
  // Key Deliverables
  markdown += `## 4. Key Deliverables\n\n`
  
  const allDeliverables: string[] = []
  stages.forEach(stage => {
    if (stage.deliverables && Array.isArray(stage.deliverables)) {
      allDeliverables.push(...stage.deliverables)
    }
  })
  
  if (allDeliverables.length > 0) {
    markdown += `The following key deliverables will be produced:\n\n`
    allDeliverables.forEach((deliverable, index) => {
      markdown += `${index + 1}. ${deliverable}\n`
    })
  } else {
    markdown += `*Deliverables to be defined*\n`
  }
  
  markdown += `\n`
  
  // Tolerances
  markdown += `## 5. Tolerances\n\n`
  markdown += `Project tolerances define acceptable variations in project parameters:\n\n`
  
  const tolerances = stages.filter(s => s.tolerance).map(s => s.tolerance)
  if (tolerances.length > 0) {
    markdown += `| Stage | Time Tolerance | Cost Tolerance |\n`
    markdown += `|-------|---------------|----------------|\n`
    stages.forEach(stage => {
      if (stage.tolerance) {
        markdown += `| ${stage.name} | ${stage.tolerance.time || 'N/A'} | ${stage.tolerance.cost || 'N/A'} |\n`
      }
    })
  } else {
    markdown += `*Tolerances to be defined based on project requirements*\n`
  }
  
  return markdown
}