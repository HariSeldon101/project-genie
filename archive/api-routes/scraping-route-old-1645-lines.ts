import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPhaseOrchestrator } from '@/lib/company-intelligence/core/phase-orchestrator'
import { getStrategyManager } from '@/lib/company-intelligence/scrapers'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { PhaseResult, ResearchPhase } from '@/lib/company-intelligence/types'
import { ContentValidator } from '@/lib/company-intelligence/scrapers/validators/content-validator'
import { BrowserPool } from '@/lib/company-intelligence/scrapers/browser/browser-pool'
import { BrowserContext } from 'playwright'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface ScrapingRequest {
  sessionId: string
  domain: string
  pages?: string[] // Optional list of specific pages to scrape
  options?: {
    maxPages?: number
    timeout?: number
    mode?: 'initial' | 'dynamic' | 'incremental' // Scraping mode
    stream?: boolean // Enable SSE streaming for progress updates
    enhancementStrategy?: string // Which scraper to use for enhancement
    skipPhases?: number[] // Skip specific phases (e.g., [2,3] to only run phase 1)
  }
  previousData?: any // Data from previous scraping pass for enhancement
}

/**
 * Helper function to create and manage browser context
 * DRY principle - single source for browser context creation
 */
async function getBrowserContext() {
  const browserPool = BrowserPool.getInstance()
  const browser = await browserPool.getBrowser()
  return await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  })
}

