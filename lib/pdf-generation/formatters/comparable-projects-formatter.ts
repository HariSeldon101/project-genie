/**
 * Comparable Projects HTML Formatter  
 * Handles case studies, comparisons, lessons learned, and benchmarking
 */

import { BaseHTMLFormatter } from './base-formatter'

export class ComparableProjectsFormatter extends BaseHTMLFormatter {
  /**
   * Format Comparable Projects content to HTML
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
    
    // Analysis Approach
    if (content.approach || content.methodology) {
      sections.push('<div class="section">')
      sections.push('<h2>2. Analysis Approach</h2>')
      sections.push(this.formatSection('', content.approach || content.methodology, 0))
      sections.push('</div>')
    }
    
    // Projects Overview
    if (content.projects || content.comparable_projects || content.case_studies) {
      sections.push('<div class="section">')
      sections.push('<h2>3. Comparable Projects</h2>')
      
      const projects = content.projects || content.comparable_projects || content.case_studies
      if (Array.isArray(projects)) {
        projects.forEach((project, index) => {
          sections.push(this.formatProjectCaseStudy(project, index + 1))
        })
      } else {
        sections.push(this.formatSection('', projects, 3))
      }
      
      sections.push('</div>')
    }
    
    // Comparison Matrix
    if (content.comparison || content.comparison_matrix) {
      sections.push('<div class="section">')
      sections.push('<h2>4. Comparison Analysis</h2>')
      sections.push(this.formatComparisonMatrix(content.comparison || content.comparison_matrix))
      sections.push('</div>')
    }
    
    // Lessons Learned
    if (content.lessons || content.lessons_learned) {
      sections.push('<div class="section">')
      sections.push('<h2>5. Lessons Learned</h2>')
      sections.push(this.formatLessonsLearned(content.lessons || content.lessons_learned))
      sections.push('</div>')
    }
    
    // Best Practices
    if (content.bestPractices || content.best_practices) {
      sections.push('<div class="section">')
      sections.push('<h2>6. Best Practices</h2>')
      sections.push(this.formatBestPractices(content.bestPractices || content.best_practices))
      sections.push('</div>')
    }
    
    // Risk Patterns
    if (content.risks || content.risk_patterns || content.common_risks) {
      sections.push('<div class="section">')
      sections.push('<h2>7. Common Risk Patterns</h2>')
      sections.push(this.formatRiskPatterns(content.risks || content.risk_patterns || content.common_risks))
      sections.push('</div>')
    }
    
    // Success Factors
    if (content.successFactors || content.success_factors) {
      sections.push('<div class="section">')
      sections.push('<h2>8. Success Factors</h2>')
      sections.push(this.formatSuccessFactors(content.successFactors || content.success_factors))
      sections.push('</div>')
    }
    
    // Recommendations
    if (content.recommendations) {
      sections.push('<div class="section">')
      sections.push('<h2>9. Recommendations</h2>')
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
          <li><a href="#section-2">Analysis Approach</a></li>
          <li><a href="#section-3">Comparable Projects</a></li>
          <li><a href="#section-4">Comparison Analysis</a></li>
          <li><a href="#section-5">Lessons Learned</a></li>
          <li><a href="#section-6">Best Practices</a></li>
          <li><a href="#section-7">Common Risk Patterns</a></li>
          <li><a href="#section-8">Success Factors</a></li>
          <li><a href="#section-9">Recommendations</a></li>
        </ol>
      </div>
      <div style="page-break-after: always;"></div>
    `
  }
  
  /**
   * Format project case study
   */
  private formatProjectCaseStudy(project: any, index: number): string {
    const html: string[] = []
    
    html.push(`<div class="case-study">`)
    
    if (typeof project === 'string') {
      html.push(`<h3>3.${index} Project ${index}</h3>`)
      html.push(`<p>${project}</p>`)
    } else {
      html.push(`<h3>3.${index} ${project.name || project.project || `Project ${index}`}</h3>`)
      
      // Project Overview Box
      html.push('<div class="project-overview">')
      
      if (project.client || project.organization) {
        html.push(`<p><strong>Client/Organization:</strong> ${project.client || project.organization}</p>`)
      }
      
      if (project.industry || project.sector) {
        html.push(`<p><strong>Industry:</strong> ${project.industry || project.sector}</p>`)
      }
      
      if (project.duration || project.timeline) {
        html.push(`<p><strong>Duration:</strong> ${project.duration || project.timeline}</p>`)
      }
      
      if (project.budget) {
        html.push(`<p><strong>Budget:</strong> ${project.budget}</p>`)
      }
      
      if (project.team_size || project.teamSize) {
        html.push(`<p><strong>Team Size:</strong> ${project.team_size || project.teamSize}</p>`)
      }
      
      if (project.status || project.outcome) {
        const statusClass = (project.status || project.outcome || '').toLowerCase().includes('success') ? 'status-success' :
                           (project.status || project.outcome || '').toLowerCase().includes('fail') ? 'status-fail' :
                           'status-partial'
        html.push(`<p><strong>Outcome:</strong> <span class="${statusClass}">${project.status || project.outcome}</span></p>`)
      }
      
      html.push('</div>')
      
      // Project Description
      if (project.description || project.overview) {
        html.push('<h4>Project Description</h4>')
        html.push(`<p>${project.description || project.overview}</p>`)
      }
      
      // Objectives
      if (project.objectives || project.goals) {
        html.push('<h4>Objectives</h4>')
        html.push(this.formatList(project.objectives || project.goals))
      }
      
      // Approach
      if (project.approach || project.methodology) {
        html.push('<h4>Approach</h4>')
        html.push(this.formatSection('', project.approach || project.methodology, 0))
      }
      
      // Technologies
      if (project.technologies || project.tech_stack) {
        html.push('<h4>Technologies Used</h4>')
        html.push(this.formatTechnologies(project.technologies || project.tech_stack))
      }
      
      // Challenges
      if (project.challenges) {
        html.push('<h4>Challenges Faced</h4>')
        html.push(this.formatList(project.challenges))
      }
      
      // Solutions
      if (project.solutions) {
        html.push('<h4>Solutions Implemented</h4>')
        html.push(this.formatList(project.solutions))
      }
      
      // Results
      if (project.results || project.outcomes) {
        html.push('<h4>Results & Outcomes</h4>')
        html.push(this.formatResults(project.results || project.outcomes))
      }
      
      // Lessons
      if (project.lessons || project.key_learnings) {
        html.push('<h4>Key Learnings</h4>')
        html.push(this.formatList(project.lessons || project.key_learnings))
      }
    }
    
    html.push(`</div>`)
    
    return html.join('\n')
  }
  
