import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { PageIntelligenceAnalyzer } from '@/lib/company-intelligence/intelligence/page-intelligence-analyzer'
import { PageType } from '@/lib/company-intelligence/intelligence/types'
import { decodeHtmlEntities, normalizeUrl, generateTitleFromUrl } from '@/lib/utils/html-decoder'
import { validateUrls } from '@/lib/utils/url-validator'
import * as cheerio from 'cheerio'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60 // Allow enough time for comprehensive discovery

interface FetchSitemapRequest {
  domain: string
  enableIntelligence?: boolean
  sessionId?: string
  siteAnalysisData?: any
}

interface SitemapPage {
  url: string
  title?: string
  lastmod?: string
  changefreq?: string
  priority?: number
  // Enhanced with intelligence data
  pageType?: PageType
  confidence?: number
  intelligence?: {
    urlPatterns: any[]
    hasStructuredData: boolean
    metaDataComplete: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: FetchSitemapRequest = await request.json()
    const { domain, enableIntelligence = true, sessionId, siteAnalysisData } = body // Always enable intelligence by default
    
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }
    
    permanentLogger.info('SITEMAP_FETCH', 'Starting sitemap fetch', { domain})
    
    // Check if client wants streaming response
    const acceptHeader = request.headers.get('accept')
    const wantsStream = acceptHeader?.includes('text/event-stream')
    
