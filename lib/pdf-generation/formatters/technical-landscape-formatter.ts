/**
 * Technical Landscape HTML Formatter
 * Handles architecture diagrams, technology stacks, integrations, and technical analysis
 */

import { BaseHTMLFormatter } from './base-formatter'

export class TechnicalLandscapeFormatter extends BaseHTMLFormatter {
  /**
   * Format Technical Landscape content to HTML
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
    
    // Table of Contents
    sections.push(this.createTableOfContents())
    
    // Executive Summary
    if (content.summary || content.executive_summary || content.overview) {
      sections.push(this.formatSection(
        '1. Executive Summary',
        content.summary || content.executive_summary || content.overview,
        2
      ))
    }
    
    // Current State Analysis
    if (content.currentState || content.current_state || content.as_is) {
      sections.push('<div class="section">')
      sections.push('<h2>2. Current State Analysis</h2>')
      sections.push(this.formatCurrentState(content.currentState || content.current_state || content.as_is))
      sections.push('</div>')
    }
    
    // Technology Stack
    if (content.techStack || content.tech_stack || content.technologies) {
      sections.push('<div class="section">')
      sections.push('<h2>3. Technology Stack</h2>')
      sections.push(this.formatTechStack(content.techStack || content.tech_stack || content.technologies))
      sections.push('</div>')
    }
    
    // System Architecture
    if (content.architecture || content.system_architecture) {
      sections.push('<div class="section">')
      sections.push('<h2>4. System Architecture</h2>')
      sections.push(this.formatArchitecture(content.architecture || content.system_architecture))
      sections.push('</div>')
    }
    
    // Integrations
    if (content.integrations || content.interfaces) {
      sections.push('<div class="section">')
      sections.push('<h2>5. Integrations & Interfaces</h2>')
      sections.push(this.formatIntegrations(content.integrations || content.interfaces))
      sections.push('</div>')
    }
    
    // Infrastructure
    if (content.infrastructure || content.hosting) {
      sections.push('<div class="section">')
      sections.push('<h2>6. Infrastructure</h2>')
      sections.push(this.formatInfrastructure(content.infrastructure || content.hosting))
      sections.push('</div>')
    }
    
    // Security Architecture
    if (content.security || content.security_architecture) {
      sections.push('<div class="section">')
      sections.push('<h2>7. Security Architecture</h2>')
      sections.push(this.formatSecurity(content.security || content.security_architecture))
      sections.push('</div>')
    }
    
    // Performance Requirements
    if (content.performance || content.performance_requirements) {
      sections.push('<div class="section">')
      sections.push('<h2>8. Performance Requirements</h2>')
      sections.push(this.formatPerformance(content.performance || content.performance_requirements))
      sections.push('</div>')
    }
    
    // Technical Debt
    if (content.technicalDebt || content.technical_debt || content.debt) {
      sections.push('<div class="section">')
      sections.push('<h2>9. Technical Debt</h2>')
      sections.push(this.formatTechnicalDebt(content.technicalDebt || content.technical_debt || content.debt))
      sections.push('</div>')
    }
    
    // Future State / Roadmap
    if (content.futureState || content.future_state || content.roadmap || content.to_be) {
      sections.push('<div class="section">')
      sections.push('<h2>10. Future State & Roadmap</h2>')
      sections.push(this.formatFutureState(content.futureState || content.future_state || content.roadmap || content.to_be))
      sections.push('</div>')
    }
    
    // Recommendations
    if (content.recommendations) {
      sections.push('<div class="section">')
      sections.push('<h2>11. Recommendations</h2>')
      sections.push(this.formatRecommendations(content.recommendations))
      sections.push('</div>')
    }
    
    // Close container
    sections.push('</div>')
    
    return sections.join('\n')
  }
  
  /**
   * Create table of contents
   */
  private createTableOfContents(): string {
    return `
      <div class="section toc">
        <h2>Table of Contents</h2>
        <ol class="toc-list">
          <li><a href="#section-1">Executive Summary</a></li>
          <li><a href="#section-2">Current State Analysis</a></li>
          <li><a href="#section-3">Technology Stack</a></li>
          <li><a href="#section-4">System Architecture</a></li>
          <li><a href="#section-5">Integrations & Interfaces</a></li>
          <li><a href="#section-6">Infrastructure</a></li>
          <li><a href="#section-7">Security Architecture</a></li>
          <li><a href="#section-8">Performance Requirements</a></li>
          <li><a href="#section-9">Technical Debt</a></li>
          <li><a href="#section-10">Future State & Roadmap</a></li>
          <li><a href="#section-11">Recommendations</a></li>
        </ol>
      </div>
      <div style="page-break-after: always;"></div>
    `
  }
  
