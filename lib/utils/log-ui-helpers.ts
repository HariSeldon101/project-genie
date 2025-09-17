/**
 * Log UI Helper Utilities
 * Provides consistent UI formatting and styling for logs
 * Following DRY principle - reusable across all log components
 * @module log-ui-helpers
 */

import { formatLevelForDatabase, formatLevelForDisplay } from './log-level-utils'
import type { LogEntry } from './log-operations'

/**
 * Format JSON data for display with proper indentation
 * Handles both strings (that might be JSON) and objects
 * Following DRY principle - single source of truth for JSON formatting
 * @param data - Data to format (string, object, or any)
 * @param indent - Number of spaces for indentation (default: 2)
 * @returns Formatted string for display
 */
export function formatJsonForDisplay(data: any, indent: number = 2): string {
  if (!data) return ''

  if (typeof data === 'string') {
    try {
      // Try to parse if it's a JSON string
      return JSON.stringify(JSON.parse(data), null, indent)
    } catch {
      // If not JSON, return as-is
      return data
    }
  }

  // If it's already an object, stringify with formatting
  try {
    return JSON.stringify(data, null, indent)
  } catch (error) {
    // Handle circular references or other stringify errors
    return String(data)
  }
}

/**
 * Format JSON with truncation for inline display
 * Used in breadcrumbs and timing displays for space efficiency
 * @param data - Data to format
 * @param maxLength - Maximum string length (default: 200)
 * @returns Truncated formatted string with ellipsis if needed
 */
export function formatJsonForInlineDisplay(data: any, maxLength: number = 200): string {
  const formatted = formatJsonForDisplay(data, 2)
  if (formatted.length <= maxLength) {
    return formatted
  }
  return formatted.substring(0, maxLength) + '...'
}

/**
 * Get the appropriate icon name for a log level
 * Used with lucide-react icons
 * @param level - Log level
 * @returns Icon component name
 */
export function getLevelIconName(level: string): string {
  // IMPORTANT: Always use formatLevelForDatabase for consistency
  const normalizedLevel = formatLevelForDatabase(level)
  
  switch (normalizedLevel) {
    case 'debug': return 'Info'
    case 'info': return 'CheckCircle2'
    case 'warn': return 'AlertTriangle'
    case 'error': return 'XCircle'
    case 'fatal': return 'AlertCircle'
    default: return 'Info'
  }
}

/**
 * Get Tailwind CSS classes for log level color
 * @param level - Log level
 * @returns Tailwind class string
 */
export function getLevelColorClass(level: string): string {
  // IMPORTANT: Always use formatLevelForDatabase for consistency
  const normalizedLevel = formatLevelForDatabase(level)
  
  switch (normalizedLevel) {
    case 'debug': return 'text-gray-500'
    case 'info': return 'text-blue-500'
    case 'warn': return 'text-yellow-500'
    case 'error': return 'text-red-500'
    case 'fatal': return 'text-red-700 font-bold'
    default: return 'text-gray-500'
  }
}

/**
 * Get badge variant for log level
 * Used with shadcn/ui Badge component
 * @param level - Log level
 * @returns Badge variant
 */
export function getLevelBadgeVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  // IMPORTANT: Always use formatLevelForDatabase for consistency
  const normalizedLevel = formatLevelForDatabase(level)
  
  if (normalizedLevel === 'error' || normalizedLevel === 'fatal') {
    return 'destructive'
  }
  if (normalizedLevel === 'warn') {
    return 'secondary'
  }
  return 'outline'
}

/**
 * Get background color classes for log entry
 * Provides visual distinction for different log levels
 * @param level - Log level
 * @returns Tailwind class string for background
 */
export function getLogBackgroundClass(level: string): string {
  // IMPORTANT: Always use formatLevelForDatabase for consistency
  const normalizedLevel = formatLevelForDatabase(level)
  
  switch (normalizedLevel) {
    case 'error':
      return 'bg-red-50 dark:bg-red-950/20 border-red-500/50 hover:bg-red-100 dark:hover:bg-red-950/30'
    case 'fatal':
      return 'bg-red-100 dark:bg-red-950/30 border-red-600 hover:bg-red-200 dark:hover:bg-red-950/40'
    case 'warn':
      return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500/50 hover:bg-yellow-100 dark:hover:bg-yellow-950/30'
    case 'debug':
      return 'bg-gray-50 dark:bg-gray-950/20 border-gray-400/50 hover:bg-gray-100 dark:hover:bg-gray-950/30'
    default:
      return 'hover:bg-muted/50 border'
  }
}