    if (wantsStream) {
      // Return streaming response
      return new Response(
        new ReadableStream({
          async start(controller) {
            await performStreamingSitemapDiscovery(domain, enableIntelligence, sessionId, controller)
          }
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      )
    }
    
    // Clean up domain
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const baseUrl = `https://${cleanDomain}`
    
    // Try to fetch sitemap.xml first
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemap`,
      `${baseUrl}/robots.txt`
    ]
    
    let pages: SitemapPage[] = []
    let sitemapFound = false
    
    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await fetch(sitemapUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)'
          },
          signal: AbortSignal.timeout(10000)
        })
        
        if (response.ok) {
          const text = await response.text()
          
          if (sitemapUrl.includes('robots.txt')) {
            // Parse robots.txt for sitemap location
            const sitemapMatch = text.match(/Sitemap:\s*(.+)/i)
            if (sitemapMatch) {
              const actualSitemapUrl = sitemapMatch[1].trim()
              const sitemapResponse = await fetch(actualSitemapUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)'
                },
                signal: AbortSignal.timeout(10000)
              })
              
              if (sitemapResponse.ok) {
                const sitemapText = await sitemapResponse.text()
                pages = await parseSitemap(sitemapText, baseUrl)
                sitemapFound = true
                break
              }
            }
          } else {
            // Parse XML sitemap
            pages = await parseSitemap(text, baseUrl)
            if (pages.length > 0) {
              sitemapFound = true
              break
            }
          }
        }
      } catch (err) {
        // Continue to next URL
        continue
      }
    }
    
    // COMPREHENSIVE PHASED DISCOVERY - Quality over speed
    permanentLogger.info('🚀 STARTING COMPREHENSIVE PHASED DISCOVERY', { category: 'SITEMAP_FETCH', sitemapFound,
      sitemapPages: pages.length })
    
    // Track discovery sources for reporting
    const discoveryStats = {
      sitemap: pages.length,
      homepage: 0,
      patterns: 0,
      blog: 0,
      crawling: 0
    }
    
    // Use normalized URLs for deduplication
    const allDiscoveredUrls = new Map<string, SitemapPage>()
    
    // Phase 1: Add sitemap pages if found
    pages.forEach(p => {
      const normalized = normalizeUrl(p.url)
      allDiscoveredUrls.set(normalized, p)
    })
    
    // Phase 2: Comprehensive homepage crawl (always run)
    permanentLogger.info('SITEMAP_FETCH', '📍 PHASE 2: Comprehensive Homepage Crawl', { baseUrl})
    const homepagePages = await crawlHomepageComprehensive(baseUrl)
    homepagePages.forEach(p => {
      const normalized = normalizeUrl(p.url)
      if (!allDiscoveredUrls.has(normalized)) {
        allDiscoveredUrls.set(normalized, p)
        discoveryStats.homepage++
        permanentLogger.info('SITEMAP_FETCH', '✅ New page from homepage', { url: p.url})
      }
    })
    
    // Phase 3: Pattern-based discovery
    permanentLogger.info('SITEMAP_FETCH', '🔍 PHASE 3: Pattern-Based Discovery')
    const patternPages = await discoverByPatterns(baseUrl, Array.from(allDiscoveredUrls.keys()))
    patternPages.forEach(p => {
      const normalized = normalizeUrl(p.url)
      if (!allDiscoveredUrls.has(normalized)) {
        allDiscoveredUrls.set(normalized, p)
        discoveryStats.patterns++
      }
    })
    
    // Phase 4: Blog and content discovery
    permanentLogger.info('SITEMAP_FETCH', '📰 PHASE 4: Blog & Content Discovery')
    
    // Check if we have a blog page
    const blogUrl = `${baseUrl}/blog`
    const hasBlogPage = Array.from(allDiscoveredUrls.values()).some(p => 
      normalizeUrl(p.url) === normalizeUrl(blogUrl)
    )
    
    if (hasBlogPage) {
      try {
        permanentLogger.info('SITEMAP_FETCH', '📰 Crawling blog for articles', { url: blogUrl})
        const blogArticles = await crawlBlogForArticles(blogUrl, baseUrl)
        blogArticles.forEach(article => {
          const normalized = normalizeUrl(article.url)
          if (!allDiscoveredUrls.has(normalized)) {
            allDiscoveredUrls.set(normalized, article)
            discoveryStats.blog++
            permanentLogger.info('✅ Blog article found', { category: 'SITEMAP_FETCH', url: article.url,
              title: article.title })
          }
        })
      } catch (error) {
        permanentLogger.info('⚠️ Error crawling blog', {
          category: 'SITEMAP_FETCH',
          error: String(error)
        })
      }
    }
    
    // Also check for other content pages
    const contentPages = Array.from(allDiscoveredUrls.values()).filter(page => {
      const url = page.url.toLowerCase()
      return url.includes('/resources') || 
             url.includes('/insights') || 
             url.includes('/news') ||
             url.includes('/articles')
    })
    
    for (const contentPage of contentPages.slice(0, 3)) { // Limit to 3 to avoid timeout
      try {
        const subPages = await crawlPageForLinks(contentPage.url, baseUrl)
        subPages.forEach(p => {
          const normalized = normalizeUrl(p.url)
          if (!allDiscoveredUrls.has(normalized)) {
            allDiscoveredUrls.set(normalized, p)
            discoveryStats.crawling++
          }
        })
      } catch (error) {
        // Continue on error
      }
    }
    
    // Convert Map back to array
    pages = Array.from(allDiscoveredUrls.values())
    
    // CRITICAL: Phase 5 - Final URL validation to remove phantom URLs
    permanentLogger.info('SITEMAP_FETCH', '🔍 FINAL VALIDATION: Checking all discovered URLs actually exist', { totalBeforeValidation: pages.length})
    
    const allUrls = pages.map(p => p.url)
    const validUrls = await validateUrls(allUrls)
    const phantomUrls = allUrls.filter(url => !validUrls.includes(url))
    
    // Filter pages to only include valid URLs
    pages = pages.filter(page => validUrls.includes(page.url))
    
    permanentLogger.info('✅ FINAL VALIDATION COMPLETE', { category: 'SITEMAP_FETCH', totalUrls: allUrls.length,
      validUrls: validUrls.length,
      phantomUrls: phantomUrls.length,
      phantomUrlsList: phantomUrls,
      finalPageCount: pages.length })
    
    // Phase 6: Validation and sorting
    
    // Sort by priority but DON'T limit - we want ALL pages
    pages.sort((a, b) => (b.priority || 0.5) - (a.priority || 0.5))
    
    permanentLogger.info('🎯 FINAL PAGE DISCOVERY RESULTS', {
      category: 'SITEMAP_FETCH',
      totalPagesFound: pages.length,
      homePage: pages.filter(p => p.priority === 1.0).length,
      mainPages: pages.filter(p => (p.priority || 0) >= 0.8).length,
      blogPages: pages.filter(p => p.url.includes('/blog')).length,
      allUrls: pages.map(p => p.url)
    })
    
    // Only limit if we have an excessive number of pages (>200)
    if (pages.length > 200) {
      permanentLogger.warn('SITEMAP_FETCH', 'Limiting pages to 200 (found ' + pages.length + ')')
      pages = pages.slice(0, 200)
    }
    
    // Skip intelligence analysis for now - focus on fast response
    // Intelligence can be done in a separate phase if needed
    
    permanentLogger.info('Sitemap fetch complete', {
      category: 'SITEMAP_FETCH',
      domain: cleanDomain,
      pagesFound: pages.length,
      intelligenceEnabled: enableIntelligence,
      classifiedPages: enableIntelligence ? pages.filter(p => p.pageType).length : 0
    })
    
    // Update research session if provided
    if (sessionId) {
      try {
        const supabase = await createClient()
        const sitemapData = {
          pages,
          sitemapFound,
          discoveredFrom: discoveryStats,
          intelligenceEnabled: enableIntelligence,
          ...(enableIntelligence && {
            summary: {
              totalPages: pages.length,
              classifiedPages: pages.filter(p => p.pageType).length,
              pageTypes: Array.from(new Set(pages.filter(p => p.pageType).map(p => p.pageType))),
              averageConfidence: pages.filter(p => p.confidence).reduce((sum, p) => sum + (p.confidence || 0), 0) / pages.filter(p => p.confidence).length || 0
            }
          })
        }
        
        // Store URLs as simple array for bulletproof architecture
        const discoveredUrls = pages.map(p => p.url)
        
        const { error: updateError } = await supabase
          .from('company_intelligence_sessions')
          .update({
            status: 'sitemap_discovery',
            discovered_urls: discoveredUrls,  // Store as simple array of URLs
            merged_data: {
              sitemap: sitemapData,
              stats: {
                totalPages: pages.length,
                dataPoints: 0,
                totalLinks: 0
              },
              pages: {},
              extractedData: {}
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)
        
        if (updateError) {
          permanentLogger.captureError('SESSION', new Error('Failed to update company intelligence session'), { sessionId,
            error: updateError.message
          })
        } else {
          permanentLogger.info('Company intelligence session updated with sitemap data', { category: 'SESSION', sessionId,
            pagesFound: pages.length,
            urlsStored: discoveredUrls.length })
          
          // Store page intelligence if enabled
          if (enableIntelligence && pages.filter(p => p.pageType).length > 0) {
            const pageIntelligenceRecords = pages
              .filter(p => p.pageType)
              .map(page => ({
                session_id: sessionId,
                url: page.url,
                page_type: page.pageType,
                confidence: page.confidence || 0,
                classification_data: {
                  intelligence: page.intelligence,
                  title: page.title,
                  lastmod: page.lastmod
                },
                created_at: new Date().toISOString()
              }))
            
            const { error: intelligenceError } = await supabase
              .from('page_intelligence')
              .insert(pageIntelligenceRecords)
            
            if (intelligenceError) {
              permanentLogger.captureError('INTELLIGENCE', new Error('Failed to store page intelligence'), { sessionId,
                error: intelligenceError.message
              })
            } else {
              permanentLogger.info('Page intelligence stored', { category: 'INTELLIGENCE', sessionId,
                recordsCreated: pageIntelligenceRecords.length })
            }
          }
        }
      } catch (sessionError) {
        permanentLogger.captureError('SESSION', new Error('Error updating company intelligence session'), { sessionId,
          error: sessionError instanceof Error ? sessionError.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      domain: cleanDomain,
      pages,
      sitemapFound,
      discoveredFrom: discoveryStats,
      intelligenceEnabled: enableIntelligence,
      sessionId,
      ...(enableIntelligence && {
        summary: {
          totalPages: pages.length,
          classifiedPages: pages.filter(p => p.pageType).length,
          pageTypes: Array.from(new Set(pages.filter(p => p.pageType).map(p => p.pageType))),
          averageConfidence: pages.filter(p => p.confidence).reduce((sum, p) => sum + (p.confidence || 0), 0) / pages.filter(p => p.confidence).length || 0
        }
      })
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    permanentLogger.captureError('SITEMAP_FETCH', new Error('Failed to fetch sitemap'), { error: errorMessage })

    // Return a clean error message without duplicating context
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

async function parseSitemap(xml: string, baseUrl: string): Promise<SitemapPage[]> {
  const pages: SitemapPage[] = []
  
  // Check if this is a sitemap index file
  const sitemapIndexRegex = /<sitemap>[\s\S]*?<\/sitemap>/g
  const sitemapMatches = xml.match(sitemapIndexRegex)
  
  if (sitemapMatches) {
    // This is a sitemap index - fetch nested sitemaps
    permanentLogger.info('SITEMAP_FETCH', 'Found sitemap index with nested sitemaps', { count: sitemapMatches.length})
    
    const locRegex = /<loc>(.*?)<\/loc>/
    for (const sitemapBlock of sitemapMatches) {
      const locMatch = sitemapBlock.match(locRegex)
      if (locMatch) {
        const nestedSitemapUrl = locMatch[1].trim()
        try {
          const response = await fetch(nestedSitemapUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)'
            },
            signal: AbortSignal.timeout(10000)
          })
          
          if (response.ok) {
            const nestedXml = await response.text()
            const nestedPages = await parseSitemap(nestedXml, baseUrl)
            pages.push(...nestedPages)
            permanentLogger.info('Parsed nested sitemap', { category: 'SITEMAP_FETCH', url: nestedSitemapUrl,
              pagesFound: nestedPages.length })
          }
        } catch (err) {
          permanentLogger.warn('Failed to fetch nested sitemap', {
            category: 'SITEMAP_FETCH',
            url: nestedSitemapUrl,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }
    }
  }
  
  // Regular expression to extract URLs from sitemap
  const urlRegex = /<url>[\s\S]*?<\/url>/g
  const locRegex = /<loc>(.*?)<\/loc>/
  const lastmodRegex = /<lastmod>(.*?)<\/lastmod>/
  const changefreqRegex = /<changefreq>(.*?)<\/changefreq>/
  const priorityRegex = /<priority>(.*?)<\/priority>/
  
  const matches = xml.match(urlRegex)
  
  if (matches) {
    matches.forEach(urlBlock => {
      const locMatch = urlBlock.match(locRegex)
      if (locMatch) {
        const url = locMatch[1].trim()
        
        // Only include URLs from the same domain
        if (url.startsWith(baseUrl) || url.startsWith('/')) {
          const page: SitemapPage = {
            url: url.startsWith('/') ? `${baseUrl}${url}` : url
          }
          
          const lastmodMatch = urlBlock.match(lastmodRegex)
          if (lastmodMatch) page.lastmod = lastmodMatch[1]
          
          const changefreqMatch = urlBlock.match(changefreqRegex)
          if (changefreqMatch) page.changefreq = changefreqMatch[1]
          
          const priorityMatch = urlBlock.match(priorityRegex)
          if (priorityMatch) page.priority = parseFloat(priorityMatch[1])
          
          // Generate title from URL and decode HTML entities
          const urlPath = page.url.replace(baseUrl, '')
          const rawTitle = urlPath
            .split('/')
            .filter(Boolean)
            .map(segment => segment.replace(/-/g, ' '))
            .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' > ') || 'Home'
          
          // Decode HTML entities in the title
          page.title = rawTitle
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&#x27;/g, "'")
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          
          pages.push(page)
        }
      }
    })
  }
  
  return pages
}

async function crawlCategoryPage(categoryUrl: string, baseUrl: string): Promise<SitemapPage[]> {
  const pages: SitemapPage[] = []
  
  try {
    const response = await fetch(categoryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)'
      },
      signal: AbortSignal.timeout(10000)
    })
    
    if (response.ok) {
      const html = await response.text()
      
      // Extract links from HTML - focus on article/post links
      const linkRegex = /<a[^>]+href=["']([^"']+)["']/g
      const links = new Set<string>()
      
      let match
      while ((match = linkRegex.exec(html)) !== null) {
        let href = match[1]
        
        // Skip external links, anchors, and non-page resources
        if (
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('javascript:') ||
          href.includes('youtube.com') ||
          href.includes('twitter.com') ||
          href.includes('facebook.com') ||
          href.includes('linkedin.com') ||
          href.match(/\.(jpg|jpeg|png|gif|pdf|zip|exe|dmg)$/i)
        ) {
          continue
        }
        
        // Convert relative URLs to absolute
        if (href.startsWith('/')) {
          href = `${baseUrl}${href}`
        } else if (!href.startsWith('http')) {
          // Handle relative URLs that don't start with /
          const categoryBase = categoryUrl.substring(0, categoryUrl.lastIndexOf('/') + 1)
          href = `${categoryBase}${href}`
        }
        
        // Only include same-domain links that appear to be blog posts/articles
        if (href.startsWith(baseUrl) && 
            !href.endsWith('/blog') && 
            !href.endsWith('/news') &&
            !href.endsWith('/resources') &&
            href !== categoryUrl) {
          
          // Check if it looks like an article URL (has some depth)
          const urlPath = href.replace(baseUrl, '')
          const segments = urlPath.split('/').filter(Boolean)
          
          // Likely an article if it has 2+ segments (e.g., /blog/article-title)
          if (segments.length >= 2) {
            links.add(href)
          }
        }
      }
      
      // Convert links to pages - process all discovered sub-pages
      const linkArray = Array.from(links)
      
      for (const url of linkArray) {
        // Generate title from URL
        const urlPath = url.replace(baseUrl, '')
        const title = urlPath
          .split('/')
          .filter(Boolean)
          .map(segment => segment.replace(/-/g, ' '))
          .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(' > ')
        
        pages.push({
          url,
          title: title || 'Article',
          priority: 0.4 // Lower priority for sub-pages
        })
      }
    }
  } catch (error) {
    permanentLogger.captureError('SITEMAP_FETCH', new Error('Error crawling category page'), { categoryUrl,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  return pages
}

async function crawlHomepageComprehensive(baseUrl: string): Promise<SitemapPage[]> {
  const pages: SitemapPage[] = []
  const discoveredUrls = new Set<string>()
  
  try {
    permanentLogger.info('SITEMAP_FETCH', 'Starting comprehensive homepage crawl', { baseUrl})
    
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)'
      },
      signal: AbortSignal.timeout(10000)
    })
    
    if (response.ok) {
      const html = await response.text()
      
      // Add homepage
      pages.push({
        url: baseUrl,
        title: 'Home',
        priority: 1.0
      })
      discoveredUrls.add(baseUrl)
      
      // Extract ALL links from HTML - including nav, footer, and body
      const links = new Set<string>()
      
      // Extract links from navigation sections
      permanentLogger.info('SITEMAP_FETCH', '🔍 STARTING SECTION-BY-SECTION LINK EXTRACTION', { htmlLength: html.length})
      
      // Extract navigation links
      const navMatches = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/gi) || []
      permanentLogger.info('SITEMAP_FETCH', 'Found navigation sections', { count: navMatches.length})
      
      for (const navSection of navMatches) {
        const navLinks = extractLinksFromHTML(navSection)
        permanentLogger.info('Navigation links extracted', {
          category: 'SITEMAP_FETCH',
          count: navLinks.length,
          links: navLinks.slice(0, 10)
        })
        navLinks.forEach(link => links.add(link))
      }
      
      // Extract footer links (CRITICAL for finding all pages)
      const footerMatches = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/gi) || []
      permanentLogger.info('SITEMAP_FETCH', '📍 FOOTER SECTIONS FOUND', { count: footerMatches.length})
      
      for (const footerSection of footerMatches) {
        const footerLinks = extractLinksFromHTML(footerSection)
        permanentLogger.info('✅ FOOTER LINKS EXTRACTED', {
          category: 'SITEMAP_FETCH',
          count: footerLinks.length,
          allLinks: footerLinks // Log ALL footer links for debugging
        })
        footerLinks.forEach(link => links.add(link))
      }
      
      // Extract header links
      const headerMatches = html.match(/<header[^>]*>([\s\S]*?)<\/header>/gi) || []
      permanentLogger.info('SITEMAP_FETCH', 'Found header sections', { count: headerMatches.length})
      
      for (const headerSection of headerMatches) {
        const headerLinks = extractLinksFromHTML(headerSection)
        permanentLogger.info('Header links extracted', {
          category: 'SITEMAP_FETCH',
          count: headerLinks.length,
          links: headerLinks.slice(0, 10)
        })
        headerLinks.forEach(link => links.add(link))
      }
      
      // Extract all other links from the page
      const mainLinkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi
      let match
      while ((match = mainLinkRegex.exec(html)) !== null) {
        links.add(match[1])
      }
      
      permanentLogger.info('Total raw links found', {
        category: 'SITEMAP_FETCH',
        count: links.size,
        allLinks: Array.from(links), // Log ALL links for debugging
        sample: Array.from(links).slice(0, 10)
      })
      
      // Process and filter links
      const validLinks = new Set<string>()
      const filteredReasons: { [key: string]: number } = {}
      
      permanentLogger.info('SITEMAP_FETCH', '🎯 STARTING LINK FILTERING', { totalRawLinks: links.size})
      
      for (let href of links) {
        // Track filtering reasons
        let filterReason: string | null = null
        
        // Skip external links, anchors, and non-page resources
        if (href.startsWith('#')) {
          filterReason = 'anchor'
        } else if (href.startsWith('mailto:')) {
          filterReason = 'mailto'
        } else if (href.startsWith('tel:')) {
          filterReason = 'tel'
        } else if (href.startsWith('javascript:')) {
          filterReason = 'javascript'
        } else if (href.includes('youtube.com') ||
                   href.includes('twitter.com') ||
                   href.includes('facebook.com') ||
                   href.includes('linkedin.com') ||
                   href.includes('instagram.com')) {
          filterReason = 'social-media'
        } else if (href.match(/\.(jpg|jpeg|png|gif|pdf|zip|exe|dmg|svg|ico|webp)$/i)) {
          filterReason = 'file-extension'
        }
        
        if (filterReason) {
          filteredReasons[filterReason] = (filteredReasons[filterReason] || 0) + 1
          continue
        }
        
        // Convert relative URLs to absolute
        if (href.startsWith('/')) {
          href = `${baseUrl}${href}`
        } else if (!href.startsWith('http')) {
          // Handle relative URLs that don't start with /
          if (href.includes(':')) {
            continue // Skip URIs like data:, blob:, etc
          }
          href = `${baseUrl}/${href}`
        }
        
        // Normalize URL (remove trailing slash, fragment)
        try {
          const url = new URL(href)
          url.hash = ''
          let normalized = url.toString()
          if (normalized.endsWith('/') && normalized !== baseUrl + '/') {
            normalized = normalized.slice(0, -1)
          }
          
          // Only include same-domain links
          if (normalized.startsWith(baseUrl) && !discoveredUrls.has(normalized)) {
            validLinks.add(normalized)
            discoveredUrls.add(normalized)
          }
        } catch {
          // Invalid URL, skip
        }
      }
      
      permanentLogger.info('✅ VALID LINKS AFTER FILTERING', {
        category: 'SITEMAP_FETCH',
        count: validLinks.size,
        urls: Array.from(validLinks).slice(0, 50), // Limit logged URLs to 50 for readability
        filteredOut: links.size - validLinks.size,
        originalCount: links.size,
        filterReasons: filteredReasons
      })
      
      // Skip URL validation - let scrapers handle 404s gracefully
      // URL validation adds significant overhead during sitemap discovery
      // The scrapers themselves should handle non-existent pages properly
      permanentLogger.info('✅ SKIPPING URL VALIDATION - Scrapers will handle 404s', { category: 'SITEMAP_FETCH', totalUrls: validLinks.size,
        reason: 'Performance optimization - scrapers handle 404s gracefully' })
      
      // Convert links to pages and fetch their titles
      const linkArray = Array.from(validLinks)
      
      // Process links in parallel but with reasonable limit
      const fetchPageTitle = async (url: string): Promise<SitemapPage> => {
        try {
          const pageResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)'
            },
            signal: AbortSignal.timeout(5000)
          })
          
          if (pageResponse.ok) {
            const pageHtml = await pageResponse.text()
            
            // Extract title from the page and decode HTML entities
            const titleMatch = pageHtml.match(/<title>(.*?)<\/title>/i)
            const rawTitle = titleMatch ? titleMatch[1] : url.replace(baseUrl, '').replace(/^\//, '')
            
            // Decode HTML entities
            const title = rawTitle
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#039;/g, "'")
              .replace(/&#x27;/g, "'")
              .replace(/&mdash;/g, '—')
              .replace(/&ndash;/g, '–')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
            
            // Determine priority based on URL pattern
            let priority = 0.5
            if (url === baseUrl || url === baseUrl + '/') {
              priority = 1.0
            } else if (url.includes('/about') || url.includes('/contact') || url.includes('/services')) {
              priority = 0.8
            } else if (url.includes('/blog/') || url.includes('/news/')) {
              priority = 0.6
            }
            
            return {
              url,
              title,
              priority
            }
          }
        } catch (error) {
          permanentLogger.debug('SITEMAP_FETCH', 'Failed to fetch page title', { 
            url, 
            error: error instanceof Error ? error.message : 'Unknown' 
          })
        }
        
        // Fallback title from URL
        const urlPath = url.replace(baseUrl, '')
        return {
          url,
          title: urlPath
            .split('/')
            .filter(Boolean)
            .map(segment => segment.replace(/-/g, ' '))
            .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' > ') || 'Page',
          priority: 0.5
        }
      }
      
      // Fetch titles for ALL discovered links (not limited to 20)
      permanentLogger.info('SITEMAP_FETCH', 'Fetching page titles', { count: linkArray.length})
      
      // Process in smaller batches to avoid overwhelming
      const batchSize = 5
      for (let i = 0; i < linkArray.length; i += batchSize) {
        const batch = linkArray.slice(i, Math.min(i + batchSize, linkArray.length))
        const batchPromises = batch.map(url => fetchPageTitle(url))
        const batchResults = await Promise.all(batchPromises)
        pages.push(...batchResults)
        
        // Small delay between batches
        if (i + batchSize < linkArray.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      permanentLogger.info('🏁 HOMEPAGE CRAWL COMPLETE', {
        category: 'SITEMAP_FETCH',
        totalPages: pages.length,
        pageUrls: pages.map(p => p.url),
        summary: {
          homepage: pages.filter(p => p.priority === 1.0).length,
          mainPages: pages.filter(p => p.priority === 0.8).length,
          blogPages: pages.filter(p => p.priority === 0.6).length,
          otherPages: pages.filter(p => p.priority === 0.5).length
        }
      })
    }
  } catch (error) {
    permanentLogger.captureError('SITEMAP_FETCH', new Error('Failed to crawl homepage'), { error })
  }
  
  return pages
}

// Helper function to extract links from HTML content using cheerio
function extractLinksFromHTML(html: string): string[] {
  const $ = cheerio.load(html)
  const links = new Set<string>()
  
  // Extract all href attributes from anchor tags
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href')
    if (href) {
      links.add(href)
    }
  })
  
  // Also check for links in data attributes (common in React/Next.js apps)
  $('[data-href]').each((_, element) => {
    const href = $(element).attr('data-href')
    if (href) {
      links.add(href)
    }
  })
  
  // Check for canonical URLs
  $('link[rel="canonical"]').each((_, element) => {
    const href = $(element).attr('href')
    if (href) {
      links.add(href)
    }
  })
  
  // Check og:url meta tags
  $('meta[property="og:url"]').each((_, element) => {
    const content = $(element).attr('content')
    if (content) {
      links.add(content)
    }
  })
  
  permanentLogger.debug('SITEMAP_FETCH', 'Extracted links with cheerio', {
    count: links.size,
    sample: Array.from(links).slice(0, 5)
  })
  
  return Array.from(links)
}

// Simplified blog discovery - just check if blog exists
async function crawlBlogForArticles(blogUrl: string, baseUrl: string): Promise<SitemapPage[]> {
  permanentLogger.info(`📰 Blog discovery for ${blogUrl}`, { category: 'SITEMAP_FETCH' })
  
  // SIMPLIFIED: Just return the blog URL itself as a page to scrape
  // Blog articles will be discovered during the actual scraping phase
  // This avoids CORS issues and network failures
  
  const blogPages: SitemapPage[] = []
  
  // Check common blog URL patterns
  const blogPatterns = ['/blog', '/news', '/insights', '/articles', '/resources']
  
  for (const pattern of blogPatterns) {
    const url = `${baseUrl}${pattern}`
    if (url === blogUrl || blogUrl.includes(pattern)) {
      blogPages.push({
        url: blogUrl,
        title: pattern.replace(/^\//, '').charAt(0).toUpperCase() + pattern.slice(2),
        priority: 0.6
      })
      
      permanentLogger.info(`✅ Found blog section: ${blogUrl}`, { category: 'SITEMAP_FETCH' })
      break
    }
  }
  
  // If no pattern matched but URL was provided, still add it
  if (blogPages.length === 0 && blogUrl) {
    blogPages.push({
      url: blogUrl,
      title: 'Blog',
      priority: 0.6
    })
    permanentLogger.info(`✅ Added blog URL: ${blogUrl}`, { category: 'SITEMAP_FETCH' })
  }
  
  permanentLogger.info(`📰 Blog discovery complete`, {
    category: 'SITEMAP_FETCH',
    found: blogPages.length,
    note: 'Individual articles will be discovered during scraping phase'
  })
  
  return blogPages
}

// Pattern-based URL discovery - DISABLED to prevent phantom URLs
async function discoverByPatterns(baseUrl: string, existingUrls: string[]): Promise<SitemapPage[]> {
  // CRITICAL FIX: Removed hardcoded common patterns that were causing 404 errors
  // The scraper will discover URLs organically through crawling
  // Previously this was adding non-existent URLs like /products and /team
  
  permanentLogger.info(`🔍 Pattern-based discovery disabled - relying on organic discovery`, { category: 'SITEMAP_FETCH' })
  
  // Return empty array - let the scraper discover URLs naturally
  return []
}

// New streaming function for real-time updates
async function performStreamingSitemapDiscovery(
  domain: string, 
  enableIntelligence: boolean,
  sessionId: string | undefined,
  controller: ReadableStreamDefaultController
) {
  const encoder = new TextEncoder()
  const correlationId = `sitemap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Standardized event format for proper priority handling
  const sendEvent = (type: string, data: any) => {
    // Map event types to priorities
    const priorityMap: Record<string, 'fatal' | 'high' | 'normal' | 'low'> = {
      'error': 'fatal',
      'phase-complete': 'high',
      'phase-start': 'normal',
      'pages-update': 'low',
      'notification': 'normal'
    }
    
    const standardizedEvent = {
      type,
      phase: data.phase || 'sitemap_discovery',
      priority: priorityMap[type] || 'normal',
      correlationId,
      timestamp: Date.now(),
      payload: {
        message: data.message || '',
        details: data
      }
    }
    
    const message = `data: ${JSON.stringify(standardizedEvent)}\n\n`
    controller.enqueue(encoder.encode(message))
  }
  
  try {
    // Clean up domain
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const baseUrl = `https://${cleanDomain}`
    
    const allDiscoveredUrls = new Map<string, SitemapPage>()
    const discoveryStats = {
      sitemap: 0,
      homepage: 0,
      patterns: 0,
      blog: 0,
      crawling: 0
    }
    
    // Phase 1: Check sitemap.xml
    sendEvent('phase-start', { 
      phase: 'checking-sitemap',
      message: 'Looking for sitemap.xml and robots.txt...'
    })
    
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemap`,
      `${baseUrl}/robots.txt`
    ]
    
    let pages: SitemapPage[] = []
    let sitemapFound = false
    
    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await fetch(sitemapUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)'
          },
          signal: AbortSignal.timeout(10000)
        })
        
        if (response.ok) {
          const text = await response.text()
          
          if (sitemapUrl.includes('robots.txt')) {
            const sitemapMatch = text.match(/Sitemap:\\s*(.+)/i)
            if (sitemapMatch) {
              const actualSitemapUrl = sitemapMatch[1].trim()
              const sitemapResponse = await fetch(actualSitemapUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)'
                },
                signal: AbortSignal.timeout(10000)
              })
              
              if (sitemapResponse.ok) {
                const sitemapText = await sitemapResponse.text()
                pages = await parseSitemap(sitemapText, baseUrl)
                sitemapFound = true
                break
              }
            }
          } else {
            pages = await parseSitemap(text, baseUrl)
            if (pages.length > 0) {
              sitemapFound = true
              break
            }
          }
        }
      } catch (err) {
        continue
      }
    }
    
    // Add sitemap pages to discovered URLs
    pages.forEach(p => {
      const normalized = normalizeUrl(p.url)
      allDiscoveredUrls.set(normalized, p)
    })
    discoveryStats.sitemap = pages.length
    
    sendEvent('phase-complete', { 
      phase: 'checking-sitemap',
      pagesFound: pages.length,
      totalPages: allDiscoveredUrls.size,
      message: sitemapFound ? `Found ${pages.length} pages in sitemap.xml` : 'No sitemap found, continuing discovery...'
    })
    
    // Send incremental update with current pages
    sendEvent('pages-update', {
      pages: Array.from(allDiscoveredUrls.values()),
      totalCount: allDiscoveredUrls.size
    })
    
    // Phase 2: Homepage crawl
    sendEvent('phase-start', { 
      phase: 'homepage-crawl',
      message: 'Extracting all links from homepage navigation and footer...'
    })
    
    const homepagePages = await crawlHomepageComprehensive(baseUrl)
    let newPagesCount = 0
    homepagePages.forEach(p => {
      const normalized = normalizeUrl(p.url)
      if (!allDiscoveredUrls.has(normalized)) {
        allDiscoveredUrls.set(normalized, p)
        newPagesCount++
      }
    })
    discoveryStats.homepage = newPagesCount
    
    sendEvent('phase-complete', { 
      phase: 'homepage-crawl',
      pagesFound: homepagePages.length,  // Total pages found by homepage crawl
      totalPages: allDiscoveredUrls.size,
      message: `Found ${homepagePages.length} pages from homepage (${newPagesCount} new)`
    })
    
    // Send incremental update
    sendEvent('pages-update', {
      pages: Array.from(allDiscoveredUrls.values()),
      totalCount: allDiscoveredUrls.size
    })
    
    // Phase 3: Pattern discovery
    sendEvent('phase-start', { 
      phase: 'pattern-discovery',
      message: 'Checking common URL patterns for hidden pages...'
    })
    
    const patternPages = await discoverByPatterns(baseUrl, Array.from(allDiscoveredUrls.keys()))
    newPagesCount = 0
    patternPages.forEach(p => {
      const normalized = normalizeUrl(p.url)
      if (!allDiscoveredUrls.has(normalized)) {
        allDiscoveredUrls.set(normalized, p)
        newPagesCount++
      }
    })
    discoveryStats.patterns = newPagesCount
    
    sendEvent('phase-complete', { 
      phase: 'pattern-discovery',
      pagesFound: patternPages.length,  // Total pages found by pattern discovery
      totalPages: allDiscoveredUrls.size,
      message: `Found ${patternPages.length} pages via pattern matching (${newPagesCount} new)`
    })
    
    // Send incremental update
    sendEvent('pages-update', {
      pages: Array.from(allDiscoveredUrls.values()),
      totalCount: allDiscoveredUrls.size
    })
    
    // Phase 4: Blog crawl
    sendEvent('phase-start', { 
      phase: 'blog-crawl',
      message: 'Discovering blog articles and resource pages...'
    })
    
    // Check for blog pages - try common blog URLs even if not discovered yet
    const potentialBlogUrls = [`${baseUrl}/blog`, `${baseUrl}/news`, `${baseUrl}/insights`, `${baseUrl}/articles`]
    let totalBlogPagesFound = 0  // Total blog articles discovered
    let newBlogPagesAdded = 0    // New unique blog articles added
    
    for (const blogUrl of potentialBlogUrls) {
      try {
        // Check if blog page exists - use GET for better reliability
        const checkResponse = await fetch(blogUrl, {
          method: 'GET',
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          signal: AbortSignal.timeout(3000)
        })
        
        // Accept successful responses and redirects
        if (checkResponse.ok || checkResponse.status === 301 || checkResponse.status === 302) {
          permanentLogger.info(`Found blog page at ${blogUrl}`, { category: 'SITEMAP_FETCH' })
          
          // Add the blog page itself if not already discovered
          const normalizedBlogUrl = normalizeUrl(blogUrl)
          if (!allDiscoveredUrls.has(normalizedBlogUrl)) {
            allDiscoveredUrls.set(normalizedBlogUrl, {
              url: blogUrl,
              title: 'Blog',
              priority: 0.8
            })
          }
          
          // Crawl for articles
          const blogPages = await crawlBlogForArticles(blogUrl, baseUrl)
          totalBlogPagesFound += blogPages.length  // Count all articles found
          
          blogPages.forEach(p => {
            const normalized = normalizeUrl(p.url)
            if (!allDiscoveredUrls.has(normalized)) {
              allDiscoveredUrls.set(normalized, p)
              newBlogPagesAdded++
            }
          })
        }
      } catch (error) {
        // Blog URL doesn't exist, continue to next
        permanentLogger.debug('SITEMAP_FETCH', `No blog at ${blogUrl}`)
      }
    }
    
    discoveryStats.blog = newBlogPagesAdded
    
    sendEvent('phase-complete', { 
      phase: 'blog-crawl',
      pagesFound: totalBlogPagesFound,  // Total blog articles found by this phase
      totalPages: allDiscoveredUrls.size,
      message: `Found ${totalBlogPagesFound} blog articles (${newBlogPagesAdded} new)`
    })
    
    // Send incremental update
    sendEvent('pages-update', {
      pages: Array.from(allDiscoveredUrls.values()),
      totalCount: allDiscoveredUrls.size
    })
    
    // Phase 5: Validation
    sendEvent('phase-start', { 
      phase: 'validation',
      message: `Validating and deduplicating ${allDiscoveredUrls.size} discovered pages...`
    })
    
    // Convert to array and sort
    const finalPages = Array.from(allDiscoveredUrls.values())
    finalPages.sort((a, b) => (b.priority || 0.5) - (a.priority || 0.5))
    
    // Log discovery breakdown
    permanentLogger.info('📊 FINAL DISCOVERY BREAKDOWN', {
      category: 'SITEMAP_FETCH',
      sitemap: discoveryStats.sitemap,
      homepage: discoveryStats.homepage,
      patterns: discoveryStats.patterns,
      blog: discoveryStats.blog,
      crawling: discoveryStats.crawling,
      total: finalPages.length,
      urls: finalPages.map(p => p.url).slice(0, 50) // Show first 50 URLs
    })
    
    // Limit if needed
    const limitedPages = finalPages.length > 200 ? finalPages.slice(0, 200) : finalPages
    
    sendEvent('phase-complete', { 
      phase: 'validation',
      pagesFound: limitedPages.length,
      totalPages: limitedPages.length,
      message: `Validation complete! ${limitedPages.length} unique pages ready for selection.`
    })
    
    // Send final result
    sendEvent('discovery-complete', {
      domain: cleanDomain,
      pages: limitedPages,
      sitemapFound,
      discoveredFrom: discoveryStats,
      intelligenceEnabled: enableIntelligence,
      sessionId,
      summary: {
        totalPages: limitedPages.length,
        classifiedPages: enableIntelligence ? limitedPages.filter(p => p.pageType).length : 0,
        pageTypes: Array.from(new Set(limitedPages.filter(p => p.pageType).map(p => p.pageType))),
        averageConfidence: limitedPages.filter(p => p.confidence).reduce((sum, p) => sum + (p.confidence || 0), 0) / limitedPages.filter(p => p.confidence).length || 0
      }
    })
    
  } catch (error) {
    sendEvent('error', {
      message: 'Failed to complete sitemap discovery',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    controller.close()
  }
}

// Crawl a specific page for additional links
async function crawlPageForLinks(pageUrl: string, baseUrl: string): Promise<SitemapPage[]> {
  const discoveredPages: SitemapPage[] = []
  
  try {
    permanentLogger.info(`🕷️ Crawling page for sub-links`, { category: 'SITEMAP_FETCH', pageUrl })
    
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)'
      },
      signal: AbortSignal.timeout(10000)
    })
    
    if (!response.ok) {
      return discoveredPages
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    const links = new Set<string>()
    
    // Extract all links
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href')
      if (href) {
        // Convert relative to absolute
        let absoluteUrl = href
        if (href.startsWith('/')) {
          absoluteUrl = `${baseUrl}${href}`
        } else if (!href.startsWith('http')) {
          // Skip non-HTTP links
          return
        }
        
        // Only include same-domain links
        if (absoluteUrl.startsWith(baseUrl)) {
          // Normalize URL
          try {
            const url = new URL(absoluteUrl)
            url.hash = ''
            let normalized = url.toString()
            if (normalized.endsWith('/') && normalized !== baseUrl + '/') {
              normalized = normalized.slice(0, -1)
            }
            links.add(normalized)
          } catch {
            // Invalid URL
          }
        }
      }
    })
    
    // Convert to pages
    for (const url of links) {
      // Skip the page we're crawling
      if (url === pageUrl) continue
      
      // Generate title from URL
      const urlPath = url.replace(baseUrl, '')
      const title = urlPath
        .split('/')
        .filter(Boolean)
        .map(segment => segment.replace(/-/g, ' '))
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' > ')
      
      discoveredPages.push({
        url,
        title: title || 'Page',
        priority: 0.3
      })
    }
    
    permanentLogger.info(`✅ Page crawl complete`, {
      category: 'SITEMAP_FETCH',
      pageUrl,
      linksFound: discoveredPages.length
    })
    
  } catch (error) {
    permanentLogger.captureError('SITEMAP_FETCH', new Error('Failed to crawl page'), { pageUrl,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  return discoveredPages
}