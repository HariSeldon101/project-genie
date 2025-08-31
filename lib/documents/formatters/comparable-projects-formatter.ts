interface ComparableProject {
  name?: string
  company?: string
  description?: string
  similarities?: string[]
  differences?: string[]
  lessons_learned?: string[]
  success_factors?: string[]
  challenges?: string[]
  outcomes?: string
  budget?: string
  duration?: string
  team_size?: string
}

interface ComparableProjectsData {
  analysis?: string
  projects?: ComparableProject[]
  summary?: {
    key_insights?: string[]
    best_practices?: string[]
    risks_to_avoid?: string[]
    recommendations?: string[]
  }
  projectName?: string
  companyName?: string
  lastUpdated?: string
  version?: string
  [key: string]: any
}

export function formatComparableProjects(data: ComparableProjectsData): string {
  let markdown = `# 📊 Comparable Projects Analysis\n\n`
  
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
  markdown += `2. [Comparable Projects](#comparable-projects)\n`
  markdown += `3. [Comparative Analysis](#comparative-analysis)\n`
  markdown += `4. [Key Insights](#key-insights)\n`
  markdown += `5. [Best Practices](#best-practices)\n`
  markdown += `6. [Risks to Avoid](#risks-to-avoid)\n`
  markdown += `7. [Recommendations](#recommendations)\n\n`
  
  // Executive Summary
  markdown += `## 1. Executive Summary\n\n`
  if (data.analysis) {
    markdown += `${data.analysis}\n\n`
  } else {
    markdown += `This analysis examines comparable projects to identify patterns of success, common challenges, and applicable lessons that can inform our project strategy and execution.\n\n`
  }
  
  // Comparable Projects
  markdown += `## 2. Comparable Projects\n\n`
  
  if (data.projects && data.projects.length > 0) {
    data.projects.forEach((project, index) => {
      markdown += `### ${index + 1}. ${project.name || `Project ${index + 1}`}\n\n`
      
      if (project.company) {
        markdown += `**Organization:** ${project.company}\n\n`
      }
      
      // Project Metrics
      markdown += `#### Project Metrics\n`
      markdown += `| Metric | Value |\n`
      markdown += `|--------|-------|\n`
      if (project.budget) markdown += `| Budget | ${project.budget} |\n`
      if (project.duration) markdown += `| Duration | ${project.duration} |\n`
      if (project.team_size) markdown += `| Team Size | ${project.team_size} |\n`
      markdown += `\n`
      
      if (project.description) {
        markdown += `#### Description\n${project.description}\n\n`
      }
      
      if (project.similarities && project.similarities.length > 0) {
        markdown += `#### Similarities to Our Project\n`
        project.similarities.forEach(sim => {
          markdown += `- ${sim}\n`
        })
        markdown += `\n`
      }
      
      if (project.differences && project.differences.length > 0) {
        markdown += `#### Key Differences\n`
        project.differences.forEach(diff => {
          markdown += `- ${diff}\n`
        })
        markdown += `\n`
      }
      
      if (project.success_factors && project.success_factors.length > 0) {
        markdown += `#### Success Factors\n`
        project.success_factors.forEach(factor => {
          markdown += `- ✅ ${factor}\n`
        })
        markdown += `\n`
      }
      
      if (project.challenges && project.challenges.length > 0) {
        markdown += `#### Challenges Encountered\n`
        project.challenges.forEach(challenge => {
          markdown += `- ⚠️ ${challenge}\n`
        })
        markdown += `\n`
      }
      
      if (project.lessons_learned && project.lessons_learned.length > 0) {
        markdown += `#### Lessons Learned\n`
        project.lessons_learned.forEach(lesson => {
          markdown += `- 💡 ${lesson}\n`
        })
        markdown += `\n`
      }
      
      if (project.outcomes) {
        markdown += `#### Outcomes\n${project.outcomes}\n\n`
      }
      
      markdown += `---\n\n`
    })
  } else {
    markdown += `*No comparable projects identified yet*\n\n`
  }
  
  // Comparative Analysis
  markdown += `## 3. Comparative Analysis\n\n`
  
  if (data.projects && data.projects.length > 0) {
    markdown += `### Project Comparison Matrix\n\n`
    markdown += `| Project | Budget | Duration | Team Size | Status |\n`
    markdown += `|---------|--------|----------|-----------|--------|\n`
    data.projects.forEach(project => {
      markdown += `| ${project.name || 'Unknown'} | ${project.budget || 'N/A'} | ${project.duration || 'N/A'} | ${project.team_size || 'N/A'} | Completed |\n`
    })
    markdown += `\n`
    
    // Common Success Factors
    const allSuccessFactors = data.projects
      .flatMap(p => p.success_factors || [])
      .filter((value, index, self) => self.indexOf(value) === index)
    
    if (allSuccessFactors.length > 0) {
      markdown += `### Common Success Factors\n\n`
      allSuccessFactors.slice(0, 5).forEach((factor, i) => {
        markdown += `${i + 1}. ${factor}\n`
      })
      markdown += `\n`
    }
    
    // Common Challenges
    const allChallenges = data.projects
      .flatMap(p => p.challenges || [])
      .filter((value, index, self) => self.indexOf(value) === index)
    
    if (allChallenges.length > 0) {
      markdown += `### Common Challenges\n\n`
      allChallenges.slice(0, 5).forEach((challenge, i) => {
        markdown += `${i + 1}. ${challenge}\n`
      })
      markdown += `\n`
    }
  }
  
  // Key Insights
  markdown += `## 4. Key Insights\n\n`
  
  if (data.summary?.key_insights && data.summary.key_insights.length > 0) {
    data.summary.key_insights.forEach((insight, i) => {
      markdown += `${i + 1}. **${insight}**\n`
    })
  } else {
    markdown += `1. **Early stakeholder engagement is critical** - Projects with strong stakeholder involvement from the start show higher success rates\n`
    markdown += `2. **Phased implementation reduces risk** - Breaking projects into manageable phases allows for course correction\n`
    markdown += `3. **Technical debt must be addressed** - Projects that ignore technical debt face exponential complexity growth\n`
    markdown += `4. **Team composition matters** - Mixed teams with both domain and technical expertise perform better\n`
    markdown += `5. **Change management is essential** - User adoption depends heavily on effective change management\n`
  }
  markdown += `\n`
  
  // Best Practices
  markdown += `## 5. Best Practices\n\n`
  
  if (data.summary?.best_practices && data.summary.best_practices.length > 0) {
    markdown += `Based on the analysis, the following best practices should be adopted:\n\n`
    data.summary.best_practices.forEach((practice, i) => {
      markdown += `### ${i + 1}. ${practice}\n`
    })
  } else {
    markdown += `### Recommended Practices\n\n`
    markdown += `- **Agile Methodology**: Adopt iterative development with regular feedback loops\n`
    markdown += `- **Continuous Integration**: Implement CI/CD pipelines from project inception\n`
    markdown += `- **Regular Communication**: Establish clear communication channels and regular updates\n`
    markdown += `- **Risk Management**: Proactive risk identification and mitigation planning\n`
    markdown += `- **Documentation**: Maintain comprehensive documentation throughout the project\n`
    markdown += `- **Testing Strategy**: Implement comprehensive testing at all levels\n`
    markdown += `- **Performance Monitoring**: Set up monitoring and alerting from the beginning\n`
  }
  markdown += `\n`
  
  // Risks to Avoid
  markdown += `## 6. Risks to Avoid\n\n`
  
  if (data.summary?.risks_to_avoid && data.summary.risks_to_avoid.length > 0) {
    markdown += `| Risk | Impact | Mitigation Strategy |\n`
    markdown += `|------|--------|--------------------|\n`
    data.summary.risks_to_avoid.forEach(risk => {
      markdown += `| ${risk} | High | Implement preventive measures |\n`
    })
  } else {
    markdown += `Based on lessons learned from comparable projects:\n\n`
    markdown += `| Risk Category | Specific Risk | Mitigation Approach |\n`
    markdown += `|---------------|---------------|--------------------|\n`
    markdown += `| Scope | Scope creep | Clear requirements and change control |\n`
    markdown += `| Technical | Technology lock-in | Use open standards and modular architecture |\n`
    markdown += `| Resource | Key person dependency | Knowledge sharing and documentation |\n`
    markdown += `| Timeline | Unrealistic deadlines | Buffer time and phased delivery |\n`
    markdown += `| Budget | Cost overruns | Regular budget reviews and contingency |\n`
  }
  markdown += `\n`
  
  // Recommendations
  markdown += `## 7. Recommendations\n\n`
  
  if (data.summary?.recommendations && data.summary.recommendations.length > 0) {
    markdown += `### Strategic Recommendations\n\n`
    data.summary.recommendations.forEach((rec, i) => {
      markdown += `${i + 1}. ${rec}\n`
    })
  } else {
    markdown += `### Action Items\n\n`
    markdown += `1. **Adopt proven methodologies** from successful comparable projects\n`
    markdown += `2. **Establish clear success metrics** based on industry benchmarks\n`
    markdown += `3. **Build in flexibility** to accommodate changing requirements\n`
    markdown += `4. **Invest in team training** to address skill gaps early\n`
    markdown += `5. **Create contingency plans** for identified risk scenarios\n`
    markdown += `6. **Set up regular review cycles** to track progress against comparables\n`
    markdown += `7. **Engage stakeholders early and often** to ensure alignment\n`
  }
  
  markdown += `\n---\n\n`
  markdown += `*This analysis should be updated as new comparable projects are identified or as existing projects reach completion.*\n`
  
  return markdown
}