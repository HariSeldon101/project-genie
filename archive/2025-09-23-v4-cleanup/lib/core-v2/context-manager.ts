/**
 * Company Context Manager
 * Manages Company Information Packs and automatically injects them into LLM prompts
 * Ensures all generated content reflects accurate company context
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { 
  CompanyInformationPack,
  CompanyResearchRequest 
} from '../types'
import type { LLMPrompt } from '@/lib/llm/types'

interface StoredPack {
  pack: CompanyInformationPack
  timestamp: number
  projectId?: string
  userId?: string
}

export class CompanyContextManager {
  private static instance: CompanyContextManager
  private packsCache: Map<string, StoredPack>
  private currentContext: CompanyInformationPack | null = null
  private persistentStorage: boolean

  private constructor() {
    this.packsCache = new Map()
    this.persistentStorage = typeof window !== 'undefined' && !!window.localStorage
    
    // Load from persistent storage if available
    if (this.persistentStorage) {
      this.loadFromStorage()
    }
    
    permanentLogger.info('CONTEXT_MANAGER', 'Initialized company context manager', {
      hasPersistentStorage: this.persistentStorage
    })
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CompanyContextManager {
    if (!CompanyContextManager.instance) {
      CompanyContextManager.instance = new CompanyContextManager()
    }
    return CompanyContextManager.instance
  }

  /**
   * Store a Company Information Pack
   */
  storePack(
    pack: CompanyInformationPack,
    options?: {
      projectId?: string
      userId?: string
      setAsCurrent?: boolean
    }
  ): void {
    const key = this.generateKey(pack.domain, options?.projectId)
    
    const storedPack: StoredPack = {
      pack,
      timestamp: Date.now(),
      projectId: options?.projectId,
      userId: options?.userId
    }
    
    this.packsCache.set(key, storedPack)
    
    // Set as current context if requested
    if (options?.setAsCurrent !== false) {
      this.currentContext = pack
      permanentLogger.info('CONTEXT_MANAGER', 'Set current company context', {
        domain: pack.domain,
        company: pack.basics?.companyName
      })
    }
    
    // Persist to storage
    if (this.persistentStorage) {
      this.saveToStorage()
    }
    
    permanentLogger.info('CONTEXT_MANAGER', 'Stored Company Information Pack', {
      domain: pack.domain,
      company: pack.basics?.companyName,
      dataCompleteness: pack.dataCompleteness,
      projectId: options?.projectId
    })
  }

  /**
   * Retrieve a Company Information Pack
   */
  getPack(domain: string, projectId?: string): CompanyInformationPack | null {
    const key = this.generateKey(domain, projectId)
    const stored = this.packsCache.get(key)
    
    if (!stored) {
      // Try without projectId as fallback
      const generalKey = this.generateKey(domain)
      const generalStored = this.packsCache.get(generalKey)
      return generalStored?.pack || null
    }
    
    // Check if pack is still fresh (24 hour TTL)
    const ttl = 24 * 60 * 60 * 1000
    if (Date.now() - stored.timestamp > ttl) {
      permanentLogger.warn('CONTEXT_MANAGER', 'Company pack expired', {
        domain,
        age: Math.floor((Date.now() - stored.timestamp) / 1000 / 60 / 60) + ' hours'
      })
    }
    
    return stored.pack
  }

  /**
   * Get current active context
   */
  getCurrentContext(): CompanyInformationPack | null {
    return this.currentContext
  }

  /**
   * Set current active context by domain
   */
  setCurrentContext(domain: string, projectId?: string): boolean {
    const pack = this.getPack(domain, projectId)
    if (pack) {
      this.currentContext = pack
      permanentLogger.info('CONTEXT_MANAGER', 'Updated current context', {
        domain: pack.domain,
        company: pack.basics?.companyName
      })
      return true
    }
    return false
  }

  /**
   * Clear current context
   */
  clearCurrentContext(): void {
    this.currentContext = null
    permanentLogger.info('CONTEXT_MANAGER', 'Cleared current company context')
  }

  /**
   * Enhance an LLM prompt with company context
   */
  enhancePrompt(prompt: LLMPrompt): LLMPrompt {
    const context = this.currentContext
    
    if (!context) {
      return prompt
    }
    
    // Build context injection
    const contextInjection = this.buildContextInjection(context)
    
    // Enhance system prompt with company context
    const enhancedSystem = `${prompt.system}

## Company Context
${contextInjection}

Remember to incorporate this company context naturally into your response where relevant.`
    
    // Log enhancement
    permanentLogger.debug('CONTEXT_MANAGER', 'Enhanced prompt with company context', {
      company: context.basics?.companyName,
      domain: context.domain,
      contextLength: contextInjection.length
    })
    
    return {
      ...prompt,
      system: enhancedSystem
    }
  }

  /**
   * Build context injection string from Company Information Pack
   */
  private buildContextInjection(pack: CompanyInformationPack): string {
    const sections: string[] = []
    
    // Company basics
    if (pack.basics) {
      sections.push(`### Company Information
- **Name**: ${pack.basics.companyName}
- **Website**: ${pack.domain}
- **Description**: ${pack.basics.description}
- **Industry**: ${pack.basics.industry?.join(', ') || 'N/A'}
- **Founded**: ${pack.basics.foundedYear || 'N/A'}`)
      
      if (pack.basics.mission) {
        sections.push(`- **Mission**: ${pack.basics.mission}`)
      }
      if (pack.basics.vision) {
        sections.push(`- **Vision**: ${pack.basics.vision}`)
      }
    }
    
    // Products and services
    if (pack.productsServices?.products?.length || pack.productsServices?.services?.length) {
      sections.push(`
### Products & Services`)
      
      // Add products
      if (pack.productsServices.products?.length) {
        pack.productsServices.products.slice(0, 3).forEach(product => {
          sections.push(`- **${product.name}**: ${product.description || 'Product offered'}`)
        })
      }
      
      // Add services
      if (pack.productsServices.services?.length) {
        pack.productsServices.services.slice(0, 3).forEach(service => {
          sections.push(`- **${service.name}**: ${service.description || 'Service provided'}`)
        })
      }
    }
    
    // Market position
    if (pack.marketPosition) {
      sections.push(`
### Market Position
- **Key Advantages**: ${pack.marketPosition.competitiveAdvantages?.slice(0, 3).join(', ')}`)
    }
    
    // Metrics (if available)
    if (pack.metrics) {
      const metricsItems = []
      if (pack.metrics.revenue) metricsItems.push(`Revenue: ${pack.metrics.revenue}`)
      if (pack.metrics.employees) metricsItems.push(`Employees: ${pack.metrics.employees}`)
      if (pack.metrics.growth) metricsItems.push(`Growth: ${pack.metrics.growth}`)
      
      if (metricsItems.length > 0) {
        sections.push(`
### Key Metrics
- ${metricsItems.join('\n- ')}`)
      }
    }
    
    // Target audience
    if (pack.targetAudience?.segments?.length) {
      sections.push(`
### Target Audience`)
      pack.targetAudience.segments.slice(0, 3).forEach(segment => {
        sections.push(`- **${segment.name}**: ${segment.characteristics.slice(0, 2).join(', ')}`)
      })
    }
    
    // Tech stack (for technical documents)
    if (pack.techStack?.length) {
      const techByCategory = pack.techStack.reduce((acc, tech) => {
        if (!acc[tech.category]) acc[tech.category] = []
        acc[tech.category].push(tech.name)
        return acc
      }, {} as Record<string, string[]>)
      
      sections.push(`
### Technology Stack`)
      Object.entries(techByCategory).slice(0, 4).forEach(([category, techs]) => {
        sections.push(`- **${category}**: ${techs.slice(0, 3).join(', ')}`)
      })
    }
    
    // Recent developments
    if (pack.recentNews?.length) {
      sections.push(`
### Recent Developments`)
      pack.recentNews.slice(0, 2).forEach(news => {
        sections.push(`- ${news.title} (${news.source})`)
      })
    }
    
    return sections.join('\n')
  }

  /**
   * Generate context summary for display
   */
  getContextSummary(): string | null {
    if (!this.currentContext) {
      return null
    }
    
    const pack = this.currentContext
    return `${pack.basics?.companyName || pack.domain} - ${pack.basics?.industry?.join(', ') || 'Company'}`
  }

  /**
   * Check if company context is available for a domain
   */
  hasContext(domain: string, projectId?: string): boolean {
    return !!this.getPack(domain, projectId)
  }

  /**
   * Get all stored domains
   */
  getStoredDomains(): string[] {
    return Array.from(this.packsCache.keys()).map(key => {
      const [domain] = key.split('::')
      return domain
    })
  }

  /**
   * Clear all stored packs
   */
  clearAll(): void {
    this.packsCache.clear()
    this.currentContext = null
    
    if (this.persistentStorage) {
      localStorage.removeItem('company_intelligence_packs')
    }
    
    permanentLogger.info('CONTEXT_MANAGER', 'Cleared all company contexts')
  }

  /**
   * Generate storage key
   */
  private generateKey(domain: string, projectId?: string): string {
    return projectId ? `${domain}::${projectId}` : domain
  }

  /**
   * Load packs from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('company_intelligence_packs')
      if (stored) {
        const data = JSON.parse(stored)
        
        // Restore packs
        if (data.packs && Array.isArray(data.packs)) {
          data.packs.forEach((item: any) => {
            if (item.key && item.pack) {
              this.packsCache.set(item.key, {
                pack: item.pack,
                timestamp: item.timestamp || Date.now(),
                projectId: item.projectId,
                userId: item.userId
              })
            }
          })
        }
        
        // Restore current context
        if (data.currentContext) {
          this.currentContext = data.currentContext
        }
        
        permanentLogger.info('CONTEXT_MANAGER', 'Loaded from storage', {
          packsCount: this.packsCache.size,
          hasCurrentContext: !!this.currentContext
        })
      }
    } catch (error) {
      permanentLogger.captureError('CONTEXT_MANAGER', error as Error, {
        message: 'Failed to load from storage'
      })
    }
  }

  /**
   * Save packs to localStorage
   */
  private saveToStorage(): void {
    if (!this.persistentStorage) return
    
    try {
      const packs = Array.from(this.packsCache.entries()).map(([key, stored]) => ({
        key,
        pack: stored.pack,
        timestamp: stored.timestamp,
        projectId: stored.projectId,
        userId: stored.userId
      }))
      
      const data = {
        packs,
        currentContext: this.currentContext,
        savedAt: new Date().toISOString()
      }
      
      localStorage.setItem('company_intelligence_packs', JSON.stringify(data))
      
      permanentLogger.debug('CONTEXT_MANAGER', 'Saved to storage', {
        packsCount: packs.length
      })
    } catch (error) {
      permanentLogger.captureError('CONTEXT_MANAGER', error as Error, {
        message: 'Failed to save to storage'
      })
    }
  }

  /**
   * Get metrics about stored contexts
   */
  getMetrics(): {
    totalPacks: number
    currentContextSet: boolean
    oldestPack: Date | null
    newestPack: Date | null
    averageCompleteness: number
  } {
    const packs = Array.from(this.packsCache.values())
    
    if (packs.length === 0) {
      return {
        totalPacks: 0,
        currentContextSet: false,
        oldestPack: null,
        newestPack: null,
        averageCompleteness: 0
      }
    }
    
    const timestamps = packs.map(p => p.timestamp).sort()
    const completeness = packs
      .map(p => p.pack.dataCompleteness || 0)
      .reduce((sum, c) => sum + c, 0) / packs.length
    
    return {
      totalPacks: packs.length,
      currentContextSet: !!this.currentContext,
      oldestPack: new Date(timestamps[0]),
      newestPack: new Date(timestamps[timestamps.length - 1]),
      averageCompleteness: Math.round(completeness * 100) / 100
    }
  }
}

// Export singleton instance getter
export const getCompanyContext = () => CompanyContextManager.getInstance()