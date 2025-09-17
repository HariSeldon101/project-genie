/**
 * Comparable Projects Content Validator
 * Validates that generated comparable projects content meets requirements
 * Based on prompt_requirements.md specifications
 */

export interface ValidationCheck {
  name: string
  passed: boolean
  details: string
  found?: any[]
  required?: number
}

export interface ValidationResult {
  isValid: boolean
  score: number
  checks: ValidationCheck[]
  summary: string
}

export class ComparableProjectsValidator {
  // Real company names to look for (sector-specific)
  private static readonly REAL_COMPANIES = {
    banking: [
      'JPMorgan', 'JP Morgan', 'Chase',
      'Bank of America', 'BofA',
      'Wells Fargo',
      'Citigroup', 'Citi',
      'Goldman Sachs',
      'Morgan Stanley',
      'HSBC',
      'Barclays',
      'Capital One',
      'PNC Bank',
      'US Bank', 'U.S. Bank',
      'TD Bank',
      'Truist',
      'BNP Paribas',
      'Deutsche Bank',
      'Santander',
      'Royal Bank of Canada', 'RBC'
    ],
    retail: [
      'Walmart',
      'Target',
      'Amazon',
      'Home Depot',
      'Lowe\'s',
      'Costco',
      'Kroger',
      'CVS',
      'Walgreens',
      'Best Buy',
      'Macy\'s',
      'Nordstrom',
      'Kohl\'s',
      'Dollar General',
      'TJX', 'TJ Maxx',
      'Ross Stores',
      'Gap',
      'Dick\'s Sporting Goods',
      'AutoZone',
      'O\'Reilly'
    ],
    technology: [
      'Microsoft',
      'Google', 'Alphabet',
      'Apple',
      'Amazon', 'AWS',
      'Meta', 'Facebook',
      'Salesforce',
      'Oracle',
      'SAP',
      'Adobe',
      'IBM',
      'ServiceNow',
      'Workday',
      'Snowflake',
      'Databricks',
      'Palantir',
      'VMware',
      'Cisco',
      'Intel',
      'NVIDIA',
      'Qualcomm'
    ],
    healthcare: [
      'UnitedHealth',
      'CVS Health',
      'Anthem',
      'Kaiser Permanente',
      'Humana',
      'Cigna',
      'Centene',
      'HCA Healthcare',
      'Tenet Healthcare',
      'Mayo Clinic',
      'Cleveland Clinic',
      'Johns Hopkins',
      'Mount Sinai',
      'Pfizer',
      'Johnson & Johnson',
      'Merck',
      'AbbVie',
      'Bristol Myers Squibb',
      'Eli Lilly',
      'Moderna'
    ]
  }

  /**
   * Main validation method
   */
  static validate(content: string, sector?: string): ValidationResult {
    const checks: ValidationCheck[] = []
    
    // 1. Check for real company names
    const companyCheck = this.checkRealCompanies(content, sector)
    checks.push(companyCheck)
    
    // 2. Check for specific date ranges
    const dateCheck = this.checkSpecificDates(content)
    checks.push(dateCheck)
    
    // 3. Check for URLs
    const urlCheck = this.checkURLs(content)
    checks.push(urlCheck)
    
    // 4. Check for budget amounts with variance
    const budgetCheck = this.checkBudgets(content)
    checks.push(budgetCheck)
    
    // 5. Check for quantified metrics
    const metricsCheck = this.checkQuantifiedMetrics(content)
    checks.push(metricsCheck)
    
    // 6. Check for named technologies
    const techCheck = this.checkNamedTechnologies(content)
    checks.push(techCheck)
    
    // 7. Check for specific outcomes
    const outcomeCheck = this.checkSpecificOutcomes(content)
    checks.push(outcomeCheck)
    
    // 8. Check for no generic placeholders
    const placeholderCheck = this.checkNoPlaceholders(content)
    checks.push(placeholderCheck)
    
    // Calculate score
    const passedChecks = checks.filter(c => c.passed).length
    const score = Math.round((passedChecks / checks.length) * 100)
    
    // Determine if valid (must pass critical checks)
    const criticalChecks = ['real_companies', 'no_placeholders', 'urls']
    const criticalPassed = checks
      .filter(c => criticalChecks.includes(c.name))
      .every(c => c.passed)
    
    const isValid = criticalPassed && score >= 70
    
    // Create summary
    const summary = isValid 
      ? `✅ Document passed validation with ${score}% score (${passedChecks}/${checks.length} checks)`
      : `❌ Document failed validation with ${score}% score (${passedChecks}/${checks.length} checks)`
    
    return {
      isValid,
      score,
      checks,
      summary
    }
  }

