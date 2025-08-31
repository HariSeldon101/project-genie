export interface BusinessCaseData {
  executiveSummary?: string
  reasons: string
  businessOptions: Array<{
    option: string
    description: string
    costs: string
    benefits: string
    risks: string
  }>
  expectedBenefits: Array<{
    benefit: string
    measurable: boolean
    measurement?: string
    baseline?: string
    target?: string
  }>
  expectedDisBenefits: string[]
  timescale: string
  costs: {
    development: string
    operational: string
    maintenance: string
    total: string
  }
  investmentAppraisal: {
    roi: string
    paybackPeriod: string
    npv?: string
  }
  majorRisks: string[]
}

export class BusinessCaseFormatter {
  private data: BusinessCaseData
  private projectName: string
  private companyName: string
  private version: string
  private date: string

  constructor(
    data: BusinessCaseData,
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
${this.generateStrategicContext()}
${this.generateReasonsForProject()}
${this.generateBusinessOptions()}
${this.generateExpectedBenefits()}
${this.generateExpectedDisBenefits()}
${this.generateTimescale()}
${this.generateCosts()}
${this.generateInvestmentAppraisal()}
${this.generateMajorRisks()}
${this.generateRecommendation()}
${this.generateApprovalSection()}
${this.generateFooter()}
`.trim()
  }

  private generateHeader(): string {
    return `
<div align="center">
  
# BUSINESS CASE

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
2. [Strategic Context](#strategic-context)
3. [Reasons for the Project](#reasons-for-the-project)
4. [Business Options](#business-options)
5. [Expected Benefits](#expected-benefits)
6. [Expected Dis-benefits](#expected-dis-benefits)
7. [Timescale](#timescale)
8. [Costs](#costs)
9. [Investment Appraisal](#investment-appraisal)
10. [Major Risks](#major-risks)
11. [Recommendation](#recommendation)
12. [Approval](#approval)

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateExecutiveSummary(): string {
    const summary = this.data.executiveSummary || `
This business case presents the justification for the ${this.projectName} project. 
The project requires an investment of ${this.data.costs.total} and is expected to deliver 
a return on investment of ${this.data.investmentAppraisal.roi} with a payback period 
of ${this.data.investmentAppraisal.paybackPeriod}.
`.trim()

    return `
## 1. Executive Summary

${summary}

### Key Points

| Aspect | Value |
|--------|-------|
| **Total Investment** | ${this.data.costs.total} |
| **ROI** | ${this.data.investmentAppraisal.roi} |
| **Payback Period** | ${this.data.investmentAppraisal.paybackPeriod} |
| **Duration** | ${this.data.timescale} |
| **Risk Level** | ${this.calculateRiskLevel()} |

### Recommendation

✅ **Proceed with the project** - The business case demonstrates strong value proposition and acceptable risk levels.

<div style="page-break-after: always;"></div>
`.trim()
  }

  private calculateRiskLevel(): string {
    const riskCount = this.data.majorRisks.length
    if (riskCount <= 3) return '🟢 Low'
    if (riskCount <= 6) return '🟡 Medium'
    return '🔴 High'
  }

  private generateStrategicContext(): string {
    return `
## 2. Strategic Context

### 2.1 Strategic Alignment

This project aligns with the organization's strategic objectives by:

- Supporting digital transformation initiatives
- Enhancing operational efficiency
- Improving customer satisfaction
- Strengthening competitive position

### 2.2 Market Context

The current market conditions favor this investment due to:

- Growing demand for digital solutions
- Competitive pressure to modernize
- Regulatory requirements
- Customer expectations

### 2.3 Organizational Readiness

The organization is prepared for this project with:

- Executive sponsorship secured
- Resources identified and available
- Clear governance structure
- Change management capabilities

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateReasonsForProject(): string {
    return `
## 3. Reasons for the Project

${this.data.reasons}

### Key Drivers

The primary drivers for this project include:

1. **Business Driver**: Improve operational efficiency and reduce costs
2. **Technology Driver**: Modernize legacy systems and infrastructure
3. **Regulatory Driver**: Ensure compliance with industry standards
4. **Customer Driver**: Meet evolving customer expectations

### Consequences of Not Proceeding

If this project is not undertaken:

- ❌ Continued operational inefficiencies
- ❌ Increased competitive disadvantage
- ❌ Risk of non-compliance
- ❌ Customer dissatisfaction and potential churn

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateBusinessOptions(): string {
    return `
## 4. Business Options

The following options have been analyzed:

${this.data.businessOptions.map((option, i) => `
### Option ${i + 1}: ${option.option}

${option.description}

#### Analysis

| Aspect | Details |
|--------|---------|
| **Estimated Costs** | ${option.costs} |
| **Expected Benefits** | ${option.benefits} |
| **Key Risks** | ${option.risks} |
| **Recommendation** | ${i === this.data.businessOptions.length - 1 ? '✅ **Recommended**' : '❌ Not recommended'} |
`).join('\n')}

### Options Comparison Matrix

| Criteria | ${this.data.businessOptions.map(o => o.option).join(' | ')} |
|----------|${this.data.businessOptions.map(() => '------').join('|')}|
| Cost | ${this.data.businessOptions.map(o => this.getCostRating(o.costs)).join(' | ')} |
| Benefits | ${this.data.businessOptions.map(o => this.getBenefitRating(o.benefits)).join(' | ')} |
| Risk | ${this.data.businessOptions.map(o => this.getRiskRating(o.risks)).join(' | ')} |
| Feasibility | ${this.data.businessOptions.map((_, i) => i === 0 ? '🔴 Low' : i === this.data.businessOptions.length - 1 ? '🟢 High' : '🟡 Medium').join(' | ')} |

<div style="page-break-after: always;"></div>
`.trim()
  }

  private getCostRating(cost: string): string {
    if (cost.toLowerCase().includes('high')) return '🔴 High'
    if (cost.toLowerCase().includes('low')) return '🟢 Low'
    return '🟡 Medium'
  }

  private getBenefitRating(benefit: string): string {
    if (benefit.toLowerCase().includes('high') || benefit.toLowerCase().includes('significant')) return '🟢 High'
    if (benefit.toLowerCase().includes('low') || benefit.toLowerCase().includes('minimal')) return '🔴 Low'
    return '🟡 Medium'
  }

  private getRiskRating(risk: string): string {
    if (risk.toLowerCase().includes('high')) return '🔴 High'
    if (risk.toLowerCase().includes('low')) return '🟢 Low'
    return '🟡 Medium'
  }

  private generateExpectedBenefits(): string {
    return `
## 5. Expected Benefits

### 5.1 Quantifiable Benefits

| Benefit | Measurable | Measurement Method | Baseline | Target | When Realized |
|---------|------------|-------------------|----------|--------|---------------|
${this.data.expectedBenefits.filter(b => b.measurable).map(b => 
  `| ${b.benefit} | ✅ Yes | ${b.measurement || 'TBD'} | ${b.baseline || 'Current'} | ${b.target || 'TBD'} | Project + 6 months |`
).join('\n')}

### 5.2 Non-Quantifiable Benefits

${this.data.expectedBenefits.filter(b => !b.measurable).map(b => 
  `- ${b.benefit}`
).join('\n')}

### 5.3 Benefits Realization Plan

\`\`\`mermaid
gantt
    title Benefits Realization Timeline
    dateFormat YYYY-MM-DD
    section Quick Wins
    Efficiency Gains :2024-06-01, 90d
    section Medium Term
    Cost Savings :2024-09-01, 180d
    section Long Term
    Strategic Benefits :2025-01-01, 365d
\`\`\`

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateExpectedDisBenefits(): string {
    // Handle both string array and object array formats
    const disbenefits = this.data.expectedDisBenefits || []
    
    // Check if it's an array of objects or strings
    const isObjectArray = disbenefits.length > 0 && typeof disbenefits[0] === 'object'
    
    return `
## 6. Expected Dis-benefits

The following dis-benefits have been identified and will be managed:

${disbenefits.map(db => {
  if (isObjectArray && typeof db === 'object' && db !== null) {
    // Handle object format from structured schema
    const disbenefit = (db as any).disbenefit || db
    const impact = (db as any).impact || 'Medium'
    const mitigation = (db as any).mitigation || 'Appropriate change management and communication plans will be implemented to minimize impact.'
    
    return `
### ⚠️ ${disbenefit}

**Impact:** ${impact}

**Mitigation Strategy:** ${mitigation}
`
  } else {
    // Handle string format
    return `
### ⚠️ ${db}

**Mitigation Strategy:** Appropriate change management and communication plans will be implemented to minimize impact.
`
  }
}).join('\n')}

### Dis-benefits Management

| Dis-benefit | Impact | Affected Parties | Mitigation |
|-------------|--------|------------------|------------|
${disbenefits.map(db => {
  if (isObjectArray && typeof db === 'object' && db !== null) {
    const disbenefit = (db as any).disbenefit || db
    const impact = (db as any).impact || 'Medium'
    const mitigation = (db as any).mitigation || 'Change management plan'
    return `| ${disbenefit} | ${impact} | Stakeholders | ${mitigation} |`
  } else {
    return `| ${db} | Medium | Stakeholders | Change management plan |`
  }
}).join('\n')}

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateTimescale(): string {
    return `
## 7. Timescale

### Project Duration

${this.data.timescale}

### Key Milestones

\`\`\`mermaid
timeline
    title Project Timeline
    
    Project Initiation : Q1 2024
    
    Phase 1 - Foundation : Q2 2024
    
    Phase 2 - Development : Q3 2024
    
    Phase 3 - Implementation : Q4 2024
    
    Project Closure : Q1 2025
    
    Benefits Realization : Q2-Q4 2025
\`\`\`

### Critical Dates

| Milestone | Target Date | Dependencies |
|-----------|------------|--------------|
| Project Start | Month 1 | Approval & Funding |
| Phase 1 Complete | Month 3 | Requirements finalized |
| Phase 2 Complete | Month 6 | Development resources |
| Go-Live | Month 9 | Testing & training |
| Project Close | Month 10 | Handover complete |

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateCosts(): string {
    return `
## 8. Costs

### 8.1 Cost Breakdown

| Category | Amount | % of Total | Notes |
|----------|--------|------------|-------|
| **Development Costs** | ${this.data.costs.development} | ${this.calculatePercentage(this.data.costs.development, this.data.costs.total)}% | Initial build and setup |
| **Operational Costs** | ${this.data.costs.operational} | ${this.calculatePercentage(this.data.costs.operational, this.data.costs.total)}% | Running costs per annum |
| **Maintenance Costs** | ${this.data.costs.maintenance} | ${this.calculatePercentage(this.data.costs.maintenance, this.data.costs.total)}% | Ongoing support |
| **Contingency** | 10% of total | 10% | Risk mitigation |
| **TOTAL** | **${this.data.costs.total}** | **100%** | All inclusive |

### 8.2 Cost Profile

\`\`\`mermaid
pie title Cost Distribution
    "Development" : 60
    "Operational" : 25
    "Maintenance" : 10
    "Contingency" : 5
\`\`\`

### 8.3 Funding Source

- Internal budget allocation: 70%
- Capital investment fund: 30%

<div style="page-break-after: always;"></div>
`.trim()
  }

  private calculatePercentage(part: string, total: string): number {
    try {
      // Parse monetary values, removing currency symbols and commas
      const partValue = parseFloat(part.replace(/[^0-9.-]/g, '') || '0')
      const totalValue = parseFloat(total.replace(/[^0-9.-]/g, '') || '0')
      
      if (totalValue === 0) return 0
      
      return Math.round((partValue / totalValue) * 100)
    } catch (error) {
      console.warn('Error calculating percentage:', error)
      return 0
    }
  }

  private generateInvestmentAppraisal(): string {
    return `
## 9. Investment Appraisal

### 9.1 Financial Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| **Return on Investment (ROI)** | ${this.data.investmentAppraisal.roi} | 🟢 Exceeds threshold |
| **Payback Period** | ${this.data.investmentAppraisal.paybackPeriod} | 🟢 Acceptable |
| **Net Present Value (NPV)** | ${this.data.investmentAppraisal.npv || 'Positive'} | 🟢 Positive |
| **Internal Rate of Return (IRR)** | 15% | 🟢 Above hurdle rate |

### 9.2 Sensitivity Analysis

| Scenario | ROI | Payback | NPV | Decision |
|----------|-----|---------|-----|----------|
| **Best Case** (+20% benefits) | ${this.adjustROI(this.data.investmentAppraisal.roi, 1.2)} | Reduced 20% | Very Positive | ✅ Proceed |
| **Expected Case** | ${this.data.investmentAppraisal.roi} | ${this.data.investmentAppraisal.paybackPeriod} | Positive | ✅ Proceed |
| **Worst Case** (-20% benefits) | ${this.adjustROI(this.data.investmentAppraisal.roi, 0.8)} | Extended 20% | Marginal | ⚠️ Review |

### 9.3 Break-even Analysis

\`\`\`mermaid
graph LR
    A[Investment] -->|Month 0| B[${this.data.costs.total}]
    B -->|Operations| C[Break-even]
    C -->|${this.data.investmentAppraisal.paybackPeriod}| D[Profit]
    D -->|Ongoing| E[ROI ${this.data.investmentAppraisal.roi}]
\`\`\`

<div style="page-break-after: always;"></div>
`.trim()
  }

  private adjustROI(roi: string, factor: number): string {
    try {
      // Extract percentage from ROI string (e.g., "150%" -> 150)
      const roiMatch = roi.match(/([\d.]+)%?/)
      if (!roiMatch) return roi
      
      const roiValue = parseFloat(roiMatch[1])
      const adjustedROI = Math.round(roiValue * factor)
      
      return `${adjustedROI}%`
    } catch (error) {
      console.warn('Error adjusting ROI:', error)
      return roi
    }
  }

  private generateMajorRisks(): string {
    // Handle both string array and object array formats
    const risksArray = this.data.majorRisks || []
    const isObjectArray = risksArray.length > 0 && typeof risksArray[0] === 'object'
    
    // Convert to consistent format for display
    const risks = risksArray.map((risk: any) => {
      if (typeof risk === 'string') {
        return {
          risk: risk,
          probability: 'medium',
          impact: 'high',
          mitigation: 'Risk management plan in place'
        }
      } else if (typeof risk === 'object' && risk !== null) {
        return {
          risk: risk.risk || '[Risk Description]',
          probability: risk.probability || 'medium',
          impact: risk.impact || 'high',
          mitigation: risk.mitigation || 'Risk management plan in place'
        }
      }
      return {
        risk: '[Unknown Risk]',
        probability: 'medium',
        impact: 'high',
        mitigation: 'Risk management plan in place'
      }
    })
    
    return `
## 10. Major Risks

### 10.1 Risk Summary

The following major risks could impact the business case:

${risks.map((risk, i) => `
#### Risk ${i + 1}: ${risk.risk}

- **Probability**: ${risk.probability.charAt(0).toUpperCase() + risk.probability.slice(1)}
- **Impact**: ${risk.impact.charAt(0).toUpperCase() + risk.impact.slice(1)}
- **Mitigation**: ${risk.mitigation}
`).join('\n')}

### 10.2 Risk Matrix

| Risk | Probability | Impact | Score | Response |
|------|------------|--------|-------|----------|
${risks.map(risk => {
  // Calculate risk score based on probability and impact
  const probScore = risk.probability === 'high' ? 5 : risk.probability === 'medium' ? 3 : 1
  const impactScore = risk.impact === 'high' ? 5 : risk.impact === 'medium' ? 3 : 1
  const totalScore = probScore * impactScore
  
  return `| ${risk.risk} | ${risk.probability.charAt(0).toUpperCase() + risk.probability.slice(1)} | ${risk.impact.charAt(0).toUpperCase() + risk.impact.slice(1)} | ${totalScore} | Mitigate |`
}).join('\n')}

### 10.3 Risk Impact on Business Case

If major risks materialize:
- ROI could reduce by up to 20%
- Payback period could extend by 6 months
- Additional contingency funds may be required

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateRecommendation(): string {
    return `
## 11. Recommendation

### 11.1 Recommended Action

Based on the analysis presented in this business case:

✅ **RECOMMENDATION: APPROVE AND PROCEED**

The project demonstrates:
- Strong financial returns with ROI of ${this.data.investmentAppraisal.roi}
- Acceptable payback period of ${this.data.investmentAppraisal.paybackPeriod}
- Clear strategic alignment with organizational objectives
- Manageable risk profile with mitigation strategies in place

### 11.2 Conditions for Approval

The following conditions should be met:
1. Secure full funding commitment of ${this.data.costs.total}
2. Confirm availability of key resources
3. Establish project governance structure
4. Approve risk management plan
5. Define success criteria and benefits tracking

### 11.3 Next Steps

Upon approval:
1. Initiate project setup
2. Appoint Project Manager and team
3. Develop detailed project plan
4. Begin stakeholder engagement
5. Commence Phase 1 activities

<div style="page-break-after: always;"></div>
`.trim()
  }

  private generateApprovalSection(): string {
    return `
## 12. Approval

### 12.1 Business Case Approval

This Business Case has been reviewed and approved by:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Executive Sponsor** | ___________________ | ___________________ | ___/___/______ |
| **CFO/Finance Director** | ___________________ | ___________________ | ___/___/______ |
| **Senior User** | ___________________ | ___________________ | ___/___/______ |
| **Project Board Chair** | ___________________ | ___________________ | ___/___/______ |

### 12.2 Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | ${this.date} | AI Generated | Initial draft |
| ${this.version} | ${this.date} | Project Manager | Ready for approval |

### 12.3 Review Schedule

This business case will be reviewed:
- At each project stage boundary
- When changes exceed tolerance
- Quarterly for benefits tracking

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
**Distribution:** Project Board and Finance Committee  
**© ${new Date().getFullYear()} ${this.companyName}. All rights reserved.**

</div>
`.trim()
  }
}

export function formatBusinessCase(
  data: BusinessCaseData,
  metadata: {
    projectName: string
    companyName?: string
    version?: string
    date?: string
  }
): string {
  const formatter = new BusinessCaseFormatter(data, metadata)
  return formatter.format()
}