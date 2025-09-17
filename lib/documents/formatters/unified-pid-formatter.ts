/**
 * Unified PID HTML Formatter
 * Single source of truth for PID content structure
 * Generates semantic HTML that can be used for both display and PDF generation
 */

import { BaseUnifiedFormatter, DocumentMetadata, FormatterOptions } from './base-unified-formatter'
import { Prince2PID } from '../schemas/prince2-pid'

export class UnifiedPIDFormatter extends BaseUnifiedFormatter<Prince2PID> {
  
  /**
   * Ensure PID data has all required structure
   */
  protected ensureStructure(data: any): Prince2PID {
    // Handle double-wrapped content
    if (data?.content && typeof data.content === 'object') {
      data = data.content
    }

    // Extract background from projectDefinition if needed
    const background = data?.projectDefinition?.background || 
                      data?.projectBackground || 
                      data?.background || 
                      ''

    // Generate executive summary if missing
    const executiveSummary = data?.executiveSummary || 
                           data?.executive_summary ||
                           this.generateExecutiveSummary(data)

    return {
      // 1. Executive Summary (generated or provided)
      executiveSummary,

      // 2. Project Background
      projectBackground: background,

      // 3. Project Definition
      projectDefinition: {
        objectives: this.extractArray(data?.projectDefinition?.objectives || data?.objectives),
        scope: {
          inScope: this.extractArray(data?.projectDefinition?.scope?.included || 
                                    data?.projectDefinition?.scope?.inScope || 
                                    data?.scope?.included || []),
          outOfScope: this.extractArray(data?.projectDefinition?.scope?.excluded || 
                                       data?.projectDefinition?.scope?.outOfScope || 
                                       data?.scope?.excluded || [])
        },
        deliverables: this.extractArray(data?.projectDefinition?.deliverables || data?.deliverables),
        constraints: this.extractArray(data?.projectDefinition?.constraints || data?.constraints),
        assumptions: this.extractArray(data?.projectDefinition?.assumptions || data?.assumptions),
        dependencies: this.extractArray(data?.projectDefinition?.dependencies || data?.dependencies),
        interfaces: this.extractArray(data?.projectDefinition?.interfaces || data?.interfaces),
        desiredOutcomes: this.extractArray(data?.projectDefinition?.desiredOutcomes || data?.desiredOutcomes)
      },

      // 4. Business Case
      businessCase: {
        reasons: data?.businessCase?.reasons || '',
        businessOptions: this.extractArray(data?.businessCase?.businessOptions),
        expectedBenefits: this.extractArray(data?.businessCase?.expectedBenefits),
        expectedDisBenefits: this.extractArray(data?.businessCase?.expectedDisBenefits),
        timescale: data?.businessCase?.timescale || '',
        costs: data?.businessCase?.costs || {},
        investmentAppraisal: data?.businessCase?.investmentAppraisal || '',
        majorRisks: this.extractArray(data?.businessCase?.majorRisks)
      },

      // 5. Organization Structure
      organizationStructure: {
        projectBoard: data?.organizationStructure?.projectBoard || {},
        projectManager: data?.organizationStructure?.projectManager || '',
        projectAssurance: data?.organizationStructure?.projectAssurance || {},
        teamManagers: this.extractArray(data?.organizationStructure?.teamManagers),
        projectSupport: data?.organizationStructure?.projectSupport || ''
      },

      // 6. Quality Management Approach
      qualityManagementApproach: {
        qualityMethod: data?.qualityManagementApproach?.qualityMethod || '',
        qualityStandards: this.extractArray(data?.qualityManagementApproach?.qualityStandards),
        qualityResponsibilities: data?.qualityManagementApproach?.qualityResponsibilities || '',
        qualityCriteria: this.extractArray(data?.qualityManagementApproach?.qualityCriteria),
        qualityRecords: this.extractArray(data?.qualityManagementApproach?.qualityRecords)
      },

      // 7. Configuration Management Approach
      configurationManagementApproach: {
        purpose: data?.configurationManagementApproach?.purpose || '',
        procedure: data?.configurationManagementApproach?.procedure || '',
        toolsAndTechniques: this.extractArray(data?.configurationManagementApproach?.toolsAndTechniques),
        issueAndChangeControl: data?.configurationManagementApproach?.issueAndChangeControl || ''
      },

      // 8. Risk Management Approach
      riskManagementApproach: {
        procedure: data?.riskManagementApproach?.procedure || '',
        timingOfRiskManagementActivities: data?.riskManagementApproach?.timingOfRiskManagementActivities || '',
        toolsAndTechniques: this.extractArray(data?.riskManagementApproach?.toolsAndTechniques),
        reporting: data?.riskManagementApproach?.reporting || '',
        rolesAndResponsibilities: data?.riskManagementApproach?.rolesAndResponsibilities || [],
        riskTolerances: data?.riskManagementApproach?.riskTolerances || {},
        riskCategories: this.extractArray(data?.riskManagementApproach?.riskCategories),
        riskRegisterFormat: data?.riskManagementApproach?.riskRegisterFormat || ''
      },

      // 9. Communication Management Approach
      communicationManagementApproach: {
        procedure: data?.communicationManagementApproach?.procedure || '',
        toolsAndTechniques: this.extractArray(data?.communicationManagementApproach?.toolsAndTechniques),
        reporting: data?.communicationManagementApproach?.reporting || '',
        stakeholderAnalysis: data?.communicationManagementApproach?.stakeholderAnalysis || [],
        rolesAndResponsibilities: data?.communicationManagementApproach?.rolesAndResponsibilities || '',
        methods: this.extractArray(data?.communicationManagementApproach?.methods),
        frequency: data?.communicationManagementApproach?.frequency || ''
      },

      // 10. Project Plan
      projectPlan: {
        stages: data?.projectPlan?.stages || [],
        milestones: data?.projectPlan?.milestones || [],
        schedule: data?.projectPlan?.schedule || '',
        dependencies: data?.projectPlan?.dependencies || [],
        resources: data?.projectPlan?.resources || {},
        budget: data?.projectPlan?.budget || {}
      },

      // 11. Project Controls
      projectControls: {
        stages: data?.projectControls?.stages || [],
        tolerances: data?.projectControls?.tolerances || {},
        reportingArrangements: data?.projectControls?.reportingArrangements || ''
      },

      // 12. Tailoring
      tailoring: {
        approach: data?.tailoring?.approach || '',
        justification: data?.tailoring?.justification || ''
      }
    }
  }