  /**
   * Check for real company names
   */
  private static checkRealCompanies(content: string, sector?: string): ValidationCheck {
    // Get companies to check based on sector
    let companiesToCheck: string[] = []
    
    if (sector) {
      const sectorKey = sector.toLowerCase()
      if (sectorKey.includes('bank') || sectorKey.includes('financ')) {
        companiesToCheck = this.REAL_COMPANIES.banking
      } else if (sectorKey.includes('retail') || sectorKey.includes('commerce')) {
        companiesToCheck = this.REAL_COMPANIES.retail
      } else if (sectorKey.includes('tech') || sectorKey.includes('software')) {
        companiesToCheck = this.REAL_COMPANIES.technology
      } else if (sectorKey.includes('health') || sectorKey.includes('medical')) {
        companiesToCheck = this.REAL_COMPANIES.healthcare
      } else {
        // Use all companies if sector unknown
        companiesToCheck = Object.values(this.REAL_COMPANIES).flat()
      }
    } else {
      companiesToCheck = Object.values(this.REAL_COMPANIES).flat()
    }
    
    const found = companiesToCheck.filter(company => {
      const regex = new RegExp(`\\b${company}\\b`, 'i')
      return regex.test(content)
    })
    
    const uniqueFound = [...new Set(found)]
    const required = 5
    
    return {
      name: 'real_companies',
      passed: uniqueFound.length >= required,
      details: `Found ${uniqueFound.length} real companies (required: ${required})`,
      found: uniqueFound,
      required
    }
  }