  /**
   * Format current state analysis
   */
  private formatCurrentState(currentState: any): string {
    const html: string[] = []
    
    if (typeof currentState === 'string') {
      html.push(`<p>${currentState}</p>`)
    } else if (currentState) {
      if (currentState.systems) {
        html.push('<h3>2.1 Existing Systems</h3>')
        html.push(this.formatSystemsList(currentState.systems))
      }
      
      if (currentState.challenges) {
        html.push('<h3>2.2 Current Challenges</h3>')
        html.push(this.formatChallenges(currentState.challenges))
      }
      
      if (currentState.assessment) {
        html.push('<h3>2.3 Assessment</h3>')
        html.push(this.formatSection('', currentState.assessment, 0))
      }
    }
    
    return html.join('\n')
  }
  
  /**
   * Format technology stack
   */
  private formatTechStack(techStack: any): string {
    const html: string[] = []
    
    // Create tech stack visualization
    html.push('<div class="tech-stack-container">')
    
    if (Array.isArray(techStack)) {
      html.push(this.createTechStackTable(techStack))
    } else if (typeof techStack === 'object') {
      // Layered architecture view
      html.push('<div class="tech-layers">')
      
      const layers = [
        { key: 'frontend', label: 'Frontend', color: '#4fc3f7' },
        { key: 'backend', label: 'Backend', color: '#66bb6a' },
        { key: 'database', label: 'Database', color: '#ffa726' },
        { key: 'infrastructure', label: 'Infrastructure', color: '#ab47bc' },
        { key: 'tools', label: 'Tools & Services', color: '#ef5350' }
      ]
      
      layers.forEach(layer => {
        if (techStack[layer.key]) {
          html.push(`<div class="tech-layer" style="border-left: 4px solid ${layer.color};">`)
          html.push(`<h3>${layer.label}</h3>`)
          html.push('<div class="tech-items">')
          
          const items = Array.isArray(techStack[layer.key]) ? techStack[layer.key] : [techStack[layer.key]]
          items.forEach((item: any) => {
            if (typeof item === 'string') {
              html.push(`<span class="tech-badge">${item}</span>`)
            } else if (item.name || item.technology) {
              html.push(`<span class="tech-badge">`)
              html.push(`${item.name || item.technology}`)
              if (item.version) html.push(` v${item.version}`)
              html.push(`</span>`)
            }
          })
          
          html.push('</div>')
          html.push('</div>')
        }
      })
      
      // Handle any other properties
      Object.keys(techStack).forEach(key => {
        if (!layers.find(l => l.key === key)) {
          html.push(`<div class="tech-layer">`)
          html.push(`<h3>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>`)
          html.push(this.formatSection('', techStack[key], 0))
          html.push('</div>')
        }
      })
      
      html.push('</div>')
    } else {
      html.push(this.formatSection('', techStack, 3))
    }
    
    // Add tech stack diagram
    html.push(this.createTechStackDiagram())
    
    html.push('</div>')
    
    return html.join('\n')
  }
  
  /**
   * Create tech stack table
   */
  private createTechStackTable(techStack: any[]): string {
    const html: string[] = []
    
    html.push('<table class="data-table tech-table">')
    html.push('<thead>')
    html.push('<tr>')
    html.push('<th>Layer</th>')
    html.push('<th>Technology</th>')
    html.push('<th>Version</th>')
    html.push('<th>Purpose</th>')
    html.push('<th>Status</th>')
    html.push('</tr>')
    html.push('</thead>')
    html.push('<tbody>')
    
    techStack.forEach(tech => {
      if (typeof tech === 'string') {
        html.push(`<tr><td colspan="5">${tech}</td></tr>`)
      } else {
        const statusClass = (tech.status || '').toLowerCase() === 'deprecated' ? 'status-deprecated' :
                           (tech.status || '').toLowerCase() === 'legacy' ? 'status-legacy' :
                           'status-active'
        html.push('<tr>')
        html.push(`<td>${tech.layer || tech.category || 'General'}</td>`)
        html.push(`<td><strong>${tech.name || tech.technology || 'Unknown'}</strong></td>`)
        html.push(`<td>${tech.version || 'Latest'}</td>`)
        html.push(`<td>${tech.purpose || tech.description || ''}</td>`)
        html.push(`<td class="${statusClass}">${tech.status || 'Active'}</td>`)
        html.push('</tr>')
      }
    })
    
    html.push('</tbody>')
    html.push('</table>')
    
    return html.join('\n')
  }
  
