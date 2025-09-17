'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  FileText,
  CheckCircle,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Star,
  Circle,
  Info,
  Link,
  Clock,
  Home,
  ShoppingBag,
  Users,
  Globe,
  CheckCircle2,
  XCircle
} from 'lucide-react'
// Remove direct persistentToast - using event bus instead
import { SitemapDiscoveryProgress } from './sitemap-discovery-progress'
import { TooltipWrapper } from './tooltip-wrapper'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { cn } from '@/lib/utils'
import { eventBus } from '@/lib/notifications/event-bus'
import { EventPriority, EventSource } from '@/lib/notifications/types'
// New utilities for SOLID/DRY compliance
import { NotificationIdGenerator } from '@/lib/notifications/utils/id-generator'
import { EventFactory, StreamReader } from '@/lib/realtime-events'
import { getDeduplicationService } from '@/lib/notifications/utils/deduplication-service'

interface SitemapSelectorProps {
  domain: string
  sessionId?: string // For reading from database if needed
  onComplete: (pages: string[]) => void // Called only on explicit approval
  onSelectionReady?: (ready: boolean, count: number) => void // Notify parent of selection state
}

// Enhanced page information structure
interface EnhancedPageInfo {
  id: string
  title: string
  url: string
  relativePath: string
  category: 'critical' | 'important' | 'useful' | 'optional'
  pageType: string
  priority: number
  lastModified?: string
  isDuplicate?: boolean
  duplicateOf?: string
  selectionReason?: string
  metadata?: {
    size?: number
    hasContent?: boolean
    updateFrequency?: string
  }
}

// Page category definitions with intelligent selection logic
const PAGE_CATEGORIES = {
  critical: {
    label: 'Critical Pages',
    description: 'Essential for understanding the business',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: Star,
    autoSelect: true,
    patterns: [
      '/', '/index', '/home', 
      '/about', '/about-us', '/team', 
      '/services', '/products', '/solutions', 
      '/blog', '/news', '/insights', '/articles', 
      '/contact', '/contact-us', '/get-in-touch',
      '/case-studies', '/case-study', '/portfolio', '/work', '/projects',
      '/pricing', '/plans', '/features', '/capabilities',
      '/clients', '/customers', '/testimonials', '/reviews',
      '/partners', '/partnerships', '/awards', '/achievements'
    ]
  },
  important: {
    label: 'Important Pages',
    description: 'Valuable for comprehensive analysis',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: CheckCircle2,
    autoSelect: true, // Auto-select for comprehensive testing
    patterns: [
      '/investor-relations', '/investors', '/ir', 
      '/stock', '/share-price', '/aim-rule-26', '/aim-26',
      '/governance', '/board', '/reports', '/financial-reports',
      '/annual-report', '/quarterly-results', '/regulatory-news'
    ]
  },
  useful: {
    label: 'Useful Pages',
    description: 'Additional context and information',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    icon: Info,
    autoSelect: false,
    patterns: ['/resources', '/faq', '/support', '/help', '/docs', '/downloads', '/white-papers']
  },
  optional: {
    label: 'Optional Pages',
    description: 'Low priority pages - typically skipped',
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    borderColor: 'border-gray-200 dark:border-gray-800',
    icon: Circle,
    autoSelect: false,
    patterns: ['/privacy', '/terms', '/cookies', '/legal', '/sitemap', '/accessibility', '/disclaimer']
  }
}