export async function POST(request: NextRequest) {
  let sessionId = ''
  // Initialize supabase client at the start to avoid undefined errors
  const supabase = await createClient()
  
  try {
    permanentLogger.info('=== STARTING SCRAPING PHASE ===', { category: 'SCRAPING_PHASE', ...{
      timestamp: new Date( }).toISOString(),
      message: 'NO LLM CALLS WILL BE MADE IN THIS PHASE'
    })
    
    const body: ScrapingRequest = await request.json()
    sessionId = body.sessionId
    const { domain, pages, options, previousData } = body
    
    // Check if streaming is requested
    const shouldStream = options?.stream === true
    
    permanentLogger.info('Request received', { category: 'SCRAPING_PHASE', ...{
      sessionId,
      domain,
      pageCount: pages?.length || 'auto-discover',
      selectedPages: pages?.slice(0, 5 }) || 'none', // Log first 5 URLs
      options: options || 'default',
      mode: options?.mode || 'standard',
      hasPreviousData: !!previousData
    })
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }
    
    // Handle different scraping modes
    if (options?.mode === 'dynamic') {
      // Dynamic mode: Use Playwright for all pages (user requested full browser scraping)
      permanentLogger.info('Dynamic mode activated', { category: 'SCRAPING_PHASE', sessionId,
        domain,
        pageCount: pages?.length || 0,
        reason: 'User requested dynamic scraping after initial results' })
      
      const strategyManager = getStrategyManager()
      const browserContext = await getBrowserContext()
      
      try {
        const dynamicResults = []
        
        // Process pages with Playwright
        for (const pageUrl of pages || [`https://${domain}`]) {
          const pageData = await strategyManager.scrape(
            pageUrl,
            browserContext,
            { 
              siteType: 'force-dynamic',
              forceStrategy: 'dynamic'
            }
          )
          dynamicResults.push(pageData)
        }
        
        // Merge with previous data if available
        if (previousData && previousData.pages) {
          const { ScrapingMerger } = await import('@/lib/company-intelligence/scrapers/mergers/scraping-merger')
          const merger = new ScrapingMerger({
            conflictResolution: 'highest_quality',
            deduplicateContent: true
          })
          
          // Merge page by page
          const mergedPages = dynamicResults.map((dynamicPage, idx) => {
            const originalPage = previousData.pages[idx]
            if (originalPage) {
              return merger.mergeSinglePage(originalPage, dynamicPage)
            }
            return dynamicPage
          })
          
          return NextResponse.json({
            success: true,
            data: {
              ...previousData,
              pages: mergedPages,
              mode: 'dynamic-enhanced',
              phases: ['initial', 'dynamic']
            }
          })
        }
        
        return NextResponse.json({
          success: true,
          data: {
            pages: dynamicResults,
            mode: 'dynamic',
            phases: ['dynamic']
          }
        })
      } finally {
        await browserContext.close()
      }
    }
    
    if (options?.mode === 'incremental') {
      // Incremental mode: Scrape additional discovered pages
      permanentLogger.info('Incremental mode activated', { category: 'SCRAPING_PHASE', sessionId,
        domain,
        newPages: pages?.length || 0,
        reason: 'User selected discovered links to scrape' })
      
      const strategyManager = getStrategyManager()
      const incrementalResults = []
      
      // Scrape new pages with appropriate strategy
      for (const pageUrl of pages || []) {
        const pageData = await strategyManager.scrape(pageUrl, undefined, siteMetadata)
        incrementalResults.push(pageData)
      }
      
      // Merge with previous data
      if (previousData && previousData.pages) {
        return NextResponse.json({
          success: true,
          data: {
            ...previousData,
            pages: [...previousData.pages, ...incrementalResults],
            discoveredLinks: previousData.discoveredLinks || [],
            mode: 'incremental',
            phases: [...(previousData.phases || ['initial']), 'incremental']
          }
        })
      }
      
      return NextResponse.json({
        success: true,
        data: {
          pages: incrementalResults,
          mode: 'incremental',
          phases: ['incremental']
        }
      })
    }
    
    // Get orchestrator instance (for future use if needed)
    const orchestrator = getPhaseOrchestrator()
    
    // Check if session exists in database and get site analysis data
    // Use the already initialized supabase client
    const { data: existingSession } = await supabase
      .from('research_sessions')
      .select('id, site_analysis_data')
      .eq('id', sessionId)
      .single()
    
    // Create session if it doesn't exist
    if (!existingSession) {
      await supabase
        .from('research_sessions')
        .insert({
          id: sessionId,
          domain,
          session_name: `Research: ${domain}`,
          stage: 'scraping',
          status: 'active',
          created_at: new Date().toISOString()
        })
    }
    
    // Initialize and get scraper instance
    permanentLogger.info('SCRAPING_PHASE', 'Initializing strategy-based scraper', { requestedMode: options?.mode || 'auto-detect'})
    
    const strategyManager = getStrategyManager()
    
    // NOTE: Browser context will only be created if needed by the strategy
    // StaticStrategy uses Cheerio + Axios and doesn't need a browser
    permanentLogger.info('Strategy manager initialized', { category: 'SCRAPING_PHASE', strategies: ['static', 'dynamic', 'spa'],
      features: ['social-media-extraction', 'auto-strategy-detection', 'cheerio-for-static'],
      domain,
      pageCount: pages?.length || 'all',
      note: 'Browser context only created when needed' })
    
    // Extract site metadata from session
    const siteMetadata = existingSession?.site_analysis_data || null
    
    if (siteMetadata) {
      permanentLogger.info('Site analysis metadata available', { category: 'SCRAPING_PHASE', siteType: siteMetadata.siteType,
        hasOrgName: !!siteMetadata.metadata?.organizationName,
        hasSchema: !!siteMetadata.metadata?.schemaType,
        language: siteMetadata.metadata?.language })
    }
    
    // Prepare scraping options with metadata - OPTIMIZED FOR SPEED
    const scrapingOptions = {
      maxPages: options?.maxPages || (pages ? pages.length : 500), // NO LIMIT if pages provided
      timeout: options?.timeout || 60000,
      followLinks: !pages, // Only follow links if specific pages not provided
      respectRobotsTxt: true,
      delayBetweenRequests: 500, // REDUCED: 500ms delay for same-domain requests
      urls: pages || undefined,
      parallelBatchSize: 5, // NEW: Process 5 pages simultaneously
      // Pass metadata to enhance scraping
      siteMetadata: siteMetadata ? {
        organizationName: siteMetadata.metadata?.organizationName || siteMetadata.metadata?.ogSiteName,
        language: siteMetadata.metadata?.language,
        charset: siteMetadata.metadata?.charset,
        schemaType: siteMetadata.metadata?.schemaType,
        socialHandles: {
          twitter: siteMetadata.metadata?.twitterSite,
          creator: siteMetadata.metadata?.twitterCreator
        },
        brandAssets: {
          favicon: siteMetadata.metadata?.favicon,
          ogImage: siteMetadata.metadata?.ogImage,
          themeColor: siteMetadata.metadata?.themeColor
        },
        siteType: siteMetadata.siteType,
        technologies: siteMetadata.technologies
      } : undefined
    }
    
    permanentLogger.info('Scraping options configured', { category: 'SCRAPING_PHASE', maxPages: scrapingOptions.maxPages,
      timeout: scrapingOptions.timeout,
      followLinks: scrapingOptions.followLinks,
      urlsProvided: !!pages,
      urlCount: pages?.length || 0 })
    
    // Execute scraping - NO LLM CALLS HERE
    permanentLogger.info('🕷️ STARTING WEB SCRAPING PROCESS', { category: 'SCRAPING_PHASE', ...{
      scraper: 'StrategyManager',
      targetDomain: domain,
      startTime: new Date( }).toISOString(),
      llmCalls: 0 // Explicitly log that no LLM calls are made
    })
    
    const startTime = Date.now()
    
    // Log each page being scraped (if specific pages provided)
    if (pages && pages.length > 0) {
      permanentLogger.info('Scraping specific pages', { category: 'SCRAPING_PHASE', ...{
        totalPages: pages.length,
        pages: pages.length <= 10 ? pages : [...pages.slice(0, 10 }), `... and ${pages.length - 10} more`]
      })
    }
    
    // Build proper URL from domain if needed
    const targetUrl = domain.startsWith('http') ? domain : `https://${domain}`
    
    let scrapedData: any
    
    // Setup streaming if requested
    if (shouldStream && pages && pages.length > 0) {
      // Import strategy grouping helper
      const { groupPagesByStrategy, getStrategyForTechnology } = await import('@/lib/company-intelligence/scrapers/strategies/technology-strategy-map')
      
      // Group pages by recommended strategy
      const pageGroups = groupPagesByStrategy(pages, siteMetadata)
      
      // Determine the primary strategy for this site
      const technologyMapping = siteMetadata?.siteType 
        ? getStrategyForTechnology(siteMetadata.siteType)
        : { strategy: 'dynamic' }
      const primaryStrategy = technologyMapping.strategy
      
      permanentLogger.info('Pages grouped by strategy', { category: 'SCRAPING_PHASE', technology: siteMetadata?.siteType,
        staticPages: pageGroups.static.length,
        dynamicPages: pageGroups.dynamic.length,
        spaPages: pageGroups.spa.length,
        totalPages: pages.length,
        estimatedSpeedup: pageGroups.static.length > 0 ? '10x for static pages' : 'normal' })
      
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()
      
      // Helper to send SSE messages with strategy information
      const sendProgress = async (data: any) => {
        // Add technology and strategy info to all progress updates
        const enrichedData = {
          ...data,
          technology: siteMetadata?.siteType || 'unknown',
          strategyInfo: {
            detected: siteMetadata?.siteType,
            isStatic: siteMetadata?.isStatic,
            requiresJS: siteMetadata?.requiresJS
          }
        }
        
        permanentLogger.info('Sending progress to UI', { category: 'STREAMING_UI_UPDATE', type: data.type,
          phase: data.phase,
          technology: siteMetadata?.siteType,
          currentStrategy: data.currentStrategy })
        
        const message = `data: ${JSON.stringify(enrichedData)}\n\n`
        await writer.write(encoder.encode(message))
      }
      
      // Start streaming response immediately
      const response = new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
      
      // Execute scraping with controlled phases based on mode
      // Note: Browser context will be closed inside executeThreePhaseScraping
      executeThreePhaseScraping({
        pages,
        strategyManager,
        scrapingOptions,
        domain,
        targetUrl,
        sessionId,
        supabase,
        sendProgress,
        writer,
        encoder,
        siteMetadata, // Pass site analysis for smart strategy selection
        pageGroups, // Pre-grouped pages by strategy
        primaryStrategy, // Pass the determined primary strategy
        skipPhases: options?.mode === 'initial' ? [2, 3] : options?.skipPhases // Skip validation and enhancement for initial mode
      })
      
      // IMPORTANT: Don't close browser context here as it's used in background
      // Browser context will be managed by strategies themselves
      
      return response
    }
    
    // Non-streaming path continues as before
    if (pages && pages.length > 0) {
      // Determine the primary strategy for this site
      const { getStrategyForTechnology } = await import('@/lib/company-intelligence/scrapers/strategies/technology-strategy-map')
      const technologyMapping = siteMetadata?.siteType 
        ? getStrategyForTechnology(siteMetadata.siteType)
        : { strategy: 'dynamic' }
      const primaryStrategy = technologyMapping.strategy
      
      permanentLogger.info('🚀 PARALLEL BATCH SCRAPING INITIATED', { category: 'SCRAPING_PHASE', ...{
        totalPages: pages.length,
        batchSize: scrapingOptions.parallelBatchSize || 5,
        estimatedTime: `${Math.ceil(pages.length / 5 }) * 3}s`,
        scraperType: primaryStrategy,
        technology: siteMetadata?.siteType
      })
      
      const allPages = []
      const batchSize = scrapingOptions.parallelBatchSize || 5
      
      // Process pages in parallel batches
      for (let batchStart = 0; batchStart < pages.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, pages.length)
        const batch = pages.slice(batchStart, batchEnd)
        const batchNumber = Math.floor(batchStart / batchSize) + 1
        const totalBatches = Math.ceil(pages.length / batchSize)
        
        permanentLogger.log('SCRAPING_PHASE', `📦 BATCH ${batchNumber}/${totalBatches} STARTING`, {
          batchNumber,
          totalBatches,
          batchSize: batch.length,
          urls: batch,
          progress: `${Math.round((batchStart / pages.length) * 100)}%`
        })
        
        // Scrape batch in parallel
        const batchPromises = batch.map(async (pageUrl, indexInBatch) => {
          const globalIndex = batchStart + indexInBatch + 1
          
          try {
            permanentLogger.log('SCRAPING_PHASE', `🕷️ Scraping page ${globalIndex}/${pages.length}`, {
              url: pageUrl,
              batch: batchNumber,
              parallelIndex: indexInBatch + 1
            })
            
            // Pass site analysis data to enable smart strategy selection
            // StaticStrategy will use Cheerio for 10x speed on static sites
            const pageData = await strategyManager.scrape(pageUrl, undefined, siteMetadata)
            
            permanentLogger.log('SCRAPING_PHASE', `✅ Page ${globalIndex} complete`, {
              url: pageUrl,
              contentLength: pageData.content?.length || 0,
              hasData: !!pageData,
              strategy: pageData.strategy || 'unknown',
              technology: siteMetadata?.siteType || 'unknown',
              usedCheerio: pageData.strategy === 'static'
            })
            
            return pageData
          } catch (error) {
            permanentLogger.error('SCRAPING_PHASE', `❌ Failed to scrape page ${globalIndex}`, {
              url: pageUrl,
              batch: batchNumber,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            return null // Return null for failed pages (will be enhanced later)
          }
        })
        
        // Wait for batch to complete
        const batchStartTime = Date.now()
        const batchResults = await Promise.all(batchPromises)
        const batchDuration = Date.now() - batchStartTime
        
        permanentLogger.log('SCRAPING_PHASE', `✅ BATCH ${batchNumber} COMPLETE`, {
          batchNumber,
          duration: `${batchDuration}ms`,
          successCount: batchResults.filter((r: any) => r !== null).length,
          failureCount: batchResults.filter((r: any) => r === null).length,
          averageTimePerPage: Math.round(batchDuration / batch.length)
        })
        
        // Add successful results
        const validResults = batchResults.filter((r: any) => r !== null)
        if (validResults.length > 0) {
          allPages.push(...validResults)
        }
        
        // Add delay between batches (not between individual pages in parallel)
        if (batchEnd < pages.length && scrapingOptions.delayBetweenRequests) {
          permanentLogger.info('SCRAPING_PHASE', 'Inter-batch delay', { delay: scrapingOptions.delayBetweenRequests})
          await new Promise(resolve => setTimeout(resolve, scrapingOptions.delayBetweenRequests))
        }
      }
      
      // PHASE 2: CONTENT VALIDATION
      permanentLogger.info('🔍 PHASE 2: CONTENT VALIDATION', { category: 'SCRAPING_PHASE', pagesScraped: allPages.length,
        scraperUsed: 'strategy-manager' })
      
      const validator = new ContentValidator()
      const { validPages, needsEnhancement, stats } = validator.validateBatch(allPages)
      
      permanentLogger.info('📊 Validation Results', { category: 'SCRAPING_PHASE', ...{
        validPages: validPages.length,
        needsEnhancement: needsEnhancement.length,
        averageScore: stats.averageScore.toFixed(2 }),
        enhancementPercentage: `${Math.round((needsEnhancement.length / allPages.length) * 100)}%`
      })
      
      // PHASE 3: SELECTIVE PLAYWRIGHT ENHANCEMENT
      if (needsEnhancement.length > 0) {
        permanentLogger.info('🎭 PHASE 3: SELECTIVE PLAYWRIGHT ENHANCEMENT', { category: 'SCRAPING_PHASE', pagesToEnhance: needsEnhancement.length,
          reasons: needsEnhancement.map(e => ({ url: e.page.url, reason: e.reason }))
        })
        
        // Use strategy manager with dynamic strategy for enhancement
        // Dynamic strategy is similar to Playwright for JavaScript-heavy pages
        if (strategyManager) {
          const enhancementStartTime = Date.now()
          
          // Process enhancement pages in smaller batches (Playwright is heavier)
          const enhancementBatchSize = 2
          const enhancedPages = []
          
          for (let i = 0; i < needsEnhancement.length; i += enhancementBatchSize) {
            const batch = needsEnhancement.slice(i, i + enhancementBatchSize)
            const batchNumber = Math.floor(i / enhancementBatchSize) + 1
            
            permanentLogger.log('SCRAPING_PHASE', `🎭 Enhancement Batch ${batchNumber}`, {
              urls: batch.map(e => e.page.url)
            })
            
            const enhancementPromises = batch.map(async ({ page, reason }) => {
              try {
                permanentLogger.info('🔄 Enhancing with Playwright', { category: 'SCRAPING_PHASE', url: page.url,
                  reason })
                
                // Use dynamic strategy for JavaScript-heavy pages
                // Pass undefined for context - strategy will create its own if needed
                const enhancedData = await strategyManager.scrape(page.url, undefined, siteMetadata)
                
                permanentLogger.info('✅ Enhancement successful', { category: 'SCRAPING_PHASE', ...{
                  url: page.url,
                  contentBefore: page.content?.length || 0,
                  contentAfter: enhancedData.content?.length || 0,
                  improvement: `${Math.round(((enhancedData.content?.length || 0 }) / (page.content?.length || 1)) * 100)}%`
                })
                
                return enhancedData
              } catch (error) {
                permanentLogger.error('SCRAPING_PHASE', '❌ Enhancement failed', {
                  url: page.url,
                  error: error instanceof Error ? error.message : 'Unknown error'
                })
                return page // Return original if enhancement fails
              }
            })
            
            const batchResults = await Promise.all(enhancementPromises)
            if (Array.isArray(batchResults) && batchResults.length > 0) {
              enhancedPages.push(...batchResults)
            }
            
            // Small delay between enhancement batches
            if (i + enhancementBatchSize < needsEnhancement.length) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
          
          // Replace failed pages with enhanced versions
          const finalPages = [...validPages]
          for (const enhanced of enhancedPages) {
            const originalIndex = allPages.findIndex((p: any) => p?.url === enhanced.url)
            if (originalIndex !== -1) {
              finalPages.splice(originalIndex, 0, enhanced)
            } else {
              finalPages.push(enhanced)
            }
          }
          
          const enhancementDuration = Date.now() - enhancementStartTime
          
          permanentLogger.info('✅ ENHANCEMENT COMPLETE', { category: 'SCRAPING_PHASE', ...{
            duration: `${enhancementDuration}ms`,
            pagesEnhanced: enhancedPages.length,
            finalPageCount: finalPages.length,
            strategy: 'HYBRID (Cheerio + Playwright })'
          })
          
          // Update allPages with finalPages
          allPages.length = 0
          allPages.push(...finalPages)
        }
      }
      
      // Aggregate data from all pages to root level
      const aggregatedBrandAssets: any = {
        logo: null,
        favicon: null,
        colors: [],
        fonts: [],
        gradients: []
      }
      
      const aggregatedContactInfo: any = {
        emails: [],
        phones: [],
        addresses: [],
        contactPageUrl: null
      }
      
      const aggregatedSocialLinks: any[] = []
      const aggregatedTeamMembers: any[] = []
      const aggregatedTestimonials: any[] = []
      const aggregatedProducts: any[] = []
      const allImages: string[] = []
      
      // Aggregate data from all pages (prioritize homepage for brand assets)
      // Store homepage colors separately for prioritization
      let homepageColors: string[] = []
      let homepageFonts: string[] = []
      
      for (let i = 0; i < allPages.length; i++) {
        const page = allPages[i]
        const pageUrl = page?.url || ''
        const isHomepage = i === 0 || pageUrl === targetUrl || pageUrl.endsWith('/') || pageUrl === targetUrl + '/'
        
        // Brand assets - prioritize homepage (first page)
        if (page.brandAssets) {
          if (!aggregatedBrandAssets.logo && page.brandAssets.logo) {
            aggregatedBrandAssets.logo = page.brandAssets.logo
          }
          if (!aggregatedBrandAssets.favicon && page.brandAssets.favicon) {
            aggregatedBrandAssets.favicon = page.brandAssets.favicon
          }
          
          // Store homepage colors separately for prioritization
          if (page.brandAssets.colors && Array.isArray(page.brandAssets.colors)) {
            if (isHomepage) {
              homepageColors.push(...page.brandAssets.colors)
            } else {
              aggregatedBrandAssets.colors.push(...page.brandAssets.colors)
            }
          }
          
          // Store homepage fonts separately for prioritization
          if (page.brandAssets.fonts && Array.isArray(page.brandAssets.fonts)) {
            if (isHomepage) {
              homepageFonts.push(...page.brandAssets.fonts)
            } else {
              aggregatedBrandAssets.fonts.push(...page.brandAssets.fonts)
            }
          }
          
          if (page.brandAssets.gradients && Array.isArray(page.brandAssets.gradients)) {
            aggregatedBrandAssets.gradients.push(...page.brandAssets.gradients)
          }
        }
        
        // Contact info
        if (page.contactInfo) {
          if (page.contactInfo.emails && Array.isArray(page.contactInfo.emails)) {
            aggregatedContactInfo.emails.push(...page.contactInfo.emails)
          }
          if (page.contactInfo.phones && Array.isArray(page.contactInfo.phones)) {
            aggregatedContactInfo.phones.push(...page.contactInfo.phones)
          }
          if (page.contactInfo.addresses && Array.isArray(page.contactInfo.addresses)) {
            aggregatedContactInfo.addresses.push(...page.contactInfo.addresses)
          }
          if (!aggregatedContactInfo.contactPageUrl && page.url?.includes('contact')) {
            aggregatedContactInfo.contactPageUrl = page.url
          }
        }
        
        // Social links
        if (page.socialLinks && Array.isArray(page.socialLinks)) {
          aggregatedSocialLinks.push(...page.socialLinks)
        }
        
        // Team members
        if (page.teamMembers && Array.isArray(page.teamMembers)) {
          aggregatedTeamMembers.push(...page.teamMembers)
        }
        
        // Testimonials
        if (page.testimonials && Array.isArray(page.testimonials)) {
          aggregatedTestimonials.push(...page.testimonials)
        }
        
        // Products
        if (page.products && Array.isArray(page.products)) {
          aggregatedProducts.push(...page.products)
        }
        
        // Images - handle new structure
        if (page.images) {
          if (page.images.all && Array.isArray(page.images.all)) {
            allImages.push(...page.images.all)
          } else if (Array.isArray(page.images)) {
            // Backward compatibility
            allImages.push(...page.images)
          }
        }
        
        // Check for brand guidelines documents
        const content = page.content || ''
        const brandGuidelinesPattern = /(?:brand|style|design)\s*(?:guide|guidelines|manual|standards)/gi
        const pdfLinkPattern = /href=["']([^"']*\.pdf[^"']*)/gi
        
        if (brandGuidelinesPattern.test(content)) {
          let match
          while ((match = pdfLinkPattern.exec(content)) !== null) {
            const pdfUrl = match[1]
            if (pdfUrl && !aggregatedBrandAssets.guidelinesUrl) {
              // Make URL absolute if needed
              if (!pdfUrl.startsWith('http')) {
                const baseUrl = new URL(page.url || targetUrl).origin
                aggregatedBrandAssets.guidelinesUrl = new URL(pdfUrl, baseUrl).href
              } else {
                aggregatedBrandAssets.guidelinesUrl = pdfUrl
              }
              permanentLogger.info('Found brand guidelines document', { category: 'SCRAPING_PHASE', url: aggregatedBrandAssets.guidelinesUrl,
                fromPage: page.url })
              break
            }
          }
        }
      }
      
      // Deduplicate aggregated data - PRIORITIZE HOMEPAGE COLORS AND FONTS
      // Combine homepage colors first, then other colors
      const allColors = [...homepageColors, ...aggregatedBrandAssets.colors]
      aggregatedBrandAssets.colors = [...new Set(allColors)].slice(0, 10)
      
      // Combine homepage fonts first, then other fonts
      const allFonts = [...homepageFonts, ...aggregatedBrandAssets.fonts]
      aggregatedBrandAssets.fonts = [...new Set(allFonts)].slice(0, 5)
      aggregatedBrandAssets.gradients = [...new Set(aggregatedBrandAssets.gradients)].slice(0, 5)
      aggregatedContactInfo.emails = [...new Set(aggregatedContactInfo.emails)].slice(0, 10)
      aggregatedContactInfo.phones = [...new Set(aggregatedContactInfo.phones)].slice(0, 5)
      aggregatedContactInfo.addresses = [...new Set(aggregatedContactInfo.addresses)].slice(0, 5)
      
      // Deduplicate social links by platform
      const socialLinksMap = new Map()
      aggregatedSocialLinks.forEach(link => {
        if (link && link.platform && !socialLinksMap.has(link.platform)) {
          socialLinksMap.set(link.platform, link)
        }
      })
      const uniqueSocialLinks = Array.from(socialLinksMap.values())
      
      // Deduplicate team members by name
      const teamMembersMap = new Map()
      aggregatedTeamMembers.forEach(member => {
        if (member && member.name && !teamMembersMap.has(member.name)) {
          teamMembersMap.set(member.name, member)
        }
      })
      const uniqueTeamMembers = Array.from(teamMembersMap.values()).slice(0, 20)
      
      // Deduplicate products by name
      const productsMap = new Map()
      aggregatedProducts.forEach(product => {
        if (product && product.name && !productsMap.has(product.name)) {
          productsMap.set(product.name, product)
        }
      })
      const uniqueProducts = Array.from(productsMap.values()).slice(0, 50)
      
      // Deduplicate testimonials by author
      const testimonialsMap = new Map()
      aggregatedTestimonials.forEach(testimonial => {
        if (testimonial && testimonial.author && !testimonialsMap.has(testimonial.author)) {
          testimonialsMap.set(testimonial.author, testimonial)
        }
      })
      const uniqueTestimonials = Array.from(testimonialsMap.values()).slice(0, 20)
      
      // Deduplicate images
      const uniqueImages = [...new Set(allImages)].slice(0, 100)
      
      permanentLogger.info('Aggregated brand and company data', { category: 'SCRAPING_PHASE', brandAssets: {
          hasLogo: !!aggregatedBrandAssets.logo,
          hasFavicon: !!aggregatedBrandAssets.favicon,
          colorsCount: aggregatedBrandAssets.colors.length,
          fontsCount: aggregatedBrandAssets.fonts.length,
          hasGuidelines: !!aggregatedBrandAssets.guidelinesUrl
        },
        contactInfo: {
          emailsCount: aggregatedContactInfo.emails.length,
          phonesCount: aggregatedContactInfo.phones.length,
          addressesCount: aggregatedContactInfo.addresses.length
        },
        socialLinksCount: uniqueSocialLinks.length,
        teamMembersCount: uniqueTeamMembers.length,
        productsCount: uniqueProducts.length,
        testimonialsCount: uniqueTestimonials.length,
        imagesCount: uniqueImages.length })
      
      // Combine all scraped data with aggregated root-level data
      scrapedData = {
        url: targetUrl,
        pages: allPages,
        // Add aggregated data at root level for StageReviewPanel
        brandAssets: aggregatedBrandAssets,
        contactInfo: aggregatedContactInfo,
        socialLinks: uniqueSocialLinks,
        teamMembers: uniqueTeamMembers,
        testimonials: uniqueTestimonials,
        products: uniqueProducts,
        images: uniqueImages,
        metadata: {
          totalPages: allPages.length,
          scrapedAt: new Date().toISOString(),
          scraperUsed: needsEnhancement.length > 0 ? 'hybrid-enhanced' : primaryStrategy,
          mode: options?.mode || 'static',
          validation: stats,
          enhancementApplied: needsEnhancement.length > 0
        }
      }
    } else {
      // Single page or automatic discovery
      permanentLogger.info('SCRAPING_PHASE', 'Scraping single page or auto-discovering', { url: targetUrl})
      const singlePageData = await strategyManager.scrape(targetUrl, undefined, siteMetadata)
      
      // Extract root-level data from the single page (cast to any for complex data structure)
      const pageDataWithExtras = singlePageData as any
      const brandAssets = pageDataWithExtras.brandAssets || {}
      const contactInfo = pageDataWithExtras.contactInfo || { emails: [], phones: [], addresses: [] }
      const socialLinks = pageDataWithExtras.socialLinks || []
      const teamMembers = pageDataWithExtras.teamMembers || []
      const testimonials = pageDataWithExtras.testimonials || []
      const products = pageDataWithExtras.products || []
      const images = pageDataWithExtras.images || []
      
      // Check for brand guidelines in single page
      if (singlePageData.content) {
        const brandGuidelinesPattern = /(?:brand|style|design)\s*(?:guide|guidelines|manual|standards)/gi
        const pdfLinkPattern = /href=["']([^"']*\.pdf[^"']*)/gi
        
        if (brandGuidelinesPattern.test(singlePageData.content)) {
          let match
          while ((match = pdfLinkPattern.exec(singlePageData.content)) !== null) {
            const pdfUrl = match[1]
            if (pdfUrl && !brandAssets.guidelinesUrl) {
              if (!pdfUrl.startsWith('http')) {
                const baseUrl = new URL(targetUrl).origin
                brandAssets.guidelinesUrl = new URL(pdfUrl, baseUrl).href
              } else {
                brandAssets.guidelinesUrl = pdfUrl
              }
              permanentLogger.info('SCRAPING_PHASE', 'Found brand guidelines document in single page', { url: brandAssets.guidelinesUrl})
              break
            }
          }
        }
      }
      
      // Ensure consistent structure with pages array and root-level data
      scrapedData = {
        url: targetUrl,
        pages: [singlePageData], // Wrap single page in array
        // Add root-level data for StageReviewPanel
        brandAssets,
        contactInfo,
        socialLinks,
        teamMembers,
        testimonials,
        products,
        images,
        metadata: {
          totalPages: 1,
          scrapedAt: new Date().toISOString(),
          scraperUsed: 'strategy-manager',
          mode: options?.mode || 'static'
        }
      }
    }
    const duration = Date.now() - startTime
    
    // Detailed completion logging
    permanentLogger.info('✅ SCRAPING COMPLETE', { category: 'SCRAPING_PHASE', ...{
      duration: `${duration}ms`,
      durationSeconds: (duration / 1000 }).toFixed(2),
      pagesScraped: scrapedData.pages?.length || 0,
      llmCallsMade: 0, // Confirm no LLM calls
      bytesDownloaded: JSON.stringify(scrapedData).length,
      kilobytesDownloaded: (JSON.stringify(scrapedData).length / 1024).toFixed(2),
      avgPageSize: scrapedData.pages?.length ? 
        (JSON.stringify(scrapedData).length / scrapedData.pages.length / 1024).toFixed(2) + ' KB' : 'N/A'
    })
    
    // Log sample of scraped content
    if (scrapedData.pages && scrapedData.pages.length > 0) {
      permanentLogger.info('Sample of scraped pages', { category: 'SCRAPING_PHASE', firstPage: {
          url: scrapedData.pages[0].url,
          title: scrapedData.pages[0].title,
          contentLength: scrapedData.pages[0].content?.length || 0
        },
        totalPages: scrapedData.pages.length })
    }
    
    // Store scraping results in session
    const phaseResult: PhaseResult = {
      phase: ResearchPhase.SCRAPING,
      status: 'success',
      data: scrapedData,
      metrics: {
        duration,
        itemsProcessed: scrapedData.pages?.length || 0,
        llmCalls: 0, // No LLM calls in scraping phase
        cost: 0 // No cost for scraping
      }
    }
    
    // Update session in database with scraped data
    await supabase
      .from('research_sessions')
      .update({
        stage: 'scraping',
        scraped_data: scrapedData,
        pages_scraped: scrapedData.pages?.length || 0,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
    
    return NextResponse.json({
      success: true,
      sessionId,
      phase: 'scraping',
      result: phaseResult,
      message: 'Scraping complete. Review results before proceeding to extraction.',
      llmUsage: {
        calls: 0,
        cost: 0,
        message: 'Scraping phase uses NO LLM calls'
      }
    })
    
  } catch (error) {
    permanentLogger.error('SCRAPING_PHASE', '❌ SCRAPING FAILED', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
      timestamp: new Date().toISOString()
    })
    
    // Update session status to failed
    if (sessionId) {
      const supabaseClient = await createClient()
      await supabaseClient
        .from('research_sessions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    }
    
    return NextResponse.json(
      { 
        error: 'Scraping failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        llmUsage: {
          calls: 0,
          cost: 0,
          message: 'No LLM calls were made'
        }
      },
      { status: 500 }
    )
  } finally {
    // Browser contexts are now managed by individual strategies
    // StaticStrategy uses Cheerio (no browser), DynamicStrategy creates its own context
    permanentLogger.info('SCRAPING_PHASE', 'Scraping route completed - contexts managed by strategies')
  }
}

// Helper function to execute 3-phase scraping with streaming progress
async function executeThreePhaseScraping(params: {
  pages: string[]
  strategyManager: any
  scrapingOptions: any
  domain: string
  targetUrl: string
  sessionId: string
  supabase: any
  sendProgress: (data: any) => Promise<void>
  writer: WritableStreamDefaultWriter
  encoder: TextEncoder
  siteMetadata?: any
  pageGroups?: Record<string, string[]>
  primaryStrategy?: string
  skipPhases?: number[] // Array of phase numbers to skip (1, 2, or 3)
}) {
  const { 
    pages, 
    strategyManager, 
    scrapingOptions, 
    domain, 
    targetUrl,
    sessionId,
    supabase,
    sendProgress,
    writer,
    encoder,
    siteMetadata,
    pageGroups,
    primaryStrategy = 'dynamic', // Default to dynamic if not provided
    skipPhases = [] // Default to running all phases
  } = params
  
  try {
    const startTime = Date.now()
    const totalPages = pages.length
    let completedPages = 0
    
    // Phase timing variables
    let rapidScrapeDuration = 0
    let validationDuration = 0
    let enhancementDuration = 0
    let rapidScrapeStart = Date.now()
    
    console.log('🚀 executeThreePhaseScraping STARTED', {
      totalPages,
      pages,
      hasStrategyManager: !!strategyManager,
      domain,
      targetUrl,
      sessionId
    })
    
    permanentLogger.info('🚀 executeThreePhaseScraping STARTED', { category: 'SCRAPING_PHASE', totalPages,
      pages,
      hasStrategyManager: !!strategyManager,
      domain,
      targetUrl,
      sessionId })
    
    // Initial progress update with strategy breakdown
    const staticCount = pageGroups?.static?.length || 0
    const dynamicCount = pageGroups?.dynamic?.length || 0
    const spaCount = pageGroups?.spa?.length || 0
    
    await sendProgress({
      type: 'strategy-init',
      completedPages: 0,
      totalPages,
      phase: 'rapid-scrape',
      technology: siteMetadata?.siteType || 'unknown',
      strategies: {
        static: { 
          count: staticCount, 
          label: 'Cheerio (Fast)', 
          estimatedTime: staticCount * 0.5 
        },
        dynamic: { 
          count: dynamicCount, 
          label: 'Playwright (Full)', 
          estimatedTime: dynamicCount * 2 
        },
        spa: { 
          count: spaCount, 
          label: 'SPA Mode', 
          estimatedTime: spaCount * 3 
        }
      },
      phases: [
        { name: 'Rapid Scrape', status: 'in-progress', details: `0/${totalPages} pages` },
        { name: 'Validation', status: 'pending' },
        { name: 'Enhancement', status: 'pending' }
      ],
      message: staticCount > 0 ? 
        `Using fast Cheerio for ${staticCount} static pages (10x speedup)` :
        'Using Playwright for dynamic content'
    })
    
    permanentLogger.info('📋 PHASE 1: RAPID SCRAPE', { category: 'SCRAPING_PHASE', totalPages,
      scraper: 'strategy-manager' })
    
    // PHASE 1: RAPID SCRAPE with Cheerio
    const allPages: any[] = []
    const batchSize = scrapingOptions.parallelBatchSize || 5
    
    for (let batchStart = 0; batchStart < pages.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, pages.length)
      const batch = pages.slice(batchStart, batchEnd)
      const batchNumber = Math.floor(batchStart / batchSize) + 1
      const totalBatches = Math.ceil(pages.length / batchSize)
      
      permanentLogger.log('SCRAPING_PHASE', `Starting batch ${batchNumber}/${totalBatches}`, {
        batchStart,
        batchEnd,
        batchSize: batch.length,
        urls: batch
      })
      
      // Scrape batch sequentially to avoid browser context conflicts
      // Changed from parallel to sequential to improve reliability
      const batchResults = []
      for (const pageUrl of batch) {
        try {
          permanentLogger.log('SCRAPING_PHASE', `Scraping page: ${pageUrl}`, {
            strategyManagerExists: !!strategyManager,
            hasMethod: !!strategyManager?.scrape,
            strategyWillCreateContext: true,
            technology: siteMetadata?.siteType || 'unknown'
          })
          
          // Send real-time update showing which strategy will be used
          const predictedStrategy = siteMetadata?.siteType === 'WORDPRESS' || 
                                   siteMetadata?.siteType === 'JEKYLL' ||
                                   siteMetadata?.siteType === 'SQUARESPACE' ? 'static' : 'dynamic'
          
          await sendProgress({
            type: 'page-start',
            currentPage: {
              url: pageUrl,
              strategy: predictedStrategy,
              technology: siteMetadata?.siteType || 'unknown',
              message: predictedStrategy === 'static' ? 
                '⚡ Using Cheerio (10x faster)' : 
                '🌐 Using Playwright (full browser)'
            },
            completedPages,
            totalPages
          })
          
          // Use strategyManager with site metadata for smart routing
          // Pass undefined for context - strategies will manage their own
          const pageData = await strategyManager.scrape(pageUrl, undefined, siteMetadata)
          
          // Send completion update with actual strategy used
          await sendProgress({
            type: 'page-complete',
            currentPage: {
              url: pageUrl,
              strategy: pageData.strategy || predictedStrategy,
              success: !!pageData.content,
              contentLength: pageData.content?.length || 0
            },
            completedPages: completedPages + 1,
            totalPages
          })
          
          // Check if we got valid data back
          if (!pageData || !pageData.content) {
            permanentLogger.warn('SCRAPING_PHASE', `Page returned empty content: ${pageUrl}`, {
              hasData: !!pageData,
              hasContent: !!pageData?.content,
              contentLength: pageData?.content?.length || 0,
              errors: pageData?.errors,
              strategy: pageData?.strategy
            })
          }
          
          permanentLogger.log('SCRAPING_PHASE', `Page scraped: ${pageUrl}`, {
            hasData: !!pageData,
            contentLength: pageData?.content?.length || 0,
            dataKeys: pageData ? Object.keys(pageData) : [],
            url: pageData?.url || 'missing',
            title: pageData?.title || 'missing',
            hasContent: !!pageData?.content,
            hasErrors: !!pageData?.errors,
            errorCount: pageData?.errors?.length || 0
          })
          
          // Only return pages with actual content
          if (pageData && pageData.content && pageData.content.length > 0) {
            // Ensure page has required fields
            if (!pageData.url) {
              pageData.url = pageUrl
            }
            batchResults.push(pageData)
          } else {
            batchResults.push(null) // Push null if no content
          }
        } catch (error) {
          permanentLogger.error('SCRAPING_PHASE', `Failed to scrape ${pageUrl}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            usedStrategyManager: true
          })
          batchResults.push(null)
        }
      }
      const validResults = batchResults.filter(r => r !== null)
      
      console.log(`📦 Batch ${batchNumber} completed:`, {
        totalResults: batchResults.length,
        validResults: validResults.length,
        failedResults: batchResults.filter(r => r === null).length,
        allPagesBeforePush: allPages.length
      })
      
      permanentLogger.log('SCRAPING_PHASE', `Batch ${batchNumber} completed`, {
        totalResults: batchResults.length,
        validResults: validResults.length,
        failedResults: batchResults.filter(r => r === null).length,
        allPagesBeforePush: allPages.length
      })
      
      if (validResults.length > 0) {
        allPages.push(...validResults)
        permanentLogger.log('SCRAPING_PHASE', `Added ${validResults.length} pages to results`, {
          allPagesAfterPush: allPages.length
        })
      }
      
      completedPages += batch.length
      
      // Update progress for Phase 1
      await sendProgress({
        type: 'progress',
        completedPages,
        totalPages,
        phase: 'rapid-scrape',
        phases: [
          { name: 'Rapid Scrape', status: 'in-progress', details: `${completedPages}/${totalPages} pages` },
          { name: 'Validation', status: 'pending' },
          { name: 'Enhancement', status: 'pending' }
        ],
        scraperType: primaryStrategy
      })
      
      // Add delay between batches
      if (batchEnd < pages.length && scrapingOptions.delayBetweenRequests) {
        await new Promise(resolve => setTimeout(resolve, scrapingOptions.delayBetweenRequests))
      }
    }
    
    // Complete Phase 1
    permanentLogger.info('Phase 1 complete - summary', { category: 'SCRAPING_PHASE', ...{
      totalPagesRequested: totalPages,
      totalPagesScraped: allPages.length,
      successRate: `${((allPages.length / totalPages }) * 100).toFixed(1)}%`
    })
    
    await sendProgress({
      type: 'progress',
      completedPages: totalPages,
      totalPages,
      phase: 'validation',
      phases: [
        { name: 'Rapid Scrape', status: 'complete', details: `${totalPages} pages` },
        { name: 'Validation', status: 'in-progress', details: 'Analyzing content quality' },
        { name: 'Enhancement', status: 'pending' }
      ],
      scraperType: primaryStrategy
    })
    
    // Check if we should skip Phase 2 and 3
    if (skipPhases.includes(2)) {
      permanentLogger.info('⏭️ Skipping Phase 2 and 3 (initial mode)', { category: 'SCRAPING_PHASE', mode: 'initial',
        pagesScraped: allPages.length,
        skipPhases })
      
      // Send completion with only Phase 1 results
      const completionData = {
        pages: allPages,
        validationScore: 1, // No validation performed
        enhancementCount: 0,
        scraperType: primaryStrategy,
        mode: 'initial',
        phasesRun: ['rapid-scrape'],
        totalAttempted: totalPages,
        successfulPages: allPages.length
      }
      
      await sendProgress({
        type: 'complete',
        result: completionData
      })
      
      await writer.close()
      return
    }
    
    permanentLogger.info('SCRAPING_PHASE', '🔍 PHASE 2: CONTENT VALIDATION', { pagesScraped: allPages.length})
    
    // PHASE 2: CONTENT VALIDATION
    const validator = new ContentValidator()
    const { validPages, needsEnhancement, stats } = validator.validateBatch(allPages)
    
    const validationScore = stats.averageScore
    
    permanentLogger.info('📊 Validation Results', { category: 'SCRAPING_PHASE', ...{
      allPagesCount: allPages.length,
      validPagesCount: validPages.length,
      needsEnhancementCount: needsEnhancement.length,
      validationScore,
      validPageUrls: validPages.map(p => p.url }).slice(0, 5),
      enhancementPageUrls: needsEnhancement.map(e => e.page.url).slice(0, 5)
    })
    
    await sendProgress({
      type: 'progress',
      completedPages: totalPages,
      totalPages,
      phase: 'validation',
      phases: [
        { name: 'Rapid Scrape', status: 'complete', details: `${totalPages} pages` },
        { name: 'Validation', status: 'complete', details: `Score: ${(validationScore * 100).toFixed(0)}%` },
        { name: 'Enhancement', status: needsEnhancement.length > 0 ? 'pending' : 'skipped' }
      ],
      validationScore,
      scraperType: primaryStrategy
    })
    
    // Include all pages, not just valid ones, since enhancement will add more pages
    let finalPages = [...validPages]
    let enhancementCount = 0
    
    // PHASE 3: SELECTIVE PLAYWRIGHT ENHANCEMENT
    if (needsEnhancement.length > 0) {
      permanentLogger.info('SCRAPING_PHASE', '🎭 PHASE 3: SELECTIVE ENHANCEMENT', { pagesToEnhance: needsEnhancement.length})
      
      await sendProgress({
        type: 'progress',
        completedPages: totalPages,
        totalPages,
        phase: 'enhancement',
        phases: [
          { name: 'Rapid Scrape', status: 'complete', details: `${totalPages} pages` },
          { name: 'Validation', status: 'complete', details: `Score: ${(validationScore * 100).toFixed(0)}%` },
          { name: 'Enhancement', status: 'in-progress', details: `0/${needsEnhancement.length} pages` }
        ],
        validationScore,
        enhancementCount: 0,
        scraperType: primaryStrategy // Keep using the primary strategy, not hardcoded 'hybrid'
      })
      
      // Use strategy manager for enhancement with dynamic strategy
      // Dynamic strategy is similar to Playwright for JavaScript-heavy pages
      if (strategyManager) {
        const enhancementBatchSize = 2
        const enhancedPages = []
        
        for (let i = 0; i < needsEnhancement.length; i += enhancementBatchSize) {
          const batch = needsEnhancement.slice(i, i + enhancementBatchSize)
          
          const enhancementPromises = batch.map(async ({ page, reason }) => {
            try {
              // Use dynamic strategy for JavaScript-heavy pages
              // Pass undefined for context - strategy will create its own
              const enhancedData = await strategyManager.scrape(page.url, undefined, siteMetadata)
              return enhancedData
            } catch (error) {
              permanentLogger.error('SCRAPING_PHASE', 'Enhancement failed', {
                url: page.url,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
              return page // Return original if enhancement fails
            }
          })
          
          const batchResults = await Promise.all(enhancementPromises)
          if (Array.isArray(batchResults) && batchResults.length > 0) {
            enhancedPages.push(...batchResults)
            enhancementCount += batchResults.length
          }
          
          // Update enhancement progress
          await sendProgress({
            type: 'progress',
            completedPages: totalPages,
            totalPages,
            phase: 'enhancement',
            phases: [
              { name: 'Rapid Scrape', status: 'complete', details: `${totalPages} pages` },
              { name: 'Validation', status: 'complete', details: `Score: ${(validationScore * 100).toFixed(0)}%` },
              { name: 'Enhancement', status: 'in-progress', details: `${enhancementCount}/${needsEnhancement.length} pages` }
            ],
            validationScore,
            enhancementCount,
            scraperType: primaryStrategy // Keep using the primary strategy, not hardcoded 'hybrid'
          })
          
          // Small delay between enhancement batches
          if (i + enhancementBatchSize < needsEnhancement.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        
        // Add enhanced pages to finalPages (they weren't in validPages)
        permanentLogger.info('Adding enhanced pages to final results', { category: 'SCRAPING_PHASE', enhancedPagesCount: enhancedPages.length,
          finalPagesBeforeCount: finalPages.length })
        
        for (const enhanced of enhancedPages) {
          // Enhanced pages weren't in validPages, so just add them
          finalPages.push(enhanced)
        }
        
        permanentLogger.info('Enhancement complete', { category: 'SCRAPING_PHASE', finalPagesAfterCount: finalPages.length,
          addedCount: enhancedPages.length })
      }
    }
    
    // If ALL pages needed enhancement and we have no valid pages, use all pages as fallback
    if (finalPages.length === 0 && allPages.length > 0) {
      permanentLogger.warn('SCRAPING_PHASE', 'No valid pages after validation, using all scraped pages', {
        allPagesCount: allPages.length
      })
      finalPages = [...allPages]
    }
    
    // Final progress update
    await sendProgress({
      type: 'progress',
      completedPages: totalPages,
      totalPages,
      phase: 'complete',
      phases: [
        { name: 'Rapid Scrape', status: 'complete', details: `${totalPages} pages` },
        { name: 'Validation', status: 'complete', details: `Score: ${(validationScore * 100).toFixed(0)}%` },
        { name: 'Enhancement', status: enhancementCount > 0 ? 'complete' : 'skipped', details: enhancementCount > 0 ? `${enhancementCount} pages` : 'Not needed' }
      ],
      validationScore,
      enhancementCount,
      scraperType: enhancementCount > 0 ? 'hybrid' : 'cheerio'
    })
    
    // Process and aggregate data (same as before)
    permanentLogger.info('📊 FINAL PAGES SUMMARY', { category: 'SCRAPING_PHASE', ...{
      allPagesCount: allPages.length,
      validPagesCount: validPages.length,
      finalPagesCount: finalPages.length,
      enhancementCount,
      targetUrl,
      finalPagesUrls: finalPages.map(p => p.url || p })
    })
    
    const aggregatedData = aggregateScrapedData(finalPages, targetUrl)
    
    permanentLogger.info('Aggregation complete', { category: 'SCRAPING_PHASE', hasBrandAssets: !!aggregatedData.brandAssets,
      hasContactInfo: !!aggregatedData.contactInfo,
      socialLinksCount: aggregatedData.socialLinks?.length || 0,
      teamMembersCount: aggregatedData.teamMembers?.length || 0 })
    
    // Save to database
    await supabase
      .from('research_sessions')
      .update({
        scraping_data: aggregatedData,
        scraping_completed_at: new Date().toISOString(),
        stage: 'extraction'
      })
      .eq('id', sessionId)
    
    // Critical debug: Log what we're about to send
    console.log('🔍 CRITICAL DEBUG: Final pages before sending', {
      finalPagesLength: finalPages.length,
      allPagesLength: allPages.length,
      validPagesLength: validPages.length,
      finalPagesType: Array.isArray(finalPages) ? 'array' : typeof finalPages,
      firstThreePages: finalPages.slice(0, 3).map(p => ({
        url: p?.url || 'no-url',
        hasContent: !!p?.content,
        contentLength: p?.content?.length || 0
      }))
    })
    
    permanentLogger.info('🔍 DEBUG: Final pages before sending', { category: 'SCRAPING_PHASE', ...{
      finalPagesLength: finalPages.length,
      finalPagesType: Array.isArray(finalPages }) ? 'array' : typeof finalPages,
      firstThreePages: finalPages.slice(0, 3).map(p => ({
        url: p?.url || 'no-url',
        hasContent: !!p?.content,
        contentLength: p?.content?.length || 0
      }))
    })
    
    // Ensure we have pages to send
    if (!finalPages || finalPages.length === 0) {
      permanentLogger.error('SCRAPING_PHASE', '❌ CRITICAL: No pages to send in completion!', {
        allPagesLength: allPages.length,
        validPagesLength: validPages.length,
        finalPagesLength: finalPages.length
      })
    }
    
    // Send completion message
    permanentLogger.info('📤 Sending completion message', { category: 'SCRAPING_PHASE', ...{
      finalPagesCount: finalPages.length,
      hasPages: finalPages.length > 0,
      firstPageUrl: finalPages[0]?.url || 'none',
      aggregatedDataKeys: Object.keys(aggregatedData })
    })
    
    const completionData = {
      pages: finalPages,
      ...aggregatedData,
      totalAttempted: pages.length,
      failedPages: pages.filter((pageUrl, i) => {
        const result = allPages[i]
        return !result || !result.content
      }),
      enhancementCount,
      validationScore,
      duration: Date.now() - startTime,
      scraperType: primaryStrategy, // Add the primary strategy used
      phaseMetrics: [
        {
          name: 'Rapid Scrape',
          duration: rapidScrapeDuration || Date.now() - rapidScrapeStart,
          pagesProcessed: pages.length,
          successRate: (allPages.filter(p => p && p.content).length / pages.length) * 100
        }
      ],
      llmUsage: {
        calls: 0,
        cost: 0,
        message: 'No LLM calls were made during scraping'
      }
    }
    
    permanentLogger.info('📦 Completion data structure', { category: 'SCRAPING_PHASE', ...{
      hasPages: !!completionData.pages,
      pagesLength: completionData.pages?.length || 0,
      dataKeys: Object.keys(completionData })
    })
    
    await sendProgress({
      type: 'complete',
      result: completionData
    })
    
    permanentLogger.info('✅ ALL PHASES COMPLETE', { category: 'SCRAPING_PHASE', ...{
      totalDuration: Date.now( }) - startTime,
      totalPages: finalPages.length,
      enhancementCount
    })
    
  } catch (error) {
    permanentLogger.error('SCRAPING_PHASE', 'Streaming scraping failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    // Send error message
    await sendProgress({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    // Browser contexts are managed by individual strategies
    permanentLogger.info('SCRAPING_PHASE', '✅ Streaming scraping completed - contexts managed by strategies')
    
    // Close the stream (only if not already closed)
    try {
      await writer.close()
    } catch (closeError) {
      // Stream might already be closed, which is fine
      if (closeError instanceof Error && !closeError.message.includes('closed')) {
        permanentLogger.error('SCRAPING_PHASE', '❌ Failed to close stream', {
          error: closeError.message
        })
      }
    }
  }
}

// Helper function to aggregate scraped data
function aggregateScrapedData(allPages: any[], targetUrl: string) {
  // This is the same aggregation logic from the original code
  const aggregatedBrandAssets: any = {
    logo: null,
    favicon: null,
    colors: [],
    fonts: [],
    gradients: []
  }
  
  const aggregatedContactInfo: any = {
    emails: [],
    phones: [],
    addresses: [],
    contactPageUrl: null
  }
  
  const aggregatedSocialLinks: any[] = []
  const aggregatedTeamMembers: any[] = []
  const aggregatedTestimonials: any[] = []
  const aggregatedProducts: any[] = []
  
  // Aggregate data from all pages
  for (const page of allPages) {
    if (page.brandAssets) {
      Object.assign(aggregatedBrandAssets, page.brandAssets)
    }
    if (page.contactInfo) {
      Object.assign(aggregatedContactInfo, page.contactInfo)
    }
    if (page.socialLinks) {
      aggregatedSocialLinks.push(...page.socialLinks)
    }
    if (page.teamMembers) {
      aggregatedTeamMembers.push(...page.teamMembers)
    }
    if (page.testimonials) {
      aggregatedTestimonials.push(...page.testimonials)
    }
    if (page.products) {
      aggregatedProducts.push(...page.products)
    }
  }
  
  return {
    brandAssets: aggregatedBrandAssets,
    contactInfo: aggregatedContactInfo,
    socialLinks: [...new Set(aggregatedSocialLinks)],
    teamMembers: aggregatedTeamMembers,
    testimonials: aggregatedTestimonials,
    products: aggregatedProducts
  }
}