  /**
   * Create tech stack diagram
   */
  private createTechStackDiagram(): string {
    return `
      <div class="tech-diagram">
        <h3>Architecture Overview</h3>
        <svg width="600" height="400" viewBox="0 0 600 400">
          <!-- Frontend Layer -->
          <rect x="50" y="30" width="500" height="60" fill="#e3f2fd" stroke="#2196f3" stroke-width="2" rx="5"/>
          <text x="300" y="65" text-anchor="middle" font-size="14" font-weight="bold">Frontend Layer</text>
          
          <!-- API Gateway -->
          <rect x="200" y="120" width="200" height="40" fill="#f3e5f5" stroke="#9c27b0" stroke-width="2" rx="5"/>
          <text x="300" y="145" text-anchor="middle" font-size="12">API Gateway</text>
          
          <!-- Backend Services -->
          <rect x="50" y="190" width="150" height="60" fill="#e8f5e9" stroke="#4caf50" stroke-width="2" rx="5"/>
          <text x="125" y="225" text-anchor="middle" font-size="12">Service A</text>
          
          <rect x="225" y="190" width="150" height="60" fill="#e8f5e9" stroke="#4caf50" stroke-width="2" rx="5"/>
          <text x="300" y="225" text-anchor="middle" font-size="12">Service B</text>
          
          <rect x="400" y="190" width="150" height="60" fill="#e8f5e9" stroke="#4caf50" stroke-width="2" rx="5"/>
          <text x="475" y="225" text-anchor="middle" font-size="12">Service C</text>
          
          <!-- Database Layer -->
          <rect x="100" y="280" width="180" height="60" fill="#fff3e0" stroke="#ff9800" stroke-width="2" rx="5"/>
          <text x="190" y="315" text-anchor="middle" font-size="12">Primary Database</text>
          
          <rect x="320" y="280" width="180" height="60" fill="#fff3e0" stroke="#ff9800" stroke-width="2" rx="5"/>
          <text x="410" y="315" text-anchor="middle" font-size="12">Cache Layer</text>
          
          <!-- Connections -->
          <line x1="300" y1="90" x2="300" y2="120" stroke="#666" stroke-width="1" stroke-dasharray="2,2"/>
          <line x1="300" y1="160" x2="125" y2="190" stroke="#666" stroke-width="1" stroke-dasharray="2,2"/>
          <line x1="300" y1="160" x2="300" y2="190" stroke="#666" stroke-width="1" stroke-dasharray="2,2"/>
          <line x1="300" y1="160" x2="475" y2="190" stroke="#666" stroke-width="1" stroke-dasharray="2,2"/>
          <line x1="125" y1="250" x2="190" y2="280" stroke="#666" stroke-width="1" stroke-dasharray="2,2"/>
          <line x1="300" y1="250" x2="190" y2="280" stroke="#666" stroke-width="1" stroke-dasharray="2,2"/>
          <line x1="475" y1="250" x2="410" y2="280" stroke="#666" stroke-width="1" stroke-dasharray="2,2"/>
        </svg>
      </div>
    `
  }
  
  /**
   * Format architecture
   */
  private formatArchitecture(architecture: any): string {
    const html: string[] = []
    
    if (typeof architecture === 'string') {
      html.push(`<p>${architecture}</p>`)
    } else if (architecture) {
      if (architecture.overview) {
        html.push('<h3>4.1 Architecture Overview</h3>')
        html.push(this.formatSection('', architecture.overview, 0))
      }
      
      if (architecture.components) {
        html.push('<h3>4.2 System Components</h3>')
        html.push(this.formatComponents(architecture.components))
      }
      
      if (architecture.patterns) {
        html.push('<h3>4.3 Architecture Patterns</h3>')
        html.push(this.formatPatterns(architecture.patterns))
      }
      
      if (architecture.decisions) {
        html.push('<h3>4.4 Key Decisions</h3>')
        html.push(this.formatDecisions(architecture.decisions))
      }
    }
    
    return html.join('\n')
  }
  