  /**
   * Check for specific date ranges
   */
  private static checkSpecificDates(content: string): ValidationCheck {
    // Look for date patterns like "January 2021 - June 2023" or "Jan 2021 - Dec 2023"
    const datePatterns = [
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*[-–]\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/gi,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*[-–]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/gi,
      /\b\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{4}/g, // MM/YYYY - MM/YYYY
      /\bQ[1-4]\s+\d{4}\s*[-–]\s*Q[1-4]\s+\d{4}/gi // Q1 2021 - Q3 2023
    ]
    
    const found: string[] = []
    datePatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        found.push(...matches)
      }
    })
    
    const required = 5
    
    return {
      name: 'specific_dates',
      passed: found.length >= required,
      details: `Found ${found.length} specific date ranges (required: ${required})`,
      found: found.slice(0, 10), // Show first 10
      required
    }
  }

  /**
   * Check for URLs
   */
  private static checkURLs(content: string): ValidationCheck {
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
    const matches = content.match(urlPattern) || []
    
    // Filter out obvious fake URLs
    const validUrls = matches.filter(url => {
      return !url.includes('example.com') && 
             !url.includes('placeholder') &&
             !url.includes('your-url-here')
    })
    
    const required = 5
    
    return {
      name: 'urls',
      passed: validUrls.length >= required,
      details: `Found ${validUrls.length} URLs (required: ${required})`,
      found: validUrls.slice(0, 10),
      required
    }
  }

  /**
   * Check for budget amounts with variance
   */
  private static checkBudgets(content: string): ValidationCheck {
    // Look for budget patterns like "$45M (15% over)" or "$2.5B budget, 10% under"
    const budgetPatterns = [
      /\$[\d.,]+[MBK]\s*(?:\([^)]*(?:over|under|variance)[^)]*\))?/gi,
      /budget[^.]*\$[\d.,]+[MBK]/gi,
      /\$[\d.,]+\s*(?:million|billion|thousand)/gi
    ]
    
    const found: string[] = []
    budgetPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        found.push(...matches)
      }
    })
    
    // Check how many have variance information
    const withVariance = found.filter(budget => 
      /\d+%|over|under|variance/i.test(budget)
    )
    
    const required = 5
    const varianceRequired = 3
    
    return {
      name: 'budgets_with_variance',
      passed: found.length >= required && withVariance.length >= varianceRequired,
      details: `Found ${found.length} budgets, ${withVariance.length} with variance (required: ${required} budgets, ${varianceRequired} with variance)`,
      found: found.slice(0, 10),
      required
    }
  }

  /**
   * Check for quantified metrics
   */
  private static checkQuantifiedMetrics(content: string): ValidationCheck {
    // Look for patterns like "45%", "3.5x", "reduced by 60%", "increased 25%"
    const metricPatterns = [
      /\d+(?:\.\d+)?%/g, // Percentages
      /\d+(?:\.\d+)?x\s/gi, // Multipliers like 2x, 3.5x
      /(?:increased?|decreased?|reduced?|improved?|grew|fell)\s+(?:by\s+)?\d+(?:\.\d+)?%/gi,
      /\d+(?:\.\d+)?%\s+(?:increase|decrease|reduction|improvement|growth)/gi
    ]
    
    const found: string[] = []
    metricPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        found.push(...matches)
      }
    })
    
    // Deduplicate
    const uniqueMetrics = [...new Set(found)]
    const required = 10
    
    return {
      name: 'quantified_metrics',
      passed: uniqueMetrics.length >= required,
      details: `Found ${uniqueMetrics.length} quantified metrics (required: ${required})`,
      found: uniqueMetrics.slice(0, 15),
      required
    }
  }

  /**
   * Check for named technologies
   */
  private static checkNamedTechnologies(content: string): ValidationCheck {
    const technologies = [
      // Cloud platforms
      'AWS', 'Amazon Web Services', 'Azure', 'Google Cloud', 'GCP', 'IBM Cloud',
      // Container/orchestration
      'Kubernetes', 'Docker', 'OpenShift', 'Rancher',
      // Databases
      'PostgreSQL', 'MySQL', 'MongoDB', 'Oracle', 'SQL Server', 'DynamoDB', 'Cosmos DB',
      // Programming languages/frameworks
      'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', '.NET', 'Spring',
      // CI/CD
      'Jenkins', 'GitLab', 'GitHub Actions', 'CircleCI', 'Travis CI',
      // Monitoring
      'Datadog', 'New Relic', 'Splunk', 'Prometheus', 'Grafana',
      // Other
      'Kafka', 'RabbitMQ', 'Redis', 'Elasticsearch', 'Terraform', 'Ansible'
    ]
    
    const found = technologies.filter(tech => {
      const regex = new RegExp(`\\b${tech}\\b`, 'i')
      return regex.test(content)
    })
    
    const required = 5
    
    return {
      name: 'named_technologies',
      passed: found.length >= required,
      details: `Found ${found.length} named technologies (required: ${required})`,
      found,
      required
    }
  }

  /**
   * Check for specific outcomes
   */
  private static checkSpecificOutcomes(content: string): ValidationCheck {
    // Look for outcome patterns with metrics
    const outcomePatterns = [
      /(?:resulted in|achieved|delivered|realized|generated)\s+[^.]*\d+(?:\.\d+)?%/gi,
      /(?:success|outcome|result|achievement)[^.]*\d+(?:\.\d+)?[%MBK]/gi,
      /ROI\s+(?:of\s+)?\d+(?:\.\d+)?%/gi,
      /cost savings?\s+(?:of\s+)?\$?\d+(?:\.\d+)?[MBK]/gi,
      /(?:customer|user) satisfaction\s+(?:of\s+)?\d+(?:\.\d+)?%/gi
    ]
    
    const found: string[] = []
    outcomePatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        found.push(...matches)
      }
    })
    
    const required = 5
    
    return {
      name: 'specific_outcomes',
      passed: found.length >= required,
      details: `Found ${found.length} specific outcomes with metrics (required: ${required})`,
      found: found.slice(0, 10),
      required
    }
  }

  /**
   * Check for absence of generic placeholders
   */
  private static checkNoPlaceholders(content: string): ValidationCheck {
    const placeholders = [
      'Company A', 'Company B', 'Company C',
      'Organization A', 'Organization B',
      'Project A', 'Project B',
      'Client X', 'Client Y',
      'Banking Institution', 'Financial Institution',
      'Large Bank', 'Major Bank',
      'Digital Transformation Project',
      'placeholder', 'example',
      'TBD', 'TODO', 'XXX',
      '\\[INSERT', '\\[COMPANY', '\\[PROJECT'
    ]
    
    const found = placeholders.filter(placeholder => {
      const regex = new RegExp(`\\b${placeholder}\\b`, 'i')
      return regex.test(content)
    })
    
    return {
      name: 'no_placeholders',
      passed: found.length === 0,
      details: found.length === 0 
        ? 'No generic placeholders found' 
        : `Found ${found.length} generic placeholders: ${found.join(', ')}`,
      found
    }
  }

  /**
   * Generate a detailed validation report
   */
  static generateReport(result: ValidationResult): string {
    let report = `# Comparable Projects Validation Report\n\n`
    report += `## Summary\n${result.summary}\n\n`
    report += `## Score: ${result.score}%\n\n`
    report += `## Validation Checks\n\n`
    
    result.checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌'
      report += `### ${icon} ${check.name.replace(/_/g, ' ').toUpperCase()}\n`
      report += `${check.details}\n`
      
      if (check.found && check.found.length > 0) {
        report += `\n**Found items:**\n`
        check.found.forEach(item => {
          report += `- ${item}\n`
        })
      }
      
      report += `\n`
    })
    
    // Add recommendations
    report += `## Recommendations\n\n`
    
    const failedChecks = result.checks.filter(c => !c.passed)
    if (failedChecks.length > 0) {
      report += `To improve this document:\n\n`
      failedChecks.forEach(check => {
        if (check.name === 'real_companies') {
          report += `- Add more real company names (JPMorgan, Bank of America, etc.)\n`
        } else if (check.name === 'specific_dates') {
          report += `- Include specific date ranges (e.g., "January 2022 - June 2023")\n`
        } else if (check.name === 'urls') {
          report += `- Add URLs to real sources and case studies\n`
        } else if (check.name === 'budgets_with_variance') {
          report += `- Include budget amounts with variance percentages\n`
        } else if (check.name === 'quantified_metrics') {
          report += `- Add more quantified metrics and percentages\n`
        } else if (check.name === 'no_placeholders') {
          report += `- Remove generic placeholders and use real examples\n`
        }
      })
    } else {
      report += `Document meets all validation requirements!\n`
    }
    
    return report
  }
}