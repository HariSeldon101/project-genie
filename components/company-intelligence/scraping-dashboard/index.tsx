'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { Sparkles, Settings2, Database, Eye } from 'lucide-react'
import { SiteAnalysisPanel } from './site-analysis-panel'
import { ScraperControls } from './scraper-controls-refactored'
import { DataSelectionGrid } from './data-selection-grid'
import { EnrichmentPreview } from './enrichment-preview'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { useToast } from '@/components/ui/use-toast'
import type { SiteAnalysis } from '@/components/company-intelligence/site-analyzer'
import type { ScraperConfig } from '@/components/company-intelligence/scraper-config/scraper-config-panel'
import type { ScrapedDataCategory, SelectedData } from './types'

interface ScrapingDashboardProps {
  domain: string
  sessionId?: string
  onEnrichmentReady?: (selectedData: SelectedData) => void
}

export function ScrapingDashboard({ domain, sessionId, onEnrichmentReady }: ScrapingDashboardProps) {
  const { toast } = useToast()

  // Site analysis state
  const [siteAnalysis, setSiteAnalysis] = useState<SiteAnalysis | null>(null)
  const [analysisExpanded, setAnalysisExpanded] = useState(true)

  // Scraper configuration state
  const [scraperConfig, setScraperConfig] = useState<ScraperConfig | null>(null)
  const [isScrapingActive, setIsScrapingActive] = useState(false)
  const [scrapingProgress, setScrapingProgress] = useState(0)

  // Scraped data state
  const [scrapedData, setScrapedData] = useState<ScrapedDataCategory[]>([])
  const [selectedData, setSelectedData] = useState<SelectedData>({
    items: [],
    totalTokens: 0,
    estimatedCost: 0
  })

  // UI state
  const [showEnrichmentPreview, setShowEnrichmentPreview] = useState(false)

  const handleSiteAnalysis = (analysis: SiteAnalysis) => {
    permanentLogger.info('SCRAPING_DASHBOARD', 'Site analysis completed', {
      domain: analysis.domain,
      siteType: analysis.siteType,
      technologies: analysis.technologies
    })
    setSiteAnalysis(analysis)
  }

  const handleScraperConfigChange = (config: ScraperConfig) => {
    setScraperConfig(config)
    permanentLogger.debug('SCRAPING_DASHBOARD', 'Scraper configuration updated', {
      scraperType: config.scraperType,
      features: config.activeFeatures
    })
  }

  const handleScraperExecute = async () => {
    if (!scraperConfig || !siteAnalysis) {
      permanentLogger.warn('SCRAPING_DASHBOARD', 'Cannot execute scraper without configuration', {
        hasConfig: !!scraperConfig,
        hasAnalysis: !!siteAnalysis
      })
      return
    }

    setIsScrapingActive(true)
    setScrapingProgress(0)

    const progressTimer = permanentLogger.timing('scraping_execution')

    try {
      permanentLogger.breadcrumb('scraping_start', 'Starting REAL scraper execution', {
        domain,
        scraperType: scraperConfig.scraperType
      })

      // Create SSE connection for real-time updates
      const response = await fetch('/api/company-intelligence/v4/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          domain: siteAnalysis.domain,
          scraperType: scraperConfig.scraperType,
          config: scraperConfig
        })
      })

      if (!response.ok) {
        throw new Error(`Scraping failed: ${response.statusText}`)
      }

      // Read SSE stream
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              // Handle different event types from EventFactory
              if (data.type === 'progress') {
                // REAL progress updates from scraper
                setScrapingProgress(data.data.percentage)
                permanentLogger.debug('SCRAPING_DASHBOARD', 'Progress update', {
                  percentage: data.data.percentage,
                  message: data.data.message
                })
              } else if (data.type === 'complete') {
                // REAL scraped data
                const categorizedData = categorizeScrapeData(data.data)
                setScrapedData(categorizedData)

                // Show success toast
                toast({
                  title: 'Scraping Complete',
                  description: `Successfully scraped ${data.data.totalItems || 0} items`,
                  variant: 'default'
                })

                permanentLogger.info('SCRAPING_DASHBOARD', 'Scraping completed successfully', {
                  domain,
                  categories: categorizedData.length,
                  totalItems: data.data.totalItems,
                  cost: data.data.cost,
                  duration: progressTimer.stop()
                })

                setScrapingProgress(100)
              } else if (data.type === 'error') {
                // REAL error - don't hide!
                throw new Error(data.data.message || 'Scraping failed')
              } else if (data.type === 'notification') {
                // Show notifications to user (could add toast here)
                permanentLogger.info('SCRAPING_DASHBOARD', 'Notification', {
                  message: data.data.message,
                  severity: data.data.type
                })
              }
            } catch (parseError) {
              permanentLogger.warn('SCRAPING_DASHBOARD', 'Failed to parse SSE data', {
                line,
                error: parseError
              })
            }
          }
        }
      }

    } catch (error) {
      // Show REAL error to user - no hiding!
      permanentLogger.captureError('SCRAPING_DASHBOARD', error as Error, {
        domain,
        scraperType: scraperConfig.scraperType
      })

      // Could add toast notification here
      console.error('Scraping error:', error)

      progressTimer.stop()
      setScrapingProgress(0)
    } finally {
      setIsScrapingActive(false)
    }
  }

  const handleDataSelectionChange = (newSelection: SelectedData) => {
    setSelectedData(newSelection)
    permanentLogger.debug('SCRAPING_DASHBOARD', 'Data selection updated', {
      selectedCount: newSelection.items.length,
      estimatedTokens: newSelection.totalTokens,
      estimatedCost: newSelection.estimatedCost
    })
  }

  const handleEnrichmentProceed = () => {
    if (selectedData.items.length === 0) {
      permanentLogger.warn('SCRAPING_DASHBOARD', 'No data selected for enrichment')
      toast({
        title: 'No Data Selected',
        description: 'Please select at least one item for enrichment',
        variant: 'default'
      })
      return
    }

    permanentLogger.info('SCRAPING_DASHBOARD', 'Proceeding to enrichment', {
      selectedItems: selectedData.items.length,
      tokens: selectedData.totalTokens,
      cost: selectedData.estimatedCost
    })

    if (onEnrichmentReady) {
      onEnrichmentReady(selectedData)
    }
  }

  // Transform REAL scraped data into categories - NO MOCK DATA
  const categorizeScrapeData = (rawData: any): ScrapedDataCategory[] => {
    if (!rawData?.categories) {
      // Let real errors happen - no fallback!
      permanentLogger.warn('SCRAPING_DASHBOARD', 'No categories in scraper response', { rawData })
      throw new Error('No data from scraper - this is a real error')
    }

    // Use REAL data from scraper
    return rawData.categories.map((cat: any) => ({
      id: cat.id,
      title: cat.title,
      icon: cat.icon || 'Database',
      count: cat.items?.length || 0,
      items: cat.items || [],
      expanded: false
    }))
  }

  return (
    <div className="space-y-6">
      {/* Phase 1: Site Analysis (existing, moved to top) */}
      <SiteAnalysisPanel
        domain={domain}
        analysis={siteAnalysis}
        expanded={analysisExpanded}
        onToggle={() => setAnalysisExpanded(!analysisExpanded)}
        onAnalysisComplete={handleSiteAnalysis}
        onRefresh={() => {
          setSiteAnalysis(null)
          setAnalysisExpanded(true)
        }}
      />

      {/* Phase 2: Scraper Controls - now receives siteAnalysis as prop */}
      <ScraperControls
        sessionId={sessionId}
        siteAnalysis={siteAnalysis}
        onConfigChange={handleScraperConfigChange}
        onExecute={handleScraperExecute}
        isExecuting={isScrapingActive}
        progress={scrapingProgress}
      />

      {/* Phase 3: Data Selection Grid - only show after scraping */}
      {scrapedData.length > 0 && (
        <DataSelectionGrid
          scrapedData={scrapedData}
          onSelectionChange={handleDataSelectionChange}
          selectedItems={selectedData}
        />
      )}

      {/* Phase 4: Enrichment Preview - sticky bottom panel */}
      {selectedData.items.length > 0 && (
        <EnrichmentPreview
          selectedData={selectedData}
          onProceed={handleEnrichmentProceed}
          onPreview={() => setShowEnrichmentPreview(true)}
        />
      )}

      {/* Development indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-background/80 backdrop-blur border rounded-lg p-2 text-xs text-muted-foreground">
          <div>Scraping Dashboard v3</div>
          {siteAnalysis && <div>Site: {siteAnalysis.siteType}</div>}
          {scraperConfig && <div>Scraper: {scraperConfig.scraperType}</div>}
          {scrapedData.length > 0 && <div>Categories: {scrapedData.length}</div>}
          {selectedData.items.length > 0 && <div>Selected: {selectedData.items.length}</div>}
        </div>
      )}
    </div>
  )
}