  /**
   * Generate executive summary from available data
   */
  private generateExecutiveSummary(data: any): string {
    const objectives = this.extractArray(data?.projectDefinition?.objectives || data?.objectives)
    const deliverables = this.extractArray(data?.projectDefinition?.deliverables || data?.deliverables)
    
    if (objectives.length === 0 && deliverables.length === 0) {
      return 'This document outlines the project initiation details for ' + this.metadata.projectName + '.'
    }

    let summary = `The ${this.metadata.projectName} project aims to deliver key business value through strategic initiatives. `
    
    if (objectives.length > 0) {
      summary += `Key objectives include ${objectives.slice(0, 2).join(' and ')}. `
    }
    
    if (deliverables.length > 0) {
      summary += `Major deliverables encompass ${deliverables.slice(0, 2).map(d => 
        typeof d === 'string' ? d : d.name
      ).join(' and ')}.`
    }

    return summary
  }

  /**
   * Generate semantic HTML
   */
  public generateHTML(): string {
    const sections: string[] = []

    // Cover page (if not white label)
    if (!this.options.whiteLabel) {
      sections.push(this.generateCoverPage())
    }

    // Table of Contents
    if (this.options.includeTableOfContents) {
      sections.push(this.generateTableOfContents())
    }

    // 1. Executive Summary
    if (this.data.executiveSummary) {
      sections.push(`
        <section class="document-section" id="executive-summary">
          <h2>1. Executive Summary</h2>
          <p>${this.data.executiveSummary}</p>
        </section>
      `)
    }

    // 2. Project Background
    if (this.data.projectBackground) {
      sections.push(`
        <section class="document-section" id="project-background">
          <h2>2. Project Background</h2>
          <p>${this.data.projectBackground}</p>
        </section>
      `)
    }

    // 3. Project Definition
    sections.push(this.generateProjectDefinitionSection())

    // 4. Business Case
    sections.push(this.generateBusinessCaseSection())

    // 5. Organization Structure
    sections.push(this.generateOrganizationSection())

    // 6. Quality Management
    sections.push(this.generateQualitySection())

    // 7. Configuration Management
    sections.push(this.generateConfigurationSection())

    // 8. Risk Management
    sections.push(this.generateRiskSection())

    // 9. Communication Management
    sections.push(this.generateCommunicationSection())

    // 10. Project Plan
    sections.push(this.generateProjectPlanSection())

    // 11. Project Controls
    sections.push(this.generateProjectControlsSection())

    // 12. Tailoring
    sections.push(this.generateTailoringSection())
    
    // Version History
    sections.push(this.generateVersionHistory())

    return `
      <div class="pid-document">
        ${sections.join('\n')}
      </div>
    `
  }

