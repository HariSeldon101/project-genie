/**
 * HTTP Fetcher Utility
 *
 * Centralized HTTP fetching utility with automatic redirect handling,
 * comprehensive error handling, and performance monitoring.
 *
 * CRITICAL: This utility follows redirects automatically to handle cases
 * like bigfluffy.ai -> www.bigfluffy.ai redirects.
 *
 * @module utils
 */

import { permanentLogger } from './permanent-logger'

/**
 * Options for HTTP fetch operations
 */
export interface HttpFetchOptions {
  /** HTTP method to use */
  method?: 'GET' | 'HEAD' | 'POST'
  /** Custom headers to include */
  headers?: Record<string, string>
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number
  /** Maximum number of redirects to follow (default: 5) */
  maxRedirects?: number
  /** Whether to follow redirects (default: true) */
  followRedirect?: boolean
  /** Optional abort signal for cancellation */
  signal?: AbortSignal
  /** Request body for POST requests */
  body?: string | FormData
}

/**
 * Result of HTTP fetch operation
 */
export interface HttpFetchResult {
  /** Whether the response was successful (2xx status) */
  ok: boolean
  /** HTTP status code */
  status: number
  /** HTTP status text */
  statusText: string
  /** Response headers */
  headers: Headers
  /** Response body as text (only for GET/POST) */
  text?: string
  /** Final URL after following redirects */
  finalUrl: string
  /** Number of redirects followed */
  redirectCount: number
  /** Total request time in milliseconds */
  timing: number
  /** Chain of redirect URLs encountered */
  redirectChain?: string[]
}

/**
 * Default User-Agent for requests
 * Identifies the bot for webmasters
 */
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; ProjectGenie/1.0; +https://project-genie.com/bot)'

/**
 * Shared HTTP fetcher with redirect handling and comprehensive error management
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Promise with fetch result
 * @throws Error if request fails or exceeds redirect limit
 */
export async function httpFetcher(
  url: string,
  options: HttpFetchOptions = {}
): Promise<HttpFetchResult> {
  const startTime = Date.now()
  const correlationId = `fetch-${Date.now()}-${Math.random().toString(36).substring(7)}`

  // Set default options
  const config: Required<HttpFetchOptions> = {
    method: options.method || 'GET',
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      ...options.headers
    },
    timeout: options.timeout ?? 10000,
    maxRedirects: options.maxRedirects ?? 5,
    followRedirect: options.followRedirect ?? true,
    signal: options.signal,
    body: options.body
  }

  // Log request initiation with breadcrumb
  permanentLogger.breadcrumb('http_fetch_start', `Starting ${config.method} request`, {
    url,
    method: config.method,
    followRedirect: config.followRedirect,
    maxRedirects: config.maxRedirects,
    correlationId
  })

  let currentUrl = url
  let redirectCount = 0
  const redirectChain: string[] = []

  try {
    // Main fetch loop to handle redirects manually
    while (true) {
      // Create timeout signal if not provided
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout)

      // Combine user signal with timeout signal
      const signal = config.signal
        ? combineSignals(config.signal, controller.signal)
        : controller.signal

      permanentLogger.breadcrumb('http_fetch_attempt', `Fetching URL`, {
        url: currentUrl,
        attempt: redirectCount + 1,
        correlationId
      })

      // Perform the actual fetch
      const response = await fetch(currentUrl, {
        method: config.method,
        headers: config.headers as HeadersInit,
        body: config.body,
        redirect: 'manual', // Handle redirects manually
        signal
      })

      clearTimeout(timeoutId)

      // Check if this is a redirect
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')

        if (!location) {
          throw new Error(`Redirect response missing location header at ${currentUrl}`)
        }

        // Add to redirect chain for debugging
        redirectChain.push(currentUrl)

        // Check if we should follow redirects
        if (!config.followRedirect) {
          permanentLogger.breadcrumb('http_fetch_redirect_not_followed', `Redirect not followed`, {
            from: currentUrl,
            to: location,
            status: response.status,
            correlationId
          })

          // Return redirect response without following
          const duration = Date.now() - startTime
          return {
            ok: false,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            finalUrl: currentUrl,
            redirectCount: 0,
            timing: duration,
            redirectChain: []
          }
        }

        // Check redirect limit
        if (redirectCount >= config.maxRedirects) {
          throw new Error(
            `Maximum redirect limit (${config.maxRedirects}) exceeded. ` +
            `Redirect chain: ${redirectChain.join(' -> ')} -> ${location}`
          )
        }

        // Update current URL for next iteration
        currentUrl = new URL(location, currentUrl).toString()
        redirectCount++

        permanentLogger.breadcrumb('http_fetch_redirect', `Following redirect`, {
          from: redirectChain[redirectChain.length - 1],
          to: currentUrl,
          status: response.status,
          redirectNumber: redirectCount,
          correlationId
        })

        continue // Continue loop with new URL
      }

      // Not a redirect, process final response
      const duration = Date.now() - startTime

      // Get response text for GET/POST requests
      let responseText: string | undefined
      if (config.method !== 'HEAD') {
        try {
          responseText = await response.text()
        } catch (error) {
          permanentLogger.breadcrumb('http_fetch_text_error', `Failed to read response text`, {
            url: currentUrl,
            error: error instanceof Error ? error.message : String(error),
            correlationId
          })
        }
      }

      // Log successful completion
      permanentLogger.breadcrumb('http_fetch_complete', `Request completed`, {
        url: currentUrl,
        originalUrl: url,
        status: response.status,
        ok: response.ok,
        redirectCount,
        duration,
        responseSize: responseText?.length,
        correlationId
      })

      // Log info for successful requests with redirects
      if (redirectCount > 0) {
        permanentLogger.info('HTTP_FETCHER', `Request completed with redirects`, {
          originalUrl: url,
          finalUrl: currentUrl,
          redirectCount,
          redirectChain,
          status: response.status,
          duration,
          correlationId
        })
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        text: responseText,
        finalUrl: currentUrl,
        redirectCount,
        timing: duration,
        redirectChain: redirectCount > 0 ? redirectChain : undefined
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime

    // Determine error type for better debugging
    let errorType = 'unknown'
    let errorMessage = error instanceof Error ? error.message : String(error)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorType = 'timeout'
        errorMessage = `Request timeout after ${config.timeout}ms`
      } else if (error.message.includes('fetch')) {
        errorType = 'network'
      } else if (error.message.includes('redirect')) {
        errorType = 'redirect_limit'
      }
    }

    permanentLogger.breadcrumb('http_fetch_error', `Request failed`, {
      url: currentUrl,
      originalUrl: url,
      errorType,
      error: errorMessage,
      redirectCount,
      duration,
      correlationId
    })

    // Capture error with full context
    permanentLogger.captureError('HTTP_FETCHER', error as Error, {
      url,
      currentUrl,
      method: config.method,
      errorType,
      redirectCount,
      redirectChain,
      duration,
      correlationId
    })

    // Re-throw with enhanced error message
    throw new Error(
      `HTTP fetch failed for ${url}: ${errorMessage}` +
      (redirectCount > 0 ? ` (after ${redirectCount} redirects)` : '')
    )
  }
}

