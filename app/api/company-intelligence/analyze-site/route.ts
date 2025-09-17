import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { PageIntelligenceAnalyzer } from '@/lib/company-intelligence/intelligence/page-intelligence-analyzer'
import { createClient } from '@/lib/supabase/server'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'

export const maxDuration = 60 // Increased timeout for intelligence analysis

interface AnalyzeRequest {
  domain: string
  enableIntelligence?: boolean
}

export async function POST(request: NextRequest) {
  // Add breadcrumb at API entry point
  permanentLogger.breadcrumb('api_entry', 'Site analysis API called', {
    method: 'POST',
    path: '/api/company-intelligence/analyze-site'
  })

  // Start timing the entire operation
  const totalTimer = permanentLogger.timing('site_analysis_total')

  try {
    const body: AnalyzeRequest = await request.json()
    const { domain, enableIntelligence = true } = body // Always enable intelligence by default

    permanentLogger.breadcrumb('input_received', 'Domain received', { domain, enableIntelligence })

    if (!domain) {
      permanentLogger.breadcrumb('validation', 'Domain validation failed', { error: 'Domain required' })
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }
    
    // CRITICAL FIX: Get authenticated user before any database operations
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      permanentLogger.captureError('AUTH', new Error('User not authenticated for site analysis'), { 
        error: authError?.message,
        domain
      })
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }
    
    permanentLogger.info('AUTH', 'User authenticated for site analysis', {
      userId: user.id,
      domain
    })
    
    permanentLogger.info('SITE_ANALYSIS', 'Starting site analysis', { domain })
    permanentLogger.breadcrumb('analysis_start', 'Starting site analysis process', { domain })
    
    // Clean up domain - remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const url = `https://${cleanDomain}`
    
    try {
      // Add breadcrumb before fetch
      permanentLogger.breadcrumb('fetch_start', 'Fetching homepage', { url })

      // Time the fetch operation
      const fetchTimer = permanentLogger.timing('homepage_fetch', { url })

      // Fetch the homepage to analyze
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      })

      fetchTimer.stop()
      
      if (!response.ok) {
        throw new Error(`Failed to fetch site: ${response.status}`)
      }
      
      const html = await response.text()

      permanentLogger.breadcrumb('html_received', 'Homepage HTML received', {
        size: html.length,
        statusCode: response.status
      })

      // Analyze the HTML for technology indicators
      const techTimer = permanentLogger.timing('technology_analysis')
      const analysis = analyzeTechnology(html, response.headers)
      techTimer.stop()
      
      // Perform page intelligence analysis if enabled
      let intelligenceResult = null
      if (enableIntelligence) {
        try {
          permanentLogger.info('INTELLIGENCE', 'Starting page intelligence analysis', { url })
          permanentLogger.breadcrumb('intelligence_start', 'Beginning intelligence analysis', { url })
          
          const intelligenceAnalyzer = new PageIntelligenceAnalyzer(cleanDomain, {
            enableDetailedLogging: true,
            maxProcessingTime: 8000 // 8 second timeout for API calls
          })
          
          const pageIntelligence = await intelligenceAnalyzer.analyzePage(url, html)
          intelligenceResult = pageIntelligence
          
          permanentLogger.info('INTELLIGENCE', 'Page intelligence analysis completed', {
            url,
            pageType: pageIntelligence.pageType,
            confidence: pageIntelligence.confidence,
            processingTime: pageIntelligence.processingTimeMs
          })
          
        } catch (intelligenceError) {
          permanentLogger.captureError('INTELLIGENCE', new Error('Page intelligence analysis failed'), {
            url,
            error: intelligenceError instanceof Error ? intelligenceError.message : 'Unknown error'
          })
          // Don't fail the whole request if intelligence analysis fails
        }
      }
      
      // Add domain and calculate confidence
      const result = {
        domain: cleanDomain,
        ...analysis,
        confidence: calculateConfidence(analysis),
        // Add intelligence data if available
        ...(intelligenceResult && { 
          intelligence: {
            pageType: intelligenceResult.pageType,
            confidence: intelligenceResult.confidence,
            urlPatterns: intelligenceResult.urlPatterns,
            contentSignals: intelligenceResult.contentSignals.slice(0, 10), // Limit for API response
            structuredData: intelligenceResult.structuredData,
            metaDataEnhanced: intelligenceResult.metaData,
            processingTimeMs: intelligenceResult.processingTimeMs,
            warnings: intelligenceResult.warnings,
            errors: intelligenceResult.errors
          }
        })
      }
      
      permanentLogger.info('SITE_ANALYSIS', 'Analysis complete', {
        domain: cleanDomain,
        siteType: result.siteType,
        technologies: result.technologies,
        intelligence: intelligenceResult ? {
          pageType: intelligenceResult.pageType,
          confidence: intelligenceResult.confidence
        } : null
      })
      
      // Create research session
      let sessionId = null
      let corporateEntityId = null
      try {
        // Note: We already have supabase client and user from above
        permanentLogger.breadcrumb('session_check', 'Checking for existing session', { domain: cleanDomain })
        permanentLogger.info('SESSION', 'Checking for existing session', {
          domain: cleanDomain,
          userId: user.id
        })
        
        // Use repository pattern for database access
        const repository = CompanyIntelligenceRepository.getInstance()

        // Check if session already exists using repository
        let existingSession = null
        try {
          const sessions = await repository.getSessionsByUser(user.id)
          existingSession = sessions.find(s => s.domain === cleanDomain && s.status === 'active')
        } catch (error) {
          permanentLogger.info('SESSION', 'No existing session found', { domain: cleanDomain })
        }

        let session = existingSession
        
        if (existingSession) {
          // Update existing session with new analysis
          permanentLogger.info('SESSION', 'Updating existing session', {
            sessionId: existingSession.id,
            domain: cleanDomain
          })
          
          // Update existing session using repository
          try {
            const updatedSession = await repository.updateSession(existingSession.id, {
              merged_data: {
                ...existingSession.merged_data,
                site_analysis: result,
                stats: {
                  ...existingSession.merged_data?.stats,
                  lastAnalysis: new Date().toISOString()
                }
              }
            })
            session = updatedSession
          } catch (updateError) {
            permanentLogger.captureError('SESSION', updateError as Error, {
              sessionId: existingSession.id
            })
          }
        } else {
          // Create new session
          permanentLogger.info('SESSION', 'Creating new research session', {
            domain: cleanDomain,
            userId: user.id
          })
          
          // Create new session using repository
          try {
            const newSession = await repository.createSession(
              `Research: ${cleanDomain}`,
              cleanDomain
            )

            // Update with analysis results
            const updatedNewSession = await repository.updateMergedData(newSession.id, {
              site_analysis: result,
              stats: {
                totalPages: 0,
                dataPoints: 0,
                totalLinks: 0,
                lastAnalysis: new Date().toISOString()
              },
              pages: {},
              extractedData: {}
            })

            session = updatedNewSession
          } catch (sessionError) {
            permanentLogger.captureError('SESSION', sessionError as Error, {
              domain: cleanDomain
            })
          }
        }
        
        const sessionError = !session
        
        if (!session) {
          permanentLogger.captureError('SESSION', new Error('No session available'), {
            domain: cleanDomain
          })
        } else {
          sessionId = session.id
          permanentLogger.info('SESSION', 'Company intelligence session created', {
            sessionId,
            domain: cleanDomain
          })
          
          // Create corporate entity from detected information
          try {
            // Extract company name from metadata
            const companyName = result.metadata?.ogSiteName || 
                              result.metadata?.organizationName || 
                              result.metadata?.title?.split(' - ')[0] ||
                              result.metadata?.title?.split(' | ')[0] ||
                              cleanDomain.replace(/\.(com|org|net|io|co|ai)$/, '').replace(/^www\./, '')
            
            permanentLogger.info('CORPORATE_ENTITY', 'Creating corporate entity', {
              sessionId,
              companyName,
              domain: cleanDomain
            })
            
            // Use CorporateEntitiesRepository instead of direct database access
            const corporateEntitiesRepo = (await import('@/lib/repositories/corporate-entities-repository')).CorporateEntitiesRepository.getInstance()
            const entity = await corporateEntitiesRepo.createEntity({
              name: companyName,
              primary_domain: cleanDomain,
              website_url: `https://${cleanDomain}`,
              entity_type: 'parent',
              brand_assets: {
                ogImage: result.metadata?.ogImage,
                favicon: result.metadata?.favicon,
                themeColor: result.metadata?.themeColor
              },
              social_profiles: {
                twitter: result.metadata?.twitterSite,
                twitterCreator: result.metadata?.twitterCreator
              }
            }).catch((entityError) => {
              permanentLogger.captureError('CORPORATE_ENTITY', new Error('Failed to create corporate entity'), {
                sessionId,
                error: entityError.message
              })
              return null
            })

            if (entity) {
              corporateEntityId = entity.id
              permanentLogger.info('CORPORATE_ENTITY', 'Corporate entity created', {
                sessionId,
                entityId: corporateEntityId,
                companyName
              })
              
              // Update session with corporate entity reference using repository
              await repository.updateMergedData(sessionId, {
                ...result,
                corporate_entity_id: corporateEntityId,
                discovered_entities: [{
                  id: corporateEntityId,
                  name: companyName,
                  type: 'parent',
                  domain: cleanDomain
                }]
              })
            }
          } catch (entityError) {
            permanentLogger.captureError('CORPORATE_ENTITY', new Error('Error creating corporate entity'), {
              sessionId,
              error: entityError instanceof Error ? entityError.message : 'Unknown error'
            })
          }
        }
      } catch (sessionError) {
        permanentLogger.captureError('SESSION', new Error('Error creating research session'), {
          error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
          domain: cleanDomain
        })
      }
      
      // Add sessionId and corporateEntityId to result
      const resultWithSession = {
        ...result,
        sessionId,
        corporateEntityId
      }
      
      // End timing and log success
      totalTimer.stop()
      permanentLogger.breadcrumb('api_success', 'Site analysis completed successfully', {
        domain: cleanDomain,
        sessionId,
        hasIntelligence: !!intelligenceResult
      })

      return NextResponse.json(resultWithSession)
      
    } catch (fetchError) {
      permanentLogger.captureError('SITE_ANALYSIS', new Error('Failed to fetch site'), {
        domain: cleanDomain,
        error: fetchError
      })
      
      return NextResponse.json(
        { error: 'Failed to access website. Please check the domain.' },
        { status: 400 }
      )
    }
    
  } catch (error) {
    totalTimer.end()
    permanentLogger.captureError('SITE_ANALYSIS', error as Error, {
      message: 'Site analysis failed',
      breadcrumbs: true // Include breadcrumbs in error context
    })
    return NextResponse.json(
      { error: 'Failed to analyze site' },
      { status: 500 }
    )
  } finally {
    // Ensure timer is ended even if there's an early return
    if (totalTimer) {
      totalTimer.stop()
    }
  }
}

