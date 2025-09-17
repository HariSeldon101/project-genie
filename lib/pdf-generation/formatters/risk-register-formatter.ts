/**
 * Risk Register HTML Formatter
 */

import { BaseHTMLFormatter } from './base-formatter'

export class RiskRegisterFormatter extends BaseHTMLFormatter {
  /**
   * Format Risk Register content to HTML
   */
  formatToHTML(content: any): string {
    const sections: string[] = []
    
    // Add styles
    sections.push(this.getStyles())
    
    // Add watermark if needed
    sections.push(this.createWatermark())
    
    // Add header/footer
    sections.push(this.createHeader())
    sections.push(this.createFooter())
    
    // Start container
    sections.push('<div class="pdf-container">')
    
    // Cover page
    sections.push(this.createCoverPage())
    
    // Page break after cover
    sections.push('<div style="page-break-after: always;"></div>')
    
    // Handle raw text content if provided
    if (content.rawText) {
      sections.push(this.formatSection(
        'Risk Register',
        content.rawText,
        2
      ))
    }
    
    // Executive Summary
    if (content.executiveSummary || content.executive_summary || content.summary) {
      sections.push(this.formatSection(
        'Executive Summary',
        content.executiveSummary || content.executive_summary || content.summary,
        2
      ))
    }
    
    // Risk Overview
    if (content.overview || content.riskOverview) {
      sections.push(this.formatSection(
        'Risk Overview',
        content.overview || content.riskOverview,
        2
      ))
    }
    
    // Risk Categories
    if (content.categories || content.riskCategories) {
      sections.push(this.formatRiskCategories(content.categories || content.riskCategories))
    }
    
    // Main Risk Register - check for 'risks' directly on content
    if (content.risks || content.riskRegister) {
      sections.push(this.formatRiskRegister(content.risks || content.riskRegister))
    }
    
    // Risk Matrix
    if (content.riskMatrix || content.matrix) {
      sections.push(this.formatRiskMatrix(content.riskMatrix || content.matrix))
    }
    
    // Risk Response Strategies
    if (content.responseStrategies || content.strategies) {
      sections.push(this.formatResponseStrategies(content.responseStrategies || content.strategies))
    }
    
    // Risk Monitoring
    if (content.monitoring || content.riskMonitoring) {
      sections.push(this.formatSection(
        'Risk Monitoring',
        content.monitoring || content.riskMonitoring,
        2
      ))
    }
    
    // Risk Governance
    if (content.governance || content.riskGovernance) {
      sections.push(this.formatSection(
        'Risk Governance',
        content.governance || content.riskGovernance,
        2
      ))
    }
    
    // Close container
    sections.push('</div>')
    
    return sections.join('\n')
  }
  
