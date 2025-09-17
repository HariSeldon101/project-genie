/**
 * Log Operations Utility Module
 * Centralized utilities for log filtering, sorting, and exporting
 * Following DRY and SOLID principles - Single Responsibility
 * @module log-operations
 */

import { formatLevelForDatabase, formatLevelForDisplay } from './log-level-utils'
import { permanentLogger } from './permanent-logger'

// Import the correct types from the logs module to avoid duplication
// This ensures we have a single source of truth for log types
export type { LogEntry, BreadcrumbEntry, TimingEntry } from '@/lib/logs/types/logs.types'

/**
 * Time filter options for log viewing
 * Allows filtering logs by recent time periods
 */
export type TimeFilter = 'all' | 'last-5m' | 'last-15m' | 'last-1h' | 'last-24h'

/**
 * Sort options for log display
 * Determines how logs are ordered in the UI
 */
export type SortBy = 'time-desc' | 'time-asc' | 'level' | 'category'

/**
 * Export format options
 * Supports multiple formats for log export
 */
export type ExportFormat = 'json' | 'csv' | 'markdown'

/**
 * Level severity order for sorting
 * Higher numbers = more severe
 */
const LEVEL_SEVERITY: Record<string, number> = {
  'fatal': 5,
  'error': 4,
  'warn': 3,
  'info': 2,
  'debug': 1
}

/**
 * Calculate time cutoff for filtering
 * @param filter - Time filter to apply
 * @returns Date object representing the cutoff time
 */
export function getTimeCutoff(filter: TimeFilter): Date | null {
  // If no filter, return null (show all)
  if (filter === 'all') return null

  const now = new Date()
  const cutoff = new Date()

  // Calculate cutoff based on filter
  switch (filter) {
    case 'last-5m':
      cutoff.setMinutes(now.getMinutes() - 5)
      break
    case 'last-15m':
      cutoff.setMinutes(now.getMinutes() - 15)
      break
    case 'last-1h':
      cutoff.setHours(now.getHours() - 1)
      break
    case 'last-24h':
      cutoff.setDate(now.getDate() - 1)
      break
  }

  permanentLogger.breadcrumb('log-filter', 'time-cutoff', { filter, cutoff: cutoff.toISOString() })
  return cutoff
}

/**
 * Filter logs by time range
 * @param logs - Array of log entries
 * @param filter - Time filter to apply
 * @returns Filtered log entries
 */
export function filterByTime(logs: LogEntry[], filter: TimeFilter): LogEntry[] {
  const cutoff = getTimeCutoff(filter)
  
  // No cutoff means show all
  if (!cutoff) return logs
  
  return logs.filter(log => new Date(log.timestamp) >= cutoff)
}

/**
 * Filter logs by level
 * IMPORTANT: Uses formatLevelForDatabase for consistency
 * @param logs - Array of log entries
 * @param level - Level to filter by (or 'ALL')
 * @returns Filtered log entries
 */
export function filterByLevel(logs: LogEntry[], level: string): LogEntry[] {
  // Show all if no specific level selected
  if (level === 'ALL') return logs
  
  // IMPORTANT: Always use utility functions for level normalization
  const normalizedSelectedLevel = formatLevelForDatabase(level)
  
  return logs.filter(log => {
    const normalizedLogLevel = formatLevelForDatabase(log.level)
    return normalizedLogLevel === normalizedSelectedLevel
  })
}

/**
 * Filter logs by category
 * @param logs - Array of log entries
 * @param category - Category to filter by (or 'ALL')
 * @returns Filtered log entries
 */
export function filterByCategory(logs: LogEntry[], category: string): LogEntry[] {
  if (category === 'ALL') return logs
  return logs.filter(log => log.category === category)
}

/**
 * Filter logs by error type
 * Only applies to error and critical logs
 * @param logs - Array of log entries
 * @param errorType - Error type to filter by (or 'ALL')
 * @returns Filtered log entries
 */
export function filterByErrorType(logs: LogEntry[], errorType: string): LogEntry[] {
  if (errorType === 'ALL') return logs
  
  return logs.filter(log => {
    // IMPORTANT: Use formatLevelForDatabase for level checks
    const normalizedLevel = formatLevelForDatabase(log.level)
    
    // Only filter error and critical logs
    if (normalizedLevel !== 'error' && normalizedLevel !== 'fatal') return false
    
    // Check if error exists and matches type
    if (!log.error) return false
    
    const errorName = log.error.name || log.error.type || 'Unknown'
    return errorName === errorType
  })
}

/**
 * Search logs by query string
 * Searches in message, category, requestId, and data
 * @param logs - Array of log entries
 * @param query - Search query string
 * @returns Filtered log entries
 */
export function searchLogs(logs: LogEntry[], query: string): LogEntry[] {
  if (!query) return logs
  
  const lowerQuery = query.toLowerCase()
  
  return logs.filter(log => 
    log.message.toLowerCase().includes(lowerQuery) ||
    log.category.toLowerCase().includes(lowerQuery) ||
    (log.requestId && log.requestId.toLowerCase().includes(lowerQuery)) ||
    (log.data && JSON.stringify(log.data).toLowerCase().includes(lowerQuery))
  )
}

/**
 * Sort logs by specified criteria
 * IMPORTANT: Uses formatLevelForDatabase for level sorting
 * @param logs - Array of log entries
 * @param sortBy - Sort criteria
 * @returns Sorted log entries (new array)
 */
