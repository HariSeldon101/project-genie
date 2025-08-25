interface Risk {
  id: string
  category: 'Strategic' | 'Operational' | 'Financial' | 'Technical' | 'Compliance' | 'External'
  description: string
  probability: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High'
  impact: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High'
  score?: number
  owner: string
  mitigation: string
  contingency?: string
  status: 'Open' | 'Monitoring' | 'Closed' | 'Occurred'
  dateIdentified: string
  lastReviewed?: string
  residualProbability?: string
  residualImpact?: string
  residualScore?: number
}

interface RiskRegisterData {
  projectName: string
  projectManager?: string
  lastUpdated: string
  approvalStatus?: 'Draft' | 'Under Review' | 'Approved'
  version?: string
  risks: Risk[]
  riskAppetite?: string
  escalationThresholds?: {
    high: number
    medium: number
    low: number
  }
  companyName?: string
  companyWebsite?: string
  documentOwner?: string
}

function calculateRiskScore(probability: string, impact: string): number {
  const scores: Record<string, number> = {
    'Very Low': 1,
    'Low': 2,
    'Medium': 3,
    'High': 4,
    'Very High': 5
  }
  return scores[probability] * scores[impact]
}

function getRiskRating(score: number): { rating: string, color: string, emoji: string } {
  if (score >= 20) return { rating: 'Critical', color: 'red', emoji: '🔴' }
  if (score >= 15) return { rating: 'High', color: 'orange', emoji: '🟠' }
  if (score >= 10) return { rating: 'Medium', color: 'yellow', emoji: '🟡' }
  if (score >= 5) return { rating: 'Low', color: 'green', emoji: '🟢' }
  return { rating: 'Very Low', color: 'blue', emoji: '🔵' }
}

function formatRiskCategory(category: string): string {
  const icons: Record<string, string> = {
    'Strategic': '🎯',
    'Operational': '⚙️',
    'Financial': '💰',
    'Technical': '💻',
    'Compliance': '📋',
    'External': '🌍'
  }
  return `${icons[category] || '📌'} ${category}`
}

