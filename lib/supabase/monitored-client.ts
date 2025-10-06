/**
 * Monitored Supabase Client
 *
 * Wraps the Supabase client to detect and log direct database access
 * that bypasses the repository pattern as required by CLAUDE.md
 *
 * This ensures compliance with the architecture guideline:
 * "ALWAYS USE REPOSITORY PATTERN FOR DATABASE ACCESS"
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Monitored Supabase Client
 * Detects and logs violations of repository pattern
 */
export class MonitoredSupabaseClient {
  private client: SupabaseClient
  private isMonitoring: boolean = process.env.NODE_ENV !== 'production' || process.env.MONITOR_DB_ACCESS === 'true'

  constructor(client: SupabaseClient) {
    this.client = this.createMonitoredProxy(client)
  }

  /**
   * Create a Proxy wrapper to intercept all database calls
   */
  private createMonitoredProxy(client: SupabaseClient): SupabaseClient {
    return new Proxy(client, {
      get: (target, prop: string) => {
        const original = target[prop as keyof typeof target]

        // Intercept the 'from' method which starts all database queries
        if (prop === 'from') {
          return (tableName: string) => {
            // Check if this call is from a repository
            const stack = new Error().stack || ''
            const isFromRepository = this.isCallFromRepository(stack)

            if (!isFromRepository && this.isMonitoring) {
              // Log violation
              this.logViolation(tableName, stack)
            }

            // Return the original from() result but also wrap it
            const query = (target as any).from(tableName)
            return this.wrapQuery(query, tableName, !isFromRepository)
          }
        }

        return original
      }
    })
  }

  /**
   * Wrap query methods to track operations
   */
  private wrapQuery(query: any, tableName: string, isViolation: boolean): any {
    return new Proxy(query, {
      get: (target, prop: string) => {
        const original = target[prop]

        // Wrap methods that execute queries
        if (['select', 'insert', 'update', 'delete', 'upsert'].includes(prop)) {
          return (...args: any[]) => {
            if (isViolation && this.isMonitoring) {
              // Log the specific operation
              const stack = new Error().stack || ''
              this.logOperation(tableName, prop, stack)
            }
            return original.apply(target, args)
          }
        }

        // For other methods (like eq, single, etc.), continue the proxy chain
        if (typeof original === 'function') {
          return (...args: any[]) => {
            const result = original.apply(target, args)
            // If the result is an object (chainable), wrap it too
            if (result && typeof result === 'object' && !Array.isArray(result)) {
              return this.wrapQuery(result, tableName, isViolation)
            }
            return result
          }
        }

        return original
      }
    })
  }

  /**
   * Check if the call originates from a repository
   */
  private isCallFromRepository(stack: string): boolean {
    // Whitelist of allowed repository files
    const repositoryPatterns = [
      '/repositories/company-intelligence-repository',
      '/repositories/base-repository',
      '/repositories/phase-data-repository',
      '/repositories/cache-manager',
      '/lib/database.types', // Type generation
      'monitored-client.ts', // Self
    ]

    return repositoryPatterns.some(pattern => stack.includes(pattern))
  }

  /**
   * Log a repository pattern violation
   */
  private logViolation(tableName: string, stack: string) {
    const caller = this.extractCaller(stack)

    // Skip if it's a system table
    if (tableName.startsWith('_') || tableName === 'schema_migrations') {
      return
    }

    // Create error for capturing
    const violationError = new Error(
      `REPOSITORY PATTERN VIOLATION: Direct database access to '${tableName}' table`
    )

    // Log with permanent logger
    permanentLogger.captureError('DB_ACCESS_VIOLATION', violationError, {
      tableName,
      caller,
      violationType: 'direct_access',
      stack: stack.split('\n').slice(1, 5).join('\n'), // First 5 stack frames
      severity: 'high',
      recommendation: 'Use CompanyIntelligenceRepository instead of direct Supabase calls'
    })

    // Also log as warning for visibility
    permanentLogger.warn('DB_ACCESS_VIOLATION', `Direct DB access detected to '${tableName}'`, {
      caller,
      recommendation: 'Use repository pattern instead'
    })

    // In development, show console error
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ REPOSITORY PATTERN VIOLATION ❌
Table: ${tableName}
Called from: ${caller}
Fix: Use CompanyIntelligenceRepository instead of direct Supabase calls
See CLAUDE.md guidelines for repository pattern requirements
`)
    }
  }

  /**
   * Log specific operation details
   */
  private logOperation(tableName: string, operation: string, stack: string) {
    const caller = this.extractCaller(stack)

    permanentLogger.breadcrumb('db_violation_operation', `Unauthorized ${operation} on ${tableName}`, {
      table: tableName,
      operation,
      caller,
      timestamp: Date.now()
    })
  }

  /**
   * Extract the calling file and line from stack trace
   */
  private extractCaller(stack: string): string {
    const lines = stack.split('\n')
    // Skip first line (Error) and second line (this function)
    // Look for the first line that's not from this monitoring file
    const relevantLine = lines.find(line =>
      !line.includes('monitored-client') &&
      !line.includes('MonitoredSupabaseClient') &&
      (line.includes('.ts') || line.includes('.tsx'))
    ) || lines[3] || lines[2] || 'unknown'

    // Extract file path and line number
    const match = relevantLine.match(/\((.+):(\d+):(\d+)\)/) ||
                  relevantLine.match(/at (.+):(\d+):(\d+)/)

    if (match) {
      const [, file, line, col] = match
      // Clean up the file path
      const cleanFile = file
        .replace(process.cwd(), '')
        .replace(/^.*\/project-genie/, '')
      return `${cleanFile}:${line}`
    }

    return relevantLine.replace(/^\s+at\s+/, '')
  }

  getClient(): SupabaseClient {
    return this.client
  }
}

/**
 * Export monitored client factory functions
 */
export function wrapWithMonitoring(client: SupabaseClient): SupabaseClient {
  if (process.env.MONITOR_DB_ACCESS === 'true' || process.env.NODE_ENV === 'development') {
    const monitored = new MonitoredSupabaseClient(client)
    return monitored.getClient()
  }
  return client
}