export function sortLogs(logs: LogEntry[], sortBy: SortBy): LogEntry[] {
  // Create a copy to avoid mutating original
  const sorted = [...logs]
  
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'time-asc':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        
      case 'time-desc':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        
      case 'level':
        // IMPORTANT: Use formatLevelForDatabase for consistency
        const aLevel = formatLevelForDatabase(a.level)
        const bLevel = formatLevelForDatabase(b.level)
        return (LEVEL_SEVERITY[bLevel] || 0) - (LEVEL_SEVERITY[aLevel] || 0)
        
      case 'category':
        return a.category.localeCompare(b.category)
        
      default:
        return 0
    }
  })
  
  return sorted
}

/**
 * Get unique categories from logs
 * Used for category filter dropdown
 * @param logs - Array of log entries
 * @returns Array of unique categories
 */
export function getUniqueCategories(logs: LogEntry[]): string[] {
  const categories = new Set<string>()
  
  logs.forEach(log => {
    // Ensure category is a string and not an object or null
    if (log.category && typeof log.category === 'string') {
      categories.add(log.category)
    } else if (log.category && typeof log.category === 'object') {
      // If category is an object, try to get a string representation
      const catStr = JSON.stringify(log.category)
      console.warn('Found object category:', catStr)
      // Don't add objects as categories
    }
  })
  
  return Array.from(categories).filter(cat => cat && cat !== 'undefined' && cat !== 'null')
}

/**
 * Get unique error types from logs
 * Only from error and critical logs
 * @param logs - Array of log entries
 * @returns Array of unique error types
 */
export function getUniqueErrorTypes(logs: LogEntry[]): string[] {
  return Array.from(new Set(
    logs
      .filter(log => {
        const level = formatLevelForDatabase(log.level)
        return (level === 'error' || level === 'fatal') && log.error
      })
      .map(log => log.error.name || log.error.type || 'Unknown')
  ))
}

/**
 * Export logs to JSON format
 * @param logs - Array of log entries
 * @returns JSON string
 */
export function exportToJSON(logs: LogEntry[]): string {
  permanentLogger.breadcrumb('log-export', 'json', { count: logs.length })
  return JSON.stringify(logs, null, 2)
}

/**
 * Export logs to CSV format
 * @param logs - Array of log entries
 * @returns CSV string
 */
export function exportToCSV(logs: LogEntry[]): string {
  permanentLogger.breadcrumb('log-export', 'csv', { count: logs.length })
  
  const headers = ['Timestamp', 'Level', 'Category', 'Message', 'Request ID', 'Data']
  const rows = logs.map(log => [
    log.timestamp,
    log.level,
    log.category,
    log.message,
    log.requestId || '',
    log.data ? JSON.stringify(log.data) : ''
  ])
  
  // Escape and quote CSV fields
  const escapeCSV = (field: string) => `"${field.replace(/"/g, '""')}"`
  
  return [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')
}

/**
 * Export logs to Markdown format
 * @param logs - Array of log entries
 * @returns Markdown string
 */
export function exportToMarkdown(logs: LogEntry[]): string {
  permanentLogger.breadcrumb('log-export', 'markdown', { count: logs.length })
  
  let content = '# Log Export\n\n'
  
  content += logs.map(log => 
    `## ${log.timestamp} - ${formatLevelForDisplay(log.level)}\n\n` +
    `**Category:** ${log.category}\n` +
    `**Message:** ${log.message}\n` +
    (log.requestId ? `**Request ID:** ${log.requestId}\n` : '') +
    (log.timingMs ? `**Duration:** ${log.timingMs}ms\n` : '') +
    (log.error ? `\n### Error Details\n\`\`\`json\n${JSON.stringify(log.error, null, 2)}\n\`\`\`\n` : '') +
    (log.data ? `\n### Additional Data\n\`\`\`json\n${JSON.stringify(log.data, null, 2)}\n\`\`\`\n` : '') +
    '\n---\n'
  ).join('\n')
  
  return content
}

/**
 * Download content as file
 * Creates a blob and triggers browser download
 * @param content - File content
 * @param filename - Name for downloaded file
 * @param type - MIME type (default: text/plain)
 */
export function downloadFile(content: string, filename: string, type: string = 'text/plain'): void {
  try {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    link.href = url
    link.download = filename
    link.click()
    
    // Clean up
    URL.revokeObjectURL(url)
    
    permanentLogger.info('Log export completed', { filename, size: content.length })
  } catch (error) {
    permanentLogger.captureError(error as Error, { context: 'log-export-download' })
    throw error // Let caller handle the error
  }
}

/**
 * Export logs with specified format
 * Combines formatting and download
 * @param logs - Array of log entries
 * @param format - Export format
 */
export function exportLogs(logs: LogEntry[], format: ExportFormat): void {
  const timestamp = Date.now()
  let content: string
  let extension: string
  
  // Format content based on type
  switch (format) {
    case 'json':
      content = exportToJSON(logs)
      extension = 'json'
      break
      
    case 'csv':
      content = exportToCSV(logs)
      extension = 'csv'
      break
      
    case 'markdown':
      content = exportToMarkdown(logs)
      extension = 'md'
      break
      
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
  
  // Download the file
  downloadFile(content, `logs-export-${timestamp}.${extension}`)
}