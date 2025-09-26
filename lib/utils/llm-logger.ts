/**
 * LLM Logger - Prominently logs all LLM API calls
 * Shows RED NEON SIGNS in console for every LLM operation
 */

import { permanentLogger } from './permanent-logger'

export interface LLMCallLog {
  timestamp: Date
  requestId: string
  sessionId?: string
  phase: string
  method: string
  model: string
  prompt: {
    system?: string
    user: string
    tokens?: number
  }
  response?: {
    content?: string
    tokens?: number
    reasoningTokens?: number
  }
  cost: {
    input: number
    output: number
    total: number
    currency: 'USD'
  }
  duration?: number
  rateLimitInfo?: {
    remaining: number
    reset: Date
  }
  error?: {
    code: string
    message: string
    retryAfter?: number
  }
}

export class LLMLogger {
  private static instance: LLMLogger
  private callCount = 0
  private totalCost = 0
  
  static getInstance(): LLMLogger {
    if (!this.instance) {
      this.instance = new LLMLogger()
    }
    return this.instance
  }

  /**
   * Log an LLM call with PROMINENT RED DISPLAY
   */
  static logCall(params: {
    model: string
    phase: string
    purpose: string
    tokens?: { input: number; output: number }
    cost: number
    sessionId?: string
  }) {
    const instance = this.getInstance()
    instance.callCount++
    instance.totalCost += params.cost
    
    const message = `
🔴🔴🔴 LLM API CALL DETECTED 🔴🔴🔴
═══════════════════════════════════════════════════════
📍 Phase: ${params.phase}
🤖 Model: ${params.model}
📝 Purpose: ${params.purpose}
📊 Tokens: ${params.tokens?.input || 0} in / ${params.tokens?.output || 0} out
💰 Cost: $${params.cost.toFixed(4)} USD
📈 Total Calls: ${instance.callCount}
💸 Total Cost: $${instance.totalCost.toFixed(4)} USD
⏰ Time: ${new Date().toISOString()}
${params.sessionId ? `🔗 Session: ${params.sessionId}` : ''}
═══════════════════════════════════════════════════════
    `
    
    // Console with red background - MOST VISIBLE
    if (typeof window === 'undefined') {
      // Server-side: Use ANSI codes
      console.log('\x1b[41m\x1b[37m%s\x1b[0m', message)
    } else {
      // Client-side: Use CSS styling
      console.log(
        '%c' + message,
        'background: #ff0000; color: #ffffff; font-weight: bold; font-size: 14px; padding: 10px;'
      )
    }
    
    // Also log normally for records
    console.log('🚨 LLM CALL:', params)
    
    // Persistent log
    permanentLogger.info('LLM_CALL', 'API Call Made', { ...params})
    
    // Broadcast to UI if available
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('llm-call', { detail: params }))
    }
  }
  
  /**
   * Log rate limit status
   */
  static logRateLimit(model: string, remaining: number, reset: Date) {
    const warning = remaining < 50
    const critical = remaining < 10
    
    const message = `
${critical ? '🚨🚨🚨' : warning ? '⚠️⚠️⚠️' : '📊'} RATE LIMIT STATUS: ${model}
═══════════════════════════════════════════════════════
Remaining: ${remaining}/500 RPM
Resets: ${reset.toISOString()}
${critical ? '🚨 CRITICAL - STOP ALL REQUESTS!' : warning ? '⚠️ WARNING - SLOW DOWN!' : '✅ Within limits'}
═══════════════════════════════════════════════════════
    `
    
    if (critical) {
      // CRITICAL - Red background
      console.log('\x1b[41m\x1b[37m%s\x1b[0m', message)
    } else if (warning) {
      // WARNING - Yellow
      console.log('\x1b[33m%s\x1b[0m', message)
    } else {
      // OK - Normal
      console.log(message)
    }
    
    permanentLogger.info('RATE_LIMIT', `Rate limit status for ${model}`, {
      model,
      remaining,
      reset,
      warning,
      critical
    })
  }
  
  /**
   * Log LLM operation starting (warning before it happens)
   */
  static logLLMOperationStarting(params: {
    phase: string
    operation: string
    estimatedCost: number
    willUseLLM: boolean
  }) {
    if (!params.willUseLLM) return
    
    const message = `
⚠️⚠️⚠️ LLM OPERATION STARTING ⚠️⚠️⚠️
═══════════════════════════════════════════════════════
📍 Phase: ${params.phase}
🎯 Operation: ${params.operation}
💰 Estimated Cost: $${params.estimatedCost.toFixed(4)} USD
⏱️ Starting in: 3 seconds...
🛑 Press Ctrl+C to abort
═══════════════════════════════════════════════════════
    `
    
    // Yellow warning
    if (typeof window === 'undefined') {
      console.log('\x1b[43m\x1b[30m%s\x1b[0m', message)
    } else {
      console.log(
        '%c' + message,
        'background: #ffcc00; color: #000000; font-weight: bold; font-size: 13px; padding: 8px;'
      )
    }
    
    permanentLogger.info('LLM_WARNING', 'LLM Operation Starting', { ...params})
  }
  
  /**
   * Log error with LLM call
   */
  static logError(error: any, context: {
    model: string
    phase: string
    attemptNumber?: number
  }) {
    const message = `
❌❌❌ LLM CALL FAILED ❌❌❌
═══════════════════════════════════════════════════════
📍 Phase: ${context.phase}
🤖 Model: ${context.model}
${context.attemptNumber ? `🔄 Attempt: ${context.attemptNumber}` : ''}
❌ Error: ${error.message || error}
${error.code ? `📝 Code: ${error.code}` : ''}
${error.status === 429 ? '⏳ Rate Limited - Will Retry' : ''}
═══════════════════════════════════════════════════════
    `
    
    console.error('\x1b[41m\x1b[37m%s\x1b[0m', message)
    
    permanentLogger.info('LLM_ERROR', 'LLM Call Failed', {
      ...context,
      error: error.message || error,
      code: error.code,
      status: error.status
    })
  }
  
  /**
   * Log phase completion
   */
  static logPhaseComplete(phase: string, metrics: {
    duration: number
    llmCalls: number
    cost: number
    success: boolean
  }) {
    const message = `
${metrics.success ? '✅' : '❌'} PHASE COMPLETED: ${phase}
═══════════════════════════════════════════════════════
⏱️ Duration: ${(metrics.duration / 1000).toFixed(2)}s
🤖 LLM Calls: ${metrics.llmCalls}
💰 Cost: $${metrics.cost.toFixed(4)} USD
📊 Status: ${metrics.success ? 'SUCCESS' : 'FAILED'}
═══════════════════════════════════════════════════════
    `
    
    const color = metrics.success ? '\x1b[42m\x1b[37m' : '\x1b[41m\x1b[37m'
    console.log(`${color}%s\x1b[0m`, message)
    
    permanentLogger.info('PHASE_COMPLETE', `Phase ${phase} completed`, metrics)
  }
  
  /**
   * Get summary of all LLM calls
   */
  static getSummary() {
    const instance = this.getInstance()
    return {
      totalCalls: instance.callCount,
      totalCost: instance.totalCost,
      averageCost: instance.callCount > 0 ? instance.totalCost / instance.callCount : 0
    }
  }
  
  /**
   * Reset counters
   */
  static reset() {
    const instance = this.getInstance()
    instance.callCount = 0
    instance.totalCost = 0
  }
}

// Export convenience functions
export const logLLMCall = LLMLogger.logCall.bind(LLMLogger)
export const logRateLimit = LLMLogger.logRateLimit.bind(LLMLogger)
export const logLLMWarning = LLMLogger.logLLMOperationStarting.bind(LLMLogger)
export const logLLMError = LLMLogger.logError.bind(LLMLogger)
export const logPhaseComplete = LLMLogger.logPhaseComplete.bind(LLMLogger)