/**
 * Format time filter display text
 * Converts filter key to human-readable text
 * @param filter - Time filter key
 * @returns Human-readable time filter text
 */
export function formatTimeFilterDisplay(filter: string): string {
  return filter
    .replace('-', ' ')
    .replace('m', ' min')
    .replace('h', ' hour')
    .replace('last', 'Last')
}

/**
 * Copy text to clipboard
 * Provides user feedback on success/failure
 * @param text - Text to copy
 * @returns Promise resolving to success boolean
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Format log entry for clipboard
 * Creates a readable text representation
 * @param log - Log entry to format
 * @returns Formatted string
 */
export function formatLogForClipboard(log: LogEntry): string {
  return formatJsonForDisplay(log)
}

/**
 * Format log entry for LLM/AI analysis
 * Creates a comprehensive markdown report with all context
 * Perfect for debugging with AI assistants like Claude or ChatGPT
 *
 * @param log - Log entry to format (typically an error)
 * @param breadcrumbs - Related breadcrumb trail (optional)
 * @param timings - Performance timings (optional)
 * @returns Markdown formatted string with full context
 */
export function formatLogForLLMAnalysis(
  log: LogEntry,
  breadcrumbs?: any[],
  timings?: any[]
): string {
  // Start building the comprehensive report
  const report: string[] = []

  // ========== HEADER ==========
  report.push('# Error Analysis Report')
  report.push(`Generated: ${new Date().toISOString()}`)
  report.push('')

  // ========== ERROR SUMMARY ==========
  report.push('## 🔴 Error Summary')
  report.push(`**Level:** ${formatLevelForDisplay(log.level)}`)
  report.push(`**Category:** ${log.category}`)
  report.push(`**Message:** ${log.message}`)
  report.push(`**Timestamp:** ${log.timestamp}`)
  if (log.requestId) {
    report.push(`**Request ID:** ${log.requestId}`)
  }
  report.push('')

  // ========== ERROR DETAILS ==========
  if (log.error) {
    report.push('## 📋 Error Details')
    report.push('```json')
    report.push(formatJsonForDisplay(log.error))
    report.push('```')
    report.push('')

    // Stack trace if available
    if (log.stack || log.error.stack) {
      report.push('### Stack Trace')
      report.push('```')
      report.push(log.stack || log.error.stack)
      report.push('```')
      report.push('')
    }
  }

  // ========== BREADCRUMBS ==========
  if (breadcrumbs && breadcrumbs.length > 0) {
    report.push('## 🍞 User Journey (Breadcrumbs)')
    report.push('*Last 20 actions before the error:*')
    report.push('')

    // Take last 20 breadcrumbs for context
    const relevantBreadcrumbs = breadcrumbs.slice(-20)

    relevantBreadcrumbs.forEach((crumb, index) => {
      const num = String(index + 1).padStart(2, '0')
      report.push(`${num}. **[${crumb.type}]** ${crumb.action}`)
      if (crumb.timestamp) {
        report.push(`    *${new Date(crumb.timestamp).toISOString()}*`)
      }
      if (crumb.data) {
        // Only show first 100 chars of data to keep it concise
        const dataStr = formatJsonForInlineDisplay(crumb.data, 100)
        report.push(`    Data: ${dataStr}`)
      }
      report.push('')
    })
  }

  // ========== PERFORMANCE TIMINGS ==========
  if (timings && timings.length > 0) {
    report.push('## ⏱️ Performance Timeline')
    report.push('*Operations leading to the error:*')
    report.push('')

    // Take last 10 timings for relevance
    const relevantTimings = timings.slice(-10)

    relevantTimings.forEach(timing => {
      report.push(`- **${timing.checkpoint}**: ${timing.duration || 0}ms`)
      if (timing.metadata) {
        report.push(`  Metadata: ${formatJsonForDisplay(timing.metadata)}`)
      }
    })
    report.push('')
  }

  // ========== ADDITIONAL DATA ==========
  if (log.data) {
    report.push('## 📊 Additional Context Data')
    report.push('```json')
    report.push(formatJsonForDisplay(log.data))
    report.push('```')
    report.push('')
  }

  // ========== SYSTEM INFO ==========
  report.push('## 💻 System Information')
  report.push(`**Environment:** ${typeof process !== 'undefined' ? process.env?.NODE_ENV || 'development' : 'browser'}`)
  report.push(`**User Agent:** ${typeof window !== 'undefined' ? window.navigator.userAgent : 'Server-side'}`)
  report.push(`**Platform:** ${typeof window !== 'undefined' ? window.navigator.platform : 'Node.js'}`)
  report.push('')

  // ========== AI ANALYSIS PROMPTS ==========
  report.push('## 🤖 Suggested AI Analysis Prompts')
  report.push('')
  report.push('You can ask your AI assistant:')
  report.push('1. "What is the root cause of this error?"')
  report.push('2. "Based on the breadcrumbs, what user action triggered this?"')
  report.push('3. "Are there any performance bottlenecks visible in the timings?"')
  report.push('4. "What are the recommended fixes for this issue?"')
  report.push('5. "Is this a frontend or backend issue?"')
  report.push('')

  // ========== FOOTER ==========
  report.push('---')
  report.push('*This report was generated for AI debugging assistance.*')
  report.push('*Copy this entire report and paste it into your AI assistant for analysis.*')

  return report.join('\n')
}

