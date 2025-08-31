// Helper types and functions
interface MarkdownSection {
  title: string
  level: number
  content: string
}

interface FormatOptions {
  format?: 'markdown' | 'html'
  projectName?: string
  companyName?: string
  version?: string
  date?: string
}

function getProjectInfo(options: FormatOptions): string {
  const parts = []
  if (options.projectName) parts.push(options.projectName)
  if (options.version) parts.push(`v${options.version}`)
  if (options.date) parts.push(options.date)
  return parts.length > 0 ? parts.join(' | ') : 'Project'
}

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  return text.replace(/[&<>"'\/]/g, char => htmlEscapes[char])
}

interface QualityManagementStrategyContent {
  introduction?: {
    purpose?: string
    scope?: string
    responsible_parties?: string[]
    quality_system_precedence?: string
  }
  quality_procedures?: {
    quality_planning?: {
      approach?: string
      product_identification?: string
      criteria_definition?: string
      techniques?: string[]
    }
    quality_control?: {
      standards?: string[]
      templates?: string[]
      methods?: string[]
      metrics?: string[]
    }
    project_assurance?: {
      board_responsibilities?: string[]
      compliance_audits?: string
      corporate_reviews?: string
    }
  }
  tools_techniques?: {
    quality_systems?: string[]
    preferred_techniques?: Array<{
      step?: string
      technique?: string
    }>
    integration_approach?: string
  }
  records_management?: {
    required_documentation?: string[]
    quality_register?: {
      composition?: string
      format?: string
    }
    inspection_documentation?: string
    approval_storage?: string
  }
  reporting?: {
    report_formats?: Array<{
      type?: string
      format?: string
    }>
    timing?: string
    recipients?: Array<{
      report?: string
      recipient?: string
    }>
    escalation_procedures?: string
  }
  timing?: {
    formal_activities?: Array<{
      activity?: string
      timing?: string
    }>
    quality_register_reference?: string
    stage_boundaries?: string
  }
  roles_responsibilities?: {
    project_board?: string[]
    senior_users?: string[]
    senior_suppliers?: string[]
    executive?: string[]
    project_manager?: string[]
    quality_assurance?: string[]
  }
  quality_expectations?: {
    product_description?: string
    acceptance_criteria?: string[]
    moscow_priorities?: {
      must_have?: string[]
      should_have?: string[]
      could_have?: string[]
      wont_have?: string[]
    }
    tolerance_levels?: Array<{
      criteria?: string
      tolerance?: string
    }>
  }
  review_technique?: {
    chair_role?: string
    presenter_role?: string
    reviewer_role?: string
    administrator_role?: string
    process?: string[]
  }
  tailoring?: {
    project_size?: string
    complexity_factors?: string[]
    organizational_standards?: string
    industry_requirements?: string[]
    risk_profile?: string
  }
}

export function formatQualityManagementStrategy(
  content: any,
  options: FormatOptions = {}
): string {
  const { format = 'markdown' } = options
  const data = content as QualityManagementStrategyContent
  const sections: MarkdownSection[] = []
  const projectInfo = getProjectInfo(options)

  // Header
  sections.push({
    title: `Quality Management Strategy - ${projectInfo}`,
    level: 1,
    content: ''
  })

  // Introduction and Scope
  if (data.introduction) {
    const introContent: string[] = []
    
    if (data.introduction.purpose) {
      introContent.push(`**Purpose:** ${data.introduction.purpose}`)
    }
    
    if (data.introduction.scope) {
      introContent.push(`**Scope:** ${data.introduction.scope}`)
    }
    
    if (data.introduction.responsible_parties?.length) {
      introContent.push(`**Responsible Parties:**`)
      data.introduction.responsible_parties.forEach(party => {
        introContent.push(`- ${party}`)
      })
    }
    
    if (data.introduction.quality_system_precedence) {
      introContent.push(`**Quality System Precedence:** ${data.introduction.quality_system_precedence}`)
    }

    sections.push({
      title: 'Introduction and Scope',
      level: 2,
      content: introContent.join('\n\n')
    })
  }

  // Quality Management Procedures
  if (data.quality_procedures) {
    const procContent: string[] = []
    
    // Quality Planning
    if (data.quality_procedures.quality_planning) {
      procContent.push('### Quality Planning')
      const qp = data.quality_procedures.quality_planning
      
      if (qp.approach) {
        procContent.push(`**Approach:** ${qp.approach}`)
      }
      if (qp.product_identification) {
        procContent.push(`**Product Identification:** ${qp.product_identification}`)
      }
      if (qp.criteria_definition) {
        procContent.push(`**Criteria Definition:** ${qp.criteria_definition}`)
      }
      if (qp.techniques?.length) {
        procContent.push(`**Techniques:**`)
        qp.techniques.forEach(technique => {
          procContent.push(`- ${technique}`)
        })
      }
    }
    
    // Quality Control
    if (data.quality_procedures.quality_control) {
      procContent.push('\n### Quality Control')
      const qc = data.quality_procedures.quality_control
      
      if (qc.standards?.length) {
        procContent.push(`**Standards:**`)
        qc.standards.forEach(standard => {
          procContent.push(`- ${standard}`)
        })
      }
      if (qc.templates?.length) {
        procContent.push(`**Templates:**`)
        qc.templates.forEach(template => {
          procContent.push(`- ${template}`)
        })
      }
      if (qc.methods?.length) {
        procContent.push(`**Methods:**`)
        qc.methods.forEach(method => {
          procContent.push(`- ${method}`)
        })
      }
      if (qc.metrics?.length) {
        procContent.push(`**Metrics:**`)
        qc.metrics.forEach(metric => {
          procContent.push(`- ${metric}`)
        })
      }
    }
    
    // Project Assurance
    if (data.quality_procedures.project_assurance) {
      procContent.push('\n### Project Assurance')
      const pa = data.quality_procedures.project_assurance
      
      if (pa.board_responsibilities?.length) {
        procContent.push(`**Project Board Responsibilities:**`)
        pa.board_responsibilities.forEach(resp => {
          procContent.push(`- ${resp}`)
        })
      }
      if (pa.compliance_audits) {
        procContent.push(`**Compliance Audits:** ${pa.compliance_audits}`)
      }
      if (pa.corporate_reviews) {
        procContent.push(`**Corporate Reviews:** ${pa.corporate_reviews}`)
      }
    }

    sections.push({
      title: 'Quality Management Procedures',
      level: 2,
      content: procContent.join('\n\n')
    })
  }

  // Tools and Techniques
  if (data.tools_techniques) {
    const toolsContent: string[] = []
    
    if (data.tools_techniques.quality_systems?.length) {
      toolsContent.push('**Quality Management Systems:**')
      data.tools_techniques.quality_systems.forEach(system => {
        toolsContent.push(`- ${system}`)
      })
    }
    
    if (data.tools_techniques.preferred_techniques?.length) {
      toolsContent.push('\n**Preferred Techniques:**')
      const techTable = [
        '| Step | Technique |',
        '|------|-----------|'
      ]
      data.tools_techniques.preferred_techniques.forEach(item => {
        techTable.push(`| ${item.step || ''} | ${item.technique || ''} |`)
      })
      toolsContent.push(techTable.join('\n'))
    }
    
    if (data.tools_techniques.integration_approach) {
      toolsContent.push(`\n**Integration Approach:** ${data.tools_techniques.integration_approach}`)
    }

    sections.push({
      title: 'Tools and Techniques',
      level: 2,
      content: toolsContent.join('\n')
    })
  }

  // Quality Records Management
  if (data.records_management) {
    const recordsContent: string[] = []
    
    if (data.records_management.required_documentation?.length) {
      recordsContent.push('**Required Documentation:**')
      data.records_management.required_documentation.forEach(doc => {
        recordsContent.push(`- ${doc}`)
      })
    }
    
    if (data.records_management.quality_register) {
      recordsContent.push('\n**Quality Register:**')
      const qr = data.records_management.quality_register
      if (qr.composition) {
        recordsContent.push(`- Composition: ${qr.composition}`)
      }
      if (qr.format) {
        recordsContent.push(`- Format: ${qr.format}`)
      }
    }
    
    if (data.records_management.inspection_documentation) {
      recordsContent.push(`\n**Inspection Documentation:** ${data.records_management.inspection_documentation}`)
    }
    
    if (data.records_management.approval_storage) {
      recordsContent.push(`**Approval Storage:** ${data.records_management.approval_storage}`)
    }

    sections.push({
      title: 'Quality Records Management',
      level: 2,
      content: recordsContent.join('\n')
    })
  }

  // Reporting Requirements
  if (data.reporting) {
    const reportContent: string[] = []
    
    if (data.reporting.report_formats?.length) {
      reportContent.push('**Report Formats:**')
      const formatTable = [
        '| Type | Format |',
        '|------|--------|'
      ]
      data.reporting.report_formats.forEach(item => {
        formatTable.push(`| ${item.type || ''} | ${item.format || ''} |`)
      })
      reportContent.push(formatTable.join('\n'))
    }
    
    if (data.reporting.timing) {
      reportContent.push(`\n**Timing:** ${data.reporting.timing}`)
    }
    
    if (data.reporting.recipients?.length) {
      reportContent.push('\n**Recipients:**')
      const recipTable = [
        '| Report | Recipient |',
        '|--------|-----------|'
      ]
      data.reporting.recipients.forEach(item => {
        recipTable.push(`| ${item.report || ''} | ${item.recipient || ''} |`)
      })
      reportContent.push(recipTable.join('\n'))
    }
    
    if (data.reporting.escalation_procedures) {
      reportContent.push(`\n**Escalation Procedures:** ${data.reporting.escalation_procedures}`)
    }

    sections.push({
      title: 'Reporting Requirements',
      level: 2,
      content: reportContent.join('\n')
    })
  }

  // Timing of Quality Activities
  if (data.timing) {
    const timingContent: string[] = []
    
    if (data.timing.formal_activities?.length) {
      timingContent.push('**Formal Quality Activities:**')
      const actTable = [
        '| Activity | Timing |',
        '|----------|--------|'
      ]
      data.timing.formal_activities.forEach(item => {
        actTable.push(`| ${item.activity || ''} | ${item.timing || ''} |`)
      })
      timingContent.push(actTable.join('\n'))
    }
    
    if (data.timing.quality_register_reference) {
      timingContent.push(`\n**Quality Register Reference:** ${data.timing.quality_register_reference}`)
    }
    
    if (data.timing.stage_boundaries) {
      timingContent.push(`**Stage Boundaries:** ${data.timing.stage_boundaries}`)
    }

    sections.push({
      title: 'Timing of Quality Activities',
      level: 2,
      content: timingContent.join('\n')
    })
  }

  // Roles and Responsibilities
  if (data.roles_responsibilities) {
    const rolesContent: string[] = []
    
    const roleGroups = [
      { key: 'project_board', title: 'Project Board' },
      { key: 'senior_users', title: 'Senior Users' },
      { key: 'senior_suppliers', title: 'Senior Suppliers' },
      { key: 'executive', title: 'Executive' },
      { key: 'project_manager', title: 'Project Manager' },
      { key: 'quality_assurance', title: 'Quality Assurance' }
    ]
    
    roleGroups.forEach(group => {
      const roles = (data.roles_responsibilities as any)[group.key]
      if (roles?.length) {
        rolesContent.push(`### ${group.title}`)
        roles.forEach((role: string) => {
          rolesContent.push(`- ${role}`)
        })
      }
    })

    sections.push({
      title: 'Roles and Responsibilities',
      level: 2,
      content: rolesContent.join('\n\n')
    })
  }

  // Quality Expectations
  if (data.quality_expectations) {
    const expectContent: string[] = []
    
    if (data.quality_expectations.product_description) {
      expectContent.push(`**Product Description:** ${data.quality_expectations.product_description}`)
    }
    
    if (data.quality_expectations.acceptance_criteria?.length) {
      expectContent.push('\n**Acceptance Criteria:**')
      data.quality_expectations.acceptance_criteria.forEach(criteria => {
        expectContent.push(`- ${criteria}`)
      })
    }
    
    if (data.quality_expectations.moscow_priorities) {
      expectContent.push('\n**MoSCoW Priorities:**')
      const mp = data.quality_expectations.moscow_priorities
      
      if (mp.must_have?.length) {
        expectContent.push('\n*Must Have:*')
        mp.must_have.forEach(item => expectContent.push(`- ${item}`))
      }
      if (mp.should_have?.length) {
        expectContent.push('\n*Should Have:*')
        mp.should_have.forEach(item => expectContent.push(`- ${item}`))
      }
      if (mp.could_have?.length) {
        expectContent.push('\n*Could Have:*')
        mp.could_have.forEach(item => expectContent.push(`- ${item}`))
      }
      if (mp.wont_have?.length) {
        expectContent.push('\n*Won\'t Have:*')
        mp.wont_have.forEach(item => expectContent.push(`- ${item}`))
      }
    }
    
    if (data.quality_expectations.tolerance_levels?.length) {
      expectContent.push('\n**Tolerance Levels:**')
      const tolTable = [
        '| Criteria | Tolerance |',
        '|----------|-----------|'
      ]
      data.quality_expectations.tolerance_levels.forEach(item => {
        tolTable.push(`| ${item.criteria || ''} | ${item.tolerance || ''} |`)
      })
      expectContent.push(tolTable.join('\n'))
    }

    sections.push({
      title: 'Quality Expectations',
      level: 2,
      content: expectContent.join('\n')
    })
  }

  // Quality Review Technique
  if (data.review_technique) {
    const reviewContent: string[] = []
    
    if (data.review_technique.chair_role) {
      reviewContent.push(`**Chair:** ${data.review_technique.chair_role}`)
    }
    if (data.review_technique.presenter_role) {
      reviewContent.push(`**Presenter:** ${data.review_technique.presenter_role}`)
    }
    if (data.review_technique.reviewer_role) {
      reviewContent.push(`**Reviewers:** ${data.review_technique.reviewer_role}`)
    }
    if (data.review_technique.administrator_role) {
      reviewContent.push(`**Administrator:** ${data.review_technique.administrator_role}`)
    }
    
    if (data.review_technique.process?.length) {
      reviewContent.push('\n**Review Process:**')
      data.review_technique.process.forEach((step, idx) => {
        reviewContent.push(`${idx + 1}. ${step}`)
      })
    }

    sections.push({
      title: 'Quality Review Technique',
      level: 2,
      content: reviewContent.join('\n\n')
    })
  }

  // Tailoring Considerations
  if (data.tailoring) {
    const tailorContent: string[] = []
    
    if (data.tailoring.project_size) {
      tailorContent.push(`**Project Size:** ${data.tailoring.project_size}`)
    }
    
    if (data.tailoring.complexity_factors?.length) {
      tailorContent.push('\n**Complexity Factors:**')
      data.tailoring.complexity_factors.forEach(factor => {
        tailorContent.push(`- ${factor}`)
      })
    }
    
    if (data.tailoring.organizational_standards) {
      tailorContent.push(`\n**Organizational Standards:** ${data.tailoring.organizational_standards}`)
    }
    
    if (data.tailoring.industry_requirements?.length) {
      tailorContent.push('\n**Industry Requirements:**')
      data.tailoring.industry_requirements.forEach(req => {
        tailorContent.push(`- ${req}`)
      })
    }
    
    if (data.tailoring.risk_profile) {
      tailorContent.push(`\n**Risk Profile:** ${data.tailoring.risk_profile}`)
    }

    sections.push({
      title: 'Tailoring Considerations',
      level: 2,
      content: tailorContent.join('\n')
    })
  }

  // Build the final markdown
  if (format === 'html') {
    return sections.map(section => {
      const heading = `h${section.level}`
      return `<${heading}>${escapeHtml(section.title)}</${heading}>\n${section.content ? `<div>${escapeHtml(section.content)}</div>` : ''}`
    }).join('\n\n')
  }

  return sections.map(section => {
    const prefix = '#'.repeat(section.level)
    return `${prefix} ${section.title}${section.content ? '\n\n' + section.content : ''}`
  }).join('\n\n')
}