export function formatRiskRegister(data: RiskRegisterData): string {
  const sections: string[] = []
  
  // Header with company branding
  sections.push(`# 📊 Risk Register

**Project:** ${data.projectName}  
${data.projectManager ? `**Project Manager:** ${data.projectManager}  ` : ''}
**Document Version:** ${data.version || '1.0'}  
**Last Updated:** ${data.lastUpdated}  
**Status:** ${data.approvalStatus || 'Draft'}  
${data.companyName ? `\n**Organization:** ${data.companyName}  ` : ''}
${data.companyWebsite ? `**Website:** ${data.companyWebsite}  ` : ''}

---`)

  // Table of Contents
  sections.push(`## 📑 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Risk Management Approach](#risk-management-approach)
3. [Risk Matrix](#risk-matrix)
4. [Risk Register](#risk-register-details)
5. [Risk Distribution](#risk-distribution)
6. [Mitigation Strategies](#mitigation-strategies)
7. [Approval & Sign-off](#approval--sign-off)

---`)

  // Executive Summary
  const totalRisks = data.risks.length
  const openRisks = data.risks.filter(r => r.status === 'Open').length
  const highRisks = data.risks.filter(r => {
    const score = calculateRiskScore(r.probability, r.impact)
    return score >= 15
  }).length
  
  sections.push(`## 1. Executive Summary

This Risk Register documents **${totalRisks} identified risks** for the ${data.projectName} project, with **${openRisks} currently open** and requiring active management.

### 🎯 Key Metrics
- **Total Risks Identified:** ${totalRisks}
- **Open Risks:** ${openRisks}
- **High/Critical Risks:** ${highRisks}
- **Risks Under Monitoring:** ${data.risks.filter(r => r.status === 'Monitoring').length}
- **Closed Risks:** ${data.risks.filter(r => r.status === 'Closed').length}

### ⚠️ Top Risks Requiring Immediate Attention
${data.risks
  .filter(r => r.status === 'Open')
  .map(r => ({ ...r, score: calculateRiskScore(r.probability, r.impact) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 3)
  .map((r, i) => {
    const { emoji } = getRiskRating(r.score)
    return `${i + 1}. ${emoji} **${r.description}** (Score: ${r.score})`
  })
  .join('\n')}

---`)

  // Risk Management Approach
  sections.push(`## 2. Risk Management Approach

### Risk Appetite
${data.riskAppetite || 'The organization maintains a balanced risk appetite, accepting calculated risks that align with strategic objectives while maintaining appropriate controls.'}

### Risk Assessment Criteria

#### Probability Scale
| Level | Description | Likelihood |
|-------|------------|------------|
| Very High (5) | Almost certain to occur | >90% |
| High (4) | Likely to occur | 70-90% |
| Medium (3) | Possible to occur | 30-70% |
| Low (2) | Unlikely to occur | 10-30% |
| Very Low (1) | Rare occurrence | <10% |

#### Impact Scale
| Level | Description | Cost Impact | Schedule Impact |
|-------|------------|------------|-----------------|
| Very High (5) | Catastrophic impact | >£1M or >50% budget | >6 months delay |
| High (4) | Major impact | £500K-1M or 25-50% budget | 3-6 months delay |
| Medium (3) | Moderate impact | £100-500K or 10-25% budget | 1-3 months delay |
| Low (2) | Minor impact | £50-100K or 5-10% budget | 2-4 weeks delay |
| Very Low (1) | Negligible impact | <£50K or <5% budget | <2 weeks delay |

### Escalation Thresholds
${data.escalationThresholds ? `
- **Critical/High Risks (Score ≥${data.escalationThresholds.high}):** Escalate to Project Board immediately
- **Medium Risks (Score ${data.escalationThresholds.low}-${data.escalationThresholds.medium}):** Report to Project Manager weekly
- **Low Risks (Score <${data.escalationThresholds.low}):** Monitor and review monthly
` : `
- **Critical/High Risks (Score ≥15):** Escalate to Project Board immediately
- **Medium Risks (Score 10-14):** Report to Project Manager weekly
- **Low Risks (Score <10):** Monitor and review monthly
`}

---`)

  // Risk Matrix
  sections.push(`## 3. Risk Matrix

\`\`\`mermaid
graph LR
    subgraph "Risk Heat Map"
        A[Very High Impact] --> A1[Medium]
        A --> A2[High]
        A --> A3[High]
        A --> A4[Critical]
        A --> A5[Critical]
        
        B[High Impact] --> B1[Low]
        B --> B2[Medium]
        B --> B3[High]
        B --> B4[High]
        B --> B5[Critical]
        
        C[Medium Impact] --> C1[Low]
        C --> C2[Low]
        C --> C3[Medium]
        C --> C4[Medium]
        C --> C5[High]
        
        D[Low Impact] --> D1[Very Low]
        D --> D2[Low]
        D --> D3[Low]
        D --> D4[Medium]
        D --> D5[Medium]
        
        E[Very Low Impact] --> E1[Very Low]
        E --> E2[Very Low]
        E --> E3[Low]
        E --> E4[Low]
        E --> E5[Low]
    end
    
    style A1 fill:#ffeb3b
    style A2 fill:#ff9800
    style A3 fill:#ff9800
    style A4 fill:#f44336
    style A5 fill:#f44336
    style B1 fill:#8bc34a
    style B2 fill:#ffeb3b
    style B3 fill:#ff9800
    style B4 fill:#ff9800
    style B5 fill:#f44336
    style C1 fill:#8bc34a
    style C2 fill:#8bc34a
    style C3 fill:#ffeb3b
    style C4 fill:#ffeb3b
    style C5 fill:#ff9800
    style D1 fill:#4caf50
    style D2 fill:#8bc34a
    style D3 fill:#8bc34a
    style D4 fill:#ffeb3b
    style D5 fill:#ffeb3b
    style E1 fill:#4caf50
    style E2 fill:#4caf50
    style E3 fill:#8bc34a
    style E4 fill:#8bc34a
    style E5 fill:#8bc34a
\`\`\`

### Current Risk Distribution
\`\`\`mermaid
pie title Risk Distribution by Rating
    "Critical" : ${data.risks.filter(r => calculateRiskScore(r.probability, r.impact) >= 20).length}
    "High" : ${data.risks.filter(r => { const s = calculateRiskScore(r.probability, r.impact); return s >= 15 && s < 20 }).length}
    "Medium" : ${data.risks.filter(r => { const s = calculateRiskScore(r.probability, r.impact); return s >= 10 && s < 15 }).length}
    "Low" : ${data.risks.filter(r => { const s = calculateRiskScore(r.probability, r.impact); return s >= 5 && s < 10 }).length}
    "Very Low" : ${data.risks.filter(r => calculateRiskScore(r.probability, r.impact) < 5).length}
\`\`\`

---`)

  // Detailed Risk Register
  sections.push(`## 4. Risk Register Details

### Open Risks

${data.risks
  .filter(r => r.status === 'Open')
  .map(r => ({ ...r, score: r.score || calculateRiskScore(r.probability, r.impact) }))
  .sort((a, b) => b.score - a.score)
  .map(risk => {
    const { rating, emoji } = getRiskRating(risk.score)
    return `#### ${emoji} Risk ${risk.id}: ${risk.description}

| Attribute | Value |
|-----------|-------|
| **Category** | ${formatRiskCategory(risk.category)} |
| **Probability** | ${risk.probability} |
| **Impact** | ${risk.impact} |
| **Risk Score** | ${risk.score} (${rating}) |
| **Owner** | ${risk.owner} |
| **Status** | ${risk.status} |
| **Date Identified** | ${risk.dateIdentified} |
${risk.lastReviewed ? `| **Last Reviewed** | ${risk.lastReviewed} |` : ''}

**Mitigation Strategy:**  
${risk.mitigation}

${risk.contingency ? `**Contingency Plan:**  
${risk.contingency}` : ''}

${risk.residualProbability ? `**Residual Risk Assessment:**
- Probability: ${risk.residualProbability}
- Impact: ${risk.residualImpact}
- Score: ${risk.residualScore || calculateRiskScore(risk.residualProbability, risk.residualImpact || 'Medium')}` : ''}

---`
  }).join('\n\n')}

### Monitoring Risks

${data.risks
  .filter(r => r.status === 'Monitoring')
  .map(risk => {
    const score = calculateRiskScore(risk.probability, risk.impact)
    const { rating, emoji } = getRiskRating(score)
    return `#### ${emoji} Risk ${risk.id}: ${risk.description}

| Attribute | Value |
|-----------|-------|
| **Category** | ${formatRiskCategory(risk.category)} |
| **Risk Score** | ${score} (${rating}) |
| **Owner** | ${risk.owner} |
| **Last Reviewed** | ${risk.lastReviewed || risk.dateIdentified} |

**Current Mitigation:** ${risk.mitigation}

---`
  }).join('\n\n') || '*No risks currently under monitoring*'}

### Closed Risks

${data.risks
  .filter(r => r.status === 'Closed')
  .map(risk => `- **${risk.id}:** ${risk.description} (Closed: ${risk.lastReviewed || 'N/A'})`)
  .join('\n') || '*No closed risks*'}

---`)

  // Risk Distribution Analysis
  sections.push(`## 5. Risk Distribution

### By Category
\`\`\`mermaid
pie title Risks by Category
${Object.entries(
  data.risks.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
).map(([cat, count]) => `    "${cat}" : ${count}`).join('\n')}
\`\`\`

### By Status
\`\`\`mermaid
pie title Risks by Status
${Object.entries(
  data.risks.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
).map(([status, count]) => `    "${status}" : ${count}`).join('\n')}
\`\`\`

---`)

  // Mitigation Strategies Summary
  sections.push(`## 6. Mitigation Strategies

### Risk Response Strategies Applied

| Strategy | Description | Number of Risks |
|----------|-------------|-----------------|
| **Avoid** | Eliminate the risk by removing the cause | ${data.risks.filter(r => r.mitigation.toLowerCase().includes('avoid') || r.mitigation.toLowerCase().includes('eliminate')).length} |
| **Reduce** | Decrease probability or impact | ${data.risks.filter(r => r.mitigation.toLowerCase().includes('reduce') || r.mitigation.toLowerCase().includes('minimize')).length} |
| **Transfer** | Shift risk to third party | ${data.risks.filter(r => r.mitigation.toLowerCase().includes('transfer') || r.mitigation.toLowerCase().includes('insurance')).length} |
| **Accept** | Acknowledge and monitor | ${data.risks.filter(r => r.mitigation.toLowerCase().includes('accept') || r.mitigation.toLowerCase().includes('monitor')).length} |

### Key Mitigation Actions

${data.risks
  .filter(r => r.status === 'Open' && calculateRiskScore(r.probability, r.impact) >= 10)
  .slice(0, 5)
  .map((r, i) => `${i + 1}. **${r.description}**
   - Owner: ${r.owner}
   - Action: ${r.mitigation.substring(0, 150)}${r.mitigation.length > 150 ? '...' : ''}`)
  .join('\n\n')}

---`)

  // Approval Section
  sections.push(`## 7. Approval & Sign-off

### Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Manager | ${data.projectManager || '_________________'} | _________________ | _________________ |
| Risk Owner | ${data.documentOwner || '_________________'} | _________________ | _________________ |
| Project Sponsor | _________________ | _________________ | _________________ |
| Quality Assurance | _________________ | _________________ | _________________ |

### Review Schedule

- **Next Review Date:** _________________
- **Review Frequency:** Monthly during project execution
- **Distribution List:** Project Board, Project Manager, Risk Owners, PMO

### Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| ${data.version || '1.0'} | ${data.lastUpdated} | ${data.documentOwner || 'Project Manager'} | ${data.approvalStatus === 'Draft' ? 'Initial draft' : 'Current version'} |

---

*This Risk Register is a living document and should be regularly updated throughout the project lifecycle.*

${data.companyName ? `\n© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.` : ''}`)

  return sections.join('\n\n')
}

