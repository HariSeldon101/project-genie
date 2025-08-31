/**
 * Persistent File-Based Logger
 * Logs to files for production debugging and analysis
 */

import fs from 'fs'
import path from 'path'
import { documentLogger } from './document-logger'

interface LogFile {
  path: string
  stream?: fs.WriteStream
  size: number
  lastRotation: Date
}

export class PersistentLogger {
  private logDir: string
  private files: Map<string, LogFile> = new Map()
  private maxFileSize = 10 * 1024 * 1024 // 10MB
  private maxFiles = 5
  private enabled: boolean
  
  constructor() {
    // Only enable in development or when explicitly requested
    this.enabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_FILE_LOGGING === 'true'
    
    if (this.enabled) {
      this.logDir = path.join(process.cwd(), 'logs')
      this.ensureLogDirectory()
    }
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private getLogFile(category: string): LogFile {
    if (!this.files.has(category)) {
      const filename = `${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}.log`
      const filepath = path.join(this.logDir, filename)
      
      // Check if file needs rotation
      let size = 0
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath)
        size = stats.size
      }
      
      this.files.set(category, {
        path: filepath,
        size,
        lastRotation: new Date()
      })
    }
    
    return this.files.get(category)!
  }

  private rotateLog(logFile: LogFile) {
    if (logFile.stream) {
      logFile.stream.close()
      logFile.stream = undefined
    }

    // Rename old files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const rotatedPath = logFile.path.replace('.log', `-${timestamp}.log`)
    
    if (fs.existsSync(logFile.path)) {
      fs.renameSync(logFile.path, rotatedPath)
    }

    // Clean up old rotated files
    this.cleanupOldFiles(path.dirname(logFile.path), path.basename(logFile.path, '.log'))
    
    // Reset file tracking
    logFile.size = 0
    logFile.lastRotation = new Date()
  }

  private cleanupOldFiles(dir: string, prefix: string) {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith(prefix) && f !== `${prefix}.log`)
      .map(f => ({
        name: f,
        path: path.join(dir, f),
        time: fs.statSync(path.join(dir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)

    // Keep only the most recent files
    files.slice(this.maxFiles).forEach(f => {
      fs.unlinkSync(f.path)
    })
  }

  private write(category: string, level: string, message: string, data?: any) {
    if (!this.enabled) return

    const logFile = this.getLogFile(category)
    
    // Check if rotation is needed
    if (logFile.size > this.maxFileSize) {
      this.rotateLog(logFile)
    }

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      ...(data && { data })
    }

    const logLine = JSON.stringify(logEntry) + '\n'
    
    // Append to file
    fs.appendFileSync(logFile.path, logLine)
    logFile.size += Buffer.byteLength(logLine)
  }

  /**
   * Log API request
   */
  logApiRequest(provider: string, model: string, prompt: any, config: any) {
    this.write('api-requests', 'info', 'API Request', {
      provider,
      model,
      promptLength: JSON.stringify(prompt).length,
      config,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log API response
   */
  logApiResponse(provider: string, model: string, response: any, duration: number) {
    this.write('api-responses', 'info', 'API Response', {
      provider,
      model,
      responseLength: JSON.stringify(response).length,
      duration,
      success: true,
      timestamp: new Date().toISOString()
    })
    
    // Log full response for debugging
    if (process.env.LOG_FULL_RESPONSES === 'true') {
      this.write('api-responses-full', 'debug', 'Full API Response', {
        provider,
        model,
        response,
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Log API error
   */
  logApiError(provider: string, model: string, error: Error, context?: any) {
    this.write('api-errors', 'error', 'API Error', {
      provider,
      model,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log JSON parsing error with full content
   */
  logJsonError(content: string, error: Error, context?: any) {
    this.write('json-errors', 'error', 'JSON Parse Error', {
      error: {
        message: error.message,
        stack: error.stack
      },
      contentLength: content.length,
      contentPreview: content.substring(0, 500),
      context,
      timestamp: new Date().toISOString()
    })
    
    // Log full content to separate file for debugging
    this.write('json-errors-content', 'debug', 'Full JSON Content', {
      content,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, metadata?: any) {
    this.write('performance', 'info', 'Performance Metric', {
      operation,
      duration,
      metadata,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log token usage and costs
   */
  logTokenUsage(provider: string, model: string, usage: any, cost?: number) {
    this.write('token-usage', 'info', 'Token Usage', {
      provider,
      model,
      usage,
      cost,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Get recent logs from a file
   */
  getRecentLogs(category: string, lines: number = 100): string[] {
    if (!this.enabled) return []

    const logFile = this.getLogFile(category)
    if (!fs.existsSync(logFile.path)) return []

    const content = fs.readFileSync(logFile.path, 'utf-8')
    const allLines = content.split('\n').filter(line => line.trim())
    
    return allLines.slice(-lines)
  }

  /**
   * Parse log entries from file
   */
  parseLogEntries(category: string, filter?: (entry: any) => boolean): any[] {
    const lines = this.getRecentLogs(category, 1000)
    const entries = []
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (!filter || filter(entry)) {
          entries.push(entry)
        }
      } catch {
        // Skip malformed lines
      }
    }
    
    return entries
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    const errors = this.parseLogEntries('api-errors')
    const stats: Record<string, number> = {}
    
    errors.forEach(entry => {
      const key = `${entry.data?.provider}:${entry.data?.error?.message}`
      stats[key] = (stats[key] || 0) + 1
    })
    
    return stats
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<string, { avg: number, min: number, max: number, count: number }> {
    const metrics = this.parseLogEntries('performance')
    const stats: Record<string, number[]> = {}
    
    metrics.forEach(entry => {
      const operation = entry.data?.operation
      if (operation) {
        if (!stats[operation]) stats[operation] = []
        stats[operation].push(entry.data.duration)
      }
    })
    
    const result: Record<string, any> = {}
    
    for (const [op, durations] of Object.entries(stats)) {
      result[op] = {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        count: durations.length
      }
    }
    
    return result
  }

  /**
   * Clear all log files
   */
  clearLogs() {
    if (!this.enabled) return

    this.files.forEach(logFile => {
      if (logFile.stream) {
        logFile.stream.close()
      }
      if (fs.existsSync(logFile.path)) {
        fs.unlinkSync(logFile.path)
      }
    })
    
    this.files.clear()
    documentLogger.info('PERSISTENT_LOGGER', 'All log files cleared')
  }

  /**
   * Archive logs to a zip file
   */
  async archiveLogs(): Promise<string> {
    // This would require a zip library like archiver
    // For now, just return the log directory path
    return this.logDir
  }
}

// Singleton instance
export const persistentLogger = new PersistentLogger()