/**
 * Convenience function for HEAD requests
 * Used primarily for URL validation
 */
export async function httpHead(
  url: string,
  options: Omit<HttpFetchOptions, 'method'> = {}
): Promise<HttpFetchResult> {
  return httpFetcher(url, { ...options, method: 'HEAD' })
}

/**
 * Convenience function for GET requests
 * Used for fetching content
 */
export async function httpGet(
  url: string,
  options: Omit<HttpFetchOptions, 'method'> = {}
): Promise<HttpFetchResult> {
  return httpFetcher(url, { ...options, method: 'GET' })
}

/**
 * Combine multiple abort signals
 * Returns a signal that aborts when any of the input signals abort
 */
function combineSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController()

  for (const signal of signals) {
    if (signal) {
      if (signal.aborted) {
        controller.abort()
        break
      }
      signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  return controller.signal
}

/**
 * Check if a URL is accessible (returns 2xx status)
 * Follows redirects and returns final URL if successful
 */
export async function checkUrlAccessibility(url: string): Promise<{
  accessible: boolean
  finalUrl?: string
  status?: number
  redirectCount?: number
}> {
  try {
    const result = await httpHead(url, {
      timeout: 5000,
      maxRedirects: 5
    })

    return {
      accessible: result.ok,
      finalUrl: result.finalUrl,
      status: result.status,
      redirectCount: result.redirectCount
    }
  } catch (error) {
    permanentLogger.debug('HTTP_FETCHER', 'URL accessibility check failed', {
      url,
      error: error instanceof Error ? error.message : String(error)
    })

    return {
      accessible: false
    }
  }
}

/**
 * Batch check multiple URLs for accessibility
 * Useful for validating many URLs efficiently
 */
export async function batchCheckUrls(
  urls: string[],
  options: {
    concurrency?: number
    timeout?: number
  } = {}
): Promise<Map<string, boolean>> {
  const startTime = Date.now()
  const concurrency = options.concurrency ?? 5
  const results = new Map<string, boolean>()

  permanentLogger.info('HTTP_FETCHER', 'Starting batch URL check', {
    totalUrls: urls.length,
    concurrency
  })

  // Process URLs in batches for rate limiting
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const result = await checkUrlAccessibility(url)
        return { url, accessible: result.accessible }
      })
    )

    for (const { url, accessible } of batchResults) {
      results.set(url, accessible)
    }
  }

  const duration = Date.now() - startTime
  const accessibleCount = Array.from(results.values()).filter(v => v).length

  permanentLogger.info('HTTP_FETCHER', 'Batch URL check complete', {
    totalUrls: urls.length,
    accessible: accessibleCount,
    inaccessible: urls.length - accessibleCount,
    duration,
    averageTimePerUrl: Math.round(duration / urls.length)
  })

  return results
}