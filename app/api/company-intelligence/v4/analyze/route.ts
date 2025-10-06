/**
 * Site Analysis API Route - REVERTED 2025-09-29T10:10:00Z
 * CLAUDE.md COMPLIANT - API route handles auth directly
 *
 * CRITICAL REVERT (2025-09-29): Auth handling restored to API layer
 * - API route now handles authentication directly
 * - Creates its own Supabase client
 * - Repository accepts client in constructor (isomorphic pattern)
 * - All auth checks happen before repository calls
 *
 * CURRENT PATTERN (REVERTED):
 * API Route (handles auth) → Repository (accepts client) → Database
 *
 * WHY REVERTED:
 * BaseRepository uses server-only code that cannot be imported in
 * client components. This route now follows the isomorphic pattern.
 *
 * @since 2025-09-29 - Reverted to distributed auth pattern
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepositoryV4 } from '@/lib/repositories/intelligence-repository-v4'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import { createClient } from '@/lib/supabase/server'  // REVERTED: Need to create client
import { getUser } from '@/lib/auth/auth-helpers'      // REVERTED: Correct import for auth

export const maxDuration = 30 // 30 second timeout for analysis

interface AnalyzeRequest {
  url?: string
  domain?: string
}

/**
 * POST /api/company-intelligence/v4/analyze
 * Analyzes a website's technology stack
 *
 * REVERTED: 2025-09-29T10:10:00Z
 * - Auth handled directly in API route
 * - Must check user authentication before repository calls
 * - Repository requires userId parameter
 *
 * @param {NextRequest} request - Contains domain or url in body
 * @returns {NextResponse} Analysis results or error
 */