// Helper function to categorize pages intelligently
function categorizePageIntelligently(url: string, title: string): EnhancedPageInfo['category'] {
  const lowerUrl = url.toLowerCase()
  const lowerTitle = title.toLowerCase()
  const startTime = performance.now()

  // PRIORITY 1: Always categorize homepage as critical
  if (lowerUrl === '/' || lowerUrl === '' || lowerUrl === '/index' || lowerUrl === '/index.html' ||
      lowerTitle === 'home' || lowerTitle === 'homepage' || lowerTitle === 'home page') {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url,
      title,
      reason: 'homepage_detection',
      timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  
  // PRIORITY 4: Check for financial/investor pages (important category)
  if (matchesAnyPattern(lowerUrl, ['investor-relations', 'investors', 'ir', 'financials', 'earnings',
                                   'annual-report', 'quarterly-results', 'stock', 'share-price',
                                   'aim-rule-26', 'aim-26', 'governance', 'board'])) {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as important', {
      url,
      title,
      reason: 'financial_investor_page',
      timeMs: performance.now() - startTime
    })
    return 'important'
  }

  // PRIORITY 5: Check for main section pages (critical)
  const criticalMainSections = ['about', 'about-us', 'services', 'products', 'solutions',
                                'contact', 'contact-us', 'team', 'leadership', 'portfolio',
                                'case-studies', 'clients', 'pricing', 'plans', 'features']

  for (const section of criticalMainSections) {
    if (isMainSectionPage(lowerUrl, section) || hasPathSegment(lowerUrl, section)) {
      permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
        url,
        title,
        reason: `main_section_${section}`,
        timeMs: performance.now() - startTime
      })
      return 'critical'
    }
  }

  // PRIORITY 6: Check for blog/news main pages (critical) vs posts (useful)
  const contentSections = ['blog', 'news', 'insights', 'articles', 'posts']
  for (const section of contentSections) {
    if (isMainSectionPage(lowerUrl, section)) {
      permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
        url,
        title,
        reason: `main_${section}_page`,
        timeMs: performance.now() - startTime
      })
      return 'critical'
    }
  }

  // Individual blog posts are useful, not critical
  if (isBlogPost(lowerUrl)) {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as useful', {
      url,
      title,
      reason: 'individual_blog_post',
      timeMs: performance.now() - startTime
    })
    return 'useful'
  }
  
  // Additional intelligence based on title (more inclusive for critical pages)
  if ((lowerTitle === 'about' || lowerTitle === 'about us' || lowerTitle === 'who we are')) {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'about_page_title', timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  if ((lowerTitle === 'services' || lowerTitle === 'products' || lowerTitle === 'solutions')) {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'services_page_title', timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  if (lowerTitle === 'contact' || lowerTitle === 'contact us' || lowerTitle === 'get in touch') {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'contact_page_title', timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  if (lowerTitle === 'team' || lowerTitle === 'our team' || lowerTitle === 'leadership') {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'team_page_title', timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  if (lowerTitle === 'blog' || lowerTitle === 'news' || lowerTitle === 'insights' || lowerTitle === 'articles') {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'blog_page_title', timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  if (lowerTitle.includes('case stud') || lowerTitle === 'portfolio' || lowerTitle === 'our work' || lowerTitle === 'projects') {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'portfolio_page_title', timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  if (lowerTitle === 'pricing' || lowerTitle === 'plans' || lowerTitle === 'features' || lowerTitle === 'capabilities') {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'pricing_page_title', timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  if (lowerTitle === 'clients' || lowerTitle === 'customers' || lowerTitle.includes('testimonial') || lowerTitle === 'reviews') {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'clients_page_title', timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  if (lowerTitle === 'partners' || lowerTitle === 'partnerships' || lowerTitle.includes('award')) {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'partners_page_title', timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  if (lowerTitle.includes('investor') || lowerTitle === 'ir' || lowerTitle.includes('aim rule') || lowerTitle.includes('stock')) return 'important'
  
  // Check for blog/news/article pages (any page with these words should be critical)
  if (lowerUrl.includes('/blog/') || lowerUrl.includes('/news/') || lowerUrl.includes('/article/') ||
      lowerUrl.includes('/insight/') || lowerUrl.includes('/post/')) {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'content_url_pattern', timeMs: performance.now() - startTime
    })
    return 'critical'
  }

  // Check for service pages (URLs containing service-related paths)
  if (lowerUrl.includes('/service') || lowerUrl.includes('/solution') || lowerUrl.includes('/product')) {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'service_url_pattern', timeMs: performance.now() - startTime
    })
    return 'critical'
  }

  // Check for case studies, portfolio, and business validation pages
  if (lowerUrl.includes('/case-stud') || lowerUrl.includes('/portfolio') || lowerUrl.includes('/work/') ||
      lowerUrl.includes('/project/') || lowerUrl.includes('/client') || lowerUrl.includes('/customer') ||
      lowerUrl.includes('/testimonial') || lowerUrl.includes('/review') || lowerUrl.includes('/partner') ||
      lowerUrl.includes('/award') || lowerUrl.includes('/achievement')) {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'validation_url_pattern', timeMs: performance.now() - startTime
    })
    return 'critical'
  }

  // Check for pricing and features
  if (lowerUrl.includes('/pricing') || lowerUrl.includes('/price') || lowerUrl.includes('/plan') ||
      lowerUrl.includes('/feature') || lowerUrl.includes('/capabilit')) {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as critical', {
      url, title, reason: 'pricing_url_pattern', timeMs: performance.now() - startTime
    })
    return 'critical'
  }
  
  // Check for investor relations and financial pages (important category)
  if (lowerUrl.includes('/investor') || lowerUrl.includes('/ir/') || lowerUrl === '/ir' ||
      lowerUrl.includes('/stock') || lowerUrl.includes('/share') || lowerUrl.includes('/aim') ||
      lowerUrl.includes('/governance') || lowerUrl.includes('/board') || lowerUrl.includes('/financial') ||
      lowerUrl.includes('/annual-report') || lowerUrl.includes('/quarterly')) return 'important'
  
  if (lowerTitle.includes('privacy') || lowerTitle.includes('terms') || lowerTitle.includes('cookie')) {
    permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as optional', {
      url, title, reason: 'legal_page_title', timeMs: performance.now() - startTime
    })
    return 'optional'
  }

  // Default to useful if unsure
  permanentLogger.breadcrumb('SITEMAP_SELECTOR', 'Page categorized as useful', {
    url, title, reason: 'default_fallback', timeMs: performance.now() - startTime
  })
  return 'useful'
}

