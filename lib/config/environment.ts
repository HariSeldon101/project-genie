/**
 * Environment Configuration Service
 *
 * Centralized environment detection and configuration
 * Replaces all localhost hacks with proper Next.js patterns
 *
 * @module environment-config
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Environment configuration class
 * Provides compile-time and runtime environment detection
 */
export class EnvironmentConfig {
  // Server-side environment detection (compile-time)
  static readonly isDevelopment = process.env.NODE_ENV === 'development'
  static readonly isProduction = process.env.NODE_ENV === 'production'
  static readonly isTest = process.env.NODE_ENV === 'test'

  // Client-side environment detection (using NEXT_PUBLIC_ prefix)
  static readonly isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'
  static readonly appEnvironment = process.env.NEXT_PUBLIC_APP_ENV || 'production'

  // App configuration
  static readonly appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://project-genie.com'

  /**
   * Check if we should show debug UI components
   * Used to replace the localhost hack in DebugDataViewer
   */
  static shouldShowDebugUI(): boolean {
    // In development, always show debug UI
    if (this.isDevelopment) {
      return true
    }

    // In other environments, check the explicit debug mode flag
    return this.isDebugMode
  }

  /**
   * Check if we're in a local development environment
   * This is the proper replacement for window.location.hostname === 'localhost'
   */
  static isLocalDevelopment(): boolean {
    return this.appEnvironment === 'development' || this.isDevelopment
  }

  /**
   * Get the current environment name for display
   */
  static getEnvironmentName(): string {
    if (this.isDevelopment) return 'Development'
    if (this.isProduction) return 'Production'
    if (this.isTest) return 'Test'
    return this.appEnvironment
  }

  /**
   * Log current environment configuration (for debugging)
   */
  static logConfiguration(): void {
    const config = {
      nodeEnv: process.env.NODE_ENV,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      isTest: this.isTest,
      isDebugMode: this.isDebugMode,
      appEnvironment: this.appEnvironment,
      appUrl: this.appUrl,
      shouldShowDebugUI: this.shouldShowDebugUI(),
      isLocalDevelopment: this.isLocalDevelopment()
    }

    permanentLogger.info('ENVIRONMENT_CONFIG', 'Environment configuration loaded', { ...config})

    // Also log to console in development for visibility
    if (this.isDevelopment) {
      console.log('🔧 Environment Configuration:', config)
    }
  }

  /**
   * Validate that required environment variables are set
   * Returns an array of missing variable names
   */
  static validateRequired(): string[] {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    const missing: string[] = []

    for (const key of required) {
      if (!process.env[key]) {
        missing.push(key)
      }
    }

    if (missing.length > 0) {
      permanentLogger.captureError('ENVIRONMENT_CONFIG', new Error('Missing required environment variables'), {
        missing
      })
    }

    return missing
  }

  /**
   * Check if a specific feature flag is enabled
   * Useful for gradual rollout of new features
   */
  static isFeatureEnabled(featureName: string): boolean {
    const flagKey = `NEXT_PUBLIC_FEATURE_${featureName.toUpperCase()}`
    return process.env[flagKey] === 'true'
  }
}

// Initialize and log configuration on module load
if (typeof window === 'undefined') {
  // Server-side initialization
  EnvironmentConfig.logConfiguration()
}