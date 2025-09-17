/**
 * Date utility functions for document formatters
 * Handles dynamic date calculations based on project timeline
 */

export interface Phase {
  name: string
  startDate: string
  endDate: string
  quarter?: string
}

export interface BudgetThresholds {
  veryLow: string
  low: string
  medium: string
  high: string
  veryHigh: string
}

/**
 * Calculate quarter from a date string
 */
export function calculateQuarterFromDate(date: string | undefined): string {
  if (!date) return 'TBD'
  
  try {
    const d = new Date(date)
    const month = d.getMonth() // 0-11
    const year = d.getFullYear()
    const quarter = Math.floor(month / 3) + 1
    return `Q${quarter} ${year}`
  } catch {
    return 'TBD'
  }
}

/**
 * Calculate milestone date from start date and month offset
 */
export function calculateMilestoneDate(
  startDate: string | undefined, 
  monthOffset: number,
  format: 'full' | 'month' | 'quarter' = 'full'
): string {
  if (!startDate) return format === 'month' ? `Month ${monthOffset}` : 'TBD'
  
  try {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + monthOffset)
    
    switch (format) {
      case 'month':
        return `Month ${monthOffset}`
      case 'quarter':
        return calculateQuarterFromDate(date.toISOString())
      case 'full':
      default:
        return date.toLocaleDateString('en-GB', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
    }
  } catch {
    return format === 'month' ? `Month ${monthOffset}` : 'TBD'
  }
}

/**
 * Calculate sprint dates from project start
 */
export function calculateSprintDates(
  startDate: string | undefined,
  sprintNumber: number,
  sprintDuration: number = 14 // days
): { start: string; end: string } {
  if (!startDate) {
    return { 
      start: `Sprint ${sprintNumber} Start`, 
      end: `Sprint ${sprintNumber} End` 
    }
  }
  
  try {
    const start = new Date(startDate)
    // Calculate sprint start (0-indexed)
    start.setDate(start.getDate() + (sprintNumber - 1) * sprintDuration)
    
    const end = new Date(start)
    end.setDate(end.getDate() + sprintDuration - 1)
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  } catch {
    return { 
      start: `Sprint ${sprintNumber} Start`, 
      end: `Sprint ${sprintNumber} End` 
    }
  }
}

/**
 * Calculate phase timeline from project dates
 */
export function calculatePhaseTimeline(
  startDate: string | undefined,
  endDate: string | undefined,
  phaseNames: string[] = ['Foundation', 'Development', 'Implementation', 'Closure']
): Phase[] {
  if (!startDate || !endDate) {
    return phaseNames.map((name, i) => ({
      name,
      startDate: `Phase ${i + 1} Start`,
      endDate: `Phase ${i + 1} End`,
      quarter: 'TBD'
    }))
  }
  
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDuration = end.getTime() - start.getTime()
    const phaseDuration = totalDuration / phaseNames.length
    
    return phaseNames.map((name, i) => {
      const phaseStart = new Date(start.getTime() + (phaseDuration * i))
      const phaseEnd = new Date(start.getTime() + (phaseDuration * (i + 1)))
      
      return {
        name,
        startDate: phaseStart.toISOString().split('T')[0],
        endDate: phaseEnd.toISOString().split('T')[0],
        quarter: calculateQuarterFromDate(phaseStart.toISOString())
      }
    })
  } catch {
    return phaseNames.map((name, i) => ({
      name,
      startDate: `Phase ${i + 1} Start`,
      endDate: `Phase ${i + 1} End`,
      quarter: 'TBD'
    }))
  }
}

/**
 * Format date for display
 */
export function formatDateForDisplay(
  date: string | undefined,
  format: 'short' | 'long' | 'iso' = 'long'
): string {
  if (!date) return 'TBD'
  
  try {
    const d = new Date(date)
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString('en-GB')
      case 'iso':
        return d.toISOString().split('T')[0]
      case 'long':
      default:
        return d.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
    }
  } catch {
    return date // Return as-is if parsing fails
  }
}

/**
 * Calculate budget thresholds based on total budget
 */
export function calculateBudgetThresholds(totalBudget: string | undefined): BudgetThresholds {
  // Default thresholds if no budget provided
  if (!totalBudget) {
    return {
      veryLow: '<5% of budget',
      low: '5-10% of budget',
      medium: '10-25% of budget',
      high: '25-50% of budget',
      veryHigh: '>50% of budget'
    }
  }
  
  // Try to parse budget amount
  const budgetMatch = totalBudget.match(/[\d,]+/)
  if (!budgetMatch) {
    return {
      veryLow: '<5% of budget',
      low: '5-10% of budget',
      medium: '10-25% of budget',
      high: '25-50% of budget',
      veryHigh: '>50% of budget'
    }
  }
  
  const amount = parseInt(budgetMatch[0].replace(/,/g, ''))
  const currency = totalBudget.includes('£') ? '£' : 
                   totalBudget.includes('€') ? '€' : '$'
  
  return {
    veryLow: `<${currency}${Math.round(amount * 0.05).toLocaleString()} or <5% budget`,
    low: `${currency}${Math.round(amount * 0.05).toLocaleString()}-${Math.round(amount * 0.10).toLocaleString()} or 5-10% budget`,
    medium: `${currency}${Math.round(amount * 0.10).toLocaleString()}-${Math.round(amount * 0.25).toLocaleString()} or 10-25% budget`,
    high: `${currency}${Math.round(amount * 0.25).toLocaleString()}-${Math.round(amount * 0.50).toLocaleString()} or 25-50% budget`,
    veryHigh: `>${currency}${Math.round(amount * 0.50).toLocaleString()} or >50% budget`
  }
}

