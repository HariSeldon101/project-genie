/**
 * Permanent Logger - Outputs to claude-code-dev-log.md
 * Captures all console logs, errors, and important events for debugging
 */

import { writeFileSync, appendFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: any
  stack?: string
}

class PermanentLogger {
  private logPath: string
  private maxFileSize = 10 * 1024 * 1024 // 10MB
  private isInitialized = false
  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
    info: console.info
  }

  constructor() {
    // Store logs in dedicated logs directory to avoid Next.js file watching issues
    const logsDir = join(process.cwd(), 'logs')
    
    // Ensure logs directory exists
    if (typeof window === 'undefined') {
      const fs = require('fs')
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }
    }
    
    this.logPath = join(logsDir, 'claude-code-dev-log.md')
    this.initialize()
  }

  private initialize() {
    if (this.isInitialized) return
    
    // Create or append to log file
    if (!existsSync(this.logPath)) {
      this.createLogFile()
    } else {
      this.checkAndRotate()
    }

    // Override console methods to capture all logs
    this.interceptConsole()
    this.isInitialized = true

    this.log('INFO', 'SYSTEM', '🚀 Permanent Logger Initialized', {
      logPath: this.logPath,
      timestamp: new Date().toISOString()
    })
  }

  private createLogFile() {
    const header = `# Claude Code Development Log

This file contains permanent logs for debugging persistent issues.
Generated: ${new Date().toISOString()}

---

`
    writeFileSync(this.logPath, header, 'utf-8')
  }

  private checkAndRotate() {
    try {
      const stats = require('fs').statSync(this.logPath)
      if (stats.size > this.maxFileSize) {
        // Archive old log
        const archivePath = this.logPath.replace('.md', `-${Date.now()}.md`)
        require('fs').renameSync(this.logPath, archivePath)
        this.createLogFile()
        this.log('INFO', 'SYSTEM', `Log rotated. Archived to: ${archivePath}`)
      }
    } catch (error) {
      // File doesn't exist or error reading, create new
      this.createLogFile()
    }
  }

  private interceptConsole() {
    const self = this

    // Override console.log
    console.log = (...args) => {
      self.originalConsole.log(...args)
      
      // Skip verbose compile messages
      const message = args.map(a => 
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' ')
      
      // Remove ANSI color codes for checking
      const cleanMessage = message.replace(/\u001b\[[0-9;]*m/g, '')
      
      if (cleanMessage.includes('Compiled in') || 
          cleanMessage.includes('Compiling') ||
          cleanMessage.includes('Fast Refresh') ||
          cleanMessage.includes('wait compiling') ||
          cleanMessage.includes('webpack.cache.PackFileCacheStrategy') ||
          cleanMessage.includes('Building') ||
          cleanMessage.includes('modules)') ||
          cleanMessage.includes('webpack compiled') ||
          cleanMessage.includes('webpack compiling')) {
        return // Skip logging these verbose messages
      }
      
      self.log('INFO', 'CONSOLE', message)
    }

    // Override console.error
    console.error = (...args) => {
      self.originalConsole.error(...args)
      const message = args.map(a => 
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' ')
      
      // Extract stack trace if available
      const stack = args.find(a => a && a.stack)?.stack || new Error().stack
      self.log('ERROR', 'CONSOLE', message, null, stack)
    }

    // Override console.warn
    console.warn = (...args) => {
      self.originalConsole.warn(...args)
      self.log('WARN', 'CONSOLE', args.map(a => 
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' '))
    }

    // Override console.debug
    console.debug = (...args) => {
      self.originalConsole.debug(...args)
      self.log('DEBUG', 'CONSOLE', args.map(a => 
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' '))
    }

    // Override console.info
    console.info = (...args) => {
      self.originalConsole.info(...args)
      self.log('INFO', 'CONSOLE', args.map(a => 
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' '))
    }
  }

  public log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    stack?: string
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      stack
    }

    this.writeEntry(entry)
  }

  private writeEntry(entry: LogEntry) {
    try {
      const emoji = this.getLevelEmoji(entry.level)
      const color = this.getLevelColor(entry.level)
      
      let logLine = `
## ${emoji} [${entry.timestamp}] ${entry.level} - ${entry.category}

**Message:** ${entry.message}
`

      if (entry.data) {
        logLine += `
**Data:**
\`\`\`json
${JSON.stringify(entry.data, null, 2)}
\`\`\`
`
      }

      if (entry.stack) {
        logLine += `
**Stack Trace:**
\`\`\`
${entry.stack}
\`\`\`
`
      }

      logLine += '\n---\n'

      // Append to file
      appendFileSync(this.logPath, logLine, 'utf-8')

      // Also output to original console for terminal visibility
      if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
        this.originalConsole.error(`${emoji} [${entry.category}] ${entry.message}`)
      }
    } catch (error) {
      // Fallback to console if file writing fails
      this.originalConsole.error('Failed to write to log file:', error)
      this.originalConsole.log(entry)
    }
  }

  private getLevelEmoji(level: LogLevel): string {
    const emojis = {
      DEBUG: '🔍',
      INFO: '📝',
      WARN: '⚠️',
      ERROR: '❌',
      CRITICAL: '🔥'
    }
    return emojis[level] || '📌'
  }

  private getLevelColor(level: LogLevel): string {
    const colors = {
      DEBUG: '#gray',
      INFO: '#blue',
      WARN: '#orange',
      ERROR: '#red',
      CRITICAL: '#darkred'
    }
    return colors[level] || '#black'
  }

  // Utility methods for specific logging scenarios
  public logApiCall(
    provider: string,
    model: string,
    success: boolean,
    duration: number,
    tokens?: number,
    error?: string
  ) {
    this.log(
      success ? 'INFO' : 'ERROR',
      'API_CALL',
      `${provider}/${model} - ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`,
      {
        provider,
        model,
        success,
        duration,
        tokens,
        error
      }
    )
  }

  public logDatabaseOperation(
    operation: string,
    table: string,
    success: boolean,
    error?: string,
    data?: any
  ) {
    this.log(
      success ? 'INFO' : 'ERROR',
      'DATABASE',
      `${operation} on ${table} - ${success ? 'SUCCESS' : 'FAILED'}`,
      {
        operation,
        table,
        success,
        error,
        data
      }
    )
  }

  public logDocumentGeneration(
    projectId: string,
    documentType: string,
    status: 'started' | 'completed' | 'failed',
    metrics?: any,
    error?: string
  ) {
    const level = status === 'failed' ? 'ERROR' : 'INFO'
    this.log(
      level,
      'DOC_GENERATION',
      `Document ${documentType} for project ${projectId} - ${status}`,
      {
        projectId,
        documentType,
        status,
        metrics,
        error
      }
    )
  }

  // Check log for errors (returns count)
  public async checkForErrors(): Promise<number> {
    try {
      const content = readFileSync(this.logPath, 'utf-8')
      const errorMatches = content.match(/## ❌|## 🔥/g) || []
      return errorMatches.length
    } catch {
      return 0
    }
  }

  // Get recent errors
  public async getRecentErrors(count: number = 10): Promise<string[]> {
    try {
      const content = readFileSync(this.logPath, 'utf-8')
      const lines = content.split('\n')
      const errors: string[] = []
      let currentError = ''
      let inError = false

      for (const line of lines) {
        if (line.includes('## ❌') || line.includes('## 🔥')) {
          if (currentError && errors.length < count) {
            errors.push(currentError)
          }
          currentError = line
          inError = true
        } else if (inError) {
          if (line === '---') {
            if (currentError && errors.length < count) {
              errors.push(currentError)
            }
            currentError = ''
            inError = false
          } else {
            currentError += '\n' + line
          }
        }
      }

      return errors.reverse() // Most recent first
    } catch {
      return []
    }
  }

  // Clear the log file
  public clear() {
    this.createLogFile()
    this.log('INFO', 'SYSTEM', 'Log file cleared')
  }
}

