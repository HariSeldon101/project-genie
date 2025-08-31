import { Prince2PID } from '../schemas/prince2-pid'

/**
 * PIDFormatter class - generates rich Markdown for document viewer
 * Produces formatted output with emojis, tables, and visual elements
 */
export class PIDFormatter {
  private data: Prince2PID
  private projectName: string
  private companyName: string
  private version: string
  private date: string

  constructor(
    data: Prince2PID,
    metadata: {
      projectName: string
      companyName?: string
      version?: string
      date?: string
    }
  ) {
    this.data = this.ensureDataStructure(data)
    this.projectName = metadata.projectName
    this.companyName = metadata.companyName || 'Your Company'
    this.version = metadata.version || '1.0'
    this.date = metadata.date || new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  private ensureDataStructure(data: any): Prince2PID {
    // Ensure all sections have proper structure
    return {
      executiveSummary: data.executiveSummary || data.executive_summary || '',
      projectBackground: data.projectBackground || data.project_background || data.background || '',
      projectDefinition: data.projectDefinition || data.project_definition || {},
      businessCase: data.businessCase || data.business_case || {},
      organizationStructure: data.organizationStructure || data.organization_structure || {},
      qualityManagementApproach: data.qualityManagementApproach || data.quality_management_approach || {},
      configurationManagementApproach: data.configurationManagementApproach || data.configuration_management_approach || {},
      riskManagementApproach: data.riskManagementApproach || data.risk_management_approach || {},
      communicationManagementApproach: data.communicationManagementApproach || data.communication_management_approach || {},
      projectPlan: data.projectPlan || data.project_plan || {},
      projectControls: data.projectControls || data.project_controls || {},
      tailoring: data.tailoring || {}
    }
  }

  public format(): string {
    // Generate rich Markdown directly with emojis and formatting
    const sections = [
      this.generateHeader(),
      this.generateTableOfContents(),
      this.generateExecutiveSummary(),
      this.generateProjectBackground(),
      this.generateProjectDefinition(),
      this.generateBusinessCase(),
      this.generateOrganizationStructure(),
      this.generateQualityManagement(),
      this.generateConfigurationManagement(),
      this.generateRiskManagement(),
      this.generateCommunicationManagement(),
      this.generateProjectPlan(),
      this.generateProjectControls(),
      this.generateTailoring(),
      this.generateApprovalSection()
    ]
    
    return sections.filter(Boolean).join('\n\n')
  }

  private generateHeader(): string {
    return `# 📋 PROJECT INITIATION DOCUMENTATION (PID)

## ${this.projectName}
### ${this.companyName}

<div style="background: linear-gradient(135deg, #b3b9f2 0%, #c5a0d4 100%); color: #333; padding: 20px; border-radius: 10px; margin: 20px 0;">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div>
      <p style="margin: 5px 0;"><strong>📅 Version:</strong> ${this.version}</p>
      <p style="margin: 5px 0;"><strong>📆 Date:</strong> ${this.date}</p>
    </div>
    <div style="text-align: right;">
      <p style="margin: 5px 0; font-size: 1.2em;">✅ <strong>PRINCE2 Compliant</strong></p>
      <p style="margin: 5px 0;">📊 Status: <strong>DRAFT</strong></p>
    </div>
  </div>
</div>

---`
  }

  private generateTableOfContents(): string {
    return `## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Background](#2-project-background)
3. [Project Definition](#3-project-definition)
   - 3.1 [Objectives](#31-objectives)
   - 3.2 [Scope](#32-scope)
   - 3.3 [Deliverables](#33-deliverables)
   - 3.4 [Constraints](#34-constraints)
   - 3.5 [Assumptions](#35-assumptions)
   - 3.6 [Dependencies](#36-dependencies)
   - 3.7 [Interfaces](#37-interfaces)
4. [Business Case](#4-business-case)
5. [Organization Structure](#5-organization-structure)
6. [Quality Management Approach](#6-quality-management-approach)
7. [Configuration Management Approach](#7-configuration-management-approach)
8. [Risk Management Approach](#8-risk-management-approach)
9. [Communication Management Approach](#9-communication-management-approach)
10. [Project Plan](#10-project-plan)
11. [Project Controls](#11-project-controls)
12. [Tailoring](#12-tailoring)

---`
  }

  private generateExecutiveSummary(): string {
    const summary = this.data.executiveSummary || 'Executive summary to be provided.'
    
    return `## 1. Executive Summary

<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 5px;">
  📝 ${summary}
</div>

### 🎯 Key Success Factors

${this.generateKeyMetrics()}`
  }

  private generateKeyMetrics(): string {
    const pd = this.data.projectDefinition
    const objectives = pd?.objectives || []
    const deliverables = pd?.deliverables || []
    
    return `| Metric | Value |
|--------|-------|
| **Objectives** | ${objectives.length} defined |
| **Deliverables** | ${deliverables.length} identified |
| **Risk Level** | ${this.assessRiskLevel()} |
| **Complexity** | ${this.assessComplexity()} |`
  }

  private assessRiskLevel(): string {
    const risks = this.data.businessCase?.majorRisks || []
    if (risks.length > 5) return '🔴 High'
    if (risks.length > 2) return '🟡 Medium'
    return '🟢 Low'
  }

  private assessComplexity(): string {
    const pd = this.data.projectDefinition
    const interfaceCount = pd?.interfaces?.length || 0
    const dependencyCount = pd?.dependencies?.length || 0
    const total = interfaceCount + dependencyCount
    
    if (total > 10) return '🔴 High'
    if (total > 5) return '🟡 Medium'
    return '🟢 Low'
  }

  private generateProjectBackground(): string {
    const background = this.data.projectBackground || 'Project background to be provided.'
    
    return `## 2. Project Background

${background}`
  }

  private generateProjectDefinition(): string {
    const pd = this.data.projectDefinition
    const sections = []
    
    sections.push(`## 3. Project Definition`)
    
    // Objectives
    if (pd?.objectives?.length > 0) {
      sections.push(`### 3.1 Objectives

${pd.objectives.map((obj: string) => `✅ ${obj}`).join('\n')}`)
    }
    
    // Scope
    if (pd?.scope) {
      const inScope = pd.scope.inScope || pd.scope.included || []
      const outScope = pd.scope.outScope || pd.scope.excluded || []
      
      sections.push(`### 3.2 Scope

#### ✅ In Scope

${Array.isArray(inScope) ? inScope.map((item: string) => `- ${item}`).join('\n') : inScope}

#### ❌ Out of Scope

${Array.isArray(outScope) ? outScope.map((item: string) => `- ${item}`).join('\n') : outScope}`)
    }
    
    // Deliverables
    if (pd?.deliverables?.length > 0) {
      sections.push(`### 3.3 Deliverables

${pd.deliverables.map((d: any) => {
        if (typeof d === 'string') return `📦 **${d}**`
        return `📦 **${d.name || d.deliverable}**${d.description ? `\n   - ${d.description}` : ''}`
      }).join('\n\n')}`)
    }
    
    // Constraints
    if (pd?.constraints?.length > 0) {
      sections.push(`### 3.4 Constraints

${pd.constraints.map((c: string) => `⚠️ ${c}`).join('\n')}`)
    }
    
    // Assumptions
    if (pd?.assumptions?.length > 0) {
      sections.push(`### 3.5 Assumptions

${pd.assumptions.map((a: string) => `📌 ${a}`).join('\n')}`)
    }
    
    // Dependencies
    if (pd?.dependencies?.length > 0) {
      sections.push(`### 3.6 Dependencies

${pd.dependencies.map((d: string) => `🔗 ${d}`).join('\n')}`)
    }
    
    // Interfaces
    if (pd?.interfaces?.length > 0) {
      sections.push(`### 3.7 Interfaces

${pd.interfaces.map((i: string) => `🔌 ${i}`).join('\n')}`)
    }
    
    return sections.join('\n\n')
  }

  private generateBusinessCase(): string {
    const bc = this.data.businessCase
    const sections = [`## 4. Business Case`]
    
    if (bc?.reasons) {
      sections.push(`### 4.1 Reasons for the Project\n\n${bc.reasons}`)
    }
    
    if (bc?.businessOptions?.length > 0) {
      sections.push(`### 4.2 Business Options\n\n${bc.businessOptions.map((opt: any, idx: number) => `
#### Option ${idx + 1}: ${opt.name || opt.option || 'Option'}

${opt.description || ''}

| Aspect | Details |
|--------|----------|
| **Benefits** | ${opt.benefits || 'TBD'} |
| **Costs** | ${opt.costs || 'TBD'} |
| **Risks** | ${opt.risks || 'TBD'} |
| **Recommendation** | ${opt.recommended ? '✅ Recommended' : '❌ Not recommended'} |
`).join('\n')}`)
    }
    
    if (bc?.expectedBenefits?.length > 0) {
      sections.push(`### 4.3 Expected Benefits\n\n${bc.expectedBenefits.map((b: string) => `✅ ${b}`).join('\n')}`)
    }
    
    if (bc?.costs) {
      sections.push(`### 4.4 Costs\n\n| Cost Type | Amount |
|-----------|--------|
${Object.entries(bc.costs).map(([key, value]) => `| **${this.formatKey(key)}** | ${value} |`).join('\n')}`)
    }
    
    if (bc?.majorRisks?.length > 0) {
      sections.push(`### 4.5 Major Risks\n\n${bc.majorRisks.map((r: string) => `🔴 ${r}`).join('\n')}`)
    }
    
    return sections.join('\n\n')
  }

  private generateOrganizationStructure(): string {
    const os = this.data.organizationStructure
    const sections = [`## 5. Organization Structure`]
    
    if (os?.projectBoard) {
      sections.push(`### 5.1 Project Board\n\n| Role | Name | Responsibilities |
|------|------|------------------|
${Object.entries(os.projectBoard).map(([role, name]) => `| **${this.formatKey(role)}** | ${name} | ${this.getRoleResponsibilities(role)} |`).join('\n')}`)
    }
    
    if (os?.projectManager) {
      sections.push(`### 5.2 Project Manager\n\n👤 **${os.projectManager}**`)
    }
    
    if (os?.teamManagers?.length > 0) {
      sections.push(`### 5.3 Team Managers\n\n${os.teamManagers.map((tm: string) => `- 👥 ${tm}`).join('\n')}`)
    }
    
    if (os?.projectAssurance) {
      sections.push(`### 5.4 Project Assurance\n\n${Object.entries(os.projectAssurance).map(([role, name]) => `- **${this.formatKey(role)}:** ${name}`).join('\n')}`)
    }
    
    return sections.join('\n\n')
  }

  private getRoleResponsibilities(role: string): string {
    const responsibilities: Record<string, string> = {
      executive: 'Ultimate accountability',
      seniorUser: 'User requirements',
      seniorSupplier: 'Supplier resources'
    }
    return responsibilities[role] || 'Key stakeholder'
  }

  private generateQualityManagement(): string {
    const qm = this.data.qualityManagementApproach
    return `## 6. Quality Management Approach

${this.formatApproachSection(qm, '📊')}`
  }

  private generateConfigurationManagement(): string {
    const cm = this.data.configurationManagementApproach
    return `## 7. Configuration Management Approach

${this.formatApproachSection(cm, '⚙️')}`
  }

  private generateRiskManagement(): string {
    const rm = this.data.riskManagementApproach
    return `## 8. Risk Management Approach

${this.formatApproachSection(rm, '⚠️')}`
  }

  private generateCommunicationManagement(): string {
    const cm = this.data.communicationManagementApproach
    const sections = [`## 9. Communication Management Approach`]
    
    if (cm?.procedure) {
      sections.push(`### 9.1 Communication Procedure\n\n${cm.procedure}`)
    }
    
    if (cm?.methods?.length > 0) {
      sections.push(`### 9.2 Communication Methods\n\n${cm.methods.map((m: string) => `- 📧 ${m}`).join('\n')}`)
    }
    
    if (cm?.frequency) {
      sections.push(`### 9.3 Communication Frequency\n\n${cm.frequency}`)
    }
    
    if (cm?.stakeholderAnalysis?.length > 0) {
      sections.push(`### 9.4 Stakeholder Analysis\n\n| Stakeholder | Interest | Influence | Communication |
|-------------|----------|-----------|---------------|
${cm.stakeholderAnalysis.map((s: any) => `| ${s.stakeholder || s.name} | ${this.getLevelIcon(s.interest)} ${s.interest} | ${this.getLevelIcon(s.influence)} ${s.influence} | ${s.communicationMethod || s.frequency} |`).join('\n')}`)
    }
    
    return sections.join('\n\n')
  }

  private getLevelIcon(level: string): string {
    const lowerLevel = (level || '').toLowerCase()
    if (lowerLevel.includes('high')) return '🔴'
    if (lowerLevel.includes('medium')) return '🟡'
    if (lowerLevel.includes('low')) return '🟢'
    return '⚪'
  }

  private generateProjectPlan(): string {
    const pp = this.data.projectPlan
    const sections = [`## 10. Project Plan`]
    
    if (pp?.stages?.length > 0) {
      sections.push(`### 10.1 Project Stages\n\n${pp.stages.map((stage: any, idx: number) => `
<div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 5px;">

#### Stage ${idx + 1}: ${stage.name || stage}

${stage.startDate ? `📅 **Start:** ${stage.startDate}  ` : ''}
${stage.endDate ? `📅 **End:** ${stage.endDate}` : ''}

${stage.objectives?.length > 0 ? `**Objectives:**\n${stage.objectives.map((o: string) => `- ${o}`).join('\n')}` : ''}

${stage.deliverables?.length > 0 ? `**Deliverables:**\n${stage.deliverables.map((d: string) => `- ${d}`).join('\n')}` : ''}

</div>`).join('\n')}`)
    }
    
    if (pp?.milestones?.length > 0) {
      sections.push(`### 10.2 Milestones\n\n| Milestone | Date | Success Criteria |
|-----------|------|------------------|
${pp.milestones.map((m: any) => `| 🎯 ${m.name || m.milestone} | ${m.date} | ${m.criteria || 'TBD'} |`).join('\n')}`)
    }
    
    if (pp?.schedule) {
      sections.push(`### 10.3 Schedule\n\n${pp.schedule}`)
    }
    
    return sections.join('\n\n')
  }

  private generateProjectControls(): string {
    const pc = this.data.projectControls
    const sections = [`## 11. Project Controls`]
    
    if (pc?.stages?.length > 0) {
      sections.push(`### 11.1 Control Stages\n\n${pc.stages.map((s: string) => `- 🎯 ${s}`).join('\n')}`)
    }
    
    if (pc?.tolerances) {
      sections.push(`### 11.2 Tolerances\n\n| Tolerance Type | Limit |
|----------------|-------|
${Object.entries(pc.tolerances).map(([key, value]) => `| **${this.formatKey(key)}** | ${value} |`).join('\n')}`)
    }
    
    if (pc?.reportingArrangements) {
      sections.push(`### 11.3 Reporting Arrangements\n\n${pc.reportingArrangements}`)
    }
    
    return sections.join('\n\n')
  }

  private generateTailoring(): string {
    const t = this.data.tailoring
    const sections = [`## 12. Tailoring`]
    
    if (t?.approach) {
      sections.push(`### 12.1 Tailoring Approach\n\n${t.approach}`)
    }
    
    if (t?.justification) {
      sections.push(`### 12.2 Tailoring Justification\n\n${t.justification}`)
    }
    
    return sections.join('\n\n')
  }

  private formatApproachSection(approach: any, icon: string): string {
    if (!approach) return 'To be defined.'
    
    const sections = []
    
    if (approach.method || approach.procedure) {
      sections.push(`### ${icon} Method\n\n${approach.method || approach.procedure}`)
    }
    
    if (approach.standards?.length > 0) {
      sections.push(`### ${icon} Standards\n\n${approach.standards.map((s: string) => `- ${s}`).join('\n')}`)
    }
    
    if (approach.techniques?.length > 0 || approach.tools?.length > 0) {
      const items = [...(approach.techniques || []), ...(approach.tools || [])]
      sections.push(`### ${icon} Tools and Techniques\n\n${items.map((t: string) => `- ${t}`).join('\n')}`)
    }
    
    if (approach.responsibilities) {
      sections.push(`### ${icon} Responsibilities\n\n${approach.responsibilities}`)
    }
    
    return sections.join('\n\n') || 'To be defined.'
  }

  private formatKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
  }