/**
 * Calculate delay thresholds based on project timeline
 */
export function calculateDelayThresholds(timeline: string | undefined): {
  veryLow: string
  low: string
  medium: string
  high: string
  veryHigh: string
} {
  if (!timeline) {
    return {
      veryLow: '<2 weeks delay',
      low: '2-4 weeks delay',
      medium: '1-3 months delay',
      high: '3-6 months delay',
      veryHigh: '>6 months delay'
    }
  }
  
  // Extract months from timeline
  const monthsMatch = timeline.match(/(\d+)\s*month/i)
  if (!monthsMatch) {
    return {
      veryLow: '<2 weeks delay',
      low: '2-4 weeks delay',
      medium: '1-3 months delay',
      high: '3-6 months delay',
      veryHigh: '>6 months delay'
    }
  }
  
  const totalMonths = parseInt(monthsMatch[1])
  
  return {
    veryLow: `<${Math.round(totalMonths * 0.05)} weeks delay`,
    low: `${Math.round(totalMonths * 0.05)}-${Math.round(totalMonths * 0.10)} weeks delay`,
    medium: `${Math.round(totalMonths * 0.10)}-${Math.round(totalMonths * 0.25)} months delay`,
    high: `${Math.round(totalMonths * 0.25)}-${Math.round(totalMonths * 0.50)} months delay`,
    veryHigh: `>${Math.round(totalMonths * 0.50)} months delay`
  }
}

/**
 * Generate project timeline for mermaid diagrams
 */
export function generateTimelineEntries(
  startDate: string | undefined,
  endDate: string | undefined,
  includePostProject: boolean = true
): string[] {
  const phases = calculatePhaseTimeline(startDate, endDate, [
    'Project Initiation',
    'Phase 1 - Foundation',
    'Phase 2 - Development', 
    'Phase 3 - Implementation',
    'Project Closure'
  ])
  
  const entries = phases.map(phase => 
    `    ${phase.name} : ${phase.quarter || calculateQuarterFromDate(phase.startDate)}`
  )
  
  if (includePostProject && endDate) {
    // Add benefits realization period
    const benefitsStart = calculateQuarterFromDate(
      calculateMilestoneDate(endDate, 1, 'full')
    )
    const benefitsEnd = calculateQuarterFromDate(
      calculateMilestoneDate(endDate, 12, 'full')
    )
    entries.push(`    Benefits Realization : ${benefitsStart}-${benefitsEnd}`)
  }
  
  return entries
}

/**
 * Calculate project duration in various formats
 */
export function calculateProjectDuration(
  startDate: string | undefined,
  endDate: string | undefined
): {
  months: number
  text: string
  detailed: string
} {
  if (!startDate || !endDate) {
    return {
      months: 0,
      text: 'Duration not specified',
      detailed: 'Project duration to be determined'
    }
  }
  
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffMonths = Math.round(diffDays / 30)
    
    const startFormatted = formatDateForDisplay(startDate, 'long')
    const endFormatted = formatDateForDisplay(endDate, 'long')
    
    return {
      months: diffMonths,
      text: `${diffMonths} months`,
      detailed: `Project Duration: ${diffMonths} months - Start Date: ${startFormatted} - End Date: ${endFormatted}`
    }
  } catch {
    return {
      months: 0,
      text: 'Duration calculation error',
      detailed: 'Unable to calculate project duration'
    }
  }
}

/**
 * Format project duration for display in tables
 */
export function formatProjectDurationForTable(
  startDate: string | undefined,
  endDate: string | undefined,
  timeline: string | undefined
): string {
  const duration = calculateProjectDuration(startDate, endDate)
  
  if (duration.months > 0) {
    return `
**Duration:** ${duration.text}
**Start:** ${formatDateForDisplay(startDate, 'short')}
**End:** ${formatDateForDisplay(endDate, 'short')}`.trim()
  }
  
  return timeline || 'Duration TBD'
}

/**
 * Parse and format numbered list from text
 */
export function formatNumberedReasons(text: string): string {
  if (!text) return ''
  
  // Check if text contains numbered items
  const numberedPattern = /(\d+)\.\s*\*\*([^*]+)\*\*:\s*([^.]+\.)/g
  const matches = Array.from(text.matchAll(numberedPattern))
  
  if (matches.length > 0) {
    return matches.map(match => {
      const [, number, title, description] = match
      return `### ${number}. ${title}\n\n${description}`
    }).join('\n\n')
  }
  
  // Try alternative pattern without markdown
  const altPattern = /(\d+)\.\s*([^:]+):\s*([^.]+\.)/g
  const altMatches = Array.from(text.matchAll(altPattern))
  
  if (altMatches.length > 0) {
    return altMatches.map(match => {
      const [, number, title, description] = match
      return `### ${number}. ${title}\n\n${description}`
    }).join('\n\n')
  }
  
  // Return original text if no pattern matches
  return text
}