  /**
   * Generate cover page
   */
  private generateCoverPage(): string {
    const date = this.metadata.date || new Date().toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return `
      <div class="cover-page">
        <div class="cover-logo">
          <svg width="200" height="60" viewBox="0 0 200 60" preserveAspectRatio="xMidYMid meet">
            <text x="100" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#667eea" text-anchor="middle">
              Project Genie 🧞
            </text>
          </svg>
        </div>
        
        <h1 class="cover-title">Project Initiation Document</h1>
        <p class="cover-subtitle">${this.metadata.projectName}</p>
        
        <div class="cover-metadata">
          <p class="cover-metadata-item"><strong>Company:</strong> ${this.metadata.companyName}</p>
          <p class="cover-metadata-item"><strong>Date:</strong> ${date}</p>
          <p class="cover-metadata-item"><strong>Version:</strong> ${this.metadata.version}</p>
          ${this.metadata.author ? `<p class="cover-metadata-item"><strong>Generated by:</strong> ${this.metadata.author}</p>` : ''}
        </div>
      </div>
    `
  }

  protected generateTableOfContents(): string {
    return `
      <nav class="table-of-contents">
        <h2>Table of Contents</h2>
        <ol>
          <li><a href="#executive-summary">Executive Summary</a></li>
          <li><a href="#project-background">Project Background</a></li>
          <li><a href="#project-definition">Project Definition</a></li>
          <li><a href="#business-case">Business Case</a></li>
          <li><a href="#organization-structure">Organization Structure</a></li>
          <li><a href="#quality-management">Quality Management Approach</a></li>
          <li><a href="#configuration-management">Configuration Management Approach</a></li>
          <li><a href="#risk-management">Risk Management Approach</a></li>
          <li><a href="#communication-management">Communication Management Approach</a></li>
          <li><a href="#project-plan">Project Plan</a></li>
          <li><a href="#project-controls">Project Controls</a></li>
          <li><a href="#tailoring">Tailoring</a></li>
        </ol>
      </nav>
    `
  }

