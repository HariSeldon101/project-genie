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

interface CommunicationPlanContent {
  document_admin?: {
    project_id?: string
    revision_history?: Array<{
      version?: string
      date?: string
      changes?: string
    }>
    approval_records?: string[]
    distribution_list?: string[]
    ownership?: string
  }
  communication_procedures?: {
    methods?: Array<{
      type?: string
      description?: string
      use_case?: string
    }>
    protocols?: {
      formal?: string[]
      informal?: string[]
    }
    escalation_paths?: Array<{
      level?: string
      trigger?: string
      contact?: string
    }>
    feedback_mechanisms?: string[]
  }
  stakeholder_analysis?: {
    identification_method?: string
    internal_stakeholders?: Array<{
      name?: string
      role?: string
      department?: string
    }>
    external_stakeholders?: Array<{
      name?: string
      organization?: string
      relationship?: string
    }>
    power_interest_grid?: {
      high_power_high_interest?: string[]
      high_power_low_interest?: string[]
      low_power_high_interest?: string[]
      low_power_low_interest?: string[]
    }
  }
  information_needs?: Array<{
    stakeholder_group?: string
    required_information?: string[]
    preferred_format?: string
    delivery_frequency?: string
    content_specifications?: string
  }>
  tools_techniques?: {
    technologies?: string[]
    collaboration_platforms?: string[]
    document_templates?: string[]
    channel_matrix?: Array<{
      message_type?: string
      channel?: string
    }>
  }
  timing_scheduling?: {
    communication_calendar?: Array<{
      event?: string
      frequency?: string
      date?: string
    }>
    report_frequencies?: Array<{
      report?: string
      frequency?: string
    }>
    event_triggers?: Array<{
      event?: string
      action?: string
    }>
    critical_milestones?: string[]
  }
  roles_responsibilities?: {
    raci_matrix?: Array<{
      activity?: string
      responsible?: string
      accountable?: string
      consulted?: string
      informed?: string
    }>
    project_manager?: string[]
    team_members?: string[]
    stakeholder_owners?: Array<{
      stakeholder?: string
      owner?: string
    }>
  }
  stakeholder_management?: {
    categories?: {
      champions?: {
        members?: string[]
        strategy?: string
      }
      supporters?: {
        members?: string[]
        strategy?: string
      }
      neutral?: {
        members?: string[]
        strategy?: string
      }
      blockers?: {
        members?: string[]
        strategy?: string
      }
      critics?: {
        members?: string[]
        strategy?: string
      }
    }
    engagement_plans?: Array<{
      stakeholder?: string
      current_state?: string
      desired_state?: string
      actions?: string[]
    }>
  }
  communication_methods?: {
    face_to_face?: {
      use_cases?: string[]
      guidelines?: string
    }
    email?: {
      use_cases?: string[]
      guidelines?: string
    }
    presentations?: {
      use_cases?: string[]
      guidelines?: string
    }
    dashboards?: {
      use_cases?: string[]
      guidelines?: string
    }
  }
  sensitive_information?: {
    classification_levels?: Array<{
      level?: string
      description?: string
      handling?: string
    }>
    access_controls?: string[]
    distribution_restrictions?: string[]
    legal_constraints?: string[]
    crisis_communication?: {
      scenarios?: string[]
      pre_drafted_messages?: string[]
      spokesperson?: string
    }
  }
  reporting_hierarchies?: {
    highlight_reports?: {
      frequency?: string
      audience?: string
      content?: string
    }
    checkpoint_reports?: {
      frequency?: string
      audience?: string
      content?: string
    }
    exception_reports?: {
      frequency?: string
      audience?: string
      content?: string
    }
    stakeholder_bulletins?: {
      frequency?: string
      audience?: string
      content?: string
    }
  }
}

