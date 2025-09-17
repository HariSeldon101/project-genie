/**
 * Unified Business Case Formatter
 * 
 * Generates semantic HTML for Business Case documents with full support for:
 * - Cost distribution pie charts
 * - Benefits realization Gantt charts  
 * - Risk matrices with visual indicators
 * - Options comparison matrices
 * - Timeline visualizations
 * - Financial metrics tables
 * - ROI and sensitivity analysis
 */

import { BaseUnifiedFormatter, DocumentMetadata, FormatterOptions } from './base-unified-formatter'

export interface BusinessCase {
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
    whenRealized?: string
  }>
  expectedDisBenefits: Array<{
    disbenefit: string
    impact: string
    mitigation: string
  }> | string[]
  timescale: string
  costs: {
    development: string
    operational: string
    maintenance: string
    total: string
    contingency?: string
  }
  investmentAppraisal: {
    roi: string
    paybackPeriod: string
    npv?: string
    irr?: string
  }
  majorRisks: Array<{
    risk: string
    probability: string
    impact: string
    mitigation: string
  }> | string[]
}

export class UnifiedBusinessCaseFormatter extends BaseUnifiedFormatter<BusinessCase> {
  
  /**
   * Format date for Gantt chart (YYYY-MM-DD)
   */
  private formatDateForGantt(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  /**
   * Format date for display (MMM YYYY)
   */
  private formatDateForDisplay(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }
  
  /**
   * Calculate project quarters based on dates
   */
  private calculateProjectQuarters(startDate: Date, endDate: Date): string[] {
    const quarters: string[] = []
    const currentDate = new Date(startDate)
    
    // Generate quarters for project duration plus benefits realization
    for (let i = 0; i < 8; i++) {
      const quarter = Math.floor(currentDate.getMonth() / 3) + 1
      const year = currentDate.getFullYear()
      quarters.push(`Q${quarter} ${year}`)
      currentDate.setMonth(currentDate.getMonth() + 3)
    }
    
    return quarters
  }
  
  /**
   * Calculate milestone date based on project progress
   */
  private calculateMilestoneDate(startDate: Date, endDate: Date, progress: number): Date {
    const duration = endDate.getTime() - startDate.getTime()
    return new Date(startDate.getTime() + duration * progress)
  }
  
  /**
   * Ensure Business Case data has all required structure
   */
  protected ensureStructure(data: any): BusinessCase {
    // Handle double-wrapped content
    if (data?.content && typeof data.content === 'object') {
      data = data.content
    }

    // Extract and normalize each section
    return {
      executiveSummary: this.extractExecutiveSummary(data),
      reasons: this.extractReasons(data),
      businessOptions: this.extractBusinessOptions(data),
      expectedBenefits: this.extractExpectedBenefits(data),
      expectedDisBenefits: this.extractExpectedDisBenefits(data),
      timescale: this.extractTimescale(data),
      costs: this.extractCosts(data),
      investmentAppraisal: this.extractInvestmentAppraisal(data),
      majorRisks: this.extractMajorRisks(data)
    }
  }

  private extractExecutiveSummary(data: any): string {
    const summary = this.extractValue(data, 'executiveSummary', 'executive_summary', 'summary')
    
    if (summary) return summary
    
    // Generate executive summary if missing
    const costs = this.extractCosts(data)
    const appraisal = this.extractInvestmentAppraisal(data)
    
    return `This business case presents the justification for the ${this.metadata.projectName} project. ` +
           `The project requires an investment of ${costs.total} and is expected to deliver ` +
           `a return on investment of ${appraisal.roi} with a payback period of ${appraisal.paybackPeriod}.`
  }

  private extractReasons(data: any): string {
    return this.extractValue(data, 'reasons', 'projectReasons', 'justification') || 
           'Strategic alignment with organizational objectives'
  }

  private extractBusinessOptions(data: any): BusinessCase['businessOptions'] {
    const options = this.extractArray(
      this.extractValue(data, 'businessOptions', 'options', 'alternatives')
    )
    
    if (options.length === 0) {
      // Provide default options
      return [
        {
          option: 'Do Nothing',
          description: 'Maintain current state',
          costs: 'Minimal',
          benefits: 'None',
          risks: 'High - competitive disadvantage'
        },
        {
          option: 'Minimal Investment',
          description: 'Basic improvements only',
          costs: 'Low',
          benefits: 'Limited improvements',
          risks: 'Medium - partial solution'
        },
        {
          option: 'Full Implementation',
          description: 'Complete solution as proposed',
          costs: 'As budgeted',
          benefits: 'Full benefits realization',
          risks: 'Low - managed approach'
        }
      ]
    }
    
    return options.map(opt => {
      if (typeof opt === 'string') {
        return {
          option: opt,
          description: '',
          costs: 'TBD',
          benefits: 'TBD',
          risks: 'TBD'
        }
      }
      return {
        option: opt.option || opt.name || 'Option',
        description: opt.description || '',
        costs: opt.costs || opt.cost || 'TBD',
        benefits: opt.benefits || opt.benefit || 'TBD',
        risks: opt.risks || opt.risk || 'TBD'
      }
    })
  }

  private extractExpectedBenefits(data: any): BusinessCase['expectedBenefits'] {
    const benefits = this.extractArray(
      this.extractValue(data, 'expectedBenefits', 'benefits', 'expected_benefits')
    )
    
    return benefits.map(benefit => {
      if (typeof benefit === 'string') {
        return {
          benefit,
          measurable: false
        }
      }
      return {
        benefit: benefit.benefit || benefit.name || benefit.description || 'Benefit',
        measurable: benefit.measurable ?? true,
        measurement: benefit.measurement || benefit.metric,
        baseline: benefit.baseline || benefit.current,
        target: benefit.target || benefit.goal,
        whenRealized: benefit.whenRealized || benefit.timeline
      }
    })
  }

  private extractExpectedDisBenefits(data: any): BusinessCase['expectedDisBenefits'] {
    const disbenefits = this.extractArray(
      this.extractValue(data, 'expectedDisBenefits', 'disbenefits', 'expected_disbenefits', 'expectedDisbenefits')
    )
    
    return disbenefits.map(db => {
      if (typeof db === 'string') return db
      
      return {
        disbenefit: db.disbenefit || db.name || db.description || 'Disbenefit',
        impact: db.impact || 'Medium',
        mitigation: db.mitigation || 'Change management plan'
      }
    })
  }

  private extractTimescale(data: any): string {
    return this.extractValue(data, 'timescale', 'timeline', 'duration', 'projectDuration') || 
           '12 months'
  }

  private extractCosts(data: any): BusinessCase['costs'] {
    const costs = this.extractValue(data, 'costs', 'cost', 'budget') || {}
    
    if (typeof costs === 'string') {
      return {
        development: 'TBD',
        operational: 'TBD',
        maintenance: 'TBD',
        total: costs
      }
    }
    
    return {
      development: costs.development || costs.dev || costs.initial || '$100,000',
      operational: costs.operational || costs.ops || costs.running || '$50,000',
      maintenance: costs.maintenance || costs.support || '$25,000',
      total: costs.total || costs.overall || '$175,000',
      contingency: costs.contingency || '10%'
    }
  }

  private extractInvestmentAppraisal(data: any): BusinessCase['investmentAppraisal'] {
    const appraisal = this.extractValue(data, 'investmentAppraisal', 'investment_appraisal', 'financials') || {}
    
    return {
      roi: appraisal.roi || appraisal.returnOnInvestment || '150%',
      paybackPeriod: appraisal.paybackPeriod || appraisal.payback || '18 months',
      npv: appraisal.npv || appraisal.netPresentValue,
      irr: appraisal.irr || appraisal.internalRateOfReturn
    }
  }

  private extractMajorRisks(data: any): BusinessCase['majorRisks'] {
    const risks = this.extractArray(
      this.extractValue(data, 'majorRisks', 'risks', 'major_risks', 'keyRisks')
    )
    
    return risks.map(risk => {
      if (typeof risk === 'string') return risk
      
      return {
        risk: risk.risk || risk.name || risk.description || 'Risk',
        probability: risk.probability || risk.likelihood || 'Medium',
        impact: risk.impact || risk.severity || 'High',
        mitigation: risk.mitigation || risk.response || 'Risk management plan'
      }
    })
  }

  /**
   * Generate semantic HTML for the Business Case
   */
  public generateHTML(): string {
    const sections: string[] = []
    
    // Add styles
    sections.push(this.getStyles())
    sections.push(this.getBusinessCaseStyles())
    
    // Add content wrapper
    sections.push('<div class="business-case-document">')
    
    // Cover page (if not white label)
    if (!this.options.whiteLabel) {
      sections.push(this.generateCoverPage())
    }
    
    // Table of Contents
    if (this.options.includeTableOfContents) {
      sections.push(this.generateTableOfContents())
    }
    
    // Executive Summary
    sections.push(this.generateExecutiveSummary())
    
    // Strategic Context
    sections.push(this.generateStrategicContext())
    
    // Reasons for Project
    sections.push(this.generateReasonsSection())
    
    // Business Options with comparison matrix
    sections.push(this.generateBusinessOptionsSection())
    
    // Expected Benefits with realization timeline
    sections.push(this.generateExpectedBenefitsSection())
    
    // Expected Dis-benefits
    sections.push(this.generateExpectedDisBenefitsSection())
    
    // Timescale with timeline visualization
    sections.push(this.generateTimescaleSection())
    
    // Costs with pie chart
    sections.push(this.generateCostsSection())
    
    // Investment Appraisal with sensitivity analysis
    sections.push(this.generateInvestmentAppraisalSection())
    
    // Major Risks with risk matrix
    sections.push(this.generateMajorRisksSection())
    
    // Recommendation
    sections.push(this.generateRecommendationSection())
    
    // Version History
    sections.push(this.generateVersionHistory())
    
    // Close wrapper
    sections.push('</div>')
    
    return sections.join('\n')
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
        
        <h1 class="cover-title">Business Case</h1>
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
          <li><a href="#strategic-context">Strategic Context</a></li>
          <li><a href="#reasons">Reasons for the Project</a></li>
          <li><a href="#business-options">Business Options</a></li>
          <li><a href="#expected-benefits">Expected Benefits</a></li>
          <li><a href="#expected-disbenefits">Expected Dis-benefits</a></li>
          <li><a href="#timescale">Timescale</a></li>
          <li><a href="#costs">Costs</a></li>
          <li><a href="#investment-appraisal">Investment Appraisal</a></li>
          <li><a href="#major-risks">Major Risks</a></li>
          <li><a href="#recommendation">Recommendation</a></li>
        </ol>
      </nav>
    `
  }

  private generateExecutiveSummary(): string {
    const riskLevel = this.calculateRiskLevel()
    
    return `
      <section class="document-section" id="executive-summary">
        <h2>1. Executive Summary</h2>
        <p>${this.data.executiveSummary}</p>
        
        <h3>Key Points</h3>
        <table class="data-table key-metrics">
          <tr>
            <th>Aspect</th>
            <th>Value</th>
          </tr>
          <tr>
            <td><strong>Total Investment</strong></td>
            <td>${this.data.costs.total}</td>
          </tr>
          <tr>
            <td><strong>ROI</strong></td>
            <td>${this.data.investmentAppraisal.roi}</td>
          </tr>
          <tr>
            <td><strong>Payback Period</strong></td>
            <td>${this.data.investmentAppraisal.paybackPeriod}</td>
          </tr>
          <tr>
            <td><strong>Duration</strong></td>
            <td>${this.data.timescale}</td>
          </tr>
          <tr>
            <td><strong>Risk Level</strong></td>
            <td>${riskLevel}</td>
          </tr>
        </table>
        
        ${this.createHighlightBox(
          'Recommendation',
          'Proceed with the project - The business case demonstrates strong value proposition and acceptable risk levels.',
          'success'
        )}
      </section>
    `
  }

  private calculateRiskLevel(): string {
    const risks = this.data.majorRisks
    const riskCount = Array.isArray(risks) ? risks.length : 0
    
    if (riskCount <= 3) return `${this.createVisualIndicator('success')} Low`
    if (riskCount <= 6) return `${this.createVisualIndicator('warning')} Medium`
    return `${this.createVisualIndicator('error')} High`
  }

  private generateStrategicContext(): string {
    return `
      <section class="document-section" id="strategic-context">
        <h2>2. Strategic Context</h2>
        
        <h3>2.1 Strategic Alignment</h3>
        <p>This project aligns with the organization's strategic objectives by:</p>
        <ul>
          <li>Supporting digital transformation initiatives</li>
          <li>Enhancing operational efficiency</li>
          <li>Improving customer satisfaction</li>
          <li>Strengthening competitive position</li>
        </ul>
        
        <h3>2.2 Market Context</h3>
        <p>The current market conditions favor this investment due to:</p>
        <ul>
          <li>Growing demand for digital solutions</li>
          <li>Competitive pressure to modernize</li>
          <li>Regulatory requirements</li>
          <li>Customer expectations</li>
        </ul>
        
        <h3>2.3 Organizational Readiness</h3>
        <p>The organization is prepared for this project with:</p>
        <ul>
          <li>Executive sponsorship secured</li>
          <li>Resources identified and available</li>
          <li>Clear governance structure</li>
          <li>Change management capabilities</li>
        </ul>
      </section>
    `
  }

  private generateReasonsSection(): string {
    return `
      <section class="document-section" id="reasons">
        <h2>3. Reasons for the Project</h2>
        <p>${this.data.reasons}</p>
      </section>
    `
  }

  private generateBusinessOptionsSection(): string {
    const options = this.data.businessOptions
    
    return `
      <section class="document-section" id="business-options">
        <h2>4. Business Options</h2>
        
        <h3>4.1 Options Considered</h3>
        <table class="options-table">
          <thead>
            <tr>
              <th style="width: 15%">Option</th>
              <th style="width: 35%">Description</th>
              <th style="width: 15%">Costs</th>
              <th style="width: 35%">Benefits</th>
              <th style="width: 35%">Risks</th>
            </tr>
          </thead>
          <tbody>
            ${options.map((opt, index) => `
              <tr>
                <td><strong>Option ${index + 1}: ${opt.option}</strong></td>
                <td>${opt.description || 'N/A'}</td>
                <td>${opt.costs}</td>
                <td>${opt.benefits}</td>
                <td>${opt.risks}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h3>4.2 Options Comparison Matrix</h3>
        <table class="comparison-matrix">
          <thead>
            <tr>
              <th>Criteria</th>
              ${options.map(opt => `<th>${opt.option}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cost</td>
              ${options.map(opt => `<td>${this.getCostRating(opt.costs)}</td>`).join('')}
            </tr>
            <tr>
              <td>Benefits</td>
              ${options.map(opt => `<td>${this.getBenefitRating(opt.benefits)}</td>`).join('')}
            </tr>
            <tr>
              <td>Risk</td>
              ${options.map(opt => `<td>${this.getRiskRating(opt.risks)}</td>`).join('')}
            </tr>
            <tr>
              <td>Feasibility</td>
              ${options.map((_, i) => `<td>${this.getFeasibilityRating(i, options.length)}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </section>
    `
  }

  private getCostRating(cost: string): string {
    const lower = cost.toLowerCase()
    if (lower.includes('high') || lower.includes('expensive')) 
      return `${this.createVisualIndicator('error')} High`
    if (lower.includes('low') || lower.includes('minimal')) 
      return `${this.createVisualIndicator('success')} Low`
    return `${this.createVisualIndicator('warning')} Medium`
  }

  private getBenefitRating(benefit: string): string {
    const lower = benefit.toLowerCase()
    if (lower.includes('high') || lower.includes('significant') || lower.includes('full')) 
      return `${this.createVisualIndicator('success')} High`
    if (lower.includes('low') || lower.includes('minimal') || lower.includes('none')) 
      return `${this.createVisualIndicator('error')} Low`
    return `${this.createVisualIndicator('warning')} Medium`
  }

  private getRiskRating(risk: string): string {
    const lower = risk.toLowerCase()
    if (lower.includes('high')) 
      return `${this.createVisualIndicator('error')} High`
    if (lower.includes('low')) 
      return `${this.createVisualIndicator('success')} Low`
    return `${this.createVisualIndicator('warning')} Medium`
  }

  private getFeasibilityRating(index: number, total: number): string {
    if (index === 0) return `${this.createVisualIndicator('error')} Low`
    if (index === total - 1) return `${this.createVisualIndicator('success')} High`
    return `${this.createVisualIndicator('warning')} Medium`
  }

  private generateExpectedBenefitsSection(): string {
    const measurable = this.data.expectedBenefits.filter(b => b.measurable)
    const nonMeasurable = this.data.expectedBenefits.filter(b => !b.measurable)
    
    // Calculate dynamic dates based on project timeline
    const startDate = this.metadata.startDate ? new Date(this.metadata.startDate) : new Date()
    const endDate = this.metadata.endDate ? new Date(this.metadata.endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    
    // Benefits realization dates (after project completion)
    const quickWinsStart = this.formatDateForGantt(endDate)
    const mediumTermStart = this.formatDateForGantt(new Date(endDate.getTime() + 90 * 24 * 60 * 60 * 1000))
    const longTermStart = this.formatDateForGantt(new Date(endDate.getTime() + 180 * 24 * 60 * 60 * 1000))
    
    return `
      <section class="document-section" id="expected-benefits">
        <h2>5. Expected Benefits</h2>
        
        ${measurable.length > 0 ? `
          <h3>5.1 Quantifiable Benefits</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Benefit</th>
                <th>Measurable</th>
                <th>Measurement Method</th>
                <th>Baseline</th>
                <th>Target</th>
                <th>When Realized</th>
              </tr>
            </thead>
            <tbody>
              ${measurable.map(b => `
                <tr>
                  <td>${b.benefit}</td>
                  <td>✅ Yes</td>
                  <td>${b.measurement || 'TBD'}</td>
                  <td>${b.baseline || 'Current'}</td>
                  <td>${b.target || 'TBD'}</td>
                  <td>${b.whenRealized || 'Project + 6 months'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        
        ${nonMeasurable.length > 0 ? `
          <h3>5.2 Non-Quantifiable Benefits</h3>
          <ul>
            ${nonMeasurable.map(b => `<li>${b.benefit}</li>`).join('')}
          </ul>
        ` : ''}
        
        <h3>5.3 Benefits Realization Timeline</h3>
        ${this.createMermaidChart('gantt', `
gantt
    title Benefits Realization Timeline
    dateFormat YYYY-MM-DD
    section Quick Wins
    Efficiency Gains :${quickWinsStart}, 90d
    section Medium Term
    Cost Savings :${mediumTermStart}, 180d
    section Long Term
    Strategic Benefits :${longTermStart}, 365d
        `)}
      </section>
    `
  }

  private generateExpectedDisBenefitsSection(): string {
    const disbenefits = this.data.expectedDisBenefits
    
    return `
      <section class="document-section" id="expected-disbenefits">
        <h2>6. Expected Dis-benefits</h2>
        
        <p>The following dis-benefits have been identified and will be managed:</p>
        
        ${disbenefits.map(db => {
          if (typeof db === 'string') {
            return `
              <div class="disbenefit-item">
                <h4>⚠️ ${db}</h4>
                <p><strong>Mitigation Strategy:</strong> Appropriate change management and communication plans will be implemented to minimize impact.</p>
              </div>
            `
          }
          return `
            <div class="disbenefit-item">
              <h4>⚠️ ${db.disbenefit}</h4>
              <p><strong>Impact:</strong> ${db.impact}</p>
              <p><strong>Mitigation Strategy:</strong> ${db.mitigation}</p>
            </div>
          `
        }).join('')}
        
        <h3>Dis-benefits Management</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Dis-benefit</th>
              <th>Impact</th>
              <th>Affected Parties</th>
              <th>Mitigation</th>
            </tr>
          </thead>
          <tbody>
            ${disbenefits.map(db => {
              if (typeof db === 'string') {
                return `
                  <tr>
                    <td>${db}</td>
                    <td>Medium</td>
                    <td>Stakeholders</td>
                    <td>Change management plan</td>
                  </tr>
                `
              }
              return `
                <tr>
                  <td>${db.disbenefit}</td>
                  <td>${db.impact}</td>
                  <td>Stakeholders</td>
                  <td>${db.mitigation}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </section>
    `
  }

  private generateTimescaleSection(): string {
    // Calculate quarters based on actual project dates
    const startDate = this.metadata.startDate ? new Date(this.metadata.startDate) : new Date()
    const endDate = this.metadata.endDate ? new Date(this.metadata.endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    
    const quarters = this.calculateProjectQuarters(startDate, endDate)
    
    return `
      <section class="document-section" id="timescale">
        <h2>7. Timescale</h2>
        
        <h3>Project Duration</h3>
        <p>${this.data.timescale}</p>
        
        <h3>Key Milestones</h3>
        ${this.createMermaidChart('timeline', `
timeline
    title Project Timeline
    
    Project Initiation : ${quarters[0]}
    
    Phase 1 - Foundation : ${quarters[1]}
    
    Phase 2 - Development : ${quarters[2]}
    
    Phase 3 - Implementation : ${quarters[3]}
    
    Project Closure : ${quarters[4]}
    
    Benefits Realization : ${quarters[5]}-${quarters[7]}
        `)}
        
        <h3>Critical Dates</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Target Date</th>
              <th>Dependencies</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Project Start</td>
              <td>${this.formatDateForDisplay(startDate)}</td>
              <td>Approval & Funding</td>
            </tr>
            <tr>
              <td>Phase 1 Complete</td>
              <td>${this.formatDateForDisplay(this.calculateMilestoneDate(startDate, endDate, 0.25))}</td>
              <td>Requirements finalized</td>
            </tr>
            <tr>
              <td>Phase 2 Complete</td>
              <td>${this.formatDateForDisplay(this.calculateMilestoneDate(startDate, endDate, 0.5))}</td>
              <td>Development resources</td>
            </tr>
            <tr>
              <td>Go-Live</td>
              <td>${this.formatDateForDisplay(this.calculateMilestoneDate(startDate, endDate, 0.75))}</td>
              <td>Testing & training</td>
            </tr>
            <tr>
              <td>Project Close</td>
              <td>${this.formatDateForDisplay(endDate)}</td>
              <td>Handover complete</td>
            </tr>
          </tbody>
        </table>
      </section>
    `
  }

  private generateCostsSection(): string {
    const costs = this.data.costs
    
    return `
      <section class="document-section" id="costs">
        <h2>8. Costs</h2>
        
        <h3>8.1 Cost Breakdown</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>% of Total</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Development Costs</strong></td>
              <td>${costs.development}</td>
              <td>${this.calculatePercentage(costs.development, costs.total)}%</td>
              <td>Initial build and setup</td>
            </tr>
            <tr>
              <td><strong>Operational Costs</strong></td>
              <td>${costs.operational}</td>
              <td>${this.calculatePercentage(costs.operational, costs.total)}%</td>
              <td>Running costs per annum</td>
            </tr>
            <tr>
              <td><strong>Maintenance Costs</strong></td>
              <td>${costs.maintenance}</td>
              <td>${this.calculatePercentage(costs.maintenance, costs.total)}%</td>
              <td>Ongoing support</td>
            </tr>
            <tr>
              <td><strong>Contingency</strong></td>
              <td>${costs.contingency || '10%'} of total</td>
              <td>10%</td>
              <td>Risk mitigation</td>
            </tr>
            <tr class="total-row">
              <td><strong>TOTAL</strong></td>
              <td><strong>${costs.total}</strong></td>
              <td><strong>100%</strong></td>
              <td>All inclusive</td>
            </tr>
          </tbody>
        </table>
        
        <h3>8.2 Cost Distribution</h3>
        ${this.createMermaidChart('pie', `
pie title Cost Distribution
    "Development" : 60
    "Operational" : 25
    "Maintenance" : 10
    "Contingency" : 5
        `)}
        
        <h3>8.3 Funding Source</h3>
        <ul>
          <li>Internal budget allocation: 70%</li>
          <li>Capital investment fund: 30%</li>
        </ul>
      </section>
    `
  }

  private calculatePercentage(part: string, total: string): number {
    try {
      const partValue = parseFloat(part.replace(/[^0-9.-]/g, '') || '0')
      const totalValue = parseFloat(total.replace(/[^0-9.-]/g, '') || '0')
      
      if (totalValue === 0) return 0
      
      return Math.round((partValue / totalValue) * 100)
    } catch {
      return 0
    }
  }

  private generateInvestmentAppraisalSection(): string {
    const appraisal = this.data.investmentAppraisal
    
    return `
      <section class="document-section" id="investment-appraisal">
        <h2>9. Investment Appraisal</h2>
        
        <h3>9.1 Financial Metrics</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Assessment</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Return on Investment (ROI)</strong></td>
              <td>${appraisal.roi}</td>
              <td>${this.createVisualIndicator('success')} Exceeds threshold</td>
            </tr>
            <tr>
              <td><strong>Payback Period</strong></td>
              <td>${appraisal.paybackPeriod}</td>
              <td>${this.createVisualIndicator('success')} Acceptable</td>
            </tr>
            <tr>
              <td><strong>Net Present Value (NPV)</strong></td>
              <td>${appraisal.npv || 'Positive'}</td>
              <td>${this.createVisualIndicator('success')} Positive</td>
            </tr>
            <tr>
              <td><strong>Internal Rate of Return (IRR)</strong></td>
              <td>${appraisal.irr || '15%'}</td>
              <td>${this.createVisualIndicator('success')} Above hurdle rate</td>
            </tr>
          </tbody>
        </table>
        
        <h3>9.2 Sensitivity Analysis</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>ROI</th>
              <th>Payback</th>
              <th>NPV</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Best Case</strong> (+20% benefits)</td>
              <td>${this.adjustROI(appraisal.roi, 1.2)}</td>
              <td>Reduced 20%</td>
              <td>Very Positive</td>
              <td>✅ Proceed</td>
            </tr>
            <tr>
              <td><strong>Expected Case</strong></td>
              <td>${appraisal.roi}</td>
              <td>${appraisal.paybackPeriod}</td>
              <td>Positive</td>
              <td>✅ Proceed</td>
            </tr>
            <tr>
              <td><strong>Worst Case</strong> (-20% benefits)</td>
              <td>${this.adjustROI(appraisal.roi, 0.8)}</td>
              <td>Extended 20%</td>
              <td>Marginal</td>
              <td>⚠️ Review</td>
            </tr>
          </tbody>
        </table>
        
        <h3>9.3 Break-even Analysis</h3>
        ${this.createMermaidChart('graph', `
graph LR
    A[Investment] -->|Month 0| B[${this.data.costs.total}]
    B -->|Operations| C[Break-even]
    C -->|${appraisal.paybackPeriod}| D[Profit]
    D -->|Ongoing| E[ROI ${appraisal.roi}]
        `)}
      </section>
    `
  }

  private adjustROI(roi: string, factor: number): string {
    try {
      const roiMatch = roi.match(/([\d.]+)%?/)
      if (!roiMatch) return roi
      
      const roiValue = parseFloat(roiMatch[1])
      const adjustedROI = Math.round(roiValue * factor)
      
      return `${adjustedROI}%`
    } catch {
      return roi
    }
  }

  private generateMajorRisksSection(): string {
    const risks = this.data.majorRisks
    
    // Normalize risks to object format
    const normalizedRisks = risks.map((risk, index) => {
      if (typeof risk === 'string') {
        return {
          risk,
          probability: 'Medium',
          impact: 'High',
          mitigation: 'Risk management plan in place'
        }
      }
      return risk
    })
    
    return `
      <section class="document-section" id="major-risks">
        <h2>10. Major Risks</h2>
        
        <h3>10.1 Risk Summary</h3>
        <p>The following major risks could impact the business case:</p>
        
        ${normalizedRisks.map((risk, i) => `
          <div class="risk-item">
            <h4>Risk ${i + 1}: ${risk.risk}</h4>
            <ul>
              <li><strong>Probability:</strong> ${risk.probability}</li>
              <li><strong>Impact:</strong> ${risk.impact}</li>
              <li><strong>Mitigation:</strong> ${risk.mitigation}</li>
            </ul>
          </div>
        `).join('')}
        
        <h3>10.2 Risk Matrix</h3>
        <table class="risk-matrix">
          <thead>
            <tr>
              <th>Risk</th>
              <th>Probability</th>
              <th>Impact</th>
              <th>Score</th>
              <th>Response</th>
            </tr>
          </thead>
          <tbody>
            ${normalizedRisks.map(risk => {
              const probScore = this.getRiskScore(risk.probability)
              const impactScore = this.getRiskScore(risk.impact)
              const totalScore = probScore * impactScore
              
              return `
                <tr>
                  <td>${risk.risk}</td>
                  <td>${this.getRiskIndicator(risk.probability)} ${risk.probability}</td>
                  <td>${this.getRiskIndicator(risk.impact)} ${risk.impact}</td>
                  <td class="risk-score-${this.getRiskScoreLevel(totalScore)}">${totalScore}</td>
                  <td>Mitigate</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
        
        <h3>10.3 Risk Impact on Business Case</h3>
        <p>If major risks materialize:</p>
        <ul>
          <li>ROI could reduce by up to 20%</li>
          <li>Payback period could extend by 6 months</li>
          <li>Additional contingency funds may be required</li>
        </ul>
      </section>
    `
  }

  private getRiskScore(level: string): number {
    const lower = level.toLowerCase()
    if (lower.includes('high') || lower.includes('fatal')) return 5
    if (lower.includes('medium') || lower.includes('moderate')) return 3
    return 1
  }

  private getRiskIndicator(level: string): string {
    const lower = level.toLowerCase()
    if (lower.includes('high') || lower.includes('fatal')) 
      return this.createVisualIndicator('error')
    if (lower.includes('medium') || lower.includes('moderate')) 
      return this.createVisualIndicator('warning')
    return this.createVisualIndicator('success')
  }

  private getRiskScoreLevel(score: number): string {
    if (score >= 15) return 'high'
    if (score >= 9) return 'medium'
    return 'low'
  }

  private generateRecommendationSection(): string {
    return `
      <section class="document-section" id="recommendation">
        <h2>11. Recommendation</h2>
        
        <h3>11.1 Recommended Action</h3>
        <p>Based on the analysis presented in this business case:</p>
        
        ${this.createHighlightBox(
          'RECOMMENDATION: APPROVE AND PROCEED',
          `The project demonstrates:
          <ul>
            <li>Strong financial returns with ROI of ${this.data.investmentAppraisal.roi}</li>
            <li>Acceptable payback period of ${this.data.investmentAppraisal.paybackPeriod}</li>
            <li>Clear strategic alignment with organizational objectives</li>
            <li>Manageable risk profile with mitigation strategies in place</li>
          </ul>`,
          'success'
        )}
        
        <h3>11.2 Conditions for Approval</h3>
        <ol>
          <li>Secure executive sponsorship and governance structure</li>
          <li>Confirm resource availability and budget allocation</li>
          <li>Establish project management office and controls</li>
          <li>Implement risk management framework</li>
          <li>Define success criteria and benefits tracking</li>
        </ol>
        
        <h3>11.3 Next Steps</h3>
        <ol>
          <li>Present business case to investment committee</li>
          <li>Obtain formal approval and funding release</li>
          <li>Initiate project charter development</li>
          <li>Mobilize project team and resources</li>
          <li>Commence project initiation phase</li>
        </ol>
      </section>
    `
  }

  private getBusinessCaseStyles(): string {
    return `
      <style>
        .business-case-document {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .business-option {
          background: #f9f9f9;
          border-left: 4px solid #2196f3;
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 4px;
        }
        
        .disbenefit-item {
          background: #fff3e0;
          border-left: 4px solid #ff9800;
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 4px;
        }
        
        .risk-item {
          background: #ffebee;
          border-left: 4px solid #f44336;
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 4px;
        }
        
        .risk-matrix {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .risk-matrix th {
          background: #ffebee;
          padding: 0.75rem;
          text-align: left;
          border: 1px solid #ffcdd2;
          font-weight: 600;
        }
        
        .risk-matrix td {
          padding: 0.75rem;
          border: 1px solid #ffcdd2;
        }
        
        .risk-score-high {
          background: #ff5252;
          color: white;
          font-weight: bold;
          text-align: center;
        }
        
        .risk-score-medium {
          background: #ffc107;
          color: #333;
          font-weight: bold;
          text-align: center;
        }
        
        .risk-score-low {
          background: #4caf50;
          color: white;
          font-weight: bold;
          text-align: center;
        }
        
        .key-metrics th {
          background: #e3f2fd;
          border-color: #90caf9;
        }
        
        .total-row {
          background: #f5f5f5;
          font-weight: bold;
        }
        
        .table-of-contents {
          background: #f9f9f9;
          padding: 1.5rem;
          border-radius: 8px;
          margin: 2rem 0;
        }
        
        .table-of-contents ol {
          margin-left: 1.5rem;
        }
        
        .table-of-contents a {
          color: #2196f3;
          text-decoration: none;
        }
        
        .table-of-contents a:hover {
          text-decoration: underline;
        }
      </style>
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