  /**
   * Format risk categories
   */
  private formatRiskCategories(categories: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Risk Categories</h2>')
    
    if (Array.isArray(categories)) {
      html.push('<div class="categories-grid">')
      categories.forEach(category => {
        const color = this.getCategoryColor(category.name || category.category)
        html.push(`
          <div class="category-card" style="border-left-color: ${color}">
            <h3>${this.escapeHtml(category.name || category.category)}</h3>
            <p>${this.escapeHtml(category.description || '')}</p>
            ${category.count ? `<div class="category-count">${category.count} risks</div>` : ''}
          </div>
        `)
      })
      html.push('</div>')
    } else {
      html.push(`<p>${this.escapeHtml(categories)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format main risk register
   */
  private formatRiskRegister(risks: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Risk Register</h2>')
    
    if (Array.isArray(risks)) {
      // Group risks by status
      const openRisks = risks.filter(r => r.status !== 'Closed' && r.status !== 'Resolved')
      const closedRisks = risks.filter(r => r.status === 'Closed' || r.status === 'Resolved')
      
      if (openRisks.length > 0) {
        html.push('<h3>Active Risks</h3>')
        html.push(this.formatRiskTable(openRisks))
      }
      
      if (closedRisks.length > 0) {
        html.push('<h3>Closed Risks</h3>')
        html.push(this.formatRiskTable(closedRisks))
      }
    } else {
      html.push(`<p>${this.escapeHtml(risks)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format risk table
   */
  private formatRiskTable(risks: any[]): string {
    const html: string[] = []
    
    html.push('<table class="pdf-table risk-register-table">')
    html.push(`
      <thead>
        <tr>
          <th>ID</th>
          <th>Risk</th>
          <th>Category</th>
          <th>Probability</th>
          <th>Impact</th>
          <th>Score</th>
          <th>Response</th>
          <th>Owner</th>
          <th>Status</th>
        </tr>
      </thead>
    `)
    html.push('<tbody>')
    
    risks.forEach((risk, index) => {
      const probability = risk.probability || 'Medium'
      const impact = risk.impact || 'Medium'
      const score = this.calculateRiskScore(probability, impact)
      const scoreClass = this.getRiskScoreClass(score)
      
      html.push(`
        <tr class="${scoreClass}">
          <td>${risk.id || `R${(index + 1).toString().padStart(3, '0')}`}</td>
          <td>${this.escapeHtml(risk.risk || risk.description || risk.title)}</td>
          <td>${this.escapeHtml(risk.category || 'General')}</td>
          <td>${this.escapeHtml(probability)}</td>
          <td>${this.escapeHtml(impact)}</td>
          <td><span class="risk-score-badge ${scoreClass}">${score}</span></td>
          <td>${this.escapeHtml(risk.response || risk.mitigation || 'TBD')}</td>
          <td>${this.escapeHtml(risk.owner || 'Unassigned')}</td>
          <td><span class="status-badge status-${(risk.status || 'Open').toLowerCase()}">${risk.status || 'Open'}</span></td>
        </tr>
      `)
    })
    
    html.push('</tbody></table>')
    return html.join('\n')
  }
  
  /**
   * Format risk matrix
   */
  private formatRiskMatrix(matrix: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Risk Matrix</h2>')
    
    // Create a 5x5 risk matrix
    const probabilities = ['Very Low', 'Low', 'Medium', 'High', 'Very High']
    const impacts = ['Very Low', 'Low', 'Medium', 'High', 'Very High']
    
    html.push('<div class="risk-matrix-container">')
    html.push('<table class="risk-matrix">')
    
    // Header row
    html.push('<thead><tr>')
    html.push('<th></th>')
    impacts.forEach(impact => {
      html.push(`<th>${impact}</th>`)
    })
    html.push('</tr></thead>')
    
    // Matrix cells
    html.push('<tbody>')
    probabilities.reverse().forEach(probability => {
      html.push('<tr>')
      html.push(`<th>${probability}</th>`)
      impacts.forEach(impact => {
        const score = this.calculateMatrixScore(probability, impact)
        const cellClass = this.getMatrixCellClass(score)
        const riskCount = this.countRisksInCell(matrix, probability, impact)
        html.push(`
          <td class="${cellClass}">
            ${riskCount > 0 ? `<div class="risk-count">${riskCount}</div>` : ''}
          </td>
        `)
      })
      html.push('</tr>')
    })
    html.push('</tbody>')
    
    html.push('</table>')
    
    // Legend
    html.push(`
      <div class="matrix-legend">
        <div class="legend-item"><span class="legend-color low"></span> Low Risk</div>
        <div class="legend-item"><span class="legend-color medium"></span> Medium Risk</div>
        <div class="legend-item"><span class="legend-color high"></span> High Risk</div>
        <div class="legend-item"><span class="legend-color critical"></span> Critical Risk</div>
      </div>
    `)
    
    html.push('</div>')
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Format response strategies
   */
  private formatResponseStrategies(strategies: any): string {
    const html: string[] = ['<div class="section">']
    html.push('<h2>Risk Response Strategies</h2>')
    
    if (Array.isArray(strategies)) {
      strategies.forEach(strategy => {
        html.push(`
          <div class="strategy-card">
            <h3>${this.escapeHtml(strategy.type || strategy.name)}</h3>
            <p><strong>Description:</strong> ${this.escapeHtml(strategy.description || '')}</p>
            ${strategy.applicable ? `<p><strong>Applicable to:</strong> ${this.escapeHtml(strategy.applicable)}</p>` : ''}
            ${strategy.examples ? `
              <div>
                <strong>Examples:</strong>
                ${this.formatList(strategy.examples)}
              </div>
            ` : ''}
          </div>
        `)
      })
    } else if (typeof strategies === 'object') {
      Object.entries(strategies).forEach(([key, value]) => {
        html.push(this.formatSection(this.formatHeader(key), value, 3))
      })
    } else {
      html.push(`<p>${this.escapeHtml(strategies)}</p>`)
    }
    
    html.push('</div>')
    return html.join('\n')
  }
  
  /**
   * Calculate risk score
   */
  private calculateRiskScore(probability: string, impact: string): string {
    const levels: Record<string, number> = {
      'Very Low': 1,
      'Low': 2,
      'Medium': 3,
      'High': 4,
      'Very High': 5
    }
    
    const probScore = levels[probability] || 3
    const impactScore = levels[impact] || 3
    const total = probScore * impactScore
    
    if (total <= 4) return 'Low'
    if (total <= 9) return 'Medium'
    if (total <= 15) return 'High'
    return 'Critical'
  }
  
  /**
   * Calculate matrix score
   */
  private calculateMatrixScore(probability: string, impact: string): number {
    const levels: Record<string, number> = {
      'Very Low': 1,
      'Low': 2,
      'Medium': 3,
      'High': 4,
      'Very High': 5
    }
    
    return (levels[probability] || 3) * (levels[impact] || 3)
  }
  
  /**
   * Get risk score class
   */
  private getRiskScoreClass(score: string): string {
    return `risk-${score.toLowerCase()}`
  }
  
  /**
   * Get matrix cell class
   */
  private getMatrixCellClass(score: number): string {
    if (score <= 4) return 'matrix-low'
    if (score <= 9) return 'matrix-medium'
    if (score <= 15) return 'matrix-high'
    return 'matrix-critical'
  }
  
  /**
   * Get category color
   */
  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Technical': '#2196F3',
      'Financial': '#4CAF50',
      'Schedule': '#FF9800',
      'Resource': '#9C27B0',
      'External': '#F44336',
      'Legal': '#795548',
      'Security': '#E91E63',
      'Operational': '#00BCD4'
    }
    
    return colors[category] || '#607D8B'
  }
  
  /**
   * Count risks in matrix cell
   */
  private countRisksInCell(matrix: any, probability: string, impact: string): number {
    if (!Array.isArray(matrix)) return 0
    
    return matrix.filter(risk => 
      risk.probability === probability && risk.impact === impact
    ).length
  }
  
  /**
   * Get document-specific styles
   */
  protected getDocumentSpecificStyles(): string {
    return `
      .categories-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
      }
      
      .category-card {
        padding: 1rem;
        background: #f9f9f9;
        border-left: 4px solid;
        border-radius: 4px;
      }
      
      .category-count {
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: #666;
        font-weight: 600;
      }
      
      .risk-register-table {
        font-size: 0.9rem;
      }
      
      .risk-register-table th {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .risk-low {
        background-color: #e8f5e9;
      }
      
      .risk-medium {
        background-color: #fff9e6;
      }
      
      .risk-high {
        background-color: #ffebee;
      }
      
      .risk-critical {
        background-color: #ffcdd2;
      }
      
      .risk-score-badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.85rem;
      }
      
      .risk-score-badge.risk-low {
        background: #4CAF50;
        color: white;
      }
      
      .risk-score-badge.risk-medium {
        background: #FF9800;
        color: white;
      }
      
      .risk-score-badge.risk-high {
        background: #F44336;
        color: white;
      }
      
      .risk-score-badge.risk-critical {
        background: #9C27B0;
        color: white;
      }
      
      .status-badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      
      .status-open {
        background: #FFF3E0;
        color: #E65100;
      }
      
      .status-monitoring {
        background: #E3F2FD;
        color: #0D47A1;
      }
      
      .status-closed {
        background: #E0E0E0;
        color: #616161;
      }
      
      .status-resolved {
        background: #E8F5E9;
        color: #1B5E20;
      }
      
      .risk-matrix-container {
        margin: 2rem 0;
      }
      
      .risk-matrix {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        border-collapse: collapse;
      }
      
      .risk-matrix th {
        padding: 0.75rem;
        text-align: center;
        background: #f5f5f5;
        font-weight: 600;
      }
      
      .risk-matrix td {
        width: 80px;
        height: 80px;
        text-align: center;
        border: 1px solid #ddd;
        position: relative;
      }
      
      .matrix-low {
        background: #C8E6C9;
      }
      
      .matrix-medium {
        background: #FFF9C4;
      }
      
      .matrix-high {
        background: #FFCCBC;
      }
      
      .matrix-critical {
        background: #F8BBD0;
      }
      
      .risk-count {
        font-size: 1.5rem;
        font-weight: bold;
        color: #333;
      }
      
      .matrix-legend {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-top: 1rem;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .legend-color {
        width: 20px;
        height: 20px;
        border: 1px solid #ddd;
      }
      
      .legend-color.low {
        background: #C8E6C9;
      }
      
      .legend-color.medium {
        background: #FFF9C4;
      }
      
      .legend-color.high {
        background: #FFCCBC;
      }
      
      .legend-color.critical {
        background: #F8BBD0;
      }
      
      .strategy-card {
        background: #f9f9f9;
        padding: 1.5rem;
        margin: 1rem 0;
        border-radius: 8px;
        border-left: 4px solid #2196F3;
      }
      
      .strategy-card h3 {
        margin-top: 0;
        color: #1976D2;
      }
    `
  }
}