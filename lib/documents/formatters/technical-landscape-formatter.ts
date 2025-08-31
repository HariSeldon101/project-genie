interface TechnicalLandscapeData {
  analysis?: string
  sections?: {
    current_state?: string
    future_state?: string
    gap_analysis?: string
    recommendations?: string[]
    risks?: string[]
  }
  technologies?: {
    frontend?: string[]
    backend?: string[]
    database?: string[]
    infrastructure?: string[]
    tools?: string[]
  }
  architecture?: {
    overview?: string
    components?: Array<{
      name: string
      description: string
      technology?: string
    }>
  }
  projectName?: string
  companyName?: string
  lastUpdated?: string
  version?: string
  [key: string]: any
}

export function formatTechnicalLandscape(data: TechnicalLandscapeData): string {
  let markdown = `# 🌐 Technical Landscape Analysis\n\n`
  
  // Project header
  if (data.projectName) {
    markdown += `**Project:** ${data.projectName}\n\n`
  }
  
  markdown += `**Document Version:** ${data.version || '1'}\n`
  markdown += `**Last Updated:** ${data.lastUpdated || new Date().toLocaleDateString()}\n`
  markdown += `**Status:** Final\n\n`
  
  if (data.companyName) {
    markdown += `**Organization:** ${data.companyName}\n\n`
  }
  
  markdown += `---\n\n`
  
  // Table of Contents
  markdown += `## 📑 Table of Contents\n\n`
  markdown += `1. [Executive Summary](#executive-summary)\n`
  markdown += `2. [Current State Analysis](#current-state-analysis)\n`
  markdown += `3. [Future State Vision](#future-state-vision)\n`
  markdown += `4. [Technology Stack](#technology-stack)\n`
  markdown += `5. [Architecture Overview](#architecture-overview)\n`
  markdown += `6. [Gap Analysis](#gap-analysis)\n`
  markdown += `7. [Recommendations](#recommendations)\n`
  markdown += `8. [Technical Risks](#technical-risks)\n\n`
  
  // Executive Summary
  markdown += `## 1. Executive Summary\n\n`
  if (data.analysis) {
    markdown += `${data.analysis}\n\n`
  } else {
    markdown += `This technical landscape analysis provides a comprehensive view of the current technology state, future vision, and the roadmap to bridge the gap between them.\n\n`
  }
  
  // Current State
  markdown += `## 2. Current State Analysis\n\n`
  if (data.sections?.current_state) {
    markdown += `${data.sections.current_state}\n\n`
  } else {
    markdown += `### Key Observations\n`
    markdown += `- Legacy systems in production\n`
    markdown += `- Limited automation and manual processes\n`
    markdown += `- Technical debt accumulation\n`
    markdown += `- Scalability constraints\n\n`
  }
  
  // Future State
  markdown += `## 3. Future State Vision\n\n`
  if (data.sections?.future_state) {
    markdown += `${data.sections.future_state}\n\n`
  } else {
    markdown += `### Target Architecture Goals\n`
    markdown += `- Cloud-native architecture\n`
    markdown += `- Microservices-based design\n`
    markdown += `- Automated CI/CD pipelines\n`
    markdown += `- Enhanced security posture\n`
    markdown += `- Improved scalability and performance\n\n`
  }
  
  // Technology Stack
  markdown += `## 4. Technology Stack\n\n`
  
  if (data.technologies) {
    if (data.technologies.frontend && data.technologies.frontend.length > 0) {
      markdown += `### Frontend Technologies\n`
      data.technologies.frontend.forEach(tech => {
        markdown += `- ${tech}\n`
      })
      markdown += `\n`
    }
    
    if (data.technologies.backend && data.technologies.backend.length > 0) {
      markdown += `### Backend Technologies\n`
      data.technologies.backend.forEach(tech => {
        markdown += `- ${tech}\n`
      })
      markdown += `\n`
    }
    
    if (data.technologies.database && data.technologies.database.length > 0) {
      markdown += `### Database & Storage\n`
      data.technologies.database.forEach(tech => {
        markdown += `- ${tech}\n`
      })
      markdown += `\n`
    }
    
    if (data.technologies.infrastructure && data.technologies.infrastructure.length > 0) {
      markdown += `### Infrastructure & DevOps\n`
      data.technologies.infrastructure.forEach(tech => {
        markdown += `- ${tech}\n`
      })
      markdown += `\n`
    }
    
    if (data.technologies.tools && data.technologies.tools.length > 0) {
      markdown += `### Development Tools\n`
      data.technologies.tools.forEach(tech => {
        markdown += `- ${tech}\n`
      })
      markdown += `\n`
    }
  } else {
    markdown += `*Technology stack to be determined based on requirements*\n\n`
  }
  
  // Architecture Overview
  markdown += `## 5. Architecture Overview\n\n`
  
  if (data.architecture?.overview) {
    markdown += `${data.architecture.overview}\n\n`
  }
  
  if (data.architecture?.components && data.architecture.components.length > 0) {
    markdown += `### System Components\n\n`
    markdown += `| Component | Description | Technology |\n`
    markdown += `|-----------|-------------|------------|\n`
    data.architecture.components.forEach(component => {
      markdown += `| ${component.name} | ${component.description} | ${component.technology || 'TBD'} |\n`
    })
    markdown += `\n`
  }
  
  // Gap Analysis
  markdown += `## 6. Gap Analysis\n\n`
  if (data.sections?.gap_analysis) {
    markdown += `${data.sections.gap_analysis}\n\n`
  } else {
    markdown += `### Key Gaps Identified\n\n`
    markdown += `| Current State | Future State | Gap | Priority |\n`
    markdown += `|---------------|--------------|-----|----------|\n`
    markdown += `| Monolithic architecture | Microservices | Architecture redesign needed | High |\n`
    markdown += `| On-premises hosting | Cloud infrastructure | Migration required | High |\n`
    markdown += `| Manual deployments | CI/CD automation | Pipeline implementation | Medium |\n`
    markdown += `| Basic monitoring | Advanced observability | Monitoring upgrade | Medium |\n\n`
  }
  
  // Recommendations
  markdown += `## 7. Recommendations\n\n`
  
  if (data.sections?.recommendations && data.sections.recommendations.length > 0) {
    markdown += `### Strategic Recommendations\n\n`
    data.sections.recommendations.forEach((rec, i) => {
      markdown += `${i + 1}. ${rec}\n`
    })
    markdown += `\n`
  } else {
    markdown += `### Priority Actions\n\n`
    markdown += `1. **Phase 1 - Foundation** (Months 1-3)\n`
    markdown += `   - Establish cloud infrastructure\n`
    markdown += `   - Set up CI/CD pipelines\n`
    markdown += `   - Implement monitoring and logging\n\n`
    
    markdown += `2. **Phase 2 - Migration** (Months 4-6)\n`
    markdown += `   - Begin application modernization\n`
    markdown += `   - Migrate data to cloud storage\n`
    markdown += `   - Implement security controls\n\n`
    
    markdown += `3. **Phase 3 - Optimization** (Months 7-9)\n`
    markdown += `   - Performance tuning\n`
    markdown += `   - Cost optimization\n`
    markdown += `   - Advanced feature implementation\n\n`
  }
  
  // Technical Risks
  markdown += `## 8. Technical Risks\n\n`
  
  if (data.sections?.risks && data.sections.risks.length > 0) {
    markdown += `| Risk | Impact | Mitigation Strategy |\n`
    markdown += `|------|--------|--------------------|\n`
    data.sections.risks.forEach(risk => {
      markdown += `| ${risk} | High | Develop mitigation plan |\n`
    })
  } else {
    markdown += `| Risk | Impact | Likelihood | Mitigation |\n`
    markdown += `|------|--------|------------|------------|\n`
    markdown += `| Data migration failures | High | Medium | Comprehensive backup and rollback procedures |\n`
    markdown += `| Integration complexities | Medium | High | Phased integration approach with testing |\n`
    markdown += `| Performance degradation | High | Low | Load testing and optimization |\n`
    markdown += `| Security vulnerabilities | High | Medium | Security audits and penetration testing |\n`
    markdown += `| Technical debt accumulation | Medium | High | Regular refactoring cycles |\n`
  }
  
  markdown += `\n---\n\n`
  markdown += `*This technical landscape analysis should be reviewed and updated regularly to reflect changes in technology and project requirements.*\n`
  
  return markdown
}