// Singleton instance
let loggerInstance: PermanentLogger | null = null

export function getLogger(): PermanentLogger {
  if (!loggerInstance) {
    loggerInstance = new PermanentLogger()
  }
  return loggerInstance
}

// Initialize on import for server-side code
if (typeof window === 'undefined') {
  getLogger()
}

// Export convenience functions
export const logger = {
  debug: (category: string, message: string, data?: any) => 
    getLogger().log('DEBUG', category, message, data),
  
  info: (category: string, message: string, data?: any) => 
    getLogger().log('INFO', category, message, data),
  
  warn: (category: string, message: string, data?: any) => 
    getLogger().log('WARN', category, message, data),
  
  error: (category: string, message: string, data?: any, stack?: string) => 
    getLogger().log('ERROR', category, message, data, stack),
  
  critical: (category: string, message: string, data?: any, stack?: string) => 
    getLogger().log('CRITICAL', category, message, data, stack),

  apiCall: (provider: string, model: string, success: boolean, duration: number, tokens?: number, error?: string) =>
    getLogger().logApiCall(provider, model, success, duration, tokens, error),

  database: (operation: string, table: string, success: boolean, error?: string, data?: any) =>
    getLogger().logDatabaseOperation(operation, table, success, error, data),

  docGen: (projectId: string, documentType: string, status: 'started' | 'completed' | 'failed', metrics?: any, error?: string) =>
    getLogger().logDocumentGeneration(projectId, documentType, status, metrics, error),

  checkErrors: () => getLogger().checkForErrors(),
  getRecentErrors: (count?: number) => getLogger().getRecentErrors(count),
  clear: () => getLogger().clear()
}

export default logger