  /**
   * Format integrations
   */
  private formatIntegrations(integrations: any): string {
    const html: string[] = []
    
    if (Array.isArray(integrations)) {
      html.push('<div class="integrations-grid">')
      integrations.forEach(integration => {
        if (typeof integration === 'string') {
          html.push(`<div class="integration-card"><p>${integration}</p></div>`)
        } else {
          html.push('<div class="integration-card">')
          html.push(`<h4>${integration.name || integration.system || 'Integration'}</h4>`)
          if (integration.type) {
            html.push(`<span class="integration-type">${integration.type}</span>`)
          }
          if (integration.protocol) {
            html.push(`<p><strong>Protocol:</strong> ${integration.protocol}</p>`)
          }
          if (integration.frequency) {
            html.push(`<p><strong>Frequency:</strong> ${integration.frequency}</p>`)
          }
          if (integration.description) {
            html.push(`<p>${integration.description}</p>`)
          }
          html.push('</div>')
        }
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', integrations, 3))
    }
    
    // Add integration diagram
    html.push(this.createIntegrationDiagram())
    
    return html.join('\n')
  }
  
  /**
   * Create integration diagram
   */
  private createIntegrationDiagram(): string {
    return `
      <div class="integration-diagram">
        <h3>Integration Architecture</h3>
        <svg width="600" height="300" viewBox="0 0 600 300">
          <!-- Central System -->
          <rect x="225" y="100" width="150" height="100" fill="#e8eaf6" stroke="#3f51b5" stroke-width="2" rx="5"/>
          <text x="300" y="150" text-anchor="middle" font-size="14" font-weight="bold">Core System</text>
          
          <!-- External Systems -->
          <rect x="20" y="50" width="120" height="60" fill="#fce4ec" stroke="#e91e63" stroke-width="2" rx="5"/>
          <text x="80" y="85" text-anchor="middle" font-size="12">CRM System</text>
          
          <rect x="20" y="190" width="120" height="60" fill="#fce4ec" stroke="#e91e63" stroke-width="2" rx="5"/>
          <text x="80" y="225" text-anchor="middle" font-size="12">Payment Gateway</text>
          
          <rect x="460" y="50" width="120" height="60" fill="#fce4ec" stroke="#e91e63" stroke-width="2" rx="5"/>
          <text x="520" y="85" text-anchor="middle" font-size="12">Analytics</text>
          
          <rect x="460" y="190" width="120" height="60" fill="#fce4ec" stroke="#e91e63" stroke-width="2" rx="5"/>
          <text x="520" y="225" text-anchor="middle" font-size="12">Email Service</text>
          
          <!-- Connections with labels -->
          <line x1="140" y1="80" x2="225" y2="130" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
          <text x="182" y="100" font-size="10" fill="#666">REST API</text>
          
          <line x1="140" y1="220" x2="225" y2="170" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
          <text x="182" y="200" font-size="10" fill="#666">Webhook</text>
          
          <line x1="375" y1="130" x2="460" y2="80" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
          <text x="417" y="100" font-size="10" fill="#666">Events</text>
          
          <line x1="375" y1="170" x2="460" y2="220" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
          <text x="417" y="200" font-size="10" fill="#666">SMTP</text>
          
          <!-- Arrow marker -->
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#666"/>
            </marker>
          </defs>
        </svg>
      </div>
    `
  }
  
  /**
   * Format infrastructure
   */
  private formatInfrastructure(infrastructure: any): string {
    const html: string[] = []
    
    if (typeof infrastructure === 'string') {
      html.push(`<p>${infrastructure}</p>`)
    } else if (infrastructure) {
      if (infrastructure.hosting) {
        html.push('<h3>6.1 Hosting Environment</h3>')
        html.push(this.formatSection('', infrastructure.hosting, 0))
      }
      
      if (infrastructure.servers) {
        html.push('<h3>6.2 Server Infrastructure</h3>')
        html.push(this.formatServers(infrastructure.servers))
      }
      
      if (infrastructure.network) {
        html.push('<h3>6.3 Network Architecture</h3>')
        html.push(this.formatSection('', infrastructure.network, 0))
      }
      
      if (infrastructure.storage) {
        html.push('<h3>6.4 Storage Solutions</h3>')
        html.push(this.formatSection('', infrastructure.storage, 0))
      }
    }
    
    return html.join('\n')
  }
  
  /**
   * Format security architecture
   */
  private formatSecurity(security: any): string {
    const html: string[] = []
    
    if (typeof security === 'string') {
      html.push(`<p>${security}</p>`)
    } else if (security) {
      if (security.authentication) {
        html.push('<h3>7.1 Authentication</h3>')
        html.push(this.formatSection('', security.authentication, 0))
      }
      
      if (security.authorization) {
        html.push('<h3>7.2 Authorization</h3>')
        html.push(this.formatSection('', security.authorization, 0))
      }
      
      if (security.encryption) {
        html.push('<h3>7.3 Encryption</h3>')
        html.push(this.formatSection('', security.encryption, 0))
      }
      
      if (security.compliance) {
        html.push('<h3>7.4 Compliance</h3>')
        html.push(this.formatCompliance(security.compliance))
      }
    }
    
    return html.join('\n')
  }
  
  /**
   * Format performance requirements
   */
  private formatPerformance(performance: any): string {
    const html: string[] = []
    
    if (Array.isArray(performance)) {
      html.push('<table class="data-table performance-table">')
      html.push('<thead>')
      html.push('<tr>')
      html.push('<th>Metric</th>')
      html.push('<th>Target</th>')
      html.push('<th>Current</th>')
      html.push('<th>Priority</th>')
      html.push('</tr>')
      html.push('</thead>')
      html.push('<tbody>')
      
      performance.forEach(metric => {
        if (typeof metric === 'string') {
          html.push(`<tr><td colspan="4">${metric}</td></tr>`)
        } else {
          const priorityClass = (metric.priority || '').toLowerCase() === 'high' ? 'priority-high' :
                              (metric.priority || '').toLowerCase() === 'low' ? 'priority-low' :
                              'priority-medium'
          html.push('<tr>')
          html.push(`<td>${metric.metric || metric.name || 'Unknown'}</td>`)
          html.push(`<td>${metric.target || 'TBD'}</td>`)
          html.push(`<td>${metric.current || 'N/A'}</td>`)
          html.push(`<td class="${priorityClass}">${metric.priority || 'Medium'}</td>`)
          html.push('</tr>')
        }
      })
      
      html.push('</tbody>')
      html.push('</table>')
    } else {
      html.push(this.formatSection('', performance, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format technical debt
   */
  private formatTechnicalDebt(debt: any): string {
    const html: string[] = []
    
    if (Array.isArray(debt)) {
      html.push('<div class="debt-items">')
      debt.forEach(item => {
        if (typeof item === 'string') {
          html.push(`<div class="debt-item"><p>${item}</p></div>`)
        } else {
          const severityClass = (item.severity || item.impact || '').toLowerCase() === 'high' ? 'severity-high' :
                              (item.severity || item.impact || '').toLowerCase() === 'low' ? 'severity-low' :
                              'severity-medium'
          html.push(`<div class="debt-item ${severityClass}">`)
          html.push(`<h4>${item.name || item.issue || 'Technical Debt Item'}</h4>`)
          if (item.description) {
            html.push(`<p>${item.description}</p>`)
          }
          if (item.impact) {
            html.push(`<p><strong>Impact:</strong> ${item.impact}</p>`)
          }
          if (item.effort) {
            html.push(`<p><strong>Effort:</strong> ${item.effort}</p>`)
          }
          if (item.recommendation) {
            html.push(`<p><strong>Recommendation:</strong> ${item.recommendation}</p>`)
          }
          html.push('</div>')
        }
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', debt, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format future state
   */
  private formatFutureState(futureState: any): string {
    const html: string[] = []
    
    if (typeof futureState === 'string') {
      html.push(`<p>${futureState}</p>`)
    } else if (futureState) {
      if (futureState.vision) {
        html.push('<h3>10.1 Technical Vision</h3>')
        html.push(this.formatSection('', futureState.vision, 0))
      }
      
      if (futureState.phases || futureState.roadmap) {
        html.push('<h3>10.2 Implementation Roadmap</h3>')
        html.push(this.formatRoadmap(futureState.phases || futureState.roadmap))
      }
      
      if (futureState.priorities) {
        html.push('<h3>10.3 Priorities</h3>')
        html.push(this.formatPriorities(futureState.priorities))
      }
    }
    
    return html.join('\n')
  }
  
  /**
   * Format recommendations
   */
  private formatRecommendations(recommendations: any): string {
    const html: string[] = []
    
    if (Array.isArray(recommendations)) {
      html.push('<div class="recommendations">')
      recommendations.forEach((rec, index) => {
        if (typeof rec === 'string') {
          html.push(`<div class="recommendation-item">`)
          html.push(`<span class="rec-number">${index + 1}</span>`)
          html.push(`<p>${rec}</p>`)
          html.push(`</div>`)
        } else {
          html.push(`<div class="recommendation-item">`)
          html.push(`<span class="rec-number">${index + 1}</span>`)
          html.push(`<div class="rec-content">`)
          html.push(`<h4>${rec.title || rec.recommendation || 'Recommendation'}</h4>`)
          if (rec.description) {
            html.push(`<p>${rec.description}</p>`)
          }
          if (rec.benefits) {
            html.push(`<p><strong>Benefits:</strong> ${rec.benefits}</p>`)
          }
          if (rec.priority) {
            html.push(`<p><strong>Priority:</strong> ${rec.priority}</p>`)
          }
          html.push(`</div>`)
          html.push(`</div>`)
        }
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', recommendations, 3))
    }
    
    return html.join('\n')
  }
  
  // Helper methods
  
  private formatSystemsList(systems: any): string {
    const html: string[] = []
    
    if (Array.isArray(systems)) {
      html.push('<ul>')
      systems.forEach(system => {
        if (typeof system === 'string') {
          html.push(`<li>${system}</li>`)
        } else {
          html.push(`<li><strong>${system.name || system.system}:</strong> ${system.description || ''}</li>`)
        }
      })
      html.push('</ul>')
    } else {
      html.push(this.formatSection('', systems, 0))
    }
    
    return html.join('\n')
  }
  
  private formatChallenges(challenges: any): string {
    const html: string[] = []
    
    if (Array.isArray(challenges)) {
      html.push('<ul class="challenges-list">')
      challenges.forEach(challenge => {
        html.push(`<li class="challenge-item">${challenge}</li>`)
      })
      html.push('</ul>')
    } else {
      html.push(this.formatSection('', challenges, 0))
    }
    
    return html.join('\n')
  }
  
  private formatComponents(components: any): string {
    const html: string[] = []
    
    if (Array.isArray(components)) {
      html.push('<div class="components-grid">')
      components.forEach(component => {
        if (typeof component === 'string') {
          html.push(`<div class="component-card"><p>${component}</p></div>`)
        } else {
          html.push('<div class="component-card">')
          html.push(`<h4>${component.name || component.component}</h4>`)
          if (component.type) {
            html.push(`<span class="component-type">${component.type}</span>`)
          }
          if (component.description) {
            html.push(`<p>${component.description}</p>`)
          }
          if (component.technology) {
            html.push(`<p><strong>Technology:</strong> ${component.technology}</p>`)
          }
          html.push('</div>')
        }
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', components, 0))
    }
    
    return html.join('\n')
  }
  
  private formatPatterns(patterns: any): string {
    const html: string[] = []
    
    if (Array.isArray(patterns)) {
      html.push('<ul>')
      patterns.forEach(pattern => {
        if (typeof pattern === 'string') {
          html.push(`<li>${pattern}</li>`)
        } else {
          html.push(`<li><strong>${pattern.name || pattern.pattern}:</strong> ${pattern.description || pattern.usage || ''}</li>`)
        }
      })
      html.push('</ul>')
    } else {
      html.push(this.formatSection('', patterns, 0))
    }
    
    return html.join('\n')
  }
  
  private formatDecisions(decisions: any): string {
    const html: string[] = []
    
    if (Array.isArray(decisions)) {
      html.push('<table class="data-table decisions-table">')
      html.push('<thead>')
      html.push('<tr>')
      html.push('<th>Decision</th>')
      html.push('<th>Rationale</th>')
      html.push('<th>Impact</th>')
      html.push('</tr>')
      html.push('</thead>')
      html.push('<tbody>')
      
      decisions.forEach(decision => {
        if (typeof decision === 'string') {
          html.push(`<tr><td colspan="3">${decision}</td></tr>`)
        } else {
          html.push('<tr>')
          html.push(`<td>${decision.decision || decision.name || 'Decision'}</td>`)
          html.push(`<td>${decision.rationale || decision.reason || ''}</td>`)
          html.push(`<td>${decision.impact || ''}</td>`)
          html.push('</tr>')
        }
      })
      
      html.push('</tbody>')
      html.push('</table>')
    } else {
      html.push(this.formatSection('', decisions, 0))
    }
    
    return html.join('\n')
  }
  
  private formatServers(servers: any): string {
    const html: string[] = []
    
    if (Array.isArray(servers)) {
      html.push('<table class="data-table servers-table">')
      html.push('<thead>')
      html.push('<tr>')
      html.push('<th>Server</th>')
      html.push('<th>Type</th>')
      html.push('<th>Specs</th>')
      html.push('<th>Location</th>')
      html.push('</tr>')
      html.push('</thead>')
      html.push('<tbody>')
      
      servers.forEach(server => {
        if (typeof server === 'string') {
          html.push(`<tr><td colspan="4">${server}</td></tr>`)
        } else {
          html.push('<tr>')
          html.push(`<td>${server.name || server.server || 'Server'}</td>`)
          html.push(`<td>${server.type || 'Virtual'}</td>`)
          html.push(`<td>${server.specs || server.configuration || 'Standard'}</td>`)
          html.push(`<td>${server.location || server.region || 'Cloud'}</td>`)
          html.push('</tr>')
        }
      })
      
      html.push('</tbody>')
      html.push('</table>')
    } else {
      html.push(this.formatSection('', servers, 0))
    }
    
    return html.join('\n')
  }
  
  private formatCompliance(compliance: any): string {
    const html: string[] = []
    
    if (Array.isArray(compliance)) {
      html.push('<ul class="compliance-list">')
      compliance.forEach(item => {
        html.push(`<li>${item}</li>`)
      })
      html.push('</ul>')
    } else {
      html.push(this.formatSection('', compliance, 0))
    }
    
    return html.join('\n')
  }
  
  private formatRoadmap(roadmap: any): string {
    const html: string[] = []
    
    if (Array.isArray(roadmap)) {
      html.push('<div class="roadmap-timeline">')
      roadmap.forEach((phase, index) => {
        if (typeof phase === 'string') {
          html.push(`<div class="roadmap-phase">`)
          html.push(`<span class="phase-number">Phase ${index + 1}</span>`)
          html.push(`<p>${phase}</p>`)
          html.push(`</div>`)
        } else {
          html.push(`<div class="roadmap-phase">`)
          html.push(`<span class="phase-number">Phase ${index + 1}</span>`)
          html.push(`<h4>${phase.name || phase.phase || `Phase ${index + 1}`}</h4>`)
          if (phase.timeline || phase.duration) {
            html.push(`<p class="phase-timeline">${phase.timeline || phase.duration}</p>`)
          }
          if (phase.deliverables) {
            html.push(`<p><strong>Deliverables:</strong> ${phase.deliverables}</p>`)
          }
          if (phase.description) {
            html.push(`<p>${phase.description}</p>`)
          }
          html.push(`</div>`)
        }
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', roadmap, 0))
    }
    
    return html.join('\n')
  }
  
  private formatPriorities(priorities: any): string {
    const html: string[] = []
    
    if (Array.isArray(priorities)) {
      html.push('<ol class="priorities-list">')
      priorities.forEach(priority => {
        html.push(`<li>${priority}</li>`)
      })
      html.push('</ol>')
    } else {
      html.push(this.formatSection('', priorities, 0))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format a section with proper handling
   */
  private formatSection(title: string, content: any, level: number = 2): string {
    const html: string[] = []
    
    if (title && level > 0) {
      html.push(`<h${level}>${title}</h${level}>`)
    }
    
    if (typeof content === 'string') {
      html.push(`<p>${content}</p>`)
    } else if (Array.isArray(content)) {
      html.push('<ul>')
      content.forEach(item => {
        if (typeof item === 'string') {
          html.push(`<li>${item}</li>`)
        } else if (item.name || item.title) {
          html.push(`<li><strong>${item.name || item.title}:</strong> ${item.description || item.value || ''}</li>`)
        }
      })
      html.push('</ul>')
    } else if (typeof content === 'object' && content !== null) {
      Object.entries(content).forEach(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        if (level > 0) {
          html.push(`<h${Math.min(level + 1, 6)}>${formattedKey}</h${Math.min(level + 1, 6)}>`)
        }
        if (typeof value === 'string') {
          html.push(`<p>${value}</p>`)
        } else if (Array.isArray(value)) {
          html.push('<ul>')
          value.forEach((item: any) => {
            html.push(`<li>${typeof item === 'string' ? item : JSON.stringify(item)}</li>`)
          })
          html.push('</ul>')
        }
      })
    }
    
    return html.join('\n')
  }
  
  /**
   * Get document-specific styles
   */
  protected getDocumentSpecificStyles(): string {
    return `
      .tech-stack-container { margin: 2rem 0; }
      
      .tech-layers {
        margin: 2rem 0;
      }
      
      .tech-layer {
        margin: 1rem 0;
        padding: 1rem;
        background: #f9f9f9;
        border-radius: 8px;
      }
      
      .tech-layer h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
      }
      
      .tech-items {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .tech-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        background: white;
        border: 1px solid #ddd;
        border-radius: 20px;
        font-size: 0.9rem;
      }
      
      .tech-table .status-deprecated { color: #d32f2f; }
      .tech-table .status-legacy { color: #f57c00; }
      .tech-table .status-active { color: #388e3c; }
      
      .tech-diagram {
        margin: 2rem 0;
        text-align: center;
      }
      
      .integration-diagram {
        margin: 2rem 0;
        text-align: center;
      }
      
      .integrations-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
      }
      
      .integration-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1rem;
        background: white;
      }
      
      .integration-card h4 {
        margin: 0 0 0.5rem 0;
        color: #3f51b5;
      }
      
      .integration-type {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        background: #e8eaf6;
        color: #3f51b5;
        border-radius: 4px;
        font-size: 0.8rem;
        margin-bottom: 0.5rem;
      }
      
      .components-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
      }
      
      .component-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1rem;
        background: #fafafa;
      }
      
      .component-card h4 {
        margin: 0 0 0.5rem 0;
        color: #2e7d32;
      }
      
      .component-type {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        background: #e8f5e9;
        color: #2e7d32;
        border-radius: 4px;
        font-size: 0.8rem;
      }
      
      .performance-table .priority-high { color: #d32f2f; font-weight: bold; }
      .performance-table .priority-medium { color: #f57c00; }
      .performance-table .priority-low { color: #388e3c; }
      
      .debt-items {
        margin: 1rem 0;
      }
      
      .debt-item {
        border-left: 4px solid #ddd;
        padding: 1rem;
        margin: 1rem 0;
        background: #f9f9f9;
      }
      
      .debt-item.severity-high { border-left-color: #f44336; }
      .debt-item.severity-medium { border-left-color: #ff9800; }
      .debt-item.severity-low { border-left-color: #4caf50; }
      
      .debt-item h4 {
        margin: 0 0 0.5rem 0;
      }
      
      .roadmap-timeline {
        position: relative;
        padding-left: 2rem;
      }
      
      .roadmap-timeline::before {
        content: '';
        position: absolute;
        left: 0.75rem;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #ddd;
      }
      
      .roadmap-phase {
        position: relative;
        margin: 2rem 0;
        padding: 1rem;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      }
      
      .phase-number {
        position: absolute;
        left: -2.25rem;
        top: 1rem;
        width: 2rem;
        height: 2rem;
        background: #3f51b5;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: bold;
      }
      
      .phase-timeline {
        color: #666;
        font-size: 0.9rem;
        margin: 0.25rem 0;
      }
      
      .recommendations {
        margin: 1rem 0;
      }
      
      .recommendation-item {
        display: flex;
        gap: 1rem;
        margin: 1rem 0;
        padding: 1rem;
        background: #f0f4f8;
        border-radius: 8px;
      }
      
      .rec-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        background: #1976d2;
        color: white;
        border-radius: 50%;
        font-weight: bold;
        flex-shrink: 0;
      }
      
      .rec-content {
        flex: 1;
      }
      
      .rec-content h4 {
        margin: 0 0 0.5rem 0;
        color: #1976d2;
      }
      
      .challenges-list {
        list-style-type: none;
        padding: 0;
      }
      
      .challenge-item {
        position: relative;
        padding-left: 1.5rem;
        margin: 0.5rem 0;
      }
      
      .challenge-item::before {
        content: '⚠️';
        position: absolute;
        left: 0;
      }
      
      .priorities-list {
        counter-reset: priority;
        list-style-type: none;
        padding: 0;
      }
      
      .priorities-list li {
        counter-increment: priority;
        position: relative;
        padding-left: 2rem;
        margin: 0.5rem 0;
      }
      
      .priorities-list li::before {
        content: counter(priority);
        position: absolute;
        left: 0;
        width: 1.5rem;
        height: 1.5rem;
        background: #e3f2fd;
        color: #1976d2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.9rem;
      }
      
      .compliance-list {
        list-style-type: none;
        padding: 0;
      }
      
      .compliance-list li {
        position: relative;
        padding-left: 1.5rem;
        margin: 0.5rem 0;
      }
      
      .compliance-list li::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: #4caf50;
        font-weight: bold;
      }
      
      .decisions-table th {
        background: #f3e5f5;
      }
      
      .servers-table th {
        background: #fff3e0;
      }
      
      .toc {
        margin-bottom: 2rem;
      }
      
      .toc-list {
        list-style-type: decimal;
        padding-left: 2rem;
      }
      
      .toc-list li {
        margin: 0.5rem 0;
      }
      
      .toc-list a {
        color: #1976d2;
        text-decoration: none;
      }
      
      .toc-list a:hover {
        text-decoration: underline;
      }
    `
  }
}