export function formatCommunicationPlan(
  content: any,
  options: FormatOptions = {}
): string {
  const { format = 'markdown' } = options
  const data = content as CommunicationPlanContent
  const sections: MarkdownSection[] = []
  const projectInfo = getProjectInfo(options)

  // Header
  sections.push({
    title: `Communication Management Approach - ${projectInfo}`,
    level: 1,
    content: ''
  })

  // Document Administration
  if (data.document_admin) {
    const adminContent: string[] = []
    
    if (data.document_admin.project_id) {
      adminContent.push(`**Project ID:** ${data.document_admin.project_id}`)
    }
    
    if (data.document_admin.revision_history?.length) {
      adminContent.push('\n**Revision History:**')
      const revTable = [
        '| Version | Date | Changes |',
        '|---------|------|---------|'
      ]
      data.document_admin.revision_history.forEach(rev => {
        revTable.push(`| ${rev.version || ''} | ${rev.date || ''} | ${rev.changes || ''} |`)
      })
      adminContent.push(revTable.join('\n'))
    }
    
    if (data.document_admin.approval_records?.length) {
      adminContent.push('\n**Approval Records:**')
      data.document_admin.approval_records.forEach(record => {
        adminContent.push(`- ${record}`)
      })
    }
    
    if (data.document_admin.distribution_list?.length) {
      adminContent.push('\n**Distribution List:**')
      data.document_admin.distribution_list.forEach(recipient => {
        adminContent.push(`- ${recipient}`)
      })
    }
    
    if (data.document_admin.ownership) {
      adminContent.push(`\n**Document Ownership:** ${data.document_admin.ownership}`)
    }

    sections.push({
      title: 'Document Administration',
      level: 2,
      content: adminContent.join('\n')
    })
  }

  // Communication Procedures
  if (data.communication_procedures) {
    const procContent: string[] = []
    
    if (data.communication_procedures.methods?.length) {
      procContent.push('**Communication Methods:**')
      const methodTable = [
        '| Type | Description | Use Case |',
        '|------|-------------|----------|'
      ]
      data.communication_procedures.methods.forEach(method => {
        methodTable.push(`| ${method.type || ''} | ${method.description || ''} | ${method.use_case || ''} |`)
      })
      procContent.push(methodTable.join('\n'))
    }
    
    if (data.communication_procedures.protocols) {
      procContent.push('\n**Protocols:**')
      const proto = data.communication_procedures.protocols
      
      if (proto.formal?.length) {
        procContent.push('\n*Formal:*')
        proto.formal.forEach(item => procContent.push(`- ${item}`))
      }
      
      if (proto.informal?.length) {
        procContent.push('\n*Informal:*')
        proto.informal.forEach(item => procContent.push(`- ${item}`))
      }
    }
    
    if (data.communication_procedures.escalation_paths?.length) {
      procContent.push('\n**Escalation Paths:**')
      const escTable = [
        '| Level | Trigger | Contact |',
        '|-------|---------|---------|'
      ]
      data.communication_procedures.escalation_paths.forEach(path => {
        escTable.push(`| ${path.level || ''} | ${path.trigger || ''} | ${path.contact || ''} |`)
      })
      procContent.push(escTable.join('\n'))
    }
    
    if (data.communication_procedures.feedback_mechanisms?.length) {
      procContent.push('\n**Feedback Mechanisms:**')
      data.communication_procedures.feedback_mechanisms.forEach(mechanism => {
        procContent.push(`- ${mechanism}`)
      })
    }

    sections.push({
      title: 'Communication Procedures',
      level: 2,
      content: procContent.join('\n')
    })
  }

  // Stakeholder Analysis
  if (data.stakeholder_analysis) {
    const stakeContent: string[] = []
    
    if (data.stakeholder_analysis.identification_method) {
      stakeContent.push(`**Identification Method:** ${data.stakeholder_analysis.identification_method}`)
    }
    
    if (data.stakeholder_analysis.internal_stakeholders?.length) {
      stakeContent.push('\n**Internal Stakeholders:**')
      const intTable = [
        '| Name | Role | Department |',
        '|------|------|------------|'
      ]
      data.stakeholder_analysis.internal_stakeholders.forEach(stake => {
        intTable.push(`| ${stake.name || ''} | ${stake.role || ''} | ${stake.department || ''} |`)
      })
      stakeContent.push(intTable.join('\n'))
    }
    
    if (data.stakeholder_analysis.external_stakeholders?.length) {
      stakeContent.push('\n**External Stakeholders:**')
      const extTable = [
        '| Name | Organization | Relationship |',
        '|------|--------------|--------------|'
      ]
      data.stakeholder_analysis.external_stakeholders.forEach(stake => {
        extTable.push(`| ${stake.name || ''} | ${stake.organization || ''} | ${stake.relationship || ''} |`)
      })
      stakeContent.push(extTable.join('\n'))
    }
    
    if (data.stakeholder_analysis.power_interest_grid) {
      stakeContent.push('\n**Power/Interest Grid:**')
      const grid = data.stakeholder_analysis.power_interest_grid
      
      if (grid.high_power_high_interest?.length) {
        stakeContent.push('\n*High Power / High Interest (Manage Closely):*')
        grid.high_power_high_interest.forEach(s => stakeContent.push(`- ${s}`))
      }
      if (grid.high_power_low_interest?.length) {
        stakeContent.push('\n*High Power / Low Interest (Keep Satisfied):*')
        grid.high_power_low_interest.forEach(s => stakeContent.push(`- ${s}`))
      }
      if (grid.low_power_high_interest?.length) {
        stakeContent.push('\n*Low Power / High Interest (Keep Informed):*')
        grid.low_power_high_interest.forEach(s => stakeContent.push(`- ${s}`))
      }
      if (grid.low_power_low_interest?.length) {
        stakeContent.push('\n*Low Power / Low Interest (Monitor):*')
        grid.low_power_low_interest.forEach(s => stakeContent.push(`- ${s}`))
      }
    }

    sections.push({
      title: 'Stakeholder Analysis',
      level: 2,
      content: stakeContent.join('\n')
    })
  }

  // Information Needs Analysis
  if (data.information_needs?.length) {
    const infoContent: string[] = []
    
    data.information_needs.forEach(need => {
      infoContent.push(`### ${need.stakeholder_group || 'Stakeholder Group'}`)
      
      if (need.required_information?.length) {
        infoContent.push('**Required Information:**')
        need.required_information.forEach(info => {
          infoContent.push(`- ${info}`)
        })
      }
      
      if (need.preferred_format) {
        infoContent.push(`**Preferred Format:** ${need.preferred_format}`)
      }
      
      if (need.delivery_frequency) {
        infoContent.push(`**Delivery Frequency:** ${need.delivery_frequency}`)
      }
      
      if (need.content_specifications) {
        infoContent.push(`**Content Specifications:** ${need.content_specifications}`)
      }
      
      infoContent.push('')
    })

    sections.push({
      title: 'Information Needs Analysis',
      level: 2,
      content: infoContent.join('\n')
    })
  }

  // Tools and Techniques
  if (data.tools_techniques) {
    const toolsContent: string[] = []
    
    if (data.tools_techniques.technologies?.length) {
      toolsContent.push('**Communication Technologies:**')
      data.tools_techniques.technologies.forEach(tech => {
        toolsContent.push(`- ${tech}`)
      })
    }
    
    if (data.tools_techniques.collaboration_platforms?.length) {
      toolsContent.push('\n**Collaboration Platforms:**')
      data.tools_techniques.collaboration_platforms.forEach(platform => {
        toolsContent.push(`- ${platform}`)
      })
    }
    
    if (data.tools_techniques.document_templates?.length) {
      toolsContent.push('\n**Document Templates:**')
      data.tools_techniques.document_templates.forEach(template => {
        toolsContent.push(`- ${template}`)
      })
    }
    
    if (data.tools_techniques.channel_matrix?.length) {
      toolsContent.push('\n**Channel Matrix:**')
      const chanTable = [
        '| Message Type | Channel |',
        '|--------------|---------|'
      ]
      data.tools_techniques.channel_matrix.forEach(item => {
        chanTable.push(`| ${item.message_type || ''} | ${item.channel || ''} |`)
      })
      toolsContent.push(chanTable.join('\n'))
    }

    sections.push({
      title: 'Tools and Techniques',
      level: 2,
      content: toolsContent.join('\n')
    })
  }

  // Timing and Scheduling
  if (data.timing_scheduling) {
    const timingContent: string[] = []
    
    if (data.timing_scheduling.communication_calendar?.length) {
      timingContent.push('**Communication Calendar:**')
      const calTable = [
        '| Event | Frequency | Date |',
        '|-------|-----------|------|'
      ]
      data.timing_scheduling.communication_calendar.forEach(item => {
        calTable.push(`| ${item.event || ''} | ${item.frequency || ''} | ${item.date || ''} |`)
      })
      timingContent.push(calTable.join('\n'))
    }
    
    if (data.timing_scheduling.report_frequencies?.length) {
      timingContent.push('\n**Report Frequencies:**')
      const repTable = [
        '| Report | Frequency |',
        '|--------|-----------|'
      ]
      data.timing_scheduling.report_frequencies.forEach(item => {
        repTable.push(`| ${item.report || ''} | ${item.frequency || ''} |`)
      })
      timingContent.push(repTable.join('\n'))
    }
    
    if (data.timing_scheduling.event_triggers?.length) {
      timingContent.push('\n**Event-Driven Triggers:**')
      const trigTable = [
        '| Event | Action |',
        '|-------|--------|'
      ]
      data.timing_scheduling.event_triggers.forEach(item => {
        trigTable.push(`| ${item.event || ''} | ${item.action || ''} |`)
      })
      timingContent.push(trigTable.join('\n'))
    }
    
    if (data.timing_scheduling.critical_milestones?.length) {
      timingContent.push('\n**Critical Milestones:**')
      data.timing_scheduling.critical_milestones.forEach(milestone => {
        timingContent.push(`- ${milestone}`)
      })
    }

    sections.push({
      title: 'Timing and Scheduling',
      level: 2,
      content: timingContent.join('\n')
    })
  }

  // Roles and Responsibilities
  if (data.roles_responsibilities) {
    const rolesContent: string[] = []
    
    if (data.roles_responsibilities.raci_matrix?.length) {
      rolesContent.push('**RACI Matrix:**')
      const raciTable = [
        '| Activity | Responsible | Accountable | Consulted | Informed |',
        '|----------|-------------|-------------|-----------|----------|'
      ]
      data.roles_responsibilities.raci_matrix.forEach(item => {
        raciTable.push(`| ${item.activity || ''} | ${item.responsible || ''} | ${item.accountable || ''} | ${item.consulted || ''} | ${item.informed || ''} |`)
      })
      rolesContent.push(raciTable.join('\n'))
    }
    
    if (data.roles_responsibilities.project_manager?.length) {
      rolesContent.push('\n**Project Manager Responsibilities:**')
      data.roles_responsibilities.project_manager.forEach(resp => {
        rolesContent.push(`- ${resp}`)
      })
    }
    
    if (data.roles_responsibilities.team_members?.length) {
      rolesContent.push('\n**Team Member Responsibilities:**')
      data.roles_responsibilities.team_members.forEach(resp => {
        rolesContent.push(`- ${resp}`)
      })
    }
    
    if (data.roles_responsibilities.stakeholder_owners?.length) {
      rolesContent.push('\n**Stakeholder Ownership:**')
      const ownTable = [
        '| Stakeholder | Owner |',
        '|-------------|--------|'
      ]
      data.roles_responsibilities.stakeholder_owners.forEach(item => {
        ownTable.push(`| ${item.stakeholder || ''} | ${item.owner || ''} |`)
      })
      rolesContent.push(ownTable.join('\n'))
    }

    sections.push({
      title: 'Roles and Responsibilities',
      level: 2,
      content: rolesContent.join('\n')
    })
  }

  // Stakeholder Management Integration
  if (data.stakeholder_management) {
    const mgmtContent: string[] = []
    
    if (data.stakeholder_management.categories) {
      mgmtContent.push('### Stakeholder Categories')
      const cat = data.stakeholder_management.categories
      
      const categoryTypes = [
        { key: 'champions', title: 'Champions' },
        { key: 'supporters', title: 'Supporters' },
        { key: 'neutral', title: 'Neutral' },
        { key: 'blockers', title: 'Blockers' },
        { key: 'critics', title: 'Critics' }
      ]
      
      categoryTypes.forEach(catType => {
        const category = (cat as any)[catType.key]
        if (category) {
          mgmtContent.push(`\n**${catType.title}:**`)
          if (category.members?.length) {
            mgmtContent.push('*Members:*')
            category.members.forEach((member: string) => mgmtContent.push(`- ${member}`))
          }
          if (category.strategy) {
            mgmtContent.push(`*Strategy:* ${category.strategy}`)
          }
        }
      })
    }
    
    if (data.stakeholder_management.engagement_plans?.length) {
      mgmtContent.push('\n### Engagement Plans')
      data.stakeholder_management.engagement_plans.forEach(plan => {
        mgmtContent.push(`\n**${plan.stakeholder || 'Stakeholder'}:**`)
        if (plan.current_state) {
          mgmtContent.push(`- Current State: ${plan.current_state}`)
        }
        if (plan.desired_state) {
          mgmtContent.push(`- Desired State: ${plan.desired_state}`)
        }
        if (plan.actions?.length) {
          mgmtContent.push('- Actions:')
          plan.actions.forEach(action => {
            mgmtContent.push(`  • ${action}`)
          })
        }
      })
    }

    sections.push({
      title: 'Stakeholder Management Integration',
      level: 2,
      content: mgmtContent.join('\n')
    })
  }

  // Communication Methods Selection
  if (data.communication_methods) {
    const methodsContent: string[] = []
    
    const methodTypes = [
      { key: 'face_to_face', title: 'Face-to-Face Communication' },
      { key: 'email', title: 'Email Communication' },
      { key: 'presentations', title: 'Presentations' },
      { key: 'dashboards', title: 'Dashboards' }
    ]
    
    methodTypes.forEach(method => {
      const methodData = (data.communication_methods as any)[method.key]
      if (methodData) {
        methodsContent.push(`### ${method.title}`)
        
        if (methodData.use_cases?.length) {
          methodsContent.push('**Use Cases:**')
          methodData.use_cases.forEach((useCase: string) => {
            methodsContent.push(`- ${useCase}`)
          })
        }
        
        if (methodData.guidelines) {
          methodsContent.push(`\n**Guidelines:** ${methodData.guidelines}`)
        }
        
        methodsContent.push('')
      }
    })

    sections.push({
      title: 'Communication Methods Selection',
      level: 2,
      content: methodsContent.join('\n')
    })
  }

  // Sensitive Information Management
  if (data.sensitive_information) {
    const sensitiveContent: string[] = []
    
    if (data.sensitive_information.classification_levels?.length) {
      sensitiveContent.push('**Information Classification Levels:**')
      const classTable = [
        '| Level | Description | Handling |',
        '|-------|-------------|----------|'
      ]
      data.sensitive_information.classification_levels.forEach(level => {
        classTable.push(`| ${level.level || ''} | ${level.description || ''} | ${level.handling || ''} |`)
      })
      sensitiveContent.push(classTable.join('\n'))
    }
    
    if (data.sensitive_information.access_controls?.length) {
      sensitiveContent.push('\n**Access Controls:**')
      data.sensitive_information.access_controls.forEach(control => {
        sensitiveContent.push(`- ${control}`)
      })
    }
    
    if (data.sensitive_information.distribution_restrictions?.length) {
      sensitiveContent.push('\n**Distribution Restrictions:**')
      data.sensitive_information.distribution_restrictions.forEach(restriction => {
        sensitiveContent.push(`- ${restriction}`)
      })
    }
    
    if (data.sensitive_information.legal_constraints?.length) {
      sensitiveContent.push('\n**Legal & Regulatory Constraints:**')
      data.sensitive_information.legal_constraints.forEach(constraint => {
        sensitiveContent.push(`- ${constraint}`)
      })
    }
    
    if (data.sensitive_information.crisis_communication) {
      sensitiveContent.push('\n**Crisis Communication Plan:**')
      const crisis = data.sensitive_information.crisis_communication
      
      if (crisis.scenarios?.length) {
        sensitiveContent.push('\n*Scenarios:*')
        crisis.scenarios.forEach(scenario => sensitiveContent.push(`- ${scenario}`))
      }
      
      if (crisis.pre_drafted_messages?.length) {
        sensitiveContent.push('\n*Pre-drafted Messages:*')
        crisis.pre_drafted_messages.forEach(message => sensitiveContent.push(`- ${message}`))
      }
      
      if (crisis.spokesperson) {
        sensitiveContent.push(`\n*Designated Spokesperson:* ${crisis.spokesperson}`)
      }
    }

    sections.push({
      title: 'Sensitive Information Management',
      level: 2,
      content: sensitiveContent.join('\n')
    })
  }

  // Reporting Hierarchies
  if (data.reporting_hierarchies) {
    const reportContent: string[] = []
    
    const reportTypes = [
      { key: 'highlight_reports', title: 'Highlight Reports' },
      { key: 'checkpoint_reports', title: 'Checkpoint Reports' },
      { key: 'exception_reports', title: 'Exception Reports' },
      { key: 'stakeholder_bulletins', title: 'Stakeholder Bulletins' }
    ]
    
    reportTypes.forEach(report => {
      const reportData = (data.reporting_hierarchies as any)[report.key]
      if (reportData) {
        reportContent.push(`### ${report.title}`)
        
        if (reportData.frequency) {
          reportContent.push(`**Frequency:** ${reportData.frequency}`)
        }
        if (reportData.audience) {
          reportContent.push(`**Audience:** ${reportData.audience}`)
        }
        if (reportData.content) {
          reportContent.push(`**Content:** ${reportData.content}`)
        }
        
        reportContent.push('')
      }
    })

    sections.push({
      title: 'Reporting Hierarchies',
      level: 2,
      content: reportContent.join('\n')
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