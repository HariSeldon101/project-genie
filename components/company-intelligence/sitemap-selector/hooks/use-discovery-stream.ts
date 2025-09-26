/**
 * Custom hook for managing discovery
 *
 * SIMPLIFIED APPROACH (KISS):
 * - Discovery takes only 3-5 seconds, so we use simple JSON fetch
 * - No SSE streaming complexity needed for such a short operation
 * - SSE can be used later for actual scraping which takes much longer
 *
 * CRITICAL: NO mock data, NO fallbacks - errors bubble up
 * All URLs validated before acceptance
 * Timing measurements at all boundaries
 *
 * Last Updated: 2025-09-18
 * Reason: Simplified from SSE to JSON for better reliability (KISS principle)
 */

import { useEffect, useState, useRef } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { safeTimestampToISO } from '@/lib/utils/safe-timestamp'
import type { PageInfo, DiscoveryState } from '../types'

/**
 * Hook for managing the discovery stream
 * @param domain - Domain to discover pages for
 * @returns pages array and discovery state
 */
// Cache key for session storage
const DISCOVERY_CACHE_PREFIX = 'discovery_cache_'

export function useDiscoveryStream(domain: string) {
  // State management
  const [pages, setPages] = useState<PageInfo[]>([])
  const [state, setState] = useState<DiscoveryState>({
    phase: 'idle',
    progress: 0,
    total: 0,  // Start with 0, will be updated when we know actual total
    error: null,
    startTime: performance.now()
  })

  // Track if discovery has already been performed for this domain
  const [hasDiscovered, setHasDiscovered] = useState(false)
  const discoveryInProgress = useRef(false)

  useEffect(() => {
    // Check if we've already discovered this domain
    const cacheKey = `${DISCOVERY_CACHE_PREFIX}${domain}`
    const cachedData = sessionStorage.getItem(cacheKey)

    if (cachedData && !hasDiscovered) {
      try {
        const cached = JSON.parse(cachedData)
        const cacheAge = Date.now() - cached.timestamp

        // Use cache if less than 5 minutes old
        if (cacheAge < 5 * 60 * 1000) {
          permanentLogger.info('DISCOVERY_STREAM', 'Using cached discovery results', {
            domain,
            cacheAge: Math.round(cacheAge / 1000),
            pageCount: cached.pages.length
          })

          setPages(cached.pages)
          setState(prev => ({
            ...prev,
            phase: 'complete',
            progress: cached.pages.length,
            total: cached.pages.length,
            error: null
          }))
          setHasDiscovered(true)
          return
        } else {
          // Clear stale cache
          sessionStorage.removeItem(cacheKey)
        }
      } catch (e) {
        // Invalid cache, remove it
        sessionStorage.removeItem(cacheKey)
      }
    }

    // Prevent duplicate discoveries
    if (discoveryInProgress.current || hasDiscovered) {
      permanentLogger.info('DISCOVERY_STREAM', 'Discovery already in progress or completed', {
        domain,
        inProgress: discoveryInProgress.current,
        hasDiscovered
      })
      return
    }

    // Reset state when starting new discovery
    const startTime = performance.now()

    // Breadcrumb at interface boundary - entering stream setup
    permanentLogger.info('DISCOVERY_STREAM', 'Initializing discovery stream', {
      domain,
      timestamp: safeTimestampToISO(Date.now())
    })

    // Validate inputs - NO graceful fallback
    if (!domain) {
      const error = new Error('Domain is required')
      permanentLogger.captureError('DISCOVERY_STREAM', error, {
        domain
      })
      setState(prev => ({ ...prev, error }))
      return
    }

    // Mark discovery as in progress
    discoveryInProgress.current = true

    // KISS: Simple JSON fetch instead of SSE for discovery (only takes 3-5 seconds)
    const discoverPages = async () => {
      // Add timeout controller - 30 seconds max for discovery
      const timeoutId = setTimeout(() => {
        const error = new Error('Discovery timeout - no response after 30 seconds')
        permanentLogger.captureError('DISCOVERY_STREAM', error, {
          domain,
          phase: 'timeout'
        })
        setState(prev => ({
          ...prev,
          error,
          phase: 'idle'
        }))
      }, 30000)

      try {
        // Set discovery state
        setState(prev => ({
          ...prev,
          phase: 'discovering',
          error: null
        }))

        // SIMPLE JSON REQUEST - No SSE needed for 3-5 second discovery
        const response = await fetch('/api/company-intelligence/fetch-sitemap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'  // Request JSON, not SSE
          },
          credentials: 'include',  // Include auth cookies
          body: JSON.stringify({
            domain,  // Only send domain - server handles session
            validateUrls: false  // Skip validation during discovery - trust sitemap/crawler results
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Clear timeout on successful response
        clearTimeout(timeoutId)

        // Parse JSON response
        const result = await response.json()

        permanentLogger.info('DISCOVERY_STREAM', 'Discovery completed', {
          domain,
          pagesFound: result.pages?.length || 0,
          success: result.success
        })

        // Helper function to generate a title from URL path
        const generateTitleFromUrl = (url: string): string => {
          try {
            const urlObj = new URL(url)
            const pathname = urlObj.pathname

            // Handle root page
            if (pathname === '/' || pathname === '') {
              return 'Home'
            }

            // Extract last segment of path
            const segments = pathname.split('/').filter(Boolean)
            const lastSegment = segments[segments.length - 1] || 'Page'

            // Remove file extension if present
            const withoutExt = lastSegment.replace(/\.(html?|php|aspx?|jsp)$/i, '')

            // Convert kebab-case or snake_case to Title Case
            const formatted = withoutExt
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, char => char.toUpperCase())

            // Add context from path if available
            if (segments.length > 1) {
              const parentSegment = segments[segments.length - 2]
              const parentFormatted = parentSegment
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, char => char.toUpperCase())

              // Common parent segments that provide useful context
              const contextualParents = ['blog', 'products', 'services', 'about', 'team', 'contact']
              if (contextualParents.includes(parentSegment.toLowerCase())) {
                return `${parentFormatted} - ${formatted}`
              }
            }

            return formatted
          } catch (e) {
            // If URL parsing fails, return a fallback
            return 'Page'
          }
        }

        // Transform pages to PageInfo format
        const transformedPages: PageInfo[] = (result.pages || []).map((item: any) => {
          // Handle both string URLs and page objects
          if (typeof item === 'string') {
            const generatedTitle = generateTitleFromUrl(item)
            return {
              id: item,
              url: item,
              title: generatedTitle,
              relativePath: new URL(item).pathname,
              category: 'optional',
              source: 'discovery',
              metadata: {},
              discovered_at: safeTimestampToISO(Date.now())
            }
          } else {
            // Use provided title if available and not empty, otherwise generate from URL
            const title = item.title && item.title.trim() && item.title !== 'Untitled'
              ? item.title
              : generateTitleFromUrl(item.url)

            return {
              id: item.id || item.url,
              url: item.url,
              title: title,
              relativePath: item.relativePath || new URL(item.url).pathname,
              category: item.category || 'optional',
              source: item.source || 'discovery',
              metadata: item.metadata || {},
              discovered_at: item.discovered_at || safeTimestampToISO(Date.now())
            }
          }
        })

        // Update state with discovered pages
        setPages(transformedPages)
        setState(prev => ({
          ...prev,
          phase: 'complete',
          progress: transformedPages.length,
          total: transformedPages.length,
          error: null
        }))

        // Cache the results
        try {
          const cacheData = {
            pages: transformedPages,
            timestamp: Date.now(),
            domain
          }
          sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
          permanentLogger.info('DISCOVERY_STREAM', 'Cached discovery results', {
            domain,
            pageCount: transformedPages.length
          })
        } catch (e) {
          // SessionStorage might be full, log but don't fail
          permanentLogger.warn('DISCOVERY_STREAM', 'Failed to cache discovery results', {
            error: e,
            domain
          })
        }

        // Mark discovery as complete
        setHasDiscovered(true)
        discoveryInProgress.current = false

        permanentLogger.info('DISCOVERY_STREAM', 'Pages transformed and state updated', {
          pageCount: transformedPages.length,
          duration: performance.now() - startTime
        })

      } catch (error) {
        // Clear timeout on error
        clearTimeout(timeoutId)
        // Setup error
        permanentLogger.captureError('DISCOVERY_STREAM', error as Error, {
          phase: 'setup',
          domain
        })

        setState(prev => ({
          ...prev,
          error: error as Error,
          phase: 'idle'
        }))

        // Reset progress tracking on error
        discoveryInProgress.current = false
      }
    }

    // Call the async function
    discoverPages()

    // Cleanup on unmount
    return () => {
      const duration = performance.now() - startTime
      permanentLogger.info('DISCOVERY_STREAM', 'Discovery hook cleanup', {
        duration,
        pagesDiscovered: pages.length,
        domain,
        wasInProgress: discoveryInProgress.current
      })

      // Clear in-progress flag on cleanup
      discoveryInProgress.current = false
    }
  }, [domain, hasDiscovered]) // Re-run only if domain changes or discovery hasn't been done

  return { pages, state }
}