interface CharterData {
  executiveSummary?: string
  visionAndObjectives?: {
    vision?: string
    objectives?: string[]
  }
  successCriteria?: Array<{
    criteria: string
    metric: string
    target: string
  }>
  scope?: {
    inScope?: string[]
    outOfScope?: string[]
  }
  deliverables?: Array<{
    name: string
    description: string
    dueDate?: string
  }>
  stakeholderAnalysis?: Array<{
    name: string
    role: string
    interest?: string
    influence?: string
    communicationNeeds?: string
  }>
  teamStructure?: {
    roles?: Array<{
      title: string
      responsibilities: string[]
      skills?: string[]
    }>
  }
  timeline?: {
    phases?: Array<{
      name: string
      startDate?: string
      endDate?: string
      milestones?: string[]
    }>
  }
  risks?: Array<{
    description: string
    impact?: string
    mitigation?: string
  }>
  dependencies?: string[]
  communicationPlan?: {
    ceremonies?: Array<{
      name: string
      frequency: string
      attendees: string[]
      purpose: string
    }>
    reports?: Array<{
      name: string
      frequency: string
      audience: string[]
    }>
  }
  projectName?: string
  companyName?: string
  lastUpdated?: string
  version?: string
  [key: string]: any
}

export function formatCharter(data: CharterData): string {
  let markdown = `# 📜 Project Charter\n\n`
  
  // Project header
  if (data.projectName) {
    markdown += `**Project:** ${data.projectName}\n\n`
  }
  
  markdown += `**Document Version:** ${data.version || '1'}\n`
  markdown += `**Last Updated:** ${data.lastUpdated || new Date().toLocaleDateString()}\n`
  markdown += `**Status:** Approved\n\n`
  
  if (data.companyName) {
    markdown += `**Organization:** ${data.companyName}\n\n`
  }
  
  markdown += `---\n\n`
  
  // Executive Summary
  if (data.executiveSummary) {
    markdown += `## Executive Summary\n\n`
    markdown += `${data.executiveSummary}\n\n`
  }
  
  // Vision and Objectives
  if (data.visionAndObjectives) {
    markdown += `## Vision and Objectives\n\n`
    if (data.visionAndObjectives.vision) {
      markdown += `### Vision\n${data.visionAndObjectives.vision}\n\n`
    }
    if (data.visionAndObjectives.objectives && data.visionAndObjectives.objectives.length > 0) {
      markdown += `### Strategic Objectives\n`
      data.visionAndObjectives.objectives.forEach((obj, i) => {
        markdown += `${i + 1}. ${obj}\n`
      })
      markdown += `\n`
    }
  }
  
  // Success Criteria
  if (data.successCriteria && data.successCriteria.length > 0) {
    markdown += `## Success Criteria\n\n`
    markdown += `| Criteria | Metric | Target |\n`
    markdown += `|----------|--------|--------|\n`
    data.successCriteria.forEach(sc => {
      markdown += `| ${sc.criteria} | ${sc.metric} | ${sc.target} |\n`
    })
    markdown += `\n`
  }
  
  // Scope
  if (data.scope) {
    markdown += `## Project Scope\n\n`
    if (data.scope.inScope && data.scope.inScope.length > 0) {
      markdown += `### In Scope\n`
      data.scope.inScope.forEach(item => {
        markdown += `- ✅ ${item}\n`
      })
      markdown += `\n`
    }
    if (data.scope.outOfScope && data.scope.outOfScope.length > 0) {
      markdown += `### Out of Scope\n`
      data.scope.outOfScope.forEach(item => {
        markdown += `- ❌ ${item}\n`
      })
      markdown += `\n`
    }
  }
  
  // Deliverables
  if (data.deliverables && data.deliverables.length > 0) {
    markdown += `## Key Deliverables\n\n`
    data.deliverables.forEach((del, i) => {
      markdown += `### ${i + 1}. ${del.name}\n`
      markdown += `${del.description}\n`
      if (del.dueDate) {
        markdown += `**Due Date:** ${del.dueDate}\n`
      }
      markdown += `\n`
    })
  }
  
  // Stakeholder Analysis
  if (data.stakeholderAnalysis && data.stakeholderAnalysis.length > 0) {
    markdown += `## Stakeholder Analysis\n\n`
    markdown += `| Name | Role | Interest | Influence | Communication |\n`
    markdown += `|------|------|----------|-----------|---------------|\n`
    data.stakeholderAnalysis.forEach(sh => {
      markdown += `| ${sh.name} | ${sh.role} | ${sh.interest || '-'} | ${sh.influence || '-'} | ${sh.communicationNeeds || '-'} |\n`
    })
    markdown += `\n`
  }
  
  // Team Structure
  if (data.teamStructure && data.teamStructure.roles) {
    markdown += `## Team Structure\n\n`
    data.teamStructure.roles.forEach(role => {
      markdown += `### ${role.title}\n`
      if (role.responsibilities && role.responsibilities.length > 0) {
        markdown += `**Responsibilities:**\n`
        role.responsibilities.forEach(resp => {
          markdown += `- ${resp}\n`
        })
      }
      if (role.skills && role.skills.length > 0) {
        markdown += `**Required Skills:**\n`
        role.skills.forEach(skill => {
          markdown += `- ${skill}\n`
        })
      }
      markdown += `\n`
    })
  }
  
  // Timeline
  if (data.timeline && data.timeline.phases) {
    markdown += `## Project Timeline\n\n`
    data.timeline.phases.forEach((phase, i) => {
      markdown += `### Phase ${i + 1}: ${phase.name}\n`
      markdown += `**Duration:** ${phase.startDate || 'TBD'} - ${phase.endDate || 'TBD'}\n\n`
      if (phase.milestones && phase.milestones.length > 0) {
        markdown += `**Key Milestones:**\n`
        phase.milestones.forEach(milestone => {
          markdown += `- ${milestone}\n`
        })
      }
      markdown += `\n`
    })
  }
  
  // Risks
  if (data.risks && data.risks.length > 0) {
    markdown += `## Initial Risk Assessment\n\n`
    data.risks.forEach((risk, i) => {
      markdown += `### Risk ${i + 1}\n`
      markdown += `**Description:** ${risk.description}\n`
      if (risk.impact) markdown += `**Impact:** ${risk.impact}\n`
      if (risk.mitigation) markdown += `**Mitigation:** ${risk.mitigation}\n`
      markdown += `\n`
    })
  }
  
  // Dependencies
  if (data.dependencies && data.dependencies.length > 0) {
    markdown += `## Dependencies\n\n`
    data.dependencies.forEach(dep => {
      markdown += `- ${dep}\n`
    })
    markdown += `\n`
  }
  
  // Communication Plan
  if (data.communicationPlan) {
    markdown += `## Communication Plan\n\n`
    if (data.communicationPlan.ceremonies && data.communicationPlan.ceremonies.length > 0) {
      markdown += `### Ceremonies\n\n`
      markdown += `| Meeting | Frequency | Purpose |\n`
      markdown += `|---------|-----------|----------|\n`
      data.communicationPlan.ceremonies.forEach(ceremony => {
        markdown += `| ${ceremony.name} | ${ceremony.frequency} | ${ceremony.purpose} |\n`
      })
      markdown += `\n`
    }
    if (data.communicationPlan.reports && data.communicationPlan.reports.length > 0) {
      markdown += `### Reports\n\n`
      markdown += `| Report | Frequency | Audience |\n`
      markdown += `|--------|-----------|----------|\n`
      data.communicationPlan.reports.forEach(report => {
        const audience = Array.isArray(report.audience) ? report.audience.join(', ') : report.audience
        markdown += `| ${report.name} | ${report.frequency} | ${audience} |\n`
      })
      markdown += `\n`
    }
  }
  
  return markdown
}