/**
 * Scraper Error Handler
 * Intelligent error handling with retry strategies (no fallbacks per bulletproof spec)
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { RetryStrategy, ErrorContext, ScraperError } from '../core/scraper.interface'

export class ScraperErrorHandler {
  private retryStrategies: Map<string, RetryStrategy> = new Map()
  private errorCounts: Map<string, number> = new Map()
  private lastErrors: Map<string, Date> = new Map()

  constructor() {
    this.registerDefaultStrategies()
    permanentLogger.info('ERROR_HANDLER', 'Initialized error handler with default strategies')
  }

  /**
   * Register default retry strategies for common errors
   */
  private registerDefaultStrategies() {
    // Network connection errors - aggressive retry
    this.retryStrategies.set('ECONNREFUSED', {
      maxRetries: 5,
      backoff: 'exponential',
      baseDelay: 1000
    })
    
    this.retryStrategies.set('ECONNRESET', {
      maxRetries: 4,
      backoff: 'exponential',
      baseDelay: 1500
    })
    
    this.retryStrategies.set('ENOTFOUND', {
      maxRetries: 2,
      backoff: 'linear',
      baseDelay: 2000
    })

    // Timeout errors - retry with increased timeout
    this.retryStrategies.set('ETIMEDOUT', {
      maxRetries: 3,
      backoff: 'exponential',
      baseDelay: 2000,
      adjustTimeout: true
    })
    
    this.retryStrategies.set('TIMEOUT', {
      maxRetries: 3,
      backoff: 'linear',
      baseDelay: 3000,
      adjustTimeout: true
    })

    // Rate limiting - retry with longer delay
    this.retryStrategies.set('429', {
      maxRetries: 5,
      backoff: 'linear',
      baseDelay: 10000 // 10 seconds
    })
    
    this.retryStrategies.set('RATE_LIMIT', {
      maxRetries: 5,
      backoff: 'exponential',
      baseDelay: 5000
    })

    // Server errors - moderate retry
    this.retryStrategies.set('500', {
      maxRetries: 3,
      backoff: 'exponential',
      baseDelay: 3000
    })
    
    this.retryStrategies.set('502', {
      maxRetries: 4,
      backoff: 'exponential',
      baseDelay: 2000
    })
    
    this.retryStrategies.set('503', {
      maxRetries: 5,
      backoff: 'linear',
      baseDelay: 5000
    })

    // Access denied/blocked - switch scraper
    this.retryStrategies.set('403', {
      maxRetries: 2,
      switchScraper: true,
      baseDelay: 1000
    })
    
    this.retryStrategies.set('BLOCKED', {
      maxRetries: 1,
      switchScraper: true,
      baseDelay: 0
    })
    
    this.retryStrategies.set('CAPTCHA', {
      maxRetries: 1,
      switchScraper: true,
      baseDelay: 0
    })

    // Client errors - limited retry
    this.retryStrategies.set('400', {
      maxRetries: 1,
      backoff: 'constant',
      baseDelay: 1000
    })
    
    this.retryStrategies.set('404', {
      maxRetries: 0, // Don't retry 404s
      backoff: 'constant',
      baseDelay: 0
    })

    permanentLogger.info('ERROR_HANDLER', 'Registered retry strategies', {
      strategies: Array.from(this.retryStrategies.keys())
    })
  }

  /**
   * Register custom retry strategy
   */
  registerStrategy(errorCode: string, strategy: RetryStrategy): void {
    this.retryStrategies.set(errorCode, strategy)
    permanentLogger.info('ERROR_HANDLER', `Registered custom strategy for ${errorCode}`, strategy)
  }

  /**
   * Handle error with appropriate retry strategy
   */
  async handleError(error: any, context: ErrorContext): Promise<any> {
    const errorCode = this.getErrorCode(error)
    const strategy = this.retryStrategies.get(errorCode) || this.getDefaultStrategy()
    
    // Track error occurrence
    const errorKey = `${context.url}_${errorCode}`
    const errorCount = (this.errorCounts.get(errorKey) || 0) + 1
    this.errorCounts.set(errorKey, errorCount)
    this.lastErrors.set(errorKey, new Date())

    permanentLogger.captureError('ERROR_HANDLER', error as Error, {
      context: 'Handling error',
      url: context.url,
      scraper: context.scraper,
      errorCode,
      attempt: context.attempt,
      errorCount,
      strategy: {
        maxRetries: strategy.maxRetries,
        backoff: strategy.backoff
      }
    })

    // Check if we should retry
    if (context.attempt >= strategy.maxRetries) {
      permanentLogger.warn('ERROR_HANDLER', 'Max retries exceeded', {
        url: context.url,
        errorCode,
        attempts: context.attempt,
        maxRetries: strategy.maxRetries
      })
      
      throw this.createScraperError(
        `Max retries (${strategy.maxRetries}) exceeded for ${context.url}`,
        errorCode,
        context,
        error
      )
    }

    // Calculate retry delay
    const delay = this.calculateDelay(strategy, context.attempt)
    
    permanentLogger.info('ERROR_HANDLER', `Retrying after ${delay}ms`, {
      url: context.url,
      attempt: context.attempt + 1,
      maxRetries: strategy.maxRetries,
      delay
    })

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay))

    // Adjust options based on strategy
    const adjustedOptions = { ...context.options }
    
    if (strategy.adjustTimeout) {
      const currentTimeout = adjustedOptions.timeout || 30000
      adjustedOptions.timeout = Math.min(currentTimeout * 1.5, 120000) // Max 2 minutes
      permanentLogger.info('ERROR_HANDLER', 'Increased timeout', {
        from: currentTimeout,
        to: adjustedOptions.timeout
      })
    }

    if (strategy.switchScraper) {
      context.forceScraper = this.determineFallbackScraper(context.scraper)
      permanentLogger.info('ERROR_HANDLER', 'Switching scraper', {
        from: context.scraper,
        to: context.forceScraper
      })
    }

    // Update context for retry
    const retryContext: ErrorContext = {
      ...context,
      attempt: context.attempt + 1,
      options: adjustedOptions
    }

    // Retry with updated context
    try {
      const result = await context.retryCallback()
      
      // Success - reset error count
      this.errorCounts.delete(errorKey)
      
      permanentLogger.info('ERROR_HANDLER', 'Retry successful', {
        url: context.url,
        attempt: retryContext.attempt,
        scraper: retryContext.forceScraper || context.scraper
      })
      
      return result
    } catch (retryError) {
      // Retry failed, handle the new error
      return this.handleError(retryError, retryContext)
    }
  }

  /**
   * Get error code from error object
   */
  private getErrorCode(error: any): string {
    // Node.js error codes
    if (error.code) return error.code

    // HTTP status codes
    if (error.response?.status) return String(error.response.status)
    if (error.status) return String(error.status)

    // Error message patterns
    const message = error.message?.toLowerCase() || ''
    
    if (message.includes('timeout')) return 'TIMEOUT'
    if (message.includes('captcha')) return 'CAPTCHA'
    if (message.includes('blocked')) return 'BLOCKED'
    if (message.includes('rate limit')) return 'RATE_LIMIT'
    if (message.includes('forbidden')) return '403'
    if (message.includes('not found')) return '404'
    if (message.includes('server error')) return '500'
    if (message.includes('bad gateway')) return '502'
    if (message.includes('service unavailable')) return '503'
    
    // Playwright/Puppeteer specific
    if (message.includes('net::err_')) return 'NETWORK_ERROR'
    if (message.includes('navigation')) return 'NAVIGATION_ERROR'
    
    return 'UNKNOWN'
  }

  /**
   * Get default strategy for unknown errors
   */
  private getDefaultStrategy(): RetryStrategy {
    return {
      maxRetries: 2,
      backoff: 'exponential',
      baseDelay: 2000
    }
  }

  /**
   * Calculate delay based on strategy and attempt
   */
  private calculateDelay(strategy: RetryStrategy, attempt: number): number {
    const base = strategy.baseDelay || 1000
    
    switch (strategy.backoff) {
      case 'exponential':
        // 2^attempt * base (with jitter)
        const exponentialDelay = base * Math.pow(2, attempt)
        const jitter = Math.random() * 1000 // Add 0-1s jitter
        return Math.min(exponentialDelay + jitter, 60000) // Cap at 60s
        
      case 'linear':
        // attempt * base
        return Math.min(base * (attempt + 1), 60000)
        
      case 'constant':
      default:
        return base
    }
  }

  /**
   * DEPRECATED: No fallback scrapers allowed per bulletproof spec
   * All errors must be thrown and properly logged
   */
  private determineFallbackScraper(currentScraper: string): string {
    throw new Error(`Scraper ${currentScraper} failed - no fallbacks allowed per bulletproof spec`)
  }

  /**
   * Create structured scraper error
   */
  private createScraperError(
    message: string,
    code: string,
    context: ErrorContext,
    originalError?: any
  ): ScraperError {
    return {
      name: 'ScraperError',
      message,
      code,
      context: {
        url: context.url,
        scraper: context.scraper,
        options: context.options,
        originalError: originalError?.message || originalError
      }
    } as any
  }

  /**
   * Get error statistics
   */
  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {
      totalErrors: this.errorCounts.size,
      errorsByType: {},
      recentErrors: []
    }

    // Group errors by type
    for (const [key, count] of this.errorCounts.entries()) {
      const [url, errorCode] = key.split('_')
      if (!stats.errorsByType[errorCode]) {
        stats.errorsByType[errorCode] = 0
      }
      stats.errorsByType[errorCode] += count
    }

    // Get recent errors (last 10)
    const recentErrors = Array.from(this.lastErrors.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .slice(0, 10)
      .map(([key, date]) => {
        const [url, errorCode] = key.split('_')
        return {
          url,
          errorCode,
          count: this.errorCounts.get(key),
          lastOccurred: date.toISOString()
        }
      })

    stats.recentErrors = recentErrors

    return stats
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorCounts.clear()
    this.lastErrors.clear()
    permanentLogger.info('ERROR_HANDLER', 'Cleared error history')
  }
}

// Singleton instance
let handlerInstance: ScraperErrorHandler | null = null

export function getErrorHandler(): ScraperErrorHandler {
  if (!handlerInstance) {
    handlerInstance = new ScraperErrorHandler()
  }
  return handlerInstance
}

export function resetErrorHandler(): void {
  if (handlerInstance) {
    handlerInstance.clearHistory()
    handlerInstance = null
  }
}