/**
 * Check if log is an error type
 * Used to determine if error-specific UI should be shown
 * @param log - Log entry to check
 * @returns True if log is error or critical level
 */
export function isErrorLog(log: LogEntry): boolean {
  // IMPORTANT: Always use formatLevelForDatabase for consistency
  const normalizedLevel = formatLevelForDatabase(log.level)
  return normalizedLevel === 'error' || normalizedLevel === 'fatal'
}

/**
 * Get error name from log entry
 * Extracts error name with fallback
 * @param log - Log entry
 * @returns Error name or 'Unknown'
 */
export function getErrorName(log: LogEntry): string {
  if (!log.error) return 'Unknown'
  return log.error.name || log.error.type || 'Unknown'
}

/**
 * Format duration for display
 * Converts milliseconds to human-readable format
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  return `${(ms / 60000).toFixed(1)}min`
}

/**
 * Calculate duration bar width percentage
 * For visual representation of timing
 * @param duration - Duration in milliseconds
 * @param maxDuration - Maximum duration for scale (default 1000ms)
 * @returns Width percentage (0-100)
 */
export function calculateDurationBarWidth(duration: number, maxDuration: number = 1000): number {
  return Math.min((duration / maxDuration) * 100, 100)
}

/**
 * Get tooltip content for log level badge
 * Provides helpful context for users
 * @param level - Log level
 * @param count - Number of logs at this level
 * @returns Tooltip content string
 */
export function getLevelTooltip(level: string, count: number): string {
  return `Click to filter by ${level} (${count} log${count !== 1 ? 's' : ''})`
}

/**
 * Get tooltip content for filter badge
 * Explains what clicking will do
 * @param filterType - Type of filter (level, category, etc)
 * @param value - Current filter value
 * @returns Tooltip content string
 */
export function getFilterTooltip(filterType: string, value: string): string {
  return `Click to remove ${filterType} filter`
}

/**
 * Format file size for display
 * Converts bytes to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Check if logs are near limit
 * Used to show warning when approaching max logs
 * @param currentCount - Current number of logs
 * @param maxCount - Maximum allowed logs (default 5000)
 * @returns Warning level: 'fatal', 'warning', or null
 */
export function checkLogLimit(currentCount: number, maxCount: number = 5000): 'fatal' | 'warning' | null {
  const percentage = (currentCount / maxCount) * 100
  
  if (percentage >= 90) {
    return 'fatal'
  }
  if (percentage >= 70) {
    return 'warning'
  }
  return null
}

/**
 * Get log limit badge variant
 * Visual indicator for log count status
 * @param currentCount - Current number of logs
 * @param maxCount - Maximum allowed logs
 * @returns Badge variant
 */
export function getLogLimitBadgeVariant(currentCount: number, maxCount: number = 5000): 'destructive' | 'secondary' | 'outline' {
  const status = checkLogLimit(currentCount, maxCount)
  
  switch (status) {
    case 'fatal':
      return 'destructive'
    case 'warning':
      return 'secondary'
    default:
      return 'outline'
  }
}

/**
 * Format log limit message
 * Provides user-friendly message about log count
 * @param currentCount - Current number of logs
 * @param maxCount - Maximum allowed logs
 * @returns Formatted message or null
 */
export function getLogLimitMessage(currentCount: number, maxCount: number = 5000): string | null {
  const status = checkLogLimit(currentCount, maxCount)
  
  if (status === 'fatal') {
    return `(near ${maxCount} limit)`
  }
  return null
}