export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  const timer = permanentLogger.timing('site_analysis', { correlationId })

  try {
    // 1. Parse request
    const body: AnalyzeRequest = await request.json()
    const inputDomain = body.domain || body.url

    if (!inputDomain) {
      permanentLogger.warn('SITE_ANALYSIS', 'No domain provided', { correlationId })
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    /**
     * REVERTED 2025-09-29T10:10:00Z
     * AUTH CHECK REQUIRED - API route must verify user
     */
    const user = await getUser()
    if (!user) {
      permanentLogger.warn('SITE_ANALYSIS', 'Unauthenticated request', {
        correlationId
      })
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. Create Supabase client and repository (REVERTED to constructor pattern)
    const supabase = await createClient()  // FIX: Added await for async function

    // DEBUG: Check environment variables first
    console.log('🔍 ENV CHECK:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ MISSING',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING'
    })

    // DEBUG: Check what createClient() returned
    console.log('🔍 API Route Debug - Supabase client type:', typeof supabase)
    console.log('🔍 API Route Debug - Supabase client:', supabase)
    console.log('🔍 API Route Debug - Has from method?:', typeof supabase?.from)

    if (!supabase || typeof supabase.from !== 'function') {
      console.error('❌ Supabase client is invalid!')
      permanentLogger.captureError('API_ANALYZE', new Error('Invalid Supabase client'), {
        clientType: typeof supabase,
        hasFrom: typeof supabase?.from,
        correlationId
      })
      return NextResponse.json(
        { error: 'Database connection failed - invalid client' },
        { status: 500 }
      )
    }

    const repository = new CompanyIntelligenceRepositoryV4(supabase)

    permanentLogger.info('SITE_ANALYSIS', 'Starting site analysis', {
      domain: inputDomain,
      correlationId
    })

    // 3. Clean up domain
    const cleanDomain = inputDomain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .split('/')[0] // Remove any path

    const url = `https://${cleanDomain}`

    /**
     * 4. Get/create session
     * REVERTED: 2025-09-29T10:10:00Z
     * - userId parameter required
     * - Auth already verified above
     * - Handles unique constraint on (user_id, domain)
     */
    const session = await repository.getOrCreateUserSession(user.id, cleanDomain)

    permanentLogger.breadcrumb('session_created', 'Session obtained for analysis', {
      sessionId: session.id,
      domain: cleanDomain,
      userId: user.id,
      correlationId
    })

    // 5. Fetch and analyze the site
    try {
      permanentLogger.breadcrumb('fetch_start', 'Fetching homepage', { url, correlationId })

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch site: ${response.status}`)
      }

      const html = await response.text()

      permanentLogger.breadcrumb('html_received', 'Homepage HTML received', {
        size: html.length,
        statusCode: response.status,
        correlationId
      })

      // 6. Analyze technology stack
      const analysis = analyzeTechnology(html, response.headers)

      // Add domain and additional metadata
      const result = {
        domain: cleanDomain,
        url,
        ...analysis,
        analyzedAt: new Date().toISOString(),
        confidence: calculateConfidence(analysis)
      }

      // 7. Update session with analysis data (REFACTORED)
      await repository.updateMergedData(session.id, {
        site_analysis: result,
        stats: {
          lastAnalysis: new Date().toISOString(),
          domain: cleanDomain
        }
      })

      const duration = timer.stop()

      permanentLogger.info('SITE_ANALYSIS', 'Analysis completed', {
        domain: cleanDomain,
        sessionId: session.id,
        framework: result.framework,
        hasJavaScript: result.hasJavaScript,
        renderingType: result.renderingType,
        duration,
        correlationId
      })

      // 8. Transform and return results in the structure UI expects

      // Build the nested technologies structure
      const technologies = {
        frontend: [] as string[],
        backend: [] as string[],
        cms: [] as string[],
        security: result.security || [],
        analytics: result.analytics || [],
        hosting: result.hosting || []
      }

      // Map framework to frontend technologies
      if (result.framework !== 'unknown') {
        // Framework mapping with associated libraries
        switch (result.framework) {
          case 'Next.js':
            technologies.frontend.push('Next.js', 'React')
            break
          case 'Nuxt.js':
            technologies.frontend.push('Nuxt.js', 'Vue')
            break
          case 'Gatsby':
            technologies.frontend.push('Gatsby', 'React')
            break
          case 'Remix':
            technologies.frontend.push('Remix', 'React')
            break
          case 'Angular':
            technologies.frontend.push('Angular', 'TypeScript')
            break
          case 'Vue.js':
            technologies.frontend.push('Vue.js')
            break
          case 'React':
            technologies.frontend.push('React')
            break
          case 'Svelte':
            technologies.frontend.push('Svelte')
            break
          default:
            technologies.frontend.push(result.framework)
        }
      }

      // Add UI libraries to frontend
      if (result.libraries && result.libraries.length > 0) {
        result.libraries.forEach((lib: string) => {
          // UI libraries go to frontend
          if (lib === 'Bootstrap' || lib === 'Tailwind CSS' || lib === 'GSAP') {
            if (!technologies.frontend.includes(lib)) {
              technologies.frontend.push(lib)
            }
          } else {
            // Other libraries might be backend (like Lodash could be either)
            if (!technologies.backend.includes(lib)) {
              technologies.backend.push(lib)
            }
          }
        })
      }

      // Detect backend from headers
      const xPoweredBy = response.headers.get('x-powered-by')
      const server = response.headers.get('server')

      if (xPoweredBy) {
        const powered = xPoweredBy.toLowerCase()
        if (powered.includes('php')) technologies.backend.push('PHP')
        if (powered.includes('express')) technologies.backend.push('Node.js', 'Express')
        if (powered.includes('asp.net')) technologies.backend.push('ASP.NET')
        if (powered.includes('python')) technologies.backend.push('Python')
        if (powered.includes('ruby')) technologies.backend.push('Ruby')
        if (powered.includes('java')) technologies.backend.push('Java')
      }

      // Add CMS and e-commerce to cms array
      if (result.cms) {
        technologies.cms.push(result.cms)
      }
      if (result.ecommerce) {
        // E-commerce platforms are a type of CMS
        if (!technologies.cms.includes(result.ecommerce)) {
          technologies.cms.push(result.ecommerce)
        }
      }

      // Remove duplicates from all arrays
      Object.keys(technologies).forEach(key => {
        technologies[key as keyof typeof technologies] = [...new Set(technologies[key as keyof typeof technologies])]
      })

      // Performance metrics
      const performance = {
        renderingType: result.renderingType,
        hasJavaScript: result.hasJavaScript
      }

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        domain: cleanDomain,
        technologies,          // Nested structure the UI expects
        metadata: result.metadata,
        performance,
        confidence: result.confidence,
        analyzedAt: result.analyzedAt
      })

    } catch (fetchError) {
      const jsError = convertSupabaseError(fetchError)
      permanentLogger.captureError('SITE_ANALYSIS', jsError, {
        domain: cleanDomain,
        correlationId
      })

      return NextResponse.json(
        { error: 'Failed to access website. Please check the domain.' },
        { status: 400 }
      )
    }

  } catch (error) {
    timer.stop()
    const jsError = convertSupabaseError(error)

    permanentLogger.captureError('SITE_ANALYSIS', jsError, {
      endpoint: '/api/company-intelligence/v4/analyze',
      correlationId
    })

    return NextResponse.json(
      { error: jsError.message || 'Analysis failed' },
      { status: 500 }
    )
  }
}

/**
 * Analyze technology stack from HTML and headers
 * Detects frameworks, libraries, CMS, e-commerce platforms, etc.
 *
 * @param {string} html - The HTML content of the page
 * @param {Headers} headers - HTTP response headers
 * @returns {object} Analysis results with technology details
 */
function analyzeTechnology(html: string, headers: Headers) {
  const result = {
    // Main framework detection
    framework: 'unknown' as string,
    hasJavaScript: false,
    renderingType: 'static' as 'static' | 'csr' | 'ssr' | 'hybrid',

    // Platform detection
    cms: undefined as string | undefined,
    ecommerce: undefined as string | undefined,

    // Technology arrays
    analytics: [] as string[],
    libraries: [] as string[],
    security: [] as string[],
    hosting: [] as string[],

    // Metadata
    metadata: extractMetadata(html)
  }

  // JavaScript detection
  result.hasJavaScript = html.includes('<script') && !html.match(/<script[^>]*>\s*<\/script>/g)

  // Framework Detection (most specific to least specific)
  if (html.includes('_next/static') || html.includes('__NEXT_DATA__')) {
    result.framework = 'Next.js'
    result.renderingType = html.includes('__NEXT_DATA__') ? 'ssr' : 'hybrid'
  } else if (html.includes('__nuxt') || html.includes('_nuxt/')) {
    result.framework = 'Nuxt.js'
    result.renderingType = 'ssr'
  } else if (html.includes('gatsby-') || html.includes('___gatsby')) {
    result.framework = 'Gatsby'
    result.renderingType = 'static'
  } else if (html.includes('remix_')) {
    result.framework = 'Remix'
    result.renderingType = 'ssr'
  } else if (html.includes('ng-version') || html.includes('ng-') || html.includes('angular')) {
    result.framework = 'Angular'
    result.renderingType = 'csr'
  } else if (html.includes('v-cloak') || html.includes('v-if') || html.includes('v-for')) {
    result.framework = 'Vue.js'
    result.renderingType = html.includes('data-server-rendered') ? 'ssr' : 'csr'
  } else if (html.includes('react') || html.includes('_react')) {
    result.framework = 'React'
    result.renderingType = 'csr'
  } else if (html.includes('svelte')) {
    result.framework = 'Svelte'
    result.renderingType = 'csr'
  }

  // CMS Detection
  if (html.includes('wp-content') || html.includes('wp-includes') || html.includes('wordpress')) {
    result.cms = 'WordPress'
  } else if (html.includes('drupal') || html.includes('Drupal')) {
    result.cms = 'Drupal'
  } else if (html.includes('joomla')) {
    result.cms = 'Joomla'
  } else if (html.includes('contentful')) {
    result.cms = 'Contentful'
  } else if (html.includes('sanity.io')) {
    result.cms = 'Sanity'
  } else if (html.includes('strapi')) {
    result.cms = 'Strapi'
  } else if (headers.get('x-powered-by')?.includes('Ghost')) {
    result.cms = 'Ghost'
  }

  // E-commerce Detection
  if (html.includes('shopify') || html.includes('Shopify')) {
    result.ecommerce = 'Shopify'
  } else if (html.includes('woocommerce')) {
    result.ecommerce = 'WooCommerce'
  } else if (html.includes('magento')) {
    result.ecommerce = 'Magento'
  } else if (html.includes('bigcommerce')) {
    result.ecommerce = 'BigCommerce'
  } else if (html.includes('prestashop')) {
    result.ecommerce = 'PrestaShop'
  } else if (html.includes('squarespace-commerce')) {
    result.ecommerce = 'Squarespace Commerce'
  }

  // Analytics Detection
  if (html.includes('google-analytics.com') || html.includes('googletagmanager.com') || html.includes('gtag(')) {
    result.analytics.push('Google Analytics')
  }
  if (html.includes('matomo') || html.includes('piwik')) {
    result.analytics.push('Matomo')
  }
  if (html.includes('hotjar.com')) {
    result.analytics.push('Hotjar')
  }
  if (html.includes('segment.com') || html.includes('segment.io')) {
    result.analytics.push('Segment')
  }
  if (html.includes('mixpanel.com')) {
    result.analytics.push('Mixpanel')
  }
  if (html.includes('plausible.io')) {
    result.analytics.push('Plausible')
  }
  if (html.includes('amplitude.com')) {
    result.analytics.push('Amplitude')
  }

  // Security Headers
  if (headers.get('strict-transport-security')) {
    result.security.push('HSTS')
  }
  if (headers.get('content-security-policy')) {
    result.security.push('CSP')
  }
  if (headers.get('x-frame-options')) {
    result.security.push('X-Frame-Options')
  }
  if (headers.get('x-content-type-options')) {
    result.security.push('X-Content-Type-Options')
  }
  if (headers.get('x-xss-protection')) {
    result.security.push('X-XSS-Protection')
  }

  // Hosting/CDN Detection
  const server = headers.get('server')
  if (server) {
    if (server.includes('cloudflare')) {
      result.hosting.push('Cloudflare')
    } else if (server.includes('nginx')) {
      result.hosting.push('Nginx')
    } else if (server.includes('apache')) {
      result.hosting.push('Apache')
    } else if (server.includes('Microsoft-IIS')) {
      result.hosting.push('IIS')
    }
  }

  // CDN Detection
  if (headers.get('cf-ray')) {
    if (!result.hosting.includes('Cloudflare')) {
      result.hosting.push('Cloudflare')
    }
  }
  if (headers.get('x-amz-cf-id')) {
    result.hosting.push('AWS CloudFront')
  }
  if (headers.get('x-vercel-id')) {
    result.hosting.push('Vercel')
  }
  if (headers.get('x-netlify-request-id')) {
    result.hosting.push('Netlify')
  }

  // Additional Libraries Detection
  if (html.includes('bootstrap.min.css') || html.includes('bootstrap.min.js')) {
    result.libraries.push('Bootstrap')
  }
  if (html.includes('tailwindcss') || html.includes('tailwind')) {
    result.libraries.push('Tailwind CSS')
  }
  if (html.includes('lodash.min.js')) {
    result.libraries.push('Lodash')
  }
  if (html.includes('axios.min.js')) {
    result.libraries.push('Axios')
  }
  if (html.includes('gsap.min.js') || html.includes('TweenMax')) {
    result.libraries.push('GSAP')
  }

  return result
}

/**
 * Extract metadata from HTML
 * Parses SEO, Open Graph, Twitter Card, and technical metadata
 *
 * @param {string} html - The HTML content
 * @returns {object} Extracted metadata
 */
function extractMetadata(html: string) {
  const metadata: Record<string, any> = {}

  // Helper function to decode HTML entities
  const decodeHtml = (text: string): string => {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
  }

  // Basic SEO
  const titleMatch = html.match(/<title>(.*?)<\/title>/i)
  if (titleMatch) metadata.title = decodeHtml(titleMatch[1].trim())

  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)
  if (descMatch) metadata.description = decodeHtml(descMatch[1].trim())

  const keywordsMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i)
  if (keywordsMatch) metadata.keywords = keywordsMatch[1].split(',').map(k => k.trim())

  const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["'](.*?)["']/i)
  if (authorMatch) metadata.author = authorMatch[1].trim()

  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i)
  if (canonicalMatch) metadata.canonical = canonicalMatch[1].trim()

  const robotsMatch = html.match(/<meta\s+name=["']robots["']\s+content=["'](.*?)["']/i)
  if (robotsMatch) metadata.robots = robotsMatch[1].trim()

  // Open Graph
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i)
  if (ogTitleMatch) metadata.ogTitle = decodeHtml(ogTitleMatch[1].trim())

  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)
  if (ogDescMatch) metadata.ogDescription = decodeHtml(ogDescMatch[1].trim())

  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i)
  if (ogImageMatch) metadata.ogImage = ogImageMatch[1].trim()

  const ogUrlMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["'](.*?)["']/i)
  if (ogUrlMatch) metadata.ogUrl = ogUrlMatch[1].trim()

  const ogTypeMatch = html.match(/<meta\s+property=["']og:type["']\s+content=["'](.*?)["']/i)
  if (ogTypeMatch) metadata.ogType = ogTypeMatch[1].trim()

  // Twitter Card
  const twitterCardMatch = html.match(/<meta\s+name=["']twitter:card["']\s+content=["'](.*?)["']/i)
  if (twitterCardMatch) metadata.twitterCard = twitterCardMatch[1].trim()

  const twitterSiteMatch = html.match(/<meta\s+name=["']twitter:site["']\s+content=["'](.*?)["']/i)
  if (twitterSiteMatch) metadata.twitterSite = twitterSiteMatch[1].trim()

  // Technical
  const viewportMatch = html.match(/<meta\s+name=["']viewport["']\s+content=["'](.*?)["']/i)
  if (viewportMatch) metadata.viewport = viewportMatch[1].trim()

  const generatorMatch = html.match(/<meta\s+name=["']generator["']\s+content=["'](.*?)["']/i)
  if (generatorMatch) metadata.generator = generatorMatch[1].trim()

  const charsetMatch = html.match(/<meta\s+charset=["'](.*?)["']/i)
  if (charsetMatch) metadata.charset = charsetMatch[1].trim()

  const languageMatch = html.match(/<html[^>]*\s+lang=["'](.*?)["']/i)
  if (languageMatch) metadata.language = languageMatch[1].trim()

  // Favicon
  const faviconMatch = html.match(/<link[^>]*\s+rel=["'](?:icon|shortcut icon)["'][^>]*\s+href=["'](.*?)["']/i)
  if (faviconMatch) metadata.favicon = faviconMatch[1].trim()

  // Schema.org
  const schemaMatch = html.match(/<script[^>]*\s+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is)
  if (schemaMatch) {
    try {
      const schemaData = JSON.parse(schemaMatch[1])
      metadata.schema = {
        type: schemaData['@type'],
        name: schemaData.name,
        url: schemaData.url
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return metadata
}

/**
 * Calculate confidence score for the analysis
 * Based on how much information was successfully extracted
 *
 * @param {any} analysis - The analysis results
 * @returns {number} Confidence score between 0 and 1
 */
function calculateConfidence(analysis: any): number {
  let confidence = 0.5 // Base confidence

  // Framework detection adds confidence
  if (analysis.framework !== 'unknown') confidence += 0.2

  // CMS/E-commerce detection adds confidence
  if (analysis.cms) confidence += 0.15
  if (analysis.ecommerce) confidence += 0.15

  // Analytics detection adds confidence
  if (analysis.analytics.length > 0) confidence += 0.1

  // Metadata quality adds confidence
  if (analysis.metadata.title) confidence += 0.05
  if (analysis.metadata.description) confidence += 0.05

  // Cap at 1.0
  return Math.min(confidence, 1.0)
}