// Helper to get selection reason
function getSelectionReason(category: EnhancedPageInfo['category'], url: string): string {
  switch (category) {
    case 'critical':
      if (url === '/' || url.endsWith('/index')) return 'Homepage - primary entry point'
      if (url.includes('/about')) return 'Company information and background'
      if (url.includes('/team')) return 'Team and leadership - key personnel information'
      if (url.includes('/services') || url.includes('/service')) return 'Core service offerings'
      if (url.includes('/products') || url.includes('/product')) return 'Product catalog and details'
      if (url.includes('/blog') || url.includes('/article')) return 'Blog content - thought leadership and expertise'
      if (url.includes('/news') || url.includes('/insight')) return 'News and insights - company updates and industry views'
      if (url.includes('/contact')) return 'Contact information - engagement channels'
      return 'Essential business information'
    case 'important':
      if (url.includes('/investor') || url.includes('/ir')) return 'Investor relations and financial information'
      if (url.includes('/stock') || url.includes('/share')) return 'Stock and share price information'
      if (url.includes('/aim-rule') || url.includes('/aim-26')) return 'AIM Rule 26 regulatory compliance information'
      if (url.includes('/governance') || url.includes('/board')) return 'Corporate governance and board information'
      if (url.includes('/report') || url.includes('/financial')) return 'Financial reports and results'
      return 'Important business and financial context'
    case 'useful':
      if (url.includes('/blog')) return 'Content strategy and thought leadership'
      if (url.includes('/resources')) return 'Additional resources and materials'
      return 'Supplementary information'
    case 'optional':
      return 'Legal and compliance pages - usually not needed for analysis'
  }
}

// Helper to extract relative path
function getRelativePath(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname || '/'
  } catch {
    // If not a valid URL, try to extract path
    const match = url.match(/https?:\/\/[^\/]+(.*)/)
    return match ? match[1] : url
  }
}