  private generateProjectDefinitionSection(): string {
    const def = this.data.projectDefinition
    return `
      <section class="document-section" id="project-definition">
        <h2>3. Project Definition</h2>
        
        ${def.objectives?.length > 0 ? `
          <h3>3.1 Objectives</h3>
          <ul>
            ${def.objectives.map((obj: string) => `<li>${obj}</li>`).join('')}
          </ul>
        ` : ''}

        ${(def.scope?.inScope?.length > 0 || def.scope?.outOfScope?.length > 0) ? `
          <h3>3.2 Scope</h3>
          ${def.scope.inScope?.length > 0 ? `
            <h4>In Scope:</h4>
            <ul>
              ${def.scope.inScope.map((item: string) => `<li>${item}</li>`).join('')}
            </ul>
          ` : ''}
          ${def.scope.outOfScope?.length > 0 ? `
            <h4>Out of Scope:</h4>
            <ul>
              ${def.scope.outOfScope.map((item: string) => `<li>${item}</li>`).join('')}
            </ul>
          ` : ''}
        ` : ''}

        ${def.deliverables?.length > 0 ? `
          <h3>3.3 Deliverables</h3>
          <ul>
            ${def.deliverables.map((d: any) => 
              `<li>${typeof d === 'string' ? d : d.name || JSON.stringify(d)}</li>`
            ).join('')}
          </ul>
        ` : ''}

        ${def.constraints?.length > 0 ? `
          <h3>3.4 Constraints</h3>
          <ul>
            ${def.constraints.map((c: string) => `<li>${c}</li>`).join('')}
          </ul>
        ` : ''}

        ${def.assumptions?.length > 0 ? `
          <h3>3.5 Assumptions</h3>
          <ul>
            ${def.assumptions.map((a: string) => `<li>${a}</li>`).join('')}
          </ul>
        ` : ''}

        ${def.dependencies?.length > 0 ? `
          <h3>3.6 Dependencies</h3>
          <ul>
            ${def.dependencies.map((d: any) => 
              `<li>${typeof d === 'string' ? d : d.description || JSON.stringify(d)}</li>`
            ).join('')}
          </ul>
        ` : ''}

        ${def.interfaces?.length > 0 ? `
          <h3>3.7 Interfaces</h3>
          <ul>
            ${def.interfaces.map((i: string) => `<li>${i}</li>`).join('')}
          </ul>
        ` : ''}
      </section>
    `
  }

