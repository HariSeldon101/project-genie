/**
 * Comprehensive logging utility for document generation
 * Tracks all generation attempts, errors, and performance metrics
 */

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category: string
  message: string
  data?: any
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

class DocumentLogger {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private enabled = true

  constructor() {
    this.enabled = process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true'
  }

  /**
   * Log info level message
   */
  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data)
  }

  /**
   * Log warning level message
   */
  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data)
  }

  /**
   * Log error level message
   */
  error(category: string, message: string, error?: Error | any, data?: any) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    } : error

    this.log('error', category, message, data, errorData)
  }

  /**
   * Log debug level message
   */
  debug(category: string, message: string, data?: any) {
    if (process.env.DEBUG) {
      this.log('debug', category, message, data)
    }
  }

  /**
   * Core logging function
   */
  private log(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any,
    error?: LogEntry['error']
  ) {
    if (!this.enabled && level !== 'error') return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...(data && { data }),
      ...(error && { error })
    }

    // Add to memory log
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift() // Remove oldest entry
    }

    // Console output with color coding
    const prefix = `[${category}]`
    const timestamp = new Date().toLocaleTimeString()
    
    switch (level) {
      case 'error':
        console.error(`❌ ${timestamp} ${prefix} ${message}`, data || '', error || '')
        break
      case 'warn':
        console.warn(`⚠️  ${timestamp} ${prefix} ${message}`, data || '')
        break
      case 'info':
        console.log(`ℹ️  ${timestamp} ${prefix} ${message}`, data || '')
        break
      case 'debug':
        console.debug(`🔍 ${timestamp} ${prefix} ${message}`, data || '')
        break
    }
  }

  /**
   * Log document generation attempt
   */
  logGenerationAttempt(
    projectId: string,
    documentType: string,
    provider: string,
    model: string
  ) {
    this.info('GENERATION', `Starting ${documentType} generation`, {
      projectId,
      documentType,
      provider,
      model,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log successful generation
   */
  logGenerationSuccess(
    projectId: string,
    documentType: string,
    duration: number,
    contentLength: number
  ) {
    this.info('GENERATION', `✅ ${documentType} generated successfully`, {
      projectId,
      documentType,
      duration: `${duration}ms`,
      contentLength,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log generation failure
   */
  logGenerationFailure(
    projectId: string,
    documentType: string,
    error: Error,
    attempt: number,
    maxAttempts: number
  ) {
    this.error('GENERATION', `Failed to generate ${documentType} (attempt ${attempt}/${maxAttempts})`, error, {
      projectId,
      documentType,
      attempt,
      maxAttempts
    })
  }

  /**
   * Log LLM request
   */
  logLLMRequest(
    provider: string,
    model: string,
    promptLength: number,
    temperature: number
  ) {
    this.debug('LLM', `Request to ${provider}/${model}`, {
      provider,
      model,
      promptLength,
      temperature,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log LLM response
   */
  logLLMResponse(
    provider: string,
    model: string,
    responseLength: number,
    duration: number,
    tokenUsage?: { input: number; output: number; total: number }
  ) {
    this.debug('LLM', `Response from ${provider}/${model}`, {
      provider,
      model,
      responseLength,
      duration: `${duration}ms`,
      tokenUsage,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log empty content detection
   */
  logEmptyContent(
    documentType: string,
    provider: string,
    attempt: number
  ) {
    this.warn('VALIDATION', `Empty content detected for ${documentType}`, {
      documentType,
      provider,
      attempt,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log fallback usage
   */
  logFallbackUsed(
    documentType: string,
    reason: string
  ) {
    this.warn('FALLBACK', `Using fallback content for ${documentType}`, {
      documentType,
      reason,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100, level?: LogEntry['level']): LogEntry[] {
    let logs = [...this.logs].reverse()
    
    if (level) {
      logs = logs.filter(log => log.level === level)
    }
    
    return logs.slice(0, count)
  }

  /**
   * Get generation statistics
   */
  getStatistics() {
    const stats = {
      totalAttempts: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      emptyContentDetections: 0,
      fallbacksUsed: 0,
      averageDuration: 0,
      errorRate: 0
    }

    const durations: number[] = []

    this.logs.forEach(log => {
      if (log.category === 'GENERATION') {
        if (log.message.includes('Starting')) {
          stats.totalAttempts++
        } else if (log.message.includes('successfully')) {
          stats.successfulGenerations++
          if (log.data?.duration) {
            const duration = parseInt(log.data.duration)
            if (!isNaN(duration)) durations.push(duration)
          }
        } else if (log.message.includes('Failed')) {
          stats.failedGenerations++
        }
      } else if (log.category === 'VALIDATION' && log.message.includes('Empty content')) {
        stats.emptyContentDetections++
      } else if (log.category === 'FALLBACK') {
        stats.fallbacksUsed++
      }
    })

    if (durations.length > 0) {
      stats.averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    }

    if (stats.totalAttempts > 0) {
      stats.errorRate = (stats.failedGenerations / stats.totalAttempts) * 100
    }

    return stats
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = []
    this.info('SYSTEM', 'Logs cleared')
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

// Singleton instance
export const documentLogger = new DocumentLogger()