export function SitemapSelectorMUI({
  domain,
  sessionId,
  onComplete,
  onSelectionReady
}: SitemapSelectorProps) {
  const [pages, setPages] = useState<EnhancedPageInfo[]>([])
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['critical', 'important']))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discoveryStage, setDiscoveryStage] = useState<string>('')
  const [discoveredCount, setDiscoveredCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isRetrying, setIsRetrying] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string>('')

  // Map backend phase IDs to frontend stage IDs
  const mapPhaseToStage = (phase: string): string => {
    const mapping: Record<string, string> = {
      'sitemap': 'checking-sitemap',
      'homepage': 'homepage-crawl',
      'patterns': 'pattern-discovery',
      'blog': 'blog-crawl',
      'validation': 'validation'
    }
    return mapping[phase] || phase
  }

  // Transform raw pages to enhanced format with intelligent categorization
  const transformToEnhancedPages = (rawPages: any[]): EnhancedPageInfo[] => {
    const startTime = performance.now()
    const enhancedPages: EnhancedPageInfo[] = []
    const seenUrls = new Set<string>()
    const titleCounts = new Map<string, number>()
    const categoryCounts = { critical: 0, important: 0, useful: 0, optional: 0 }

    permanentLogger.info('SITEMAP_SELECTOR', 'Starting page transformation', {
      rawPageCount: rawPages.length,
      timestamp: new Date().toISOString()
    })
    
    // First pass: count title occurrences (but not URL duplicates)
    rawPages.forEach(page => {
      const title = page.title || 'Untitled Page'
      titleCounts.set(title, (titleCounts.get(title) || 0) + 1)
    })
    
    // Second pass: create enhanced pages
    rawPages.forEach((page, index) => {
      // Skip actual duplicate URLs (same URL should not appear twice)
      if (seenUrls.has(page.url)) {
        return
      }
      seenUrls.add(page.url)
      
      const title = page.title || 'Untitled Page'
      const relativePath = getRelativePath(page.url)
      const category = categorizePageIntelligently(page.url, title)
      const hasSimilarTitles = (titleCounts.get(title) || 0) > 1
      
      // Debug logging for homepage and critical pages
      if (title.toLowerCase().includes('home') || relativePath === '/' || 
          title.toLowerCase().includes('team') || title.toLowerCase().includes('service')) {
        console.log(`Categorizing: "${title}" (${relativePath}) -> ${category}`)
      }
      
      // If multiple pages have the same title, append path to disambiguate
      const displayTitle = hasSimilarTitles ? `${title} [${relativePath}]` : title
      
      // Track category distribution
      if (categoryCounts[category as keyof typeof categoryCounts] !== undefined) {
        categoryCounts[category as keyof typeof categoryCounts]++
      }

      // Generate stable ID based on URL (not index) to prevent duplicates
      const urlHash = page.url.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      const stableId = `page_${urlHash}`

      enhancedPages.push({
        id: stableId,
        title: displayTitle,
        url: page.url,
        relativePath: relativePath,
        category: category,
        pageType: page.type || 'other',
        priority: page.priority || 0.5,
        lastModified: page.lastmod,
        isDuplicate: false, // Only actual URL duplicates are duplicates
        selectionReason: getSelectionReason(category, page.url),
        metadata: {
          hasContent: true,
          updateFrequency: page.changefreq
        }
      })
    })

    permanentLogger.info('SITEMAP_SELECTOR', 'Page transformation complete', {
      enhancedPageCount: enhancedPages.length,
      categoryCounts,
      duplicatesSkipped: rawPages.length - enhancedPages.length,
      timeMs: performance.now() - startTime
    })

    return enhancedPages
  }

  // Group pages by category with defensive coding and proper mapping
  const groupedPages = useMemo(() => {
    const groups: Record<string, EnhancedPageInfo[]> = {
      critical: [],
      important: [],
      useful: [],
      optional: []
    }

    const filteredPages = pages.filter(page => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        page.title.toLowerCase().includes(query) ||
        page.url.toLowerCase().includes(query) ||
        page.relativePath.toLowerCase().includes(query)
      )
    })

    filteredPages.forEach(page => {
      // Defensive coding: ensure category exists
      const category = page.category || 'useful'

      // Additional defensive check: ensure the category exists in groups
      if (groups[category]) {
        groups[category].push(page)
      } else {
        // Log error with permanentLogger and add to 'useful' as fallback
        permanentLogger.captureError('SITEMAP_SELECTOR', new Error('Unknown page category'), {
          category,
          pageUrl: page.url,
          pageTitle: page.title,
          availableCategories: Object.keys(groups)
        })
        groups['useful'].push(page)
      }
    })

    return groups
  }, [pages, searchQuery])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = pages.length
    const selected = selectedPages.size
    const byCategory = {
      critical: groupedPages.critical.filter(p => selectedPages.has(p.id)).length,
      important: groupedPages.important.filter(p => selectedPages.has(p.id)).length,
      useful: groupedPages.useful.filter(p => selectedPages.has(p.id)).length,
      optional: groupedPages.optional.filter(p => selectedPages.has(p.id)).length
    }
    return { total, selected, byCategory }
  }, [pages, selectedPages, groupedPages])

  // Fetch sitemap data
  const fetchSitemap = async () => {
    // Generate correlation ID for this request
    const correlationId = NotificationIdGenerator.correlationId()
    const deduplicationService = getDeduplicationService(100)
    
    permanentLogger.info('Starting sitemap fetch', { category: 'SITEMAP_SELECTOR', domain, correlationId })
    setIsLoading(true)
    setError(null)
    setDiscoveredCount(0)
    setDiscoveryStage('checking-sitemap')
    setPages([])
    
    try {
      // We'll handle streaming response directly since this uses POST
      // The API doesn't support EventSource (GET only), so we use fetch with streaming
      
      // Set up a handler for the streaming response data
      const handleStreamingData = (data: any) => {
        // Log the raw event for debugging
        permanentLogger.info('SITEMAP_SELECTOR', 'Received streaming event', {
          type: data.type,
          hasPages: !!data.pages,
          pageCount: data.pages?.length || 0,
          phase: data.phase,
          correlationId: data.correlationId
        })

        // No more double-wrapping - data comes directly from backend
        const eventData = data

        // Debug logging for critical events
        if (data.type === 'discovery-complete' || data.type === 'pages-update') {
          permanentLogger.info('SITEMAP_SELECTOR', 'Processing discovery event', {
            type: data.type,
            pageCount: data.pages?.length || 0,
            totalCount: data.totalCount || 0,
            timestamp: data.timestamp
          })
        }

        // Handle different event types
        if (data.type === 'phase-start') {
          const phase = data.phase
          const mappedStage = mapPhaseToStage(phase)
          setDiscoveryStage(mappedStage)
          permanentLogger.info('SITEMAP_SELECTOR', 'Phase started', {
            phase,
            mappedStage,
            phaseName: data.phaseName,
            description: data.description
          })
        } else if (data.type === 'phase-complete') {
          // Don't overwrite discovered count if we already have pages
          const totalPages = data.totalPages || data.totalCount || data.found || data.count || discoveredCount
          setDiscoveredCount(totalPages)
          permanentLogger.info('SITEMAP_SELECTOR', 'Phase completed', {
            phase: data.phase,
            totalPages,
            found: data.found,
            count: data.count
          })
        } else if (data.type === 'pages-update') {
          // DEBUG: Log full data to understand structure
          console.log('PAGES_UPDATE_DEBUG: Full event received:', {
            type: data.type,
            hasPages: !!data.pages,
            pagesIsArray: Array.isArray(data.pages),
            pageCount: data.pages?.length || 0,
            firstPage: data.pages?.[0] || null,
            dataKeys: Object.keys(data),
            fullData: JSON.stringify(data, null, 2)
          })

          const pages = data.pages || []
          const totalCount = data.totalCount || pages.length

          if (pages.length > 0) {
            permanentLogger.info('SITEMAP_SELECTOR', 'Pages update received', { pageCount: pages.length, totalCount })
            const newEnhancedPages = transformToEnhancedPages(pages)

            // Merge with existing pages, avoiding duplicates based on URL
            setPages(prevPages => {
              const existingUrls = new Set(prevPages.map(p => p.url))
              const uniqueNewPages = newEnhancedPages.filter(p => !existingUrls.has(p.url))
              const mergedPages = [...prevPages, ...uniqueNewPages]

              permanentLogger.info('SITEMAP_SELECTOR', 'Pages merged', {
                previousCount: prevPages.length,
                newCount: newEnhancedPages.length,
                uniqueNewCount: uniqueNewPages.length,
                totalAfterMerge: mergedPages.length
              })

              return mergedPages
            })
            setDiscoveredCount(totalCount)
          
            // Auto-select all critical and important pages
            const autoSelected = new Set<string>()
            let criticalCount = 0
            let importantCount = 0

            newEnhancedPages.forEach(page => {
              if (page.category === 'critical') {
                autoSelected.add(page.id)
                criticalCount++
              } else if (page.category === 'important') {
                autoSelected.add(page.id)
                importantCount++
              }
            })

            if (autoSelected.size > 0) {
              permanentLogger.info('SITEMAP_SELECTOR', 'Auto-selecting pages', {
                criticalCount,
                importantCount,
                totalSelected: autoSelected.size
              })
              setSelectedPages(autoSelected)

              // Immediately notify parent of the auto-selection
              if (onSelectionReady) {
                onSelectionReady(true, autoSelected.size)
              }

              // REMOVED: Premature onComplete call - wait for user approval
              // The parent will get URLs when user explicitly approves
            }
          }
        } else if (data.type === 'validation') {
          setValidationMessage(data.message || '')
          setDiscoveryStage('validation')
          permanentLogger.info('SITEMAP_SELECTOR', 'Validation phase', {
            message: data.message
          })
        } else if (data.type === 'complete' || data.type === 'discovery-complete') {
          // Discovery is complete - extract pages and stop loading

          // DEBUG: Log the entire data structure to understand what we're receiving
          console.log('DISCOVERY_COMPLETE_DEBUG: Full event received:', {
            type: data.type,
            hasPages: !!data.pages,
            pagesIsArray: Array.isArray(data.pages),
            pageCount: data.pages?.length || 0,
            firstPage: data.pages?.[0] || null,
            dataKeys: Object.keys(data),
            fullData: JSON.stringify(data, null, 2)
          })

          permanentLogger.info('SITEMAP_SELECTOR', 'Discovery complete received', {
            dataType: data.type,
            pageCount: data.pages?.length || 0,
            existingPageCount: pages.length,
            sitemapFound: data.sitemapFound,
            discoveredFrom: data.discoveredFrom,
            hasPages: !!data.pages,
            dataKeys: Object.keys(data)
          })

          // Extract pages from discovery-complete event
          // Check multiple possible locations for pages
          const discoveredPages = data.pages || data.data?.pages || []

          permanentLogger.info('SITEMAP_SELECTOR', 'Pages extraction from discovery-complete', {
            discoveredPagesCount: discoveredPages.length,
            fromDataPages: data.pages?.length || 0,
            fromDataDataPages: data.data?.pages?.length || 0
          })

          // If no pages in complete event but we already have pages from updates, keep them
          if (discoveredPages.length === 0 && pages.length > 0) {
            permanentLogger.info('SITEMAP_SELECTOR', 'Discovery complete - using pages from incremental updates', {
              existingPageCount: pages.length
            })
            // Don't clear pages - they were already set by pages-update events
            // Just update the discovered count to match what we have
            setDiscoveredCount(pages.length)
          } else if (discoveredPages.length > 0) {
            permanentLogger.info('SITEMAP_SELECTOR', 'Processing discovered pages from complete event', {
              pageCount: discoveredPages.length
            })

            // Transform and merge the pages
            const newEnhancedPages = transformToEnhancedPages(discoveredPages)

            // If we already have pages, merge them; otherwise set directly
            setPages(prevPages => {
              if (prevPages.length === 0) {
                // No existing pages, just set the new ones
                return newEnhancedPages
              }

              // Merge with existing pages, avoiding duplicates
              const existingUrls = new Set(prevPages.map(p => p.url))
              const uniqueNewPages = newEnhancedPages.filter(p => !existingUrls.has(p.url))
              const mergedPages = [...prevPages, ...uniqueNewPages]

              permanentLogger.info('SITEMAP_SELECTOR', 'Discovery complete - pages merged', {
                previousCount: prevPages.length,
                newCount: newEnhancedPages.length,
                uniqueNewCount: uniqueNewPages.length,
                totalAfterMerge: mergedPages.length
              })

              return mergedPages
            })
            setDiscoveredCount(discoveredPages.length)

            // Auto-select critical and important pages
            const autoSelected = new Set<string>()
            let criticalCount = 0
            let importantCount = 0

            newEnhancedPages.forEach(page => {
              if (page.category === 'critical') {
                autoSelected.add(page.id)
                criticalCount++
              } else if (page.category === 'important') {
                autoSelected.add(page.id)
                importantCount++
              }
            })

            if (autoSelected.size > 0) {
              permanentLogger.info('SITEMAP_SELECTOR', 'Auto-selecting pages from complete event', {
                criticalCount,
                importantCount,
                totalSelected: autoSelected.size
              })
              setSelectedPages(autoSelected)

              // Notify parent of selection readiness
              if (onSelectionReady) {
                onSelectionReady(true, autoSelected.size)
              }
            }
          } else {
            // No pages found at all - this is a real "no pages" scenario
            permanentLogger.info('SITEMAP_SELECTOR', 'Discovery complete with no pages found', {
              discoveredPagesLength: discoveredPages.length,
              existingPagesLength: pages.length
            })
          }

          // Clear loading state
          setDiscoveryStage('')
          setValidationMessage('')
          setIsLoading(false)
        } else if (data.type === 'error') {
          // Capture error with breadcrumbs and timing
          const errorTime = Date.now()
          permanentLogger.captureError('SITEMAP_SELECTOR', new Error(data.message), {
            eventType: data.type,
            domain,
            timing: { errorReceivedMs: errorTime - (window.performance?.now() || 0) }
          })
          setError(data.message)
          setIsLoading(false)
        } else if (data.type === 'discovery-failed') {
          // Handle discovery failure with detailed error
          const errorMessage = data.error || 'Discovery failed'
          permanentLogger.captureError('SITEMAP_SELECTOR', new Error(errorMessage), {
            eventType: 'discovery-failed',
            domain,
            sessionId: data.sessionId,
            pagesFound: data.pagesFound || 0
          })
          setError(`Discovery failed: ${errorMessage}`)
          setIsLoading(false)
        } else if (data.type === 'notification') {
          // Handle notification events
          permanentLogger.info('SITEMAP_SELECTOR', 'Notification received', {
            message: data.message,
            notificationType: data.notificationType
          })

          // Show toast notification if it's an error
          if (data.notificationType === 'error') {
            setError(data.message)
          }
        }
      }
      
      // Make the actual request with streaming
      const response = await fetch('/api/company-intelligence/fetch-sitemap', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          domain,
          enableIntelligence: true,
          sessionId: sessionId // Pass session ID for database integration
        })
      })

      if (!response.ok) {
        // Parse the error response to get the actual error message
        const errorData = await response.json()
        throw new Error(errorData.error || response.statusText)
      }
      
      // Process the streaming response
      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                handleStreamingData(data)

                // Create proper notification events using EventFactory
                if (data.message) {
                  const event = EventFactory.notification(
                    data.message,
                    data.type === 'error' ? 'error' : 'info',
                    {
                      source: EventSource.SERVER,
                      correlationId
                    }
                  )
                  eventBus.emit(event)
                }
              } catch (parseError) {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sitemap'
      setError(message)

      // Use EventFactory for error notification without duplicating context
      // Only add [SITEMAP] prefix if not already present in the message
      const errorMessage = message.includes('[SITEMAP]') ? message : `[SITEMAP] ${message}`
      const errorEvent = EventFactory.error(
        errorMessage,
        err instanceof Error ? err : undefined,
        {
          correlationId,
          priority: EventPriority.HIGH
        }
      )
      eventBus.emit(errorEvent)
      
      setDiscoveryStage('')
    } finally {
      setIsLoading(false)
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    console.log('SITEMAP_SELECTOR: useEffect triggered, domain:', domain)
    if (domain) {
      console.log('SITEMAP_SELECTOR: Calling fetchSitemap')
      fetchSitemap()
    }
    
    // No cleanup needed since we're handling streaming directly
  }, [domain])

  // REMOVED: Duplicate auto-selection logic that was causing race conditions
  // Auto-selection now happens immediately when pages are discovered in handleStreamingData
  
  // REMOVED: Automatic onComplete calling that was causing premature data submission
  // The parent component will now explicitly request the selected pages when user approves

  // Notify parent of selection readiness (for UI updates only, not data submission)
  useEffect(() => {
    if (!isLoading) {
      const selectedCount = selectedPages.size
      const isReady = selectedCount > 0

      // Only notify parent about selection state for UI updates
      // DO NOT call onComplete here - wait for explicit user approval
      if (onSelectionReady) {
        onSelectionReady(isReady, selectedCount)
      }
    }
  }, [selectedPages, isLoading, onSelectionReady])

  // Get currently selected URLs (for parent to call when needed)
  const getSelectedUrls = (): string[] => {
    return pages
      .filter(page => selectedPages.has(page.id))
      .map(page => page.url)
  }

  // Handle selection changes
  const handlePageToggle = (pageId: string) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(pageId)) {
        newSet.delete(pageId)
      } else {
        newSet.add(pageId)
      }
      return newSet
    })
  }

  // Handle category selection
  const handleCategoryToggle = (category: string) => {
    const categoryPages = groupedPages[category] || []
    const allSelected = categoryPages.every(p => selectedPages.has(p.id))
    
    setSelectedPages(prev => {
      const newSet = new Set(prev)
      categoryPages.forEach(page => {
        if (allSelected) {
          newSet.delete(page.id)
        } else {
          newSet.add(page.id)
        }
      })
      
      // Notify parent of selection changes
      const selectedUrls = pages
        .filter(page => newSet.has(page.id))
        .map(page => page.url)
      
      if (selectedUrls.length > 0) {
        onComplete(selectedUrls)
      }
      
      return newSet
    })
  }

  // Handle confirm selection
  const handleConfirmSelection = (e: React.MouseEvent) => {
    console.log('Confirm Selection clicked!', { selectedPages: selectedPages.size })
    e.preventDefault()
    e.stopPropagation()
    
    const selectedUrls = pages
      .filter(page => selectedPages.has(page.id))
      .map(page => page.url)
    
    console.log('Selected URLs:', selectedUrls)
    
    permanentLogger.info('Pages selected for scraping', { category: 'SITEMAP_SELECTOR', total: selectedUrls.length,
      urls: selectedUrls })
    
    if (selectedUrls.length > 0) {
      onComplete(selectedUrls)
    } else {
      console.error('No URLs selected!')
    }
  }

  // Render page row
  const renderPageRow = (page: EnhancedPageInfo) => {
    const isSelected = selectedPages.has(page.id)

    // Defensive coding: ensure category exists with fallback
    let category = PAGE_CATEGORIES[page.category as keyof typeof PAGE_CATEGORIES]
    if (!category) {
      permanentLogger.captureError('SITEMAP_SELECTOR', new Error('Invalid category in renderPageRow'), {
        pageId: page.id,
        pageCategory: page.category,
        pageUrl: page.url,
        availableCategories: Object.keys(PAGE_CATEGORIES)
      })
      // Use 'useful' as fallback category
      category = PAGE_CATEGORIES.useful
    }

    const Icon = category.icon
    
    return (
      <div
        key={page.id}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-accent/50",
          isSelected ? "bg-accent/20 border-primary/30" : "border-transparent"
        )}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => handlePageToggle(page.id)}
          className="flex-shrink-0"
        />
        
        <Icon className={cn("w-4 h-4 flex-shrink-0", category.color)} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link className="w-3 h-3 text-primary flex-shrink-0" />
            <TooltipWrapper content={`Full URL: ${page.url}`}>
              <code className="text-sm font-mono font-medium text-foreground hover:text-primary transition-colors cursor-help truncate">
                {page.relativePath}
              </code>
            </TooltipWrapper>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{page.title}</span>
            {page.lastModified && (
              <TooltipWrapper content={`Last updated: ${new Date(page.lastModified).toLocaleString()}`}>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(page.lastModified).toLocaleDateString()}
                  </span>
                </div>
              </TooltipWrapper>
            )}
          </div>
          {isSelected && page.selectionReason && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {page.selectionReason}
            </p>
          )}
        </div>
        
        {page.priority > 0 && (
          <TooltipWrapper content={`Page importance: ${Math.round(page.priority * 100)}% - This score comes from the sitemap.xml priority value (0.0-1.0) set by the website owner to indicate relative importance. Higher scores (>70%) typically indicate key pages.`}>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {Math.round(page.priority * 100)}%
            </Badge>
          </TooltipWrapper>
        )}
      </div>
    )
  }

  // Render category section
  const renderCategorySection = (categoryKey: string) => {
    const category = PAGE_CATEGORIES[categoryKey as keyof typeof PAGE_CATEGORIES]
    const categoryPages = groupedPages[categoryKey] || []
    const selectedCount = categoryPages.filter(p => selectedPages.has(p.id)).length
    const isExpanded = expandedCategories.has(categoryKey)
    const Icon = category.icon
    
    if (categoryPages.length === 0) return null
    
    return (
      <Collapsible
        key={categoryKey}
        open={isExpanded}
        onOpenChange={(open) => {
          setExpandedCategories(prev => {
            const newSet = new Set(prev)
            if (open) {
              newSet.add(categoryKey)
            } else {
              newSet.delete(categoryKey)
            }
            return newSet
          })
        }}
      >
        <div className={cn("rounded-lg border", category.borderColor, category.bgColor)}>
          <div className="flex items-center justify-between p-4">
            <CollapsibleTrigger className="flex-1 flex items-center gap-3 hover:bg-accent/10 transition-colors rounded p-2 -m-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <Icon className={cn("w-5 h-5", category.color)} />
              <div className="text-left">
                <div className="font-medium">{category.label}</div>
                <div className="text-xs text-muted-foreground">{category.description}</div>
              </div>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2 ml-4">
              <Badge variant={selectedCount > 0 ? "default" : "secondary"}>
                {selectedCount}/{categoryPages.length} selected
              </Badge>
              <TooltipWrapper content={`Select all ${category.label.toLowerCase()}`}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCategoryToggle(categoryKey)
                  }}
                >
                  {selectedCount === categoryPages.length ? 'Deselect All' : 'Select All'}
                </Button>
              </TooltipWrapper>
            </div>
          </div>
          
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {categoryPages.map(page => renderPageRow(page))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Sitemap Discovery
        </CardTitle>
        <CardDescription>
          Intelligently select pages for comprehensive research
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Discovery Progress */}
        {(isLoading || discoveryStage === 'validation') && (
          <>
            <SitemapDiscoveryProgress
              currentStage={discoveryStage || 'checking-sitemap'}
              discoveredPages={discoveredCount}
              isRetrying={isRetrying}
            />
            {validationMessage && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  {validationMessage}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {console.log('SITEMAP_SELECTOR: Render check - pages.length:', pages.length, 'isLoading:', isLoading, 'error:', error)}

        {/* Show actual error if there is one - NO FALLBACK MESSAGES */}
        {error && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Only show "no pages" if truly no pages and no error */}
        {!isLoading && pages.length === 0 && !error && (
          <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              Discovery completed but no pages were found. The website may not have a sitemap or accessible pages.
            </AlertDescription>
          </Alert>
        )}
        {pages.length > 0 && (
          <>
            {/* Stats Bar */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <TooltipWrapper content="Total unique pages discovered">
                  <Badge variant="outline">
                    <FileText className="mr-1 h-3 w-3" />
                    {stats.total} pages found
                  </Badge>
                </TooltipWrapper>
                <TooltipWrapper content="Pages selected for web scraping">
                  <Badge variant={stats.selected > 0 ? "default" : "secondary"}>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {stats.selected} selected
                  </Badge>
                </TooltipWrapper>
                {stats.selected > 0 && (
                  <div className="flex gap-2">
                    <Badge className="bg-green-600 text-white">
                      {stats.byCategory.critical} critical
                    </Badge>
                    <Badge className="bg-blue-600 text-white">
                      {stats.byCategory.important} important
                    </Badge>
                    {stats.byCategory.useful > 0 && (
                      <Badge className="bg-yellow-600 text-white">
                        {stats.byCategory.useful} useful
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <TooltipWrapper content="Select all pages">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setSelectedPages(new Set(pages.map(p => p.id)))}
                  >
                    Select All
                  </Button>
                </TooltipWrapper>
                <TooltipWrapper content="Clear all selections">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setSelectedPages(new Set())}
                  >
                    Select None
                  </Button>
                </TooltipWrapper>
              </div>
            </div>

            {/* Search */}
            <TooltipWrapper content="Search by page title or URL">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </TooltipWrapper>

            {/* Intelligence Info */}
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <strong>Intelligent Selection Active:</strong> Critical and important pages have been pre-selected based on their relevance to business analysis. 
                You can adjust selections as needed. Optional pages like privacy policies are excluded by default.
              </AlertDescription>
            </Alert>

            {/* Category Sections */}
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {Object.keys(PAGE_CATEGORIES).map(category => renderCategorySection(category))}
              </div>
            </ScrollArea>

            {/* Action buttons removed - now handled by PersistentActionBar in parent component */}
          </>
        )}
      </CardContent>
    </Card>
  )
}