  /**
   * Format comparison matrix
   */
  private formatComparisonMatrix(comparison: any): string {
    const html: string[] = []
    
    if (Array.isArray(comparison)) {
      html.push('<table class="comparison-table">')
      html.push('<thead>')
      html.push('<tr>')
      html.push('<th>Aspect</th>')
      html.push('<th>Project A</th>')
      html.push('<th>Project B</th>')
      html.push('<th>Project C</th>')
      html.push('<th>Our Project</th>')
      html.push('</tr>')
      html.push('</thead>')
      html.push('<tbody>')
      
      comparison.forEach(row => {
        if (typeof row === 'object') {
          html.push('<tr>')
          html.push(`<td><strong>${row.aspect || row.criteria || 'Aspect'}</strong></td>`)
          html.push(`<td>${row.project_a || row.a || '-'}</td>`)
          html.push(`<td>${row.project_b || row.b || '-'}</td>`)
          html.push(`<td>${row.project_c || row.c || '-'}</td>`)
          html.push(`<td class="highlight">${row.our_project || row.ours || '-'}</td>`)
          html.push('</tr>')
        }
      })
      
      html.push('</tbody>')
      html.push('</table>')
    } else if (typeof comparison === 'object') {
      // Handle object-based comparison
      html.push('<div class="comparison-cards">')
      Object.entries(comparison).forEach(([key, value]) => {
        html.push('<div class="comparison-card">')
        html.push(`<h4>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>`)
        html.push(this.formatSection('', value, 0))
        html.push('</div>')
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', comparison, 3))
    }
    
    // Add comparison visualization
    html.push(this.createComparisonChart())
    
    return html.join('\n')
  }
  
  /**
   * Create comparison chart
   */
  private createComparisonChart(): string {
    return `
      <div class="comparison-chart">
        <h4>Comparative Analysis</h4>
        <svg width="600" height="300" viewBox="0 0 600 300">
          <!-- Y-axis -->
          <line x1="50" y1="250" x2="50" y2="50" stroke="#333" stroke-width="2"/>
          <!-- X-axis -->
          <line x1="50" y1="250" x2="550" y2="250" stroke="#333" stroke-width="2"/>
          
          <!-- Y-axis labels -->
          <text x="25" y="55" font-size="10" text-anchor="end">100%</text>
          <text x="25" y="105" font-size="10" text-anchor="end">75%</text>
          <text x="25" y="155" font-size="10" text-anchor="end">50%</text>
          <text x="25" y="205" font-size="10" text-anchor="end">25%</text>
          <text x="25" y="255" font-size="10" text-anchor="end">0%</text>
          
          <!-- Bars -->
          <rect x="100" y="150" width="60" height="100" fill="#4fc3f7" opacity="0.8"/>
          <text x="130" y="270" font-size="10" text-anchor="middle">Budget</text>
          
          <rect x="200" y="100" width="60" height="150" fill="#66bb6a" opacity="0.8"/>
          <text x="230" y="270" font-size="10" text-anchor="middle">Timeline</text>
          
          <rect x="300" y="125" width="60" height="125" fill="#ffa726" opacity="0.8"/>
          <text x="330" y="270" font-size="10" text-anchor="middle">Quality</text>
          
          <rect x="400" y="75" width="60" height="175" fill="#ab47bc" opacity="0.8"/>
          <text x="430" y="270" font-size="10" text-anchor="middle">Success</text>
          
          <!-- Title -->
          <text x="300" y="30" font-size="14" font-weight="bold" text-anchor="middle">Performance Metrics Comparison</text>
        </svg>
      </div>
    `
  }
  
  /**
   * Format lessons learned
   */
  private formatLessonsLearned(lessons: any): string {
    const html: string[] = []
    
    if (Array.isArray(lessons)) {
      html.push('<div class="lessons-grid">')
      lessons.forEach((lesson, index) => {
        if (typeof lesson === 'string') {
          html.push(`<div class="lesson-card">`)
          html.push(`<span class="lesson-number">${index + 1}</span>`)
          html.push(`<p>${lesson}</p>`)
          html.push(`</div>`)
        } else {
          const categoryClass = `category-${(lesson.category || 'general').toLowerCase().replace(/\s+/g, '-')}`
          html.push(`<div class="lesson-card ${categoryClass}">`)
          html.push(`<span class="lesson-number">${index + 1}</span>`)
          html.push(`<h4>${lesson.title || lesson.lesson || 'Lesson'}</h4>`)
          if (lesson.category) {
            html.push(`<span class="lesson-category">${lesson.category}</span>`)
          }
          if (lesson.description) {
            html.push(`<p>${lesson.description}</p>`)
          }
          if (lesson.impact) {
            html.push(`<p class="lesson-impact"><strong>Impact:</strong> ${lesson.impact}</p>`)
          }
          if (lesson.application) {
            html.push(`<p class="lesson-application"><strong>Application:</strong> ${lesson.application}</p>`)
          }
          html.push(`</div>`)
        }
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', lessons, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format best practices
   */
  private formatBestPractices(practices: any): string {
    const html: string[] = []
    
    if (Array.isArray(practices)) {
      html.push('<div class="practices-container">')
      
      // Group by category if available
      const categorized: { [key: string]: any[] } = {}
      const uncategorized: any[] = []
      
      practices.forEach(practice => {
        if (typeof practice === 'object' && practice.category) {
          if (!categorized[practice.category]) {
            categorized[practice.category] = []
          }
          categorized[practice.category].push(practice)
        } else {
          uncategorized.push(practice)
        }
      })
      
      // Render categorized practices
      Object.entries(categorized).forEach(([category, items]) => {
        html.push(`<div class="practice-category">`)
        html.push(`<h4>${category}</h4>`)
        html.push('<ul class="practice-list">')
        items.forEach(item => {
          html.push(`<li>`)
          html.push(`<strong>${item.practice || item.title || 'Practice'}:</strong> `)
          html.push(`${item.description || ''}`)
          if (item.benefit) {
            html.push(` <em>(${item.benefit})</em>`)
          }
          html.push(`</li>`)
        })
        html.push('</ul>')
        html.push(`</div>`)
      })
      
      // Render uncategorized practices
      if (uncategorized.length > 0) {
        html.push('<ul class="practice-list">')
        uncategorized.forEach(practice => {
          if (typeof practice === 'string') {
            html.push(`<li>${practice}</li>`)
          } else {
            html.push(`<li>`)
            html.push(`<strong>${practice.practice || practice.title || 'Practice'}:</strong> `)
            html.push(`${practice.description || ''}`)
            html.push(`</li>`)
          }
        })
        html.push('</ul>')
      }
      
      html.push('</div>')
    } else {
      html.push(this.formatSection('', practices, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Format risk patterns
   */
  private formatRiskPatterns(risks: any): string {
    const html: string[] = []
    
    if (Array.isArray(risks)) {
      html.push('<table class="risk-patterns-table">')
      html.push('<thead>')
      html.push('<tr>')
      html.push('<th>Risk Pattern</th>')
      html.push('<th>Frequency</th>')
      html.push('<th>Impact</th>')
      html.push('<th>Mitigation Strategy</th>')
      html.push('</tr>')
      html.push('</thead>')
      html.push('<tbody>')
      
      risks.forEach(risk => {
        if (typeof risk === 'string') {
          html.push(`<tr><td colspan="4">${risk}</td></tr>`)
        } else {
          const impactClass = (risk.impact || '').toLowerCase() === 'high' ? 'impact-high' :
                             (risk.impact || '').toLowerCase() === 'low' ? 'impact-low' :
                             'impact-medium'
          const frequencyClass = (risk.frequency || '').toLowerCase() === 'common' ? 'freq-high' :
                                (risk.frequency || '').toLowerCase() === 'rare' ? 'freq-low' :
                                'freq-medium'
          html.push('<tr>')
          html.push(`<td>${risk.pattern || risk.risk || 'Risk'}</td>`)
          html.push(`<td class="${frequencyClass}">${risk.frequency || 'Occasional'}</td>`)
          html.push(`<td class="${impactClass}">${risk.impact || 'Medium'}</td>`)
          html.push(`<td>${risk.mitigation || risk.strategy || 'To be determined'}</td>`)
          html.push('</tr>')
        }
      })
      
      html.push('</tbody>')
      html.push('</table>')
      
      // Add risk heat map
      html.push(this.createRiskHeatMap())
    } else {
      html.push(this.formatSection('', risks, 3))
    }
    
    return html.join('\n')
  }
  
  /**
   * Create risk heat map
   */
  private createRiskHeatMap(): string {
    return `
      <div class="risk-heatmap">
        <h4>Risk Heat Map</h4>
        <svg width="400" height="400" viewBox="0 0 400 400">
          <!-- Grid -->
          <rect x="100" y="50" width="80" height="80" fill="#c8e6c9" stroke="#333" stroke-width="1"/>
          <rect x="180" y="50" width="80" height="80" fill="#fff9c4" stroke="#333" stroke-width="1"/>
          <rect x="260" y="50" width="80" height="80" fill="#ffccbc" stroke="#333" stroke-width="1"/>
          
          <rect x="100" y="130" width="80" height="80" fill="#fff9c4" stroke="#333" stroke-width="1"/>
          <rect x="180" y="130" width="80" height="80" fill="#ffccbc" stroke="#333" stroke-width="1"/>
          <rect x="260" y="130" width="80" height="80" fill="#ffcdd2" stroke="#333" stroke-width="1"/>
          
          <rect x="100" y="210" width="80" height="80" fill="#ffccbc" stroke="#333" stroke-width="1"/>
          <rect x="180" y="210" width="80" height="80" fill="#ffcdd2" stroke="#333" stroke-width="1"/>
          <rect x="260" y="210" width="80" height="80" fill="#ef9a9a" stroke="#333" stroke-width="1"/>
          
          <!-- Labels -->
          <text x="50" y="95" font-size="12" text-anchor="middle">Low</text>
          <text x="50" y="175" font-size="12" text-anchor="middle">Medium</text>
          <text x="50" y="255" font-size="12" text-anchor="middle">High</text>
          
          <text x="140" y="35" font-size="12" text-anchor="middle">Rare</text>
          <text x="220" y="35" font-size="12" text-anchor="middle">Occasional</text>
          <text x="300" y="35" font-size="12" text-anchor="middle">Common</text>
          
          <!-- Axis labels -->
          <text x="25" y="170" font-size="14" font-weight="bold" text-anchor="middle" transform="rotate(-90 25 170)">Impact</text>
          <text x="220" y="320" font-size="14" font-weight="bold" text-anchor="middle">Frequency</text>
          
          <!-- Title -->
          <text x="200" y="360" font-size="12" text-anchor="middle">Lower Risk ← → Higher Risk</text>
        </svg>
      </div>
    `
  }
  
  /**
   * Format success factors
   */
  private formatSuccessFactors(factors: any): string {
    const html: string[] = []
    
    if (Array.isArray(factors)) {
      html.push('<div class="success-factors">')
      factors.forEach((factor, index) => {
        if (typeof factor === 'string') {
          html.push(`<div class="factor-item">`)
          html.push(`<div class="factor-icon">✓</div>`)
          html.push(`<p>${factor}</p>`)
          html.push(`</div>`)
        } else {
          const importanceClass = (factor.importance || '').toLowerCase() === 'critical' ? 'importance-critical' :
                                (factor.importance || '').toLowerCase() === 'nice-to-have' ? 'importance-low' :
                                'importance-high'
          html.push(`<div class="factor-item ${importanceClass}">`)
          html.push(`<div class="factor-icon">✓</div>`)
          html.push(`<div class="factor-content">`)
          html.push(`<h4>${factor.factor || factor.title || 'Success Factor'}</h4>`)
          if (factor.description) {
            html.push(`<p>${factor.description}</p>`)
          }
          if (factor.importance) {
            html.push(`<span class="factor-importance">${factor.importance}</span>`)
          }
          if (factor.evidence) {
            html.push(`<p class="factor-evidence"><em>Evidence: ${factor.evidence}</em></p>`)
          }
          html.push(`</div>`)
          html.push(`</div>`)
        }
      })
      html.push('</div>')
    } else {
      html.push(this.formatSection('', factors, 3))
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
          html.push(`<div class="recommendation">`)
          html.push(`<div class="rec-number">${index + 1}</div>`)
          html.push(`<p>${rec}</p>`)
          html.push(`</div>`)
        } else {
          const priorityClass = (rec.priority || '').toLowerCase() === 'high' ? 'priority-high' :
                              (rec.priority || '').toLowerCase() === 'low' ? 'priority-low' :
                              'priority-medium'
          html.push(`<div class="recommendation ${priorityClass}">`)
          html.push(`<div class="rec-number">${index + 1}</div>`)
          html.push(`<div class="rec-content">`)
          html.push(`<h4>${rec.recommendation || rec.title || 'Recommendation'}</h4>`)
          if (rec.description) {
            html.push(`<p>${rec.description}</p>`)
          }
          if (rec.rationale) {
            html.push(`<p><strong>Rationale:</strong> ${rec.rationale}</p>`)
          }
          if (rec.priority) {
            html.push(`<span class="rec-priority">Priority: ${rec.priority}</span>`)
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
  
  private formatList(items: any): string {
    if (!items) return ''
    
    const html: string[] = []
    const itemList = Array.isArray(items) ? items : [items]
    
    html.push('<ul>')
    itemList.forEach(item => {
      if (typeof item === 'string') {
        html.push(`<li>${item}</li>`)
      } else if (item.name || item.title || item.item) {
        html.push(`<li>`)
        html.push(`<strong>${item.name || item.title || item.item}:</strong> `)
        html.push(`${item.description || item.value || ''}`)
        html.push(`</li>`)
      }
    })
    html.push('</ul>')
    
    return html.join('\n')
  }
  
  private formatTechnologies(technologies: any): string {
    if (!technologies) return ''
    
    const html: string[] = []
    const techList = Array.isArray(technologies) ? technologies : [technologies]
    
    html.push('<div class="tech-tags">')
    techList.forEach(tech => {
      if (typeof tech === 'string') {
        html.push(`<span class="tech-tag">${tech}</span>`)
      } else if (tech.name || tech.technology) {
        html.push(`<span class="tech-tag">${tech.name || tech.technology}</span>`)
      }
    })
    html.push('</div>')
    
    return html.join('\n')
  }
  
  private formatResults(results: any): string {
    if (!results) return ''
    
    const html: string[] = []
    
    if (Array.isArray(results)) {
      html.push('<ul class="results-list">')
      results.forEach(result => {
        if (typeof result === 'string') {
          html.push(`<li>${result}</li>`)
        } else {
          html.push(`<li>`)
          if (result.metric || result.kpi) {
            html.push(`<strong>${result.metric || result.kpi}:</strong> `)
          }
          html.push(`${result.value || result.result || result}`)
          if (result.improvement) {
            html.push(` <span class="improvement">(+${result.improvement})</span>`)
          }
          html.push(`</li>`)
        }
      })
      html.push('</ul>')
    } else {
      html.push(this.formatSection('', results, 0))
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
      .case-study {
        margin: 2rem 0;
        padding: 1.5rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: #fafafa;
      }
      
      .case-study h3 {
        color: #1976d2;
        margin-bottom: 1rem;
      }
      
      .project-overview {
        background: white;
        padding: 1rem;
        border-left: 4px solid #1976d2;
        margin: 1rem 0;
      }
      
      .project-overview p {
        margin: 0.5rem 0;
      }
      
      .status-success { color: #2e7d32; font-weight: bold; }
      .status-fail { color: #c62828; font-weight: bold; }
      .status-partial { color: #f57c00; font-weight: bold; }
      
      .tech-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0.5rem 0;
      }
      
      .tech-tag {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        background: #e3f2fd;
        color: #1976d2;
        border-radius: 15px;
        font-size: 0.9rem;
      }
      
      .results-list .improvement {
        color: #2e7d32;
        font-weight: bold;
      }
      
      .comparison-table {
        width: 100%;
        margin: 2rem 0;
      }
      
      .comparison-table th {
        background: #f5f5f5;
        font-weight: 600;
      }
      
      .comparison-table .highlight {
        background: #fff3e0;
        font-weight: 500;
      }
      
      .comparison-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
      }
      
      .comparison-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1rem;
        background: white;
      }
      
      .comparison-chart {
        margin: 2rem 0;
        text-align: center;
      }
      
      .lessons-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
      }
      
      .lesson-card {
        position: relative;
        padding: 1.5rem;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .lesson-number {
        position: absolute;
        top: -10px;
        left: 20px;
        width: 30px;
        height: 30px;
        background: #1976d2;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      
      .lesson-card h4 {
        margin: 0.5rem 0;
        color: #333;
      }
      
      .lesson-category {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        background: #e8eaf6;
        color: #3f51b5;
        border-radius: 4px;
        font-size: 0.8rem;
        margin-bottom: 0.5rem;
      }
      
      .lesson-impact {
        color: #f57c00;
        font-size: 0.9rem;
      }
      
      .lesson-application {
        color: #2e7d32;
        font-size: 0.9rem;
      }
      
      .practices-container {
        margin: 1rem 0;
      }
      
      .practice-category {
        margin: 1.5rem 0;
      }
      
      .practice-category h4 {
        color: #1976d2;
        border-bottom: 2px solid #e3f2fd;
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
      }
      
      .practice-list {
        list-style-type: none;
        padding-left: 0;
      }
      
      .practice-list li {
        position: relative;
        padding-left: 2rem;
        margin: 0.75rem 0;
      }
      
      .practice-list li::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: #4caf50;
        font-weight: bold;
        font-size: 1.2rem;
      }
      
      .risk-patterns-table th {
        background: #ffebee;
      }
      
      .impact-high { color: #c62828; font-weight: bold; }
      .impact-medium { color: #f57c00; }
      .impact-low { color: #2e7d32; }
      
      .freq-high { color: #c62828; }
      .freq-medium { color: #f57c00; }
      .freq-low { color: #2e7d32; }
      
      .risk-heatmap {
        margin: 2rem 0;
        text-align: center;
      }
      
      .success-factors {
        margin: 2rem 0;
      }
      
      .factor-item {
        display: flex;
        gap: 1rem;
        margin: 1rem 0;
        padding: 1rem;
        background: #f0f4f8;
        border-radius: 8px;
        align-items: flex-start;
      }
      
      .factor-icon {
        width: 30px;
        height: 30px;
        background: #4caf50;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        flex-shrink: 0;
      }
      
      .factor-content {
        flex: 1;
      }
      
      .factor-content h4 {
        margin: 0 0 0.5rem 0;
        color: #333;
      }
      
      .factor-importance {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 0.8rem;
        margin-top: 0.5rem;
      }
      
      .importance-critical { border-left: 4px solid #c62828; }
      .importance-high { border-left: 4px solid #f57c00; }
      .importance-low { border-left: 4px solid #66bb6a; }
      
      .factor-evidence {
        color: #666;
        font-size: 0.9rem;
        margin-top: 0.5rem;
      }
      
      .recommendations {
        margin: 2rem 0;
      }
      
      .recommendation {
        display: flex;
        gap: 1rem;
        margin: 1rem 0;
        padding: 1rem;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      }
      
      .rec-number {
        width: 30px;
        height: 30px;
        background: #1976d2;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
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
      
      .rec-priority {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        background: #e3f2fd;
        color: #1976d2;
        border-radius: 4px;
        font-size: 0.8rem;
        margin-top: 0.5rem;
      }
      
      .priority-high { border-left: 4px solid #c62828; }
      .priority-medium { border-left: 4px solid #f57c00; }
      .priority-low { border-left: 4px solid #4caf50; }
      
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