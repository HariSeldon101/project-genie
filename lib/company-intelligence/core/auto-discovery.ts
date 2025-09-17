/**
 * Auto-discovery system for pipeline components
 * Automatically loads and registers enrichers, extractors, and scrapers from the manifest
 */

import fs from 'fs'
import path from 'path'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface ManifestEnricher {
  name: string
  path: string
  enabled: boolean
  connected: boolean
  dataTypes: string[]
  requiredKeys: string[]
  tables: string[]
}

interface ManifestExtractor {
  name: string
  path: string
  enabled: boolean
  dataTypes: string[]
}

interface ProjectManifest {
  pipeline: {
    companyIntelligence: {
      phases: Array<{
        name: string
        handlers?: {
          enrichers?: ManifestEnricher[]
          extractors?: ManifestExtractor[]
          scrapers?: any[]
        }
      }>
    }
  }
}

export class AutoDiscovery {
  private static instance: AutoDiscovery
  private manifest: ProjectManifest | null = null
  private loadedEnrichers: Map<string, any> = new Map()
  private loadedExtractors: Map<string, any> = new Map()

  private constructor() {
    this.loadManifest()
  }

  static getInstance(): AutoDiscovery {
    if (!AutoDiscovery.instance) {
      AutoDiscovery.instance = new AutoDiscovery()
    }
    return AutoDiscovery.instance
  }

  private loadManifest() {
    try {
      const manifestPath = path.join(process.cwd(), 'PROJECT_MANIFEST.json')
      if (fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(manifestPath, 'utf-8')
        this.manifest = JSON.parse(content)
        permanentLogger.info('AUTO_DISCOVERY', 'Loaded PROJECT_MANIFEST.json')
      } else {
        permanentLogger.info('AUTO_DISCOVERY', 'PROJECT_MANIFEST.json not found, using defaults')
      }
    } catch (error) {
      permanentLogger.info('AUTO_DISCOVERY', 'Error loading manifest', { error})
    }
  }

  /**
   * Get all enabled enrichers from the manifest
   */
  async getEnabledEnrichers(): Promise<any[]> {
    if (!this.manifest) {
      permanentLogger.info('AUTO_DISCOVERY', 'No manifest available, returning empty enrichers')
      return []
    }

    const enrichmentPhase = this.manifest.pipeline.companyIntelligence.phases.find(
      p => p.name === 'enrichment'
    )

    if (!enrichmentPhase?.handlers?.enrichers) {
      permanentLogger.info('AUTO_DISCOVERY', 'No enrichers found in manifest')
      return []
    }

    const enabledEnrichers = enrichmentPhase.handlers.enrichers.filter(e => e.enabled)
    const enrichers = []

    for (const enricherConfig of enabledEnrichers) {
      try {
        // Check if already loaded
        if (this.loadedEnrichers.has(enricherConfig.name)) {
          enrichers.push(this.loadedEnrichers.get(enricherConfig.name))
          continue
        }

        // Dynamic import
        const modulePath = path.join(process.cwd(), enricherConfig.path)
        const module = await import(modulePath)
        
        // Find the enricher class
        const EnricherClass = module[enricherConfig.name] || module.default
        
        if (EnricherClass) {
          const instance = new EnricherClass()
          this.loadedEnrichers.set(enricherConfig.name, instance)
          enrichers.push(instance)
          
          permanentLogger.info('AUTO_DISCOVERY', `Loaded enricher: ${enricherConfig.name}`)
        }
      } catch (error) {
        permanentLogger.info('AUTO_DISCOVERY', `Failed to load enricher: ${enricherConfig.name}`, { error })
      }
    }

    return enrichers
  }

  /**
   * Get all enabled extractors from the manifest
   */
  async getEnabledExtractors(): Promise<any[]> {
    if (!this.manifest) {
      return []
    }

    const extractionPhase = this.manifest.pipeline.companyIntelligence.phases.find(
      p => p.name === 'extraction'
    )

    if (!extractionPhase?.handlers?.extractors) {
      return []
    }

    const enabledExtractors = extractionPhase.handlers.extractors.filter(e => e.enabled)
    const extractors = []

    for (const extractorConfig of enabledExtractors) {
      try {
        if (this.loadedExtractors.has(extractorConfig.name)) {
          extractors.push(this.loadedExtractors.get(extractorConfig.name))
          continue
        }

        const modulePath = path.join(process.cwd(), extractorConfig.path)
        const module = await import(modulePath)
        const ExtractorClass = module[extractorConfig.name] || module.default
        
        if (ExtractorClass) {
          const instance = new ExtractorClass()
          this.loadedExtractors.set(extractorConfig.name, instance)
          extractors.push(instance)
          
          permanentLogger.info('AUTO_DISCOVERY', `Loaded extractor: ${extractorConfig.name}`)
        }
      } catch (error) {
        permanentLogger.info('AUTO_DISCOVERY', `Failed to load extractor: ${extractorConfig.name}`, { error })
      }
    }

    return extractors
  }

  /**
   * Check if a specific enricher is available and enabled
   */
  isEnricherEnabled(name: string): boolean {
    if (!this.manifest) return false

    const enrichmentPhase = this.manifest.pipeline.companyIntelligence.phases.find(
      p => p.name === 'enrichment'
    )

    const enricher = enrichmentPhase?.handlers?.enrichers?.find(e => e.name === name)
    return enricher?.enabled || false
  }

  /**
   * Enable an enricher in the manifest (requires manifest update)
   */
  async enableEnricher(name: string): Promise<void> {
    permanentLogger.info('AUTO_DISCOVERY', `Request to enable enricher: ${name}`)
    // This would trigger a manifest update
    // In production, this would update PROJECT_MANIFEST.json
  }

  /**
   * Get quick wins - features that are built but not enabled
   */
  getQuickWins(): any[] {
    if (!this.manifest) return []

    const quickWins = []

    // Check for disabled enrichers
    const enrichmentPhase = this.manifest.pipeline.companyIntelligence.phases.find(
      p => p.name === 'enrichment'
    )

    if (enrichmentPhase?.handlers?.enrichers) {
      const disabledEnrichers = enrichmentPhase.handlers.enrichers.filter(e => !e.enabled)
      
      if (disabledEnrichers.length > 0) {
        quickWins.push({
          type: 'enrichers',
          count: disabledEnrichers.length,
          items: disabledEnrichers.map(e => e.name),
          effort: '2 hours',
          impact: 'Very High'
        })
      }
    }

    return quickWins
  }

  /**
   * Reload manifest (useful after updates)
   */
  reloadManifest() {
    this.loadManifest()
    this.loadedEnrichers.clear()
    this.loadedExtractors.clear()
    permanentLogger.info('AUTO_DISCOVERY', 'Manifest reloaded, caches cleared')
  }
}