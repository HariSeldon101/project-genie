/**
 * DataAggregator - Intelligent data merging with URL-based deduplication
 * 
 * What it does (like a 12-year-old would understand):
 * - Takes data from multiple scraping runs and combines them smartly
 * - Removes duplicates by checking URLs (not just counting)
 * - Merges information about the same page from different sources
 * - Keeps track of what data came from which phase
 * 
 * Why we need it:
 * - PREVENTS duplicate counting (38 pages showing as 76)
 * - ENSURES data from all phases is properly combined
 * - PROVIDES accurate counts and statistics
 * - MAINTAINS data quality through intelligent merging
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { getDeduplicator } from '../scrapers/utils/content-deduplicator'
import type { PageResult } from '../scrapers/core/types'

export interface PageData {
  url: string
  title?: string
  description?: string
  technologies?: string[]
  links?: string[]
  phase?: string
  timestamp?: string
  [key: string]: any
}

export interface AggregatedData {
  pages: Record<string, PageData>  // Plain object only - no Maps for simplicity
  stats: {
    totalPages: number
    totalLinks: number
    uniqueTechnologies: number
    phaseCounts: Record<string, number>
    dataPoints: number
  }
  extractedData: {
    titles: string[]
    descriptions: string[]
    technologies: string[]
    emails: string[]
    phones: string[]
    addresses: string[]
    socialLinks: string[]
    people: any[]
    products: any[]
    services: any[]
    pricing: any[]
    [key: string]: any[]
  }
}

export class DataAggregator {
  private logger = permanentLogger

  /**
   * Aggregate data from multiple phases/runs
   * @param existingData - Current aggregated data
   * @param newData - New data to merge in
   * @param phase - The phase this data came from
   * @returns The merged aggregated data
   */
  aggregateData(
    existingData: AggregatedData | null,
    newData: any,
    phase: string
  ): AggregatedData {
    // DEBUG: Log immediately to see if we even enter this function
    permanentLogger.debug('DATA_AGGREGATOR', 'aggregateData called', {
      phase,
      hasExistingData: !!existingData,
      newDataType: typeof newData,
      newDataIsArray: Array.isArray(newData),
      newDataKeys: newData && typeof newData === 'object' ? Object.keys(newData) : [],
      hasPagesField: !!newData?.pages,
      pagesIsArray: Array.isArray(newData?.pages),
      pagesLength: Array.isArray(newData?.pages) ? newData.pages.length : 'not array'
    })
    
    // Force recompilation
    const startTime = Date.now()
    
    // Add breadcrumb for aggregation start
    this.logger.breadcrumb('DATA_AGGREGATOR', 'Starting data aggregation', {
      phase,
      hasExisting: !!existingData,
      newDataType: Array.isArray(newData) ? 'array' : typeof newData,
      newDataKeys: Object.keys(newData || {}).length
    })
    
    this.logger.info('DATA_AGGREGATOR', 'Starting data aggregation', { 
      phase,
      hasExisting: !!existingData,
      newDataKeys: Object.keys(newData || {}),
      newDataStructure: {
        hasPages: !!(newData?.pages),
        pagesIsArray: Array.isArray(newData?.pages),
        pagesLength: newData?.pages?.length,
        isDirectArray: Array.isArray(newData),
        directArrayLength: Array.isArray(newData) ? newData.length : 0,
        sampleKeys: newData && typeof newData === 'object' && !Array.isArray(newData) ? 
          Object.keys(newData).slice(0, 5) : []
      }
    })

    // Initialize or use existing data
    const aggregated: AggregatedData = existingData || this.createEmptyAggregatedData()

    // Process new data based on its structure
    permanentLogger.debug('DATA_AGGREGATOR', 'About to check if (newData)', !!newData)
    if (newData) {
      permanentLogger.debug('DATA_AGGREGATOR', 'Inside if(newData) block')
      permanentLogger.debug('DATA_AGGREGATOR', 'newData.pages exists?', !!newData.pages)
      permanentLogger.debug('DATA_AGGREGATOR', 'Array.isArray(newData.pages)?', Array.isArray(newData.pages))
      permanentLogger.debug('DATA_AGGREGATOR', 'Will process pages?', !!(newData.pages && Array.isArray(newData.pages)))
      
      // CRITICAL DEBUG: Log exactly what we're checking
      this.logger.debug('DATA_AGGREGATOR_CHECK', 'Checking for pages in newData', {
        hasNewData: !!newData,
        hasPages: !!(newData.pages),
        pagesType: typeof newData.pages,
        isArray: Array.isArray(newData.pages),
        pagesLength: newData.pages ? 
          (Array.isArray(newData.pages) ? newData.pages.length : 'not array') : 
          'no pages',
        willProcess: !!(newData.pages && Array.isArray(newData.pages))
      })
      
      if (newData.pages && Array.isArray(newData.pages)) {
        permanentLogger.debug('DATA_AGGREGATOR', 'ENTERING PAGES MERGE BLOCK!')
        permanentLogger.debug('DATA_AGGREGATOR', 'Pages to merge', { count: newData.pages.length })
        
        this.logger.breadcrumb('MERGE', 'Processing pages array', {
          count: newData.pages.length,
          phase
        })
        this.logger.info('PAGES_MERGE_START', 'Starting to merge pages', {
          pageCount: newData.pages.length,
          firstPageUrl: newData.pages[0]?.url,
          phase
        })
        const pagesStartTime = Date.now()
        permanentLogger.debug('DATA_AGGREGATOR', 'About to call mergePages')
        this.mergePages(aggregated, newData.pages, phase)
        permanentLogger.debug('DATA_AGGREGATOR', 'mergePages completed')
        permanentLogger.debug('DATA_AGGREGATOR', 'After merge, aggregated.pages count', { count: Object.keys(aggregated.pages).length })
        permanentLogger.debug('DATA_AGGREGATOR', 'After merge, aggregated.pages keys', { keys: Object.keys(aggregated.pages) })
        this.logger.timing('pages_merged', { 
          duration: Date.now() - pagesStartTime,
          count: newData.pages.length 
        })
        this.logger.info('PAGES_MERGE_END', 'Finished merging pages', {
          aggregatedPagesCount: Object.keys(aggregated.pages).length,
          phase
        })
      } else {
        this.logger.debug('PAGES_MERGE_SKIP', 'Skipping pages merge - condition not met', {
          reason: !newData.pages ? 'no pages property' : 'pages not array',
          actualType: typeof newData.pages
        })
      }
      
      if (newData.links && Array.isArray(newData.links)) {
        this.logger.breadcrumb('MERGE', 'Processing links array', {
          count: newData.links.length,
          phase
        })
        const linksStartTime = Date.now()
        this.mergeLinks(aggregated, newData.links, phase)
        this.logger.timing('links_merged', { 
          duration: Date.now() - linksStartTime,
          count: newData.links.length 
        })
      }

      if (newData.extractedData) {
        this.logger.breadcrumb('MERGE', 'Processing extracted data', {
          keys: Object.keys(newData.extractedData).length,
          phase
        })
        const extractStartTime = Date.now()
        this.mergeExtractedData(aggregated, newData.extractedData)
        this.logger.timing('extracted_data_merged', { 
          duration: Date.now() - extractStartTime 
        })
      }

      // Handle direct array of pages (from some scrapers)
      if (Array.isArray(newData)) {
        this.logger.breadcrumb('MERGE', 'Processing direct pages array', {
          count: newData.length,
          phase
        })
        const directStartTime = Date.now()
        this.mergePages(aggregated, newData, phase)
        this.logger.timing('direct_pages_merged', { 
          duration: Date.now() - directStartTime,
          count: newData.length 
        })
      }
    }

    // Update statistics
    this.logger.breadcrumb('STATISTICS', 'Updating aggregation statistics', {
      pagesCount: Object.keys(aggregated.pages).length
    })
    const statsStartTime = Date.now()
    this.updateStatistics(aggregated)
    this.logger.timing('statistics_updated', { 
      duration: Date.now() - statsStartTime 
    })

    // Final breadcrumb and timing
    const totalDuration = Date.now() - startTime
    
    this.logger.breadcrumb('DATA_AGGREGATOR', 'Aggregation complete', {
      phase,
      totalPages: aggregated.stats.totalPages,
      totalLinks: aggregated.stats.totalLinks,
      dataPoints: aggregated.stats.dataPoints,
      duration: totalDuration
    })
    
    this.logger.timing('aggregation_complete', {
      totalDuration,
      totalPages: aggregated.stats.totalPages,
      dataPoints: aggregated.stats.dataPoints
    })
    
    this.logger.info('DATA_AGGREGATOR', 'Data aggregation complete', {
      phase,
      totalPages: aggregated.stats.totalPages,
      totalLinks: aggregated.stats.totalLinks,
      dataPoints: aggregated.stats.dataPoints,
      duration: totalDuration
    })

    // No conversion needed - already using plain objects
    permanentLogger.debug('DATA_AGGREGATOR', 'Final aggregated data before return', {
      pagesCount: Object.keys(aggregated.pages).length,
      pageUrls: Object.keys(aggregated.pages),
      statsTotal: aggregated.stats.totalPages
    })
    return aggregated
  }

  /**
   * Merge pages with URL-based deduplication
   * @param aggregated - The aggregated data
   * @param pages - New pages to merge
   * @param phase - The phase these pages came from
   */
  private mergePages(
    aggregated: AggregatedData,
    pages: any[],
    phase: string
  ): void {
    permanentLogger.debug('MERGE_PAGES', 'Called with', {
      pagesLength: pages?.length,
      pagesIsArray: Array.isArray(pages),
      firstPage: pages?.[0],
      phase
    })
    
    // FIX: Ensure pages object exists to prevent null reference error
    if (!aggregated.pages) {
      aggregated.pages = {}
      this.logger.debug('DATA_AGGREGATOR', 'Initialized empty pages object', { phase })
    }
    
    const startCount = Object.keys(aggregated.pages).length
    const mergeStartTime = Date.now()
    
    this.logger.breadcrumb('PAGE_MERGE', 'Starting page merge', {
      phase,
      inputPages: pages.length,
      existingPages: startCount
    })
    
    // Use ContentDeduplicator for URL normalization (DRY principle)
    const deduplicator = getDeduplicator()
    
    permanentLogger.debug('MERGE_PAGES', 'About to forEach over pages', { count: pages.length })
    
    pages.forEach((page, index) => {
      permanentLogger.debug('MERGE_PAGES', 'Processing page', { index, page })
      const url = deduplicator.normalizeUrl(page.url || page.link || '')
      
      // CRITICAL DEBUG: Log why pages might be skipped
      if (!url) {
        this.logger.debug('PAGE_MERGE_SKIP', 'Skipping page - no valid URL', {
          pageIndex: index,
          pageUrl: page.url,
          pageLink: page.link,
          pageKeys: Object.keys(page || {}).slice(0, 5)
        })
        return
      }

      const existing = aggregated.pages[url]
      
      if (existing) {
        // Merge data for existing page
        this.logger.breadcrumb('PAGE_MERGE', 'Merging duplicate page', { 
          url, 
          phase,
          pageIndex: index 
        })
        this.logger.debug('DATA_AGGREGATOR', 'Merging data for existing page', { url, phase })
        
        aggregated.pages[url] = {
          ...existing,
          ...page,
          // Preserve arrays by merging
          technologies: this.mergeArrays(existing.technologies, page.technologies),
          links: this.mergeArrays(existing.links, page.links),
          // Track which phases contributed
          phases: this.mergeArrays(existing.phases || [], [phase]),
          // Keep the earliest timestamp
          timestamp: existing.timestamp || page.timestamp || new Date().toISOString()
        }
      } else {
        // Add new page
        this.logger.breadcrumb('PAGE_MERGE', 'Adding new page', { 
          url, 
          phase,
          pageIndex: index 
        })
        this.logger.debug('DATA_AGGREGATOR', 'Adding new page', { url, phase })
        
        aggregated.pages[url] = {
          ...page,
          url,
          phase,
          phases: [phase],
          timestamp: page.timestamp || new Date().toISOString()
        }
        
        // CRITICAL DEBUG: Verify page was actually added
        this.logger.debug('PAGE_ADDED_VERIFICATION', 'Verifying page was added to aggregated.pages', {
          url,
          wasAdded: !!aggregated.pages[url],
          currentPagesCount: Object.keys(aggregated.pages).length
        })
      }
    })

    const addedCount = Object.keys(aggregated.pages).length - startCount
    const mergeDuration = Date.now() - mergeStartTime
    
    this.logger.breadcrumb('PAGE_MERGE', 'Page merge complete', {
      phase,
      inputCount: pages.length,
      addedCount,
      duplicatesFound: pages.length - addedCount,
      totalPages: Object.keys(aggregated.pages).length
    })
    
    this.logger.timing('pages_merge_duration', {
      duration: mergeDuration,
      pagesProcessed: pages.length,
      pagesAdded: addedCount
    })
    
    this.logger.info('DATA_AGGREGATOR', 'Pages merged', { 
      phase, 
      inputCount: pages.length,
      addedCount,
      totalPages: Object.keys(aggregated.pages).length
    })
  }

  /**
   * Merge links with deduplication and count all discovered links
   * @param aggregated - The aggregated data
   * @param links - New links to merge (optional)
   * @param phase - The phase these links came from
   */
  private mergeLinks(
    aggregated: AggregatedData,
    links: any[] = [],
    phase: string
  ): void {
    const mergeStartTime = Date.now()

    this.logger.breadcrumb('LINK_MERGE', 'Starting link merge', {
      phase,
      inputLinks: links.length
    })

    const uniqueLinks = new Set<string>()

    // Get all links from pages (both 'links' and 'discoveredLinks' fields)
    Object.values(aggregated.pages).forEach(page => {
      // Count links field
      if (page.links && Array.isArray(page.links)) {
        page.links.forEach(link => {
          const deduplicator = getDeduplicator()
          const normalized = deduplicator.normalizeUrl(link)
          if (normalized) uniqueLinks.add(normalized)
        })
      }

      // Count discoveredLinks field (this is what scrapers actually populate)
      if (page.discoveredLinks && Array.isArray(page.discoveredLinks)) {
        page.discoveredLinks.forEach(linkObj => {
          // discoveredLinks is an array of objects with 'url' property
          const url = typeof linkObj === 'string' ? linkObj : linkObj.url
          if (url) {
            const deduplicator = getDeduplicator()
            const normalized = deduplicator.normalizeUrl(url)
            if (normalized) uniqueLinks.add(normalized)
          }
        })
      }
    })

    // Add any additional new links passed in
    links.forEach(link => {
      const url = typeof link === 'string' ? link : link.url || link.link
      if (url) {
        const deduplicator = getDeduplicator()
        const normalized = deduplicator.normalizeUrl(url)
        if (normalized) uniqueLinks.add(normalized)
      }
    })

    // Store unique count - this is what shows in the UI
    aggregated.stats.totalLinks = uniqueLinks.size

    const mergeDuration = Date.now() - mergeStartTime

    this.logger.breadcrumb('LINK_MERGE', 'Link merge complete', {
      phase,
      inputCount: links.length,
      uniqueLinks: uniqueLinks.size,
      duplicates: links.length > 0 ? links.length - uniqueLinks.size : 0
    })

    this.logger.timing('links_merge_duration', {
      duration: mergeDuration,
      linksProcessed: links.length,
      uniqueLinks: uniqueLinks.size
    })

    this.logger.info('DATA_AGGREGATOR', 'Links merged', {
      phase,
      inputCount: links.length,
      uniqueLinks: uniqueLinks.size,
      totalLinks: aggregated.stats.totalLinks
    })
  }

  /**
   * Merge extracted data arrays
   * @param aggregated - The aggregated data
   * @param extractedData - New extracted data to merge
   */
  private mergeExtractedData(
    aggregated: AggregatedData,
    extractedData: any
  ): void {
    if (!extractedData || typeof extractedData !== 'object') return
    
    const mergeStartTime = Date.now()
    const dataKeys = Object.keys(extractedData)
    
    this.logger.breadcrumb('EXTRACTED_MERGE', 'Starting extracted data merge', {
      dataKeys: dataKeys.length,
      keys: dataKeys
    })

    Object.keys(extractedData).forEach(key => {
      const value = extractedData[key]
      
      if (Array.isArray(value)) {
        // Merge arrays with deduplication
        aggregated.extractedData[key] = this.mergeArrays(
          aggregated.extractedData[key] || [],
          value
        )
      } else if (value && typeof value === 'object') {
        // Handle nested objects
        if (!aggregated.extractedData[key]) {
          aggregated.extractedData[key] = []
        }
        aggregated.extractedData[key].push(value)
      }
    })

    const mergeDuration = Date.now() - mergeStartTime
    const totalDataPoints = this.countDataPoints(aggregated.extractedData || {})
    
    this.logger.breadcrumb('EXTRACTED_MERGE', 'Extracted data merge complete', {
      keys: dataKeys.length,
      totalDataPoints
    })
    
    this.logger.timing('extracted_merge_duration', {
      duration: mergeDuration,
      keysProcessed: dataKeys.length,
      dataPoints: totalDataPoints
    })
    
    this.logger.info('DATA_AGGREGATOR', 'Extracted data merged', {
      keys: dataKeys,
      dataPoints: totalDataPoints
    })
  }

  /**
   * Update statistics based on current data
   * @param aggregated - The aggregated data
   */
  private updateStatistics(aggregated: AggregatedData): void {
    const statsStartTime = Date.now()
    
    this.logger.breadcrumb('STATISTICS', 'Calculating statistics', {
      pageCount: Object.keys(aggregated.pages).length
    })
    
    // Ensure stats object exists
    if (!aggregated.stats) {
      aggregated.stats = {
        totalPages: 0,
        totalLinks: 0,
        uniqueTechnologies: 0,
        phaseCounts: {},
        dataPoints: 0
      }
    }
    
    // Count pages
    aggregated.stats.totalPages = Object.keys(aggregated.pages).length

    // Count unique technologies
    const allTechnologies = new Set<string>()
    Object.values(aggregated.pages).forEach(page => {
      if (page.technologies && Array.isArray(page.technologies)) {
        page.technologies.forEach(tech => allTechnologies.add(tech))
      }
    })
    aggregated.stats.uniqueTechnologies = allTechnologies.size  // allTechnologies is still a Set for deduplication

    // Count pages by phase
    aggregated.stats.phaseCounts = {}
    Object.values(aggregated.pages).forEach(page => {
      const phases = page.phases || [page.phase] || []
      phases.forEach(phase => {
        if (phase) {
          aggregated.stats.phaseCounts[phase] = (aggregated.stats.phaseCounts[phase] || 0) + 1
        }
      })
    })

    // Count total data points from pages and extracted data
    aggregated.stats.dataPoints = this.countDataPointsFromPages(aggregated)
    
    const statsDuration = Date.now() - statsStartTime
    
    this.logger.breadcrumb('STATISTICS', 'Statistics calculated', {
      totalPages: aggregated.stats.totalPages,
      totalLinks: aggregated.stats.totalLinks,
      uniqueTechnologies: aggregated.stats.uniqueTechnologies,
      dataPoints: aggregated.stats.dataPoints,
      phases: Object.keys(aggregated.stats.phaseCounts).length
    })
    
    this.logger.timing('statistics_calculation', {
      duration: statsDuration,
      metrics: {
        pages: aggregated.stats.totalPages,
        technologies: aggregated.stats.uniqueTechnologies,
        dataPoints: aggregated.stats.dataPoints
      }
    })
  }

  /**
   * Count data points from pages and extracted data
   * @param aggregated - The aggregated data object containing pages and extractedData
   * @returns Total count of data points
   */
  private countDataPointsFromPages(aggregated: AggregatedData): number {
    let count = 0

    try {
      // Count data points from pages
      Object.values(aggregated.pages || {}).forEach(page => {
        // Count basic data
        if (page.title) count++
        if (page.description) count++
        if (page.textContent) count++

        // Count arrays
        if (Array.isArray(page.technologies)) count += page.technologies.length
        if (Array.isArray(page.links)) count += page.links.length
        if (Array.isArray(page.discoveredLinks)) count += page.discoveredLinks.length
        if (Array.isArray(page.apiEndpoints)) count += page.apiEndpoints.length
        if (Array.isArray(page.forms)) count += page.forms.length
        if (Array.isArray(page.images)) count += page.images.length

        // Count objects
        if (page.contactInfo && typeof page.contactInfo === 'object') {
          count += Object.keys(page.contactInfo).length
        }
        if (page.socialLinks && typeof page.socialLinks === 'object') {
          count += Object.keys(page.socialLinks).length
        }
        if (page.structuredData && typeof page.structuredData === 'object') {
          count += Object.keys(page.structuredData).length
        }
      })

      // Also count from extractedData if it exists
      if (aggregated.extractedData && typeof aggregated.extractedData === 'object') {
        Object.values(aggregated.extractedData).forEach(value => {
          if (Array.isArray(value)) {
            count += value.length
          }
        })
      }

      this.logger.breadcrumb('DATA_POINTS_COUNT', 'Counted data points', {
        totalCount: count,
        pageCount: Object.keys(aggregated.pages || {}).length
      })
    } catch (error) {
      this.logger.breadcrumb('COUNT_DATA_POINTS', 'Error counting data points', { error })
      return 0
    }

    return count
  }

  /**
   * Count data points in extracted data (legacy method for backward compatibility)
   * @param extractedData - The extracted data object
   * @returns Total count of data points
   */
  private countDataPoints(extractedData: any): number {
    // Handle null or undefined extractedData
    if (!extractedData || typeof extractedData !== 'object') {
      return 0
    }

    let count = 0

    try {
      Object.values(extractedData).forEach(value => {
        if (Array.isArray(value)) {
          count += value.length
        }
      })
    } catch (error) {
      this.logger.breadcrumb('COUNT_DATA_POINTS', 'Error counting data points', { error })
      return 0
    }

    return count
  }

  /**
   * Normalize URL for consistent comparison
   * @param url - The URL to normalize
   * @returns Normalized URL or empty string
   */
  // REMOVED: normalizeUrl method - using ContentDeduplicator.normalizeUrl() instead (DRY principle)

  /**
   * Merge arrays with deduplication
   * @param arr1 - First array
   * @param arr2 - Second array
   * @returns Merged array with unique values
   */
  private mergeArrays(arr1: any[], arr2: any[]): any[] {
    if (!arr1 && !arr2) return []
    if (!arr1) return [...new Set(arr2)]
    if (!arr2) return [...new Set(arr1)]
    
    // Merge and deduplicate
    const merged = [...arr1, ...arr2]
    
    // For simple types, use Set
    if (merged.every(item => typeof item !== 'object')) {
      return [...new Set(merged)]
    }
    
    // For objects, deduplicate by JSON string
    const seen = new Set()
    return merged.filter(item => {
      const key = JSON.stringify(item)
      if (seen.has(key)) return false  // seen is still a Set for efficient lookups
      seen.add(key)
      return true
    })
  }

  /**
   * Create empty aggregated data structure
   * @returns Empty aggregated data
   */
  private createEmptyAggregatedData(): AggregatedData {
    return {
      pages: {},  // Plain object - no Map
      stats: {
        totalPages: 0,
        totalLinks: 0,
        uniqueTechnologies: 0,
        phaseCounts: {},
        dataPoints: 0
      },
      extractedData: {
        titles: [],
        descriptions: [],
        technologies: [],
        emails: [],
        phones: [],
        addresses: [],
        socialLinks: [],
        people: [],
        products: [],
        services: [],
        pricing: []
      }
    }
  }

  /**
   * Convert aggregated data for database storage
   * @param aggregated - The aggregated data with Map
   * @returns Data with plain object for JSONB storage
   */
  private convertForDatabase(aggregated: AggregatedData): AggregatedData {
    // If pages is already a plain object, return as-is
    if (!(aggregated.pages instanceof Map)) {
      return aggregated
    }

    // Convert Map to plain object
    const pagesObject: Record<string, PageData> = {}
    aggregated.pages.forEach((value, key) => {
      pagesObject[key] = value
    })

    this.logger.breadcrumb('CONVERT_DB', 'Converted Map to object for database', {
      pageCount: Object.keys(pagesObject).length
    })

    return {
      ...aggregated,
      pages: pagesObject
    }
  }

  /**
   * Convert aggregated data to format expected by UI
   * @param aggregated - The aggregated data
   * @returns UI-friendly format
   */
  formatForUI(aggregated: AggregatedData): any {
    const formatStartTime = Date.now()
    
    // Initialize stats if not present to prevent crashes
    if (!aggregated.stats) {
      aggregated.stats = {
        totalPages: 0,
        totalLinks: 0,
        uniqueTechnologies: 0,
        phaseCounts: {},
        dataPoints: 0
      }
      
      // Try to calculate stats from available data
      if (aggregated.pages) {
        this.calculateStatistics(aggregated)
      }
    }
    
    // Handle both Map and plain object with null check to prevent crashes
    const pageCount = aggregated.pages instanceof Map 
      ? aggregated.pages.size 
      : aggregated.pages ? Object.keys(aggregated.pages).length : 0
    
    this.logger.breadcrumb('FORMAT_UI', 'Formatting data for UI', {
      pageCount,
      dataPoints: aggregated.stats.dataPoints
    })
    
    // Convert to array for UI with null check
    const pages = aggregated.pages instanceof Map
      ? Array.from(aggregated.pages.values())
      : aggregated.pages ? Object.values(aggregated.pages) : []
    
    const formatted = {
      pages,
      stats: aggregated.stats,
      extractedData: aggregated.extractedData || {},
      summary: {
        totalPages: aggregated.stats.totalPages,
        totalLinks: aggregated.stats.totalLinks,
        dataPoints: aggregated.stats.dataPoints,
        technologies: aggregated.stats.uniqueTechnologies,
        phases: Object.keys(aggregated.stats.phaseCounts).length
      }
    }
    
    const formatDuration = Date.now() - formatStartTime
    
    this.logger.breadcrumb('FORMAT_UI', 'UI formatting complete', {
      pageCount: pages.length,
      duration: formatDuration
    })
    
    this.logger.timing('ui_format_duration', {
      duration: formatDuration,
      pagesFormatted: pages.length
    })
    
    return formatted
  }

  /**
   * Get cached result if available
   * @param sessionId - The session ID
   * @param executionId - The execution ID
   * @returns Cached data or null
   */
  async getCachedResult(sessionId: string, executionId: string): Promise<any | null> {
    // This would query the scraping_results_cache table
    // For now, returning null to indicate no cache
    // Will be implemented when integrating with database
    return null
  }

  /**
   * Cache aggregated result
   * @param sessionId - The session ID
   * @param executionId - The execution ID
   * @param data - The data to cache
   * @param ttlMs - Time to live in milliseconds
   */
  async cacheResult(
    sessionId: string,
    executionId: string,
    data: any,
    ttlMs: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<void> {
    // This would insert into scraping_results_cache table
    // Will be implemented when integrating with database
  }

  /**
   * Calculate data points from page results
   * Counts various extracted data elements from pages
   *
   * This belongs in DataAggregator as part of data analysis responsibilities
   * Following SOLID principles - Single Responsibility for data operations
   *
   * @param pages - Array of PageResult objects from scraping
   * @returns Total count of data points extracted
   */
  calculateDataPointsFromPages(pages: PageResult[]): number {
    let dataPoints = 0

    // Count data points from each page's extracted data
    pages.forEach(page => {
      if (page.extractedData) {
        // Count basic text fields
        if (page.extractedData.title) dataPoints++
        if (page.extractedData.description) dataPoints++
        if (page.extractedData.content) dataPoints++

        // Count contact information items
        if (page.extractedData.contactInfo) {
          const contact = page.extractedData.contactInfo
          dataPoints += (contact.emails?.length || 0)
          dataPoints += (contact.phones?.length || 0)
          dataPoints += (contact.addresses?.length || 0)
        }

        // Count social media links
        if (page.extractedData.socialLinks && Array.isArray(page.extractedData.socialLinks)) {
          dataPoints += page.extractedData.socialLinks.length
        }

        // Count structured data properties
        if (page.extractedData.structuredData && typeof page.extractedData.structuredData === 'object') {
          dataPoints += Object.keys(page.extractedData.structuredData).length
        }

        // Count discovered links
        if (page.extractedData.links && Array.isArray(page.extractedData.links)) {
          dataPoints += page.extractedData.links.length
        }
      }
    })

    permanentLogger.debug('DATA_AGGREGATOR', 'Calculated data points from pages', {
      pageCount: pages.length,
      dataPoints
    })

    return dataPoints
  }
}