function analyzeTechnology(html: string, headers: Headers) {
  const technologies = {
    frontend: [] as string[],
    backend: [] as string[],
    cms: [] as string[],
    analytics: [] as string[],
    hosting: [] as string[],
    security: [] as string[]
  }
  
  const metadata = {
    // Basic SEO
    title: '',
    description: '',
    keywords: [] as string[],
    author: '',
    favicon: '',
    canonical: '',
    robots: '',
    
    // Open Graph (Facebook, LinkedIn)
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    ogType: '',
    ogUrl: '',
    ogSiteName: '',
    
    // Twitter Card
    twitterCard: '',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    twitterSite: '',
    twitterCreator: '',
    
    // Schema.org structured data
    schemaType: '',
    organizationName: '',
    
    // Additional metadata
    viewport: '',
    generator: '',
    language: '',
    charset: '',
    themeColor: ''
  }
  
  // Detect CMS & Website Builders
  if (html.includes('wp-content') || html.includes('wordpress')) {
    technologies.cms.push('WordPress')
  }
  if (html.includes('drupal')) {
    technologies.cms.push('Drupal')
  }
  if (html.includes('joomla')) {
    technologies.cms.push('Joomla')
  }
  if (html.includes('shopify') || html.includes('cdn.shopify.com')) {
    technologies.cms.push('Shopify')
  }
  if (html.includes('wix.com') || html.includes('static.wixstatic.com')) {
    technologies.cms.push('Wix')
  }
  if (html.includes('squarespace') || html.includes('static.squarespace.com')) {
    technologies.cms.push('Squarespace')
  }
  if (html.includes('webflow.com') || html.includes('assets.website-files.com')) {
    technologies.cms.push('Webflow')
  }
  
  // Detect E-commerce Platforms
  if (html.includes('woocommerce') || html.includes('wc-') || html.includes('wc_')) {
    technologies.cms.push('WooCommerce')
    if (!technologies.cms.includes('WordPress')) {
      technologies.cms.push('WordPress') // WooCommerce implies WordPress
    }
  }
  // More specific Magento detection - look for actual Magento markers, not just the word
  if ((html.includes('/static/version') && html.includes('Magento')) || 
      html.includes('mage/cookies.js') || 
      html.includes('Magento_') ||
      html.includes('data-mage-init') ||
      html.includes('mage/apply/main')) {
    technologies.cms.push('Magento')
  }
  if (html.includes('prestashop') || html.includes('PrestaShop')) {
    technologies.cms.push('PrestaShop')
  }
  if (html.includes('bigcommerce') || html.includes('cdn11.bigcommerce.com')) {
    technologies.cms.push('BigCommerce')
  }
  
  // Detect Frontend Frameworks - More accurate detection
  // Next.js - very specific markers
  if (html.includes('__NEXT_DATA__') || html.includes('/_next/static/')) {
    technologies.frontend.push('Next.js')
    // Next.js always uses React
    if (!technologies.frontend.includes('React')) {
      technologies.frontend.push('React')
    }
  }
  // React - look for specific React patterns
  else if (html.match(/data-react|react-root|__react/i) || 
           html.includes('React.createElement') ||
           html.includes('_reactRootContainer')) {
    technologies.frontend.push('React')
  }
  // Vue.js - specific Vue markers
  else if (html.match(/\bv-if="|v-for="|v-model="|v-show="/i) || 
           html.includes('Vue.js') ||
           html.includes('__vue__')) {
    technologies.frontend.push('Vue.js')
  }
  // Angular - specific Angular markers (not just the word 'angular')
  else if (html.match(/\bng-app="|ng-controller="|ng-model="|ng-click="/i) ||
           html.includes('angular.min.js') ||
           html.match(/<[^>]+\s+\*ngIf=/i)) {
    technologies.frontend.push('Angular')
  }
  // Svelte - specific Svelte markers
  else if (html.includes('__svelte') || html.includes('svelte-')) {
    technologies.frontend.push('Svelte')
  }
  
  // Detect jQuery (as primary framework when no other is detected)
  if (html.includes('jquery.min.js') || html.includes('jQuery(') || html.includes('$(document)')) {
    technologies.frontend.push('jQuery')
  }
  
  // Detect Node.js/Express indicators
  if (headers.get('x-powered-by')?.includes('Express')) {
    technologies.backend.push('Express.js')
    technologies.backend.push('Node.js')
  }
  
  // Detect ASP.NET
  if (html.includes('.aspx') || html.includes('__VIEWSTATE') || html.includes('ASP.NET')) {
    technologies.backend.push('ASP.NET')
  }
  if (headers.get('x-aspnet-version')) {
    technologies.backend.push('ASP.NET')
  }
  
  // Detect Analytics - be more specific
  if (html.match(/google-analytics\.com\/analytics\.js|\/gtag\/js|ga\('create'/)) {
    technologies.analytics.push('Google Analytics')
  }
  if (html.includes('googletagmanager.com/gtm.js')) {
    technologies.analytics.push('Google Tag Manager')
  }
  if (html.includes('cdn.segment.com/analytics.js')) {
    technologies.analytics.push('Segment')
  }
  if (html.includes('static.hotjar.com/c/hotjar-')) {
    technologies.analytics.push('Hotjar')
  }
  if (html.includes('cdn.mixpanel.com')) {
    technologies.analytics.push('Mixpanel')
  }
  
  // Detect Security Headers
  if (headers.get('strict-transport-security')) {
    technologies.security.push('HSTS')
  }
  if (headers.get('content-security-policy')) {
    technologies.security.push('CSP')
  }
  if (headers.get('x-frame-options')) {
    technologies.security.push('X-Frame-Options')
  }
  
  // Detect Hosting/CDN
  const server = headers.get('server')
  if (server) {
    if (server.includes('cloudflare')) {
      technologies.hosting.push('Cloudflare')
    }
    if (server.includes('nginx')) {
      technologies.hosting.push('Nginx')
    }
    if (server.includes('apache')) {
      technologies.hosting.push('Apache')
    }
  }
  
  const cfRay = headers.get('cf-ray')
  if (cfRay) {
    technologies.hosting.push('Cloudflare')
  }
  
  // Extract comprehensive metadata
  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text: string): string => {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&nbsp;/g, ' ')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
  }
  
  // Basic SEO metadata
  const titleMatch = html.match(/<title>(.*?)<\/title>/i)
  if (titleMatch) {
    metadata.title = decodeHtmlEntities(titleMatch[1].trim())
  }
  
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)
  if (descMatch) {
    metadata.description = decodeHtmlEntities(descMatch[1].trim())
  }
  
  const keywordsMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i)
  if (keywordsMatch) {
    metadata.keywords = keywordsMatch[1].split(',').map(k => k.trim())
  }
  
  const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["'](.*?)["']/i)
  if (authorMatch) {
    metadata.author = authorMatch[1].trim()
  }
  
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i)
  if (canonicalMatch) {
    metadata.canonical = canonicalMatch[1].trim()
  }
  
  const robotsMatch = html.match(/<meta\s+name=["']robots["']\s+content=["'](.*?)["']/i)
  if (robotsMatch) {
    metadata.robots = robotsMatch[1].trim()
  }
  
  // Open Graph metadata (Facebook, LinkedIn)
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i)
  if (ogTitleMatch) {
    metadata.ogTitle = ogTitleMatch[1].trim()
  }
  
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)
  if (ogDescMatch) {
    metadata.ogDescription = ogDescMatch[1].trim()
  }
  
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i)
  if (ogImageMatch) {
    metadata.ogImage = ogImageMatch[1].trim()
  }
  
  const ogTypeMatch = html.match(/<meta\s+property=["']og:type["']\s+content=["'](.*?)["']/i)
  if (ogTypeMatch) {
    metadata.ogType = ogTypeMatch[1].trim()
  }
  
  const ogUrlMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["'](.*?)["']/i)
  if (ogUrlMatch) {
    metadata.ogUrl = ogUrlMatch[1].trim()
  }
  
  const ogSiteNameMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["'](.*?)["']/i)
  if (ogSiteNameMatch) {
    metadata.ogSiteName = ogSiteNameMatch[1].trim()
  }
  
  // Twitter Card metadata
  const twitterCardMatch = html.match(/<meta\s+name=["']twitter:card["']\s+content=["'](.*?)["']/i)
  if (twitterCardMatch) {
    metadata.twitterCard = twitterCardMatch[1].trim()
  }
  
  const twitterTitleMatch = html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i)
  if (twitterTitleMatch) {
    metadata.twitterTitle = twitterTitleMatch[1].trim()
  }
  
  const twitterDescMatch = html.match(/<meta\s+name=["']twitter:description["']\s+content=["'](.*?)["']/i)
  if (twitterDescMatch) {
    metadata.twitterDescription = twitterDescMatch[1].trim()
  }
  
  const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i)
  if (twitterImageMatch) {
    metadata.twitterImage = twitterImageMatch[1].trim()
  }
  
  const twitterSiteMatch = html.match(/<meta\s+name=["']twitter:site["']\s+content=["'](.*?)["']/i)
  if (twitterSiteMatch) {
    metadata.twitterSite = twitterSiteMatch[1].trim()
  }
  
  const twitterCreatorMatch = html.match(/<meta\s+name=["']twitter:creator["']\s+content=["'](.*?)["']/i)
  if (twitterCreatorMatch) {
    metadata.twitterCreator = twitterCreatorMatch[1].trim()
  }
  
  // Additional metadata
  const viewportMatch = html.match(/<meta\s+name=["']viewport["']\s+content=["'](.*?)["']/i)
  if (viewportMatch) {
    metadata.viewport = viewportMatch[1].trim()
  }
  
  const generatorMatch = html.match(/<meta\s+name=["']generator["']\s+content=["'](.*?)["']/i)
  if (generatorMatch) {
    metadata.generator = generatorMatch[1].trim()
  }
  
  const languageMatch = html.match(/<html[^>]*\s+lang=["'](.*?)["']/i)
  if (languageMatch) {
    metadata.language = languageMatch[1].trim()
  }
  
  const charsetMatch = html.match(/<meta\s+charset=["'](.*?)["']/i)
  if (charsetMatch) {
    metadata.charset = charsetMatch[1].trim()
  }
  
  const themeColorMatch = html.match(/<meta\s+name=["']theme-color["']\s+content=["'](.*?)["']/i)
  if (themeColorMatch) {
    metadata.themeColor = themeColorMatch[1].trim()
  }
  
  // Favicon detection
  const faviconMatch = html.match(/<link[^>]*\s+rel=["'](?:icon|shortcut icon)["'][^>]*\s+href=["'](.*?)["']/i)
  if (faviconMatch) {
    metadata.favicon = faviconMatch[1].trim()
  }
  
  // Schema.org structured data detection
  const schemaMatch = html.match(/<script[^>]*\s+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is)
  if (schemaMatch) {
    try {
      const schemaData = JSON.parse(schemaMatch[1])
      if (schemaData['@type']) {
        metadata.schemaType = Array.isArray(schemaData['@type']) ? schemaData['@type'].join(', ') : schemaData['@type']
      }
      if (schemaData.name && (schemaData['@type'] === 'Organization' || schemaData['@type']?.includes('Organization'))) {
        metadata.organizationName = schemaData.name
      }
    } catch (e) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', e as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw e
    }
  }
  
  // Determine site type - prioritize most specific first
  let siteType: 'wordpress' | 'shopify' | 'wix' | 'squarespace' | 'joomla' | 'drupal' | 
               'webflow' | 'react' | 'nextjs' | 'angular' | 'vue' | 'svelte' | 
               'nodejs' | 'express' | 'woocommerce' | 'magento' | 'prestashop' | 
               'bigcommerce' | 'aspnet' | 'jquery' | 'static' | 'unknown' = 'unknown'
  
  // JavaScript frameworks take priority (Next.js, React, etc. are the primary technology)
  if (technologies.frontend.includes('Next.js')) {
    siteType = 'nextjs'
  } else if (technologies.frontend.includes('React')) {
    siteType = 'react'
  } else if (technologies.frontend.includes('Vue.js')) {
    siteType = 'vue'
  } else if (technologies.frontend.includes('Angular')) {
    siteType = 'angular'
  } else if (technologies.frontend.includes('Svelte')) {
    siteType = 'svelte'
  }
  // E-commerce platforms (only if no modern JS framework detected)
  else if (technologies.cms.includes('WooCommerce')) {
    siteType = 'woocommerce'
  } else if (technologies.cms.includes('Shopify')) {
    siteType = 'shopify'
  } else if (technologies.cms.includes('Magento')) {
    siteType = 'magento'
  } else if (technologies.cms.includes('PrestaShop')) {
    siteType = 'prestashop'
  } else if (technologies.cms.includes('BigCommerce')) {
    siteType = 'bigcommerce'
  }
  // CMS/Website builders
  else if (technologies.cms.includes('WordPress')) {
    siteType = 'wordpress'
  } else if (technologies.cms.includes('Wix')) {
    siteType = 'wix'
  } else if (technologies.cms.includes('Squarespace')) {
    siteType = 'squarespace'
  } else if (technologies.cms.includes('Webflow')) {
    siteType = 'webflow'
  } else if (technologies.cms.includes('Drupal')) {
    siteType = 'drupal'
  } else if (technologies.cms.includes('Joomla')) {
    siteType = 'joomla'
  }
  // jQuery as fallback for older sites
  else if (technologies.frontend.includes('jQuery')) {
    siteType = 'jquery'
  }
  // Backend frameworks
  else if (technologies.backend.includes('ASP.NET')) {
    siteType = 'aspnet'
  } else if (technologies.backend.includes('Express.js')) {
    siteType = 'express'
  } else if (technologies.backend.includes('Node.js')) {
    siteType = 'nodejs'
  }
  // Static sites
  else if (technologies.frontend.length === 0 && technologies.cms.length === 0) {
    // Check for signs of dynamic content
    if (!html.includes('<script') || html.match(/<script[^>]*>\s*<\/script>/g)) {
      siteType = 'static'
    }
  }
  
  return {
    technologies,
    metadata,
    siteType,
    performance: {
      loadTime: 0, // Would need actual measurement
      pageSize: html.length,
      requestCount: 1
    }
  }
}

function calculateConfidence(analysis: any): number {
  let confidence = 0.5 // Base confidence
  
  // Increase confidence based on detected technologies
  if (analysis.technologies.cms.length > 0) confidence += 0.2
  if (analysis.technologies.frontend.length > 0) confidence += 0.2
  if (analysis.technologies.analytics.length > 0) confidence += 0.1
  
  // Cap at 1.0
  return Math.min(confidence, 1.0)
}