  private generateBusinessCaseSection(): string {
    const bc = this.data.businessCase
    return `
      <section class="document-section" id="business-case">
        <h2>4. Business Case</h2>
        
        ${bc.reasons ? `
          <h3>4.1 Reasons for the Project</h3>
          <p>${bc.reasons}</p>
        ` : ''}

        ${bc.businessOptions?.length > 0 ? `
          <h3>4.2 Business Options</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Option</th>
                <th>Description</th>
                <th>Benefits</th>
                <th>Costs</th>
                <th>Risks</th>
              </tr>
            </thead>
            <tbody>
              ${bc.businessOptions.map((opt: any) => `
                <tr>
                  <td><strong>${opt.option || opt}</strong></td>
                  <td>${opt.description || 'N/A'}</td>
                  <td>${opt.benefits || 'N/A'}</td>
                  <td>${opt.costs || 'N/A'}</td>
                  <td>${opt.risks || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${bc.expectedBenefits?.length > 0 ? `
          <h3>4.3 Expected Benefits</h3>
          <ul>
            ${bc.expectedBenefits.map((b: any) => 
              `<li>${typeof b === 'string' ? b : b.benefit || JSON.stringify(b)}</li>`
            ).join('')}
          </ul>
        ` : ''}

        ${bc.costs ? `
          <h3>4.4 Costs</h3>
          ${typeof bc.costs === 'object' ? `
            <table class="data-table">
              <tr><th>Type</th><th>Amount</th></tr>
              ${Object.entries(bc.costs).map(([key, value]) => 
                `<tr><td>${key}</td><td>${value}</td></tr>`
              ).join('')}
            </table>
          ` : `<p>${bc.costs}</p>`}
        ` : ''}

        ${bc.majorRisks?.length > 0 ? `
          <h3>4.5 Major Risks</h3>
          <ul>
            ${bc.majorRisks.map((r: string) => `<li>${r}</li>`).join('')}
          </ul>
        ` : ''}
      </section>
    `
  }

  private generateOrganizationSection(): string {
    const org = this.data.organizationStructure
    return `
      <section class="document-section" id="organization-structure">
        <h2>5. Organization Structure</h2>
        
        ${org.projectBoard ? `
          <h3>5.1 Project Board</h3>
          ${typeof org.projectBoard === 'object' ? `
            <ul>
              ${org.projectBoard.executive ? `<li><strong>Executive:</strong> ${org.projectBoard.executive}</li>` : ''}
              ${org.projectBoard.seniorUser ? `<li><strong>Senior User:</strong> ${org.projectBoard.seniorUser}</li>` : ''}
              ${org.projectBoard.seniorSupplier ? `<li><strong>Senior Supplier:</strong> ${org.projectBoard.seniorSupplier}</li>` : ''}
            </ul>
          ` : `<p>${org.projectBoard}</p>`}
        ` : ''}

        ${org.projectManager ? `
          <h3>5.2 Project Manager</h3>
          <p>${org.projectManager}</p>
        ` : ''}

        ${org.teamManagers?.length > 0 ? `
          <h3>5.3 Team Structure</h3>
          ${this.generateTeamStructureChart(org.teamManagers)}
          <table class="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Name</th>
                <th>Responsibilities</th>
              </tr>
            </thead>
            <tbody>
              ${org.teamManagers.map((tm: any) => {
                // Parse the team manager string if it contains name and role
                const tmString = typeof tm === 'string' ? tm : tm.name || tm
                const parts = tmString.split(' - ')
                const name = parts[0] || tmString
                const role = parts[1] || 'Team Manager'
                
                return `
                  <tr>
                    <td><strong>${role}</strong></td>
                    <td>${name}</td>
                    <td>Responsible for ${role.toLowerCase()} activities and deliverables</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        ` : ''}

        ${org.projectAssurance ? `
          <h3>5.4 Project Assurance</h3>
          ${typeof org.projectAssurance === 'object' ? `
            <ul>
              ${Object.entries(org.projectAssurance).map(([key, value]) => 
                `<li><strong>${key}:</strong> ${value}</li>`
              ).join('')}
            </ul>
          ` : `<p>${org.projectAssurance}</p>`}
        ` : ''}
      </section>
    `
  }

  private generateTeamStructureChart(teamManagers: any[]): string {
    if (!this.options.includeCharts) return ''
    
    return this.createMermaidChart('graph', `
graph TD
    PB[Project Board]
    PM[Project Manager]
    PB --> PM
    ${teamManagers.map((tm, i) => `
    PM --> TM${i}["${tm}"]`).join('')}
    `)
  }

  private generateQualitySection(): string {
    const qm = this.data.qualityManagementApproach
    return `
      <section class="document-section" id="quality-management">
        <h2>6. Quality Management Approach</h2>
        
        ${qm.qualityMethod ? `
          <h3>6.1 Quality Method</h3>
          <p>${qm.qualityMethod}</p>
        ` : ''}

        ${qm.qualityStandards?.length > 0 ? `
          <h3>6.2 Quality Standards</h3>
          <ul>
            ${qm.qualityStandards.map((s: string) => `<li>${s}</li>`).join('')}
          </ul>
        ` : ''}

        ${qm.qualityCriteria?.length > 0 ? `
          <h3>6.3 Quality Criteria</h3>
          <ul>
            ${qm.qualityCriteria.map((c: string) => `<li>${c}</li>`).join('')}
          </ul>
        ` : ''}

        ${qm.qualityResponsibilities ? `
          <h3>6.4 Quality Responsibilities</h3>
          <p>${qm.qualityResponsibilities}</p>
        ` : ''}
      </section>
    `
  }

  private generateConfigurationSection(): string {
    const cm = this.data.configurationManagementApproach
    return `
      <section class="document-section" id="configuration-management">
        <h2>7. Configuration Management Approach</h2>
        
        ${cm.purpose ? `
          <h3>7.1 Purpose</h3>
          <p>${cm.purpose}</p>
        ` : ''}

        ${cm.procedure ? `
          <h3>7.2 Procedure</h3>
          <p>${cm.procedure}</p>
        ` : ''}

        ${cm.toolsAndTechniques?.length > 0 ? `
          <h3>7.3 Tools and Techniques</h3>
          <ul>
            ${cm.toolsAndTechniques.map((t: string) => `<li>${t}</li>`).join('')}
          </ul>
        ` : ''}

        ${cm.issueAndChangeControl ? `
          <h3>7.4 Issue and Change Control</h3>
          <p>${cm.issueAndChangeControl}</p>
        ` : ''}
      </section>
    `
  }

  private generateRiskSection(): string {
    const rm = this.data.riskManagementApproach
    return `
      <section class="document-section" id="risk-management">
        <h2>8. Risk Management Approach</h2>
        
        ${rm.procedure ? `
          <h3>8.1 Risk Management Procedure</h3>
          <p>${rm.procedure}</p>
        ` : ''}

        ${rm.riskCategories?.length > 0 ? `
          <h3>8.2 Risk Categories</h3>
          <ul>
            ${rm.riskCategories.map((c: string) => `<li>${c}</li>`).join('')}
          </ul>
        ` : ''}

        ${rm.riskTolerances ? `
          <h3>8.3 Risk Tolerances</h3>
          ${typeof rm.riskTolerances === 'object' ? `
            <ul>
              ${Object.entries(rm.riskTolerances).map(([key, value]) => 
                `<li><strong>${key}:</strong> ${value}</li>`
              ).join('')}
            </ul>
          ` : `<p>${rm.riskTolerances}</p>`}
        ` : ''}

        ${rm.toolsAndTechniques?.length > 0 ? `
          <h3>8.4 Tools and Techniques</h3>
          <ul>
            ${rm.toolsAndTechniques.map((t: string) => `<li>${t}</li>`).join('')}
          </ul>
        ` : ''}
      </section>
    `
  }

  private generateCommunicationSection(): string {
    const cm = this.data.communicationManagementApproach
    return `
      <section class="document-section" id="communication-management">
        <h2>9. Communication Management Approach</h2>
        
        ${cm.procedure ? `
          <h3>9.1 Communication Procedure</h3>
          <p>${cm.procedure}</p>
        ` : ''}

        ${cm.methods?.length > 0 ? `
          <h3>9.2 Communication Methods</h3>
          <ul>
            ${cm.methods.map((m: string) => `<li>${m}</li>`).join('')}
          </ul>
        ` : ''}

        ${cm.frequency ? `
          <h3>9.3 Communication Frequency</h3>
          <p>${cm.frequency}</p>
        ` : ''}

        ${cm.stakeholderAnalysis?.length > 0 ? `
          <h3>9.4 Stakeholder Analysis</h3>
          <table class="data-table">
            <tr>
              <th>Stakeholder</th>
              <th>Interest</th>
              <th>Influence</th>
              <th>Communication</th>
            </tr>
            ${cm.stakeholderAnalysis.map((s: any) => `
              <tr>
                <td>${s.stakeholder || s.name || ''}</td>
                <td>${s.interest || ''}</td>
                <td>${s.influence || ''}</td>
                <td>${s.communicationMethod || s.frequency || ''}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
      </section>
    `
  }

  private generateProjectPlanSection(): string {
    const pp = this.data.projectPlan
    return `
      <section class="document-section" id="project-plan">
        <h2>10. Project Plan</h2>
        
        ${pp.stages?.length > 0 ? `
          <h3>10.1 Project Stages</h3>
          ${this.generateProjectTimeline(pp.stages)}
          <table class="data-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Objectives</th>
                <th>Deliverables</th>
              </tr>
            </thead>
            <tbody>
              ${pp.stages.map((stage: any, index: number) => `
                <tr>
                  <td><strong>Stage ${index + 1}: ${stage.name || stage}</strong></td>
                  <td>${stage.startDate || 'TBD'}</td>
                  <td>${stage.endDate || 'TBD'}</td>
                  <td>
                    ${stage.objectives?.length > 0 ? `
                      <ul>
                        ${stage.objectives.map((o: string) => `<li>${o}</li>`).join('')}
                      </ul>
                    ` : 'To be defined'}
                  </td>
                  <td>
                    ${stage.deliverables?.length > 0 ? `
                      <ul>
                        ${stage.deliverables.map((d: string) => `<li>${d}</li>`).join('')}
                      </ul>
                    ` : 'To be defined'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${pp.milestones?.length > 0 ? `
          <h3>10.2 Milestones</h3>
          ${this.generateMilestoneChart(pp.milestones)}
          <table class="data-table">
            <tr>
              <th>Milestone</th>
              <th>Date</th>
              <th>Criteria</th>
            </tr>
            ${pp.milestones.map((m: any) => `
              <tr>
                <td>${m.name || m}</td>
                <td>${m.date || ''}</td>
                <td>${m.criteria || ''}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}

        ${pp.schedule ? `
          <h3>10.3 Schedule</h3>
          <p>${pp.schedule}</p>
        ` : ''}
      </section>
    `
  }

  private generateProjectTimeline(stages: any[]): string {
    if (!this.options.includeCharts || stages.length === 0) return ''
    
    const timelineData = stages.map((stage, index) => {
      const name = stage.name || stage
      const date = stage.startDate || `Month ${index + 1}`
      return `    Stage${index} : ${date} : ${name}`
    }).join('\n')
    
    return this.createMermaidChart('timeline', `
timeline
    title Project Timeline
${timelineData}
    `)
  }

  private generateMilestoneChart(milestones: any[]): string {
    if (!this.options.includeCharts || milestones.length === 0) return ''
    
    const today = new Date()
    const ganttData = milestones.map((m, i) => {
      const name = m.name || m
      const date = m.date || `${today.getFullYear()}-${String(today.getMonth() + i + 1).padStart(2, '0')}-01`
      return `    ${name} :milestone, m${i}, ${date}, 0d`
    }).join('\n')
    
    return this.createMermaidChart('gantt', `
gantt
    title Project Milestones
    dateFormat YYYY-MM-DD
    section Milestones
${ganttData}
    `)
  }

  private generateProjectControlsSection(): string {
    const pc = this.data.projectControls
    return `
      <section class="document-section" id="project-controls">
        <h2>11. Project Controls</h2>
        
        ${pc.stages?.length > 0 ? `
          <h3>11.1 Control Stages</h3>
          <ul>
            ${pc.stages.map((s: string) => `<li>${s}</li>`).join('')}
          </ul>
        ` : ''}

        ${pc.tolerances ? `
          <h3>11.2 Tolerances</h3>
          ${typeof pc.tolerances === 'object' ? `
            <ul>
              ${Object.entries(pc.tolerances).map(([key, value]) => 
                `<li><strong>${key}:</strong> ${value}</li>`
              ).join('')}
            </ul>
          ` : `<p>${pc.tolerances}</p>`}
        ` : ''}

        ${pc.reportingArrangements ? `
          <h3>11.3 Reporting Arrangements</h3>
          <p>${pc.reportingArrangements}</p>
        ` : ''}
      </section>
    `
  }

  private generateTailoringSection(): string {
    const t = this.data.tailoring
    return `
      <section class="document-section" id="tailoring">
        <h2>12. Tailoring</h2>
        
        ${t.approach ? `
          <h3>12.1 Tailoring Approach</h3>
          <p>${t.approach}</p>
        ` : ''}

        ${t.justification ? `
          <h3>12.2 Tailoring Justification</h3>
          <p>${t.justification}</p>
        ` : ''}
      </section>
    `
  }

  private generateVersionHistory(): string {
    const currentDate = this.metadata.date || new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    
    return `
      <section class="document-section page-break-before" id="version-history">
        <h2>Document Version History</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Date</th>
              <th>Author</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${this.metadata.version || '1.0'}</td>
              <td>${currentDate}</td>
              <td>${this.metadata.author || 'User'}</td>
              <td>Initial document generation</td>
            </tr>
          </tbody>
        </table>
      </section>
    `
  }
}

export interface PIDMetadata extends DocumentMetadata {}