// Helper function to generate sample risk data for testing
export function generateSampleRiskRegister(): RiskRegisterData {
  return {
    projectName: "Digital Transformation Initiative",
    projectManager: "Sarah Johnson",
    lastUpdated: new Date().toLocaleDateString(),
    approvalStatus: "Under Review",
    version: "2.1",
    companyName: "TechCorp Solutions",
    companyWebsite: "https://techcorp.example.com",
    documentOwner: "Risk Management Office",
    riskAppetite: "Moderate - willing to accept risks that could result in limited financial loss or reputational impact in pursuit of strategic objectives",
    escalationThresholds: {
      high: 15,
      medium: 10,
      low: 5
    },
    risks: [
      {
        id: "R001",
        category: "Technical",
        description: "Legacy system integration failures could delay data migration",
        probability: "High",
        impact: "High",
        owner: "Technical Lead",
        mitigation: "Implement phased migration approach with rollback capabilities. Conduct thorough testing in staging environment.",
        contingency: "Maintain parallel running of legacy system for 3 months post-migration",
        status: "Open",
        dateIdentified: "2024-01-15",
        lastReviewed: "2024-02-01",
        residualProbability: "Medium",
        residualImpact: "Medium"
      },
      {
        id: "R002",
        category: "Financial",
        description: "Budget overrun due to scope creep",
        probability: "Medium",
        impact: "Very High",
        owner: "Project Manager",
        mitigation: "Implement strict change control process. Regular budget reviews with stakeholders.",
        status: "Open",
        dateIdentified: "2024-01-10"
      },
      {
        id: "R003",
        category: "Strategic",
        description: "Competitor launches similar product before project completion",
        probability: "Medium",
        impact: "High",
        owner: "Product Owner",
        mitigation: "Accelerate MVP delivery. Focus on unique differentiators.",
        status: "Monitoring",
        dateIdentified: "2024-01-20",
        lastReviewed: "2024-02-05"
      },
      {
        id: "R004",
        category: "Operational",
        description: "Key team members leaving the project",
        probability: "Low",
        impact: "High",
        owner: "HR Manager",
        mitigation: "Implement knowledge transfer sessions. Maintain comprehensive documentation.",
        status: "Open",
        dateIdentified: "2024-01-25"
      },
      {
        id: "R005",
        category: "Compliance",
        description: "GDPR compliance issues with data handling",
        probability: "Low",
        impact: "Very High",
        owner: "Compliance Officer",
        mitigation: "Engage legal counsel for review. Implement privacy-by-design principles.",
        status: "Closed",
        dateIdentified: "2024-01-05",
        lastReviewed: "2024-01-30"
      }
    ]
  }
}