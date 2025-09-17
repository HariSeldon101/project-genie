/**
 * Configuration Validator
 *
 * Validates environment configuration and provides graceful degradation
 * for missing services. Prevents crashes from missing API keys.
 *
 * @module config-validator
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EnvironmentConfig } from './environment'

export interface ServiceStatus {
  name: string
  isConfigured: boolean
  isRequired: boolean
  error?: string
}

export interface ValidationResult {
  isValid: boolean
  missingRequired: string[]
  missingOptional: string[]
  services: ServiceStatus[]
}

/**
 * Configuration validator class
 * Checks for required and optional environment variables
 */
export class ConfigurationValidator {
  // Required environment variables (app will not work without these)
  private static readonly REQUIRED_VARS = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  // Optional environment variables (app will work with degraded functionality)
  private static readonly OPTIONAL_VARS = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'DEEPSEEK_API_KEY',
    'GROQ_API_KEY',
    'AI_GATEWAY_API_KEY'
  ]

  // Service configuration mapping
  private static readonly SERVICES = [
    {
      name: 'Supabase',
      keys: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      required: true
    },
    {
      name: 'Email (Resend)',
      keys: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
      required: false
    },
    {
      name: 'OpenAI',
      keys: ['OPENAI_API_KEY'],
      required: false
    },
    {
      name: 'Stripe',
      keys: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY'],
      required: false
    },
    {
      name: 'Syncfusion',
      keys: ['NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY'],
      required: false
    }
  ]

  /**
   * Validate all configuration
   */
  static validate(): ValidationResult {
    const missingRequired: string[] = []
    const missingOptional: string[] = []
    const services: ServiceStatus[] = []

    // Check required variables
    for (const key of this.REQUIRED_VARS) {
      if (!process.env[key]) {
        missingRequired.push(key)
      }
    }

    // Check optional variables
    for (const key of this.OPTIONAL_VARS) {
      if (!process.env[key] || process.env[key]?.startsWith('your_')) {
        missingOptional.push(key)
      }
    }

    // Check service status
    for (const service of this.SERVICES) {
      const missingKeys = service.keys.filter(
        key => !process.env[key] || process.env[key]?.startsWith('your_')
      )

      services.push({
        name: service.name,
        isConfigured: missingKeys.length === 0,
        isRequired: service.required,
        error: missingKeys.length > 0
          ? `Missing: ${missingKeys.join(', ')}`
          : undefined
      })
    }

    const isValid = missingRequired.length === 0

    // Log validation results
    if (!isValid) {
      permanentLogger.captureError('CONFIG_VALIDATOR', new Error('Required configuration missing'), {
        missingRequired,
        missingOptional
      })
    } else if (missingOptional.length > 0) {
      permanentLogger.info('CONFIG_VALIDATOR', 'Optional configuration missing', { missingOptional,
        note: 'App will run with degraded functionality' })
    }

    return {
      isValid,
      missingRequired,
      missingOptional,
      services
    }
  }

  /**
   * Check if a specific service is configured
   * CRITICAL: Throws error if service is not configured - NO FALLBACKS!
   */
  static isServiceConfigured(serviceName: string): boolean {
    const service = this.SERVICES.find(s => s.name === serviceName)
    if (!service) {
      const error = new Error(`Service ${serviceName} not found in configuration!`)
      permanentLogger.captureError('CONFIG_VALIDATOR', error, {
        requestedService: serviceName,
        availableServices: this.SERVICES.map(s => s.name)
      })
      throw error
    }

    const missingKeys = service.keys.filter(
      key => !process.env[key] || process.env[key]?.startsWith('your_')
    )

    if (missingKeys.length > 0) {
      const error = new Error(
        `Service ${serviceName} is not configured! Missing keys: ${missingKeys.join(', ')}. ` +
        `Please add these to your .env.local file.`
      )
      permanentLogger.captureError('CONFIG_VALIDATOR', error, {
        service: serviceName,
        missingKeys,
        isRequired: service.required
      })
      throw error
    }

    return true
  }

  /**
   * Validate configuration on app startup
   * Throws error if required configuration is missing
   */
  static validateOnStartup(): void {
    const result = this.validate()

    if (!result.isValid) {
      const errorMessage = `Missing required environment variables: ${result.missingRequired.join(', ')}`

      // Log error
      permanentLogger.captureError('CONFIG_VALIDATOR', new Error('Startup validation failed'), {
        missingRequired: result.missingRequired
      })

      // In development, show detailed error
      if (EnvironmentConfig.isDevelopment) {
        console.error('❌ Configuration Error:', errorMessage)
        console.error('Missing required:', result.missingRequired)
        console.error('Missing optional:', result.missingOptional)
      }

      throw new Error(errorMessage)
    }

    // Log successful validation with warnings for optional services
    if (result.missingOptional.length > 0) {
      permanentLogger.info('CONFIG_VALIDATOR', 'Startup validation passed with warnings', { missingOptional: result.missingOptional,
        services: result.services })

      if (EnvironmentConfig.isDevelopment) {
        console.warn('⚠️ Optional services not configured:', result.missingOptional)
        console.warn('Service status:', result.services)
      }
    } else {
      permanentLogger.info('CONFIG_VALIDATOR', 'All services configured successfully', { services: result.services})

      if (EnvironmentConfig.isDevelopment) {
        console.log('✅ All services configured successfully')
      }
    }
  }

  /**
   * Get a summary of service configuration for display
   */
  static getConfigurationSummary(): string {
    const result = this.validate()
    const lines: string[] = []

    lines.push('=== Configuration Status ===')
    lines.push(`Environment: ${EnvironmentConfig.getEnvironmentName()}`)
    lines.push(`Debug Mode: ${EnvironmentConfig.isDebugMode ? 'Enabled' : 'Disabled'}`)
    lines.push('')

    lines.push('Services:')
    for (const service of result.services) {
      const status = service.isConfigured ? '✅' : service.isRequired ? '❌' : '⚠️'
      lines.push(`  ${status} ${service.name}: ${service.isConfigured ? 'Configured' : service.error}`)
    }

    if (result.missingRequired.length > 0) {
      lines.push('')
      lines.push('❌ Missing Required:')
      result.missingRequired.forEach(key => lines.push(`  - ${key}`))
    }

    if (result.missingOptional.length > 0) {
      lines.push('')
      lines.push('⚠️ Missing Optional:')
      result.missingOptional.forEach(key => lines.push(`  - ${key}`))
    }

    return lines.join('\n')
  }
}