  private generateApprovalSection(): string {
    return `---

## Document Approval

<div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin: 20px 0;">

### ✍️ This Project Initiation Documentation has been reviewed and approved by:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Executive** | ___________________ | ___________________ | ___/___/______ |
| **Senior User** | ___________________ | ___________________ | ___/___/______ |
| **Senior Supplier** | ___________________ | ___________________ | ___/___/______ |
| **Project Manager** | ___________________ | ___________________ | ___/___/______ |

</div>

### 📄 Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| ${this.version} | ${this.date} | Project Manager | Initial version - Ready for approval |

---

<div align="center" style="margin-top: 40px; padding: 20px; background: linear-gradient(135deg, #b3b9f2 0%, #c5a0d4 100%); color: #333; border-radius: 10px;">

### ${this.companyName}

*This document is confidential and proprietary*

**Classification:** 🔒 Confidential  
**Distribution:** Project Board Members Only  
**© ${new Date().getFullYear()} ${this.companyName}. All rights reserved.**

</div>`
  }
}

/**
 * Format PID data to Markdown
 * Uses UnifiedPIDFormatter for consistent structure
 */
export function formatPID(
  data: Prince2PID,
  metadata: {
    projectName: string
    companyName?: string
    version?: string
    date?: string
  }
): string {
  const formatter = new PIDFormatter(data, metadata)
  return formatter.format()
}