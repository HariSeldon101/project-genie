import { Prince2PID } from '../schemas/prince2-pid'

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
    this.data = data
    this.projectName = metadata.projectName
    this.companyName = metadata.companyName || 'Your Company'
    this.version = metadata.version || '1.0'
    this.date = metadata.date || new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  public format(): string {
    return `
${this.generateHeader()}
${this.generateTableOfContents()}
${this.generateExecutiveSummary()}
${this.generateProjectDefinition()}
${this.generateBusinessCase()}
${this.generateOrganizationStructure()}
${this.generateQualityManagement()}
${this.generateConfigurationManagement()}
${this.generateRiskManagement()}
${this.generateCommunicationManagement()}
${this.generateProjectPlan()}
${this.generateProjectControls()}
${this.generateTailoring()}
${this.generateApprovalSection()}
${this.generateFooter()}
`.trim()
  }

  private generateHeader(): string {
    return `
<div align="center">
  
# PROJECT INITIATION DOCUMENTATION (PID)

## ${this.projectName}

### ${this.companyName}

---

**Version:** ${this.version}  
**Date:** ${this.date}  
**Status:** Draft  
**Classification:** Confidential

---

<img src="/logo.png" alt="${this.companyName} Logo" width="200" />

</div>

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateTableOfContents(): string {
    return `
## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Definition](#project-definition)
   - 2.1 [Background](#background)
   - 2.2 [Project Objectives](#project-objectives)
   - 2.3 [Scope and Exclusions](#scope-and-exclusions)
   - 2.4 [Constraints and Assumptions](#constraints-and-assumptions)
   - 2.5 [Deliverables](#deliverables)
   - 2.6 [Interfaces](#interfaces)
3. [Business Case](#business-case)
   - 3.1 [Reasons for the Project](#reasons-for-the-project)
   - 3.2 [Business Options](#business-options)
   - 3.3 [Expected Benefits](#expected-benefits)
   - 3.4 [Expected Dis-benefits](#expected-dis-benefits)
   - 3.5 [Costs](#costs)
   - 3.6 [Investment Appraisal](#investment-appraisal)
4. [Project Organization Structure](#project-organization-structure)
   - 4.1 [Project Board](#project-board)
   - 4.2 [Project Management Team](#project-management-team)
   - 4.3 [Project Assurance](#project-assurance)
5. [Quality Management Approach](#quality-management-approach)
6. [Configuration Management Approach](#configuration-management-approach)
7. [Risk Management Approach](#risk-management-approach)
8. [Communication Management Approach](#communication-management-approach)
9. [Project Plan](#project-plan)
10. [Project Controls](#project-controls)
11. [Tailoring](#tailoring)
12. [Approval](#approval)

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateExecutiveSummary(): string {
    return `
## Executive Summary

This Project Initiation Documentation (PID) defines the ${this.projectName} project and forms the contract between the Project Board and the Project Manager. It provides the baseline against which the Project Board and Project Manager can monitor progress, assess issues and risks, and make decisions about the project's continuation.

The project aims to deliver the following key outcomes:
${this.data.projectDefinition.desiredOutcomes.map(outcome => `- ${outcome}`).join('\n')}

The total estimated cost is **${this.data.businessCase.costs.total}** with an expected ROI of **${this.data.businessCase.investmentAppraisal.roi}** and a payback period of **${this.data.businessCase.investmentAppraisal.paybackPeriod}**.

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateProjectDefinition(): string {
    const { projectDefinition } = this.data
    
    return `
## 1. Project Definition

### 1.1 Background

${projectDefinition.background}

### 1.2 Project Objectives

The project has the following SMART objectives:

${projectDefinition.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**Desired Outcomes:**
${projectDefinition.desiredOutcomes.map(outcome => `- ${outcome}`).join('\n')}

### 1.3 Scope and Exclusions

#### In Scope
${projectDefinition.scope.included.map(item => `- ✅ ${item}`).join('\n')}

#### Out of Scope
${projectDefinition.scope.excluded.map(item => `- ❌ ${item}`).join('\n')}

### 1.4 Constraints and Assumptions

#### Constraints
${projectDefinition.constraints.map(constraint => `- ${constraint}`).join('\n')}

#### Assumptions
${projectDefinition.assumptions.map(assumption => `- ${assumption}`).join('\n')}

### 1.5 Deliverables

| Deliverable | Description | Quality Criteria |
|------------|-------------|------------------|
${projectDefinition.deliverables.map(d => 
  `| **${d.name}** | ${d.description} | ${d.qualityCriteria.join(', ')} |`
).join('\n')}

### 1.6 Interfaces

The project will interface with the following systems/projects:
${projectDefinition.interfaces.map(iface => `- ${iface}`).join('\n')}

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateBusinessCase(): string {
    const { businessCase } = this.data
    
    return `
## 2. Business Case

### 2.1 Reasons for the Project

${businessCase.reasons}

### 2.2 Business Options

The following options have been considered:

${(businessCase.businessOptions || businessCase.options || []).map((option, i) => `
#### Option ${i + 1}: ${option.option}

**Description:** ${option.description}

| Aspect | Details |
|--------|---------|
| **Costs** | ${option.costs} |
| **Benefits** | ${option.benefits} |
| **Risks** | ${option.risks} |
`).join('\n')}

### 2.3 Expected Benefits

| Benefit | Measurable | Measurement | Baseline | Target |
|---------|------------|-------------|----------|--------|
${businessCase.expectedBenefits.map(b => 
  `| ${b.benefit} | ${b.measurable ? '✅' : '❌'} | ${b.measurement || 'N/A'} | ${b.baseline || 'N/A'} | ${b.target || 'N/A'} |`
).join('\n')}

### 2.4 Expected Dis-benefits

The following dis-benefits have been identified:
${(businessCase.expectedDisBenefits || businessCase.expectedDisbenefits || []).map(db => `- ⚠️ ${typeof db === 'string' ? db : db.disbenefit || db.description || JSON.stringify(db)}`).join('\n')}

### 2.5 Timescale

${businessCase.timescale}

### 2.6 Costs

| Cost Category | Amount |
|--------------|--------|
| **Development** | ${businessCase.costs.development} |
| **Operational** | ${businessCase.costs.operational} |
| **Maintenance** | ${businessCase.costs.maintenance} |
| **TOTAL** | **${businessCase.costs.total}** |

### 2.7 Investment Appraisal

| Metric | Value |
|--------|-------|
| **Return on Investment (ROI)** | ${businessCase.investmentAppraisal.roi} |
| **Payback Period** | ${businessCase.investmentAppraisal.paybackPeriod} |
| **Net Present Value (NPV)** | ${businessCase.investmentAppraisal.npv || 'To be calculated'} |

### 2.8 Major Risks

The following major risks could impact the business case:
${(businessCase.majorRisks || []).map((risk, i) => `${i + 1}. ${risk}`).join('\n')}

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateOrganizationStructure(): string {
    const { organizationStructure } = this.data
    
    return `
## 3. Project Organization Structure

### 3.1 Project Board

| Role | Name/Placeholder | Key Responsibilities |
|------|-----------------|---------------------|
| **Executive** | ${organizationStructure.projectBoard.executive} | • Ultimate accountability for project success<br>• Owns the Business Case<br>• Chairs Project Board |
| **Senior User** | ${organizationStructure.projectBoard.seniorUser} | • Represents user interests<br>• Ensures user requirements are met<br>• Commits user resources |
| **Senior Supplier** | ${organizationStructure.projectBoard.seniorSupplier} | • Represents supplier interests<br>• Ensures technical feasibility<br>• Provides supplier resources |

### 3.2 Project Management Team

**Project Manager:** ${organizationStructure.projectManager}
- Day-to-day management of the project
- Planning and monitoring
- Risk and issue management
- Reporting to Project Board

${organizationStructure.teamManagers ? `
**Team Managers:**
${organizationStructure.teamManagers.map(tm => `- ${tm}`).join('\n')}
` : ''}

${organizationStructure.projectSupport ? `
**Project Support:** ${organizationStructure.projectSupport}
- Administrative support
- Configuration management
- Specialist tools and techniques
` : ''}

### 3.3 Project Assurance

| Role | Responsibilities |
|------|-----------------|
${Array.isArray(organizationStructure.projectAssurance) 
  ? organizationStructure.projectAssurance.map(pa => 
      `| **${pa.role}** | ${Array.isArray(pa.responsibilities) ? pa.responsibilities.join('<br>') : pa.responsibilities} |`
    ).join('\n')
  : Object.entries(organizationStructure.projectAssurance || {}).map(([key, value]) =>
      `| **${key.charAt(0).toUpperCase() + key.slice(1)} Assurance** | ${value} |`
    ).join('\n')
}

### Organization Chart

\`\`\`mermaid
graph TD
    PB[Project Board]
    EX[Executive]
    SU[Senior User]
    SS[Senior Supplier]
    PM[Project Manager]
    PS[Project Support]
    TM[Team Managers]
    PA[Project Assurance]
    
    PB --> EX
    PB --> SU
    PB --> SS
    EX --> PM
    PM --> PS
    PM --> TM
    PB --> PA
\`\`\`

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateQualityManagement(): string {
    const { qualityManagementApproach } = this.data
    
    return `
## 4. Quality Management Approach

### 4.1 Quality Standards

The project will adhere to the following quality standards:
${qualityManagementApproach.qualityStandards.map(std => `- ${std}`).join('\n')}

### 4.2 Quality Criteria

The following quality criteria will be applied:
${qualityManagementApproach.qualityCriteria.map(criteria => `- ${criteria}`).join('\n')}

### 4.3 Quality Method

${qualityManagementApproach.qualityMethod}

### 4.4 Quality Responsibilities

| Role | Quality Responsibilities |
|------|-------------------------|
${typeof qualityManagementApproach.qualityResponsibilities === 'string' 
  ? `| **Project Team** | ${qualityManagementApproach.qualityResponsibilities} |`
  : Array.isArray(qualityManagementApproach.qualityResponsibilities)
    ? qualityManagementApproach.qualityResponsibilities.map(qr => 
        `| **${qr.role}** | ${Array.isArray(qr.responsibilities) ? qr.responsibilities.join('<br>') : qr.responsibilities} |`
      ).join('\n')
    : '| **Team** | To be defined |'
}

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateConfigurationManagement(): string {
    const { configurationManagementApproach } = this.data
    
    return `
## 5. Configuration Management Approach

### 5.1 Purpose

${configurationManagementApproach.purpose}

### 5.2 Configuration Management Procedure

${configurationManagementApproach.procedure}

### 5.3 Issue and Change Control

${configurationManagementApproach.issueAndChangeControl}

### 5.4 Tools and Techniques

The following tools and techniques will be used:
${configurationManagementApproach.toolsAndTechniques.map(tool => `- ${tool}`).join('\n')}

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateRiskManagement(): string {
    const { riskManagementApproach } = this.data
    
    return `
## 6. Risk Management Approach

### 6.1 Risk Management Procedure

${riskManagementApproach.procedure}

### 6.2 Risk Tolerance

| Area | Tolerance Level |
|------|----------------|
| **Time** | ${riskManagementApproach.riskTolerance.time} |
| **Cost** | ${riskManagementApproach.riskTolerance.cost} |
| **Quality** | ${riskManagementApproach.riskTolerance.quality} |
| **Scope** | ${riskManagementApproach.riskTolerance.scope} |
| **Benefits** | ${riskManagementApproach.riskTolerance.benefits} |
| **Risk** | ${riskManagementApproach.riskTolerance.risk} |

### 6.3 Risk Categories

The following risk categories will be used:
${riskManagementApproach.riskCategories.map(cat => `- ${cat}`).join('\n')}

### 6.4 Risk Management Roles and Responsibilities

| Role | Responsibilities |
|------|-----------------|
${riskManagementApproach.rolesAndResponsibilities.map(rr => 
  `| **${rr.role}** | ${rr.responsibilities.join('<br>')} |`
).join('\n')}

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateCommunicationManagement(): string {
    const { communicationManagementApproach } = this.data
    
    // Ensure we have the required data structure
    if (!communicationManagementApproach) {
      return `
## 7. Communication Management Approach

*Communication management approach to be defined*
`
    }
    
    return `
## 7. Communication Management Approach

### 7.1 Communication Methods

| Method | Frequency | Audience | Purpose |
|--------|-----------|----------|---------|
${communicationManagementApproach.methods && Array.isArray(communicationManagementApproach.methods) 
  ? communicationManagementApproach.methods.map(m => 
      `| ${m.method || 'N/A'} | ${m.frequency || 'N/A'} | ${Array.isArray(m.audience) ? m.audience.join(', ') : 'N/A'} | ${m.purpose || 'N/A'} |`
    ).join('\n')
  : '| No methods defined | - | - | - |'}

### 7.2 Stakeholder Analysis

| Stakeholder | Interest | Influence | Communication Needs |
|------------|----------|-----------|-------------------|
${communicationManagementApproach.stakeholderAnalysis && Array.isArray(communicationManagementApproach.stakeholderAnalysis)
  ? communicationManagementApproach.stakeholderAnalysis.map(s => 
      `| ${s.stakeholder || 'Unknown'} | ${this.getStakeholderIcon(s.interest)} ${s.interest || 'N/A'} | ${this.getStakeholderIcon(s.influence)} ${s.influence || 'N/A'} | ${s.communicationNeeds || 'To be defined'} |`
    ).join('\n')
  : '| No stakeholders defined | - | - | - |'}

### Stakeholder Matrix

\`\`\`mermaid
quadrantChart
    title Stakeholder Power/Interest Grid
    x-axis Low Interest --> High Interest
    y-axis Low Influence --> High Influence
    quadrant-1 Manage Closely
    quadrant-2 Keep Satisfied
    quadrant-3 Monitor
    quadrant-4 Keep Informed
${this.generateStakeholderPoints()}
\`\`\`

<div style="page-break-after: always;"></div>
`.trim()
  }

  private getStakeholderIcon(level: string): string {
    switch(level) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return ''
    }
  }

  private generateStakeholderPoints(): string {
    // Generate points for the quadrant chart based on stakeholder analysis
    try {
      const { stakeholderAnalysis } = this.data.communicationManagementApproach
      if (!stakeholderAnalysis || !Array.isArray(stakeholderAnalysis)) {
        return ''
      }
      
      return stakeholderAnalysis.map(s => {
        const interestScore = s.interest === 'high' ? 0.8 : s.interest === 'medium' ? 0.5 : 0.2
        const influenceScore = s.influence === 'high' ? 0.8 : s.influence === 'medium' ? 0.5 : 0.2
        return `    "${s.stakeholder}": [${interestScore}, ${influenceScore}]`
      }).join('\n')
    } catch (error) {
      console.warn('Error generating stakeholder points:', error)
      return ''
    }
  }

  private generateProjectPlan(): string {
    const { projectPlan } = this.data
    
    return `
## 8. Project Plan

### 8.1 Project Stages

${projectPlan.stages.map((stage, i) => `
#### Stage ${i + 1}: ${stage.name}

**Duration:** ${stage.startDate} to ${stage.endDate}

**Objectives:**
${stage.objectives.map(obj => `- ${obj}`).join('\n')}

**Deliverables:**
${stage.deliverables.map(del => `- ${del}`).join('\n')}

**Tolerances:**
| Aspect | Tolerance |
|--------|-----------|
| Time | ${stage.tolerances.time} |
| Cost | ${stage.tolerances.cost} |
| Quality | ${stage.tolerances.quality} |
| Scope | ${stage.tolerances.scope} |
`).join('\n')}

### 8.2 Major Milestones

| Milestone | Date | Deliverables |
|-----------|------|--------------|
${projectPlan.milestones.map(m => 
  `| **${m.name}** | ${m.date} | ${m.deliverables.join(', ')} |`
).join('\n')}

### 8.3 Gantt Chart

\`\`\`mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    
    section Stages
${projectPlan.stages.map(stage => 
  `    ${stage.name} :${stage.startDate}, ${stage.endDate}`
).join('\n')}
\`\`\`

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateProjectControls(): string {
    const { projectControls } = this.data
    
    return `
## 9. Project Controls

### 9.1 Tolerances

#### Project Level Tolerances

| Aspect | Tolerance |
|--------|-----------|
| **Time** | ${projectControls.tolerances.project.time} |
| **Cost** | ${projectControls.tolerances.project.cost} |
| **Quality** | ${projectControls.tolerances.project.quality} |
| **Scope** | ${projectControls.tolerances.project.scope} |
| **Risk** | ${projectControls.tolerances.project.risk} |
| **Benefits** | ${projectControls.tolerances.project.benefits} |

#### Stage Level Tolerances

| Aspect | Tolerance |
|--------|-----------|
| **Time** | ${projectControls.tolerances.stage.time} |
| **Cost** | ${projectControls.tolerances.stage.cost} |

### 9.2 Reporting Arrangements

| Report | Frequency | Recipients |
|--------|-----------|------------|
${projectControls.reportingArrangements.map(r => 
  `| ${r.report} | ${r.frequency} | ${r.recipients.join(', ')} |`
).join('\n')}

### 9.3 Issue and Change Control

${projectControls.issueAndChangeControl}

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateTailoring(): string {
    const { tailoring } = this.data
    
    return `
## 10. Tailoring

### 10.1 Tailoring Approach

${tailoring.approach}

### 10.2 Justification

${tailoring.justification}

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateApprovalSection(): string {
    return `
## 11. Approval

This Project Initiation Documentation has been reviewed and approved by:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Executive** | ___________________ | ___________________ | ___/___/______ |
| **Senior User** | ___________________ | ___________________ | ___/___/______ |
| **Senior Supplier** | ___________________ | ___________________ | ___/___/______ |
| **Project Manager** | ___________________ | ___________________ | ___/___/______ |

### Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | ${this.date} | AI Generated | Initial draft |
| ${this.version} | ${this.date} | Project Manager | Ready for approval |

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateFooter(): string {
    return `
---

<div align="center">

**${this.companyName}**  
*This document is confidential and proprietary*

**Classification:** Confidential  
**Distribution:** Project Board Members Only  
**© ${new Date().getFullYear()} ${this.companyName}. All rights reserved.**

</div>
`.trim()
  }
}

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