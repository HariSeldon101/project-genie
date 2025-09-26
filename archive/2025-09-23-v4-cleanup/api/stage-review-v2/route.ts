/**
 * Stage-by-Stage Company Intelligence API
 * Processes research in stages with review gates
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPhaseOrchestrator } from '@/lib/company-intelligence/core/phase-orchestrator'
// PackStore removed - table doesn't exist, using CompanyIntelligenceRepository instead
// TestPackStore removed - not used in production
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { createClient } from '@/lib/supabase/server'
// initializeScrapers removed - orchestrator handles initialization internally

// Request schemas
const startSchema = z.object({
  stage: z.literal('start'),
  domain: z.string(),
  sessionId: z.string().optional(),  // Add sessionId for progress tracking
  options: z.object({
    maxPages: z.number().default(50),  // Increased from 10 to capture all discovered pages
    timeout: z.number().default(30000),
    scraperMode: z.enum(['auto', 'static', 'dynamic']).default('auto')
  }).optional()
})

const reviewSchema = z.object({
  stage: z.enum(['scraping', 'extraction', 'enrichment', 'generation']),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  sessionId: z.string()
})

// Store for active sessions
const activeSessions = new Map<string, any>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Check if in test mode
    const isTestMode = process.env.NODE_ENV === 'development' && 
                      req.headers.get('x-test-mode') === 'true'
    
    let userId = 'test-user'
    
    if (!isTestMode) {
      // Check authentication
      const supabase = await createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user && !isTestMode) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      
      if (user) userId = user.id
    }

    // Handle start request
    if (body.stage === 'start') {
      const request = startSchema.parse(body)
      const sessionId = request.sessionId || crypto.randomUUID()
      
      permanentLogger.info('STAGE_REVIEW_API', 'Starting stage-by-stage research', {
        sessionId,
        domain: request.domain,
        userId
      })

      // Initialize orchestrator
      const packStore = await PackStore.createServerInstance()
      const orchestrator = getPhaseOrchestrator()

      // NOTE: Orchestrator constructor already calls initializeScrapers()
      // DO NOT call it again here - it causes double registration issues!

      // Start scraping phase
      const scrapingData = await orchestrator.scrapeCompanyWebsite({
        domain: request.domain,
        depth: 'basic',
        options: request.options,
        userId,
        projectId: 'stage-review',
        sessionId // Pass sessionId for progress tracking
      } as any)

      // Extract ALL comprehensive data from enhanced scraper
      const firstPage = scrapingData.pages[0]
      // Get data from the correct location after orchestrator mapping
      const pageData = firstPage?.data || {}
      
      // Extract and aggregate navigation items from all pages
      const allNavigationItems: any[] = []
      const navigationStructure: any = {
        main: [],
        footer: [],
        sidebar: [],
        breadcrumbs: []
      }
      
      // Collect navigation from all scraped pages
      scrapingData.pages.forEach((page: any) => {
        // Check multiple locations for navigation data
        const navSources = [
          page.data?.navigationItems,
          page.data?.structured?.navigationItems,
          page.data?.structured?.navigation?.items,
          page.data?.raw?.navigationItems
        ]
        
        for (const navSource of navSources) {
          if (navSource && Array.isArray(navSource)) {
            allNavigationItems.push(...navSource)
          }
        }
        
        // Also check for structured navigation data
        if (page.data?.structured?.navigation) {
          const nav = page.data.structured.navigation
          if (nav.mainNav) navigationStructure.main = nav.mainNav
          if (nav.footerNav) navigationStructure.footer = nav.footerNav
          if (nav.sidebarNav) navigationStructure.sidebar = nav.sidebarNav
          if (nav.breadcrumbs) navigationStructure.breadcrumbs = nav.breadcrumbs
        }
      })
      
      // If no navigation items found, create them from discovered page URLs
      if (allNavigationItems.length === 0 && scrapingData.pages.length > 0) {
        permanentLogger.info('STAGE_REVIEW_API', 'Creating navigation from discovered pages', {
          pageCount: scrapingData.pages.length
        })
        
        scrapingData.pages.forEach((page: any) => {
          const url = page.url
          const urlPath = new URL(url).pathname
          
          // Create navigation item from URL
          let text = urlPath.split('/').filter(Boolean).pop() || 'Home'
          text = text.replace(/-/g, ' ').replace(/_/g, ' ')
          text = text.charAt(0).toUpperCase() + text.slice(1)
          
          // Categorize by URL pattern
          const category = urlPath.includes('/blog') ? 'blog' :
                          urlPath.includes('/about') ? 'company' :
                          urlPath.includes('/contact') ? 'contact' :
                          urlPath.includes('/services') || urlPath.includes('/products') ? 'offerings' :
                          urlPath.includes('/team') ? 'company' :
                          urlPath.includes('/case-studies') || urlPath.includes('/portfolio') ? 'work' :
                          'main'
          
          allNavigationItems.push({
            text: text,
            href: urlPath || '/',
            category: category,
            depth: urlPath.split('/').filter(Boolean).length
          })
        })
      }
      
      // Deduplicate navigation items
      const uniqueNavigationItems = allNavigationItems
        .filter((item, index, self) => 
          index === self.findIndex(i => i.href === item.href && i.text === item.text)
        )
        .slice(0, 50) // Limit to 50 items
      
      const reviewData = {
        // Add discovered URLs count
        discoveredUrls: scrapingData.discoveredUrls || scrapingData.pages?.length || 0,
        
        // Core content from all pages
        pages: scrapingData.pages.map(page => ({
          url: page.url,
          type: page.type,
          title: page.data?.title || '',
          h1: page.data?.h1 || page.data?.structured?.h1?.[0] || '',
          heroText: page.data?.description || page.data?.structured?.heroText || '',
          content: page.data?.content || page.data?.structured?.content || page.data?.raw?.text?.substring(0, 2000) || '',
          images: page.data?.images || page.data?.structured?.images || [],
          metadata: page.data?.metadata || {},
          contactInfo: page.data?.contactInfo || {},
          socialLinks: page.data?.socialLinks || [],
          navigationItems: page.data?.navigationItems || [],
          teamMembers: page.data?.teamMembers || [],
          testimonials: page.data?.testimonials || [],
          products: page.data?.products || []
        })),
        
        // Brand assets from scraping data - now properly extracted
        brandAssets: scrapingData.brandAssets || {
          logo: pageData.brandAssets?.logo || null,
          colors: pageData.brandAssets?.colors || [],
          fonts: pageData.brandAssets?.fonts || [],
          favicon: pageData.brandAssets?.favicon || null
        },
        
        // Contact information aggregated from scraped data
        contactInfo: scrapingData.contactInfo || {
          emails: pageData.contactInfo?.emails || [],
          phones: pageData.contactInfo?.phones || [],
          addresses: pageData.contactInfo?.addresses || [],
          contactPageUrl: ''
        },
        
        // Social media presence
        socialLinks: scrapingData.socialLinks || pageData.socialLinks || [],
        
        // Navigation structure - now properly aggregated
        navigationItems: uniqueNavigationItems.length > 0 ? uniqueNavigationItems : 
                        scrapingData.navigationItems || [],
        navigationStructure: navigationStructure,
        
        // Team information - aggregate from all pages
        teamMembers: scrapingData.teamMembers || scrapingData.pages
          .flatMap(p => p.data?.teamMembers || [])
          .filter((member, index, self) => 
            index === self.findIndex(m => m.name === member.name)
          )
          .slice(0, 20), // Top 20 unique team members
        
        // Customer testimonials
        testimonials: scrapingData.testimonials || scrapingData.pages
          .flatMap(p => p.data?.testimonials || [])
          .slice(0, 15), // Top 15 testimonials
        
        // Products and services
        products: scrapingData.products || scrapingData.pages
          .flatMap(p => p.data?.products || [])
          .slice(0, 20), // Top 20 products
        
        // Blog posts
        blogPosts: scrapingData.blogPosts || scrapingData.pages
          .flatMap(p => p.data?.blogPosts || [])
          .slice(0, 10),
        
        // Screenshot if available
        screenshot: pageData.screenshot || null,
        
        // Metrics
        metrics: {
          pagesDiscovered: allNavigationItems.length || uniqueNavigationItems.length,
          pagesScraped: scrapingData.pages.length,
          completeness: calculateCompleteness(scrapingData),
          quality: calculateQuality(scrapingData),
          diversity: calculateDiversity(scrapingData),
          confidence: 85,
          hasLogo: !!(scrapingData.brandAssets?.logo),
          hasContactInfo: !!(scrapingData.contactInfo?.emails?.length || 
                            scrapingData.contactInfo?.phones?.length),
          hasSocialLinks: !!(scrapingData.socialLinks?.length),
          hasTeamInfo: !!(scrapingData.teamMembers?.length),
          hasProducts: !!(scrapingData.products?.length)
        }
      }

      // Store session data
      activeSessions.set(sessionId, {
        orchestrator,
        domain: request.domain,
        userId,
        currentStage: 'scraping',
        scrapingData,
        timestamp: new Date()
      })

      // Clean up old sessions (older than 1 hour)
      cleanupOldSessions()

      return NextResponse.json({
        sessionId,
        stage: 'scraping',
        data: reviewData,
        nextAction: 'review'
      })
    }

    // Handle review request
    if (body.action) {
      const review = reviewSchema.parse(body)
      
      const session = activeSessions.get(review.sessionId)
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found or expired' },
          { status: 404 }
        )
      }

      permanentLogger.info('STAGE_REVIEW_API', 'Processing review', {
        sessionId: review.sessionId,
        stage: review.stage,
        action: review.action
      })

      if (review.action === 'reject') {
        // Clean up and end session
        await session.orchestrator.cleanup()
        activeSessions.delete(review.sessionId)
        
        return NextResponse.json({
          sessionId: review.sessionId,
          status: 'rejected',
          stage: review.stage,
          reason: review.reason || 'User rejected the results'
        })
      }

      // Process next stage based on current stage
      let nextStage: string
      let nextData: any

      switch (review.stage) {
        case 'scraping':
          // Move to extraction phase
          nextStage = 'extraction'
          const extractedData = await session.orchestrator.extractCompanyData(session.scrapingData)
          
          // Include all the comprehensive data we collected
          nextData = {
            companyName: extractedData.companyName,
            basics: extractedData.basics,
            products: extractedData.productsServices?.products || [],
            services: extractedData.productsServices?.services || [],
            team: extractedData.people?.leadership || [],
            employees: extractedData.people?.employees || [],
            contact: extractedData.contact,
            online: extractedData.online || {},
            brandAssets: session.scrapingData.pages[0]?.data?.structured?.brandAssets || {},
            navigationStructure: session.scrapingData.pages[0]?.data?.structured?.navigationItems || [],
            testimonials: session.scrapingData.pages
              .flatMap(p => p.data?.structured?.testimonials || [])
              .slice(0, 10),
            metrics: {
              completeness: calculateCompleteness(extractedData),
              quality: 85,
              diversity: 80,
              confidence: 88,
              extractedFields: Object.keys(extractedData).filter(k => extractedData[k]).length
            }
          }
          
          session.extractedData = extractedData
          session.currentStage = nextStage
          break

        case 'extraction':
          // STOP HERE - Wait for user approval before enrichment
          // This is where the user should review and approve/reject
          nextStage = 'awaiting_approval' // Stop progression
          nextAction = 'approve_or_reject' // User must approve to continue
          
          // Return the extracted data for user review
          nextData = {
            message: 'Data extraction complete. Review the extracted data and approve to continue with enrichment.',
            extractedData: session.extractedData,
            requiresApproval: true,
            nextStep: 'enrichment'
          }
          
          // DO NOT run enrichment automatically - wait for user approval
          /*
          const enrichedData = await session.orchestrator.enrichmentEngine.enrich(
            session.extractedData,
            { 
              domain: session.domain,
              includeNews: true,
              includeCompetitors: true,
              includeTechStack: true
            }
          )
          
          // Remove any dummy data
          if (enrichedData.recentActivity?.news) {
            enrichedData.recentActivity.news = enrichedData.recentActivity.news.filter(
              (news: any) => news.url && !news.title.includes('OR')
            )
          }
          
          if (enrichedData.online?.socialMedia) {
            enrichedData.online.socialMedia = enrichedData.online.socialMedia.filter(
              (social: any) => social.profileUrl && social.followers > 0
            )
          }
          
          nextData = {
            news: enrichedData.recentActivity?.news || [],
            socialMedia: enrichedData.online?.socialMedia || [],
            competitors: enrichedData.competitors || [],
            techStack: enrichedData.techStack || [],
            metrics: {
              completeness: 85,
              quality: 85,
              diversity: 90,
              confidence: 88
            }
          }
          
          session.enrichedData = enrichedData
          */
          session.currentStage = 'awaiting_approval'
          break

        case 'enrichment':
          // Move to generation phase
          nextStage = 'generation'
          const finalPack = await session.orchestrator.packGenerator.generate(
            session.enrichedData,
            {
              domain: session.domain,
              format: 'full',
              includeMetadata: true
            }
          )
          
          // Clean up internal prompts and metadata
          delete (finalPack as any).generationMetadata
          delete (finalPack as any).internalPrompts
          
          nextData = {
            pack: finalPack,
            metrics: {
              completeness: 95,
              quality: 92,
              diversity: 88,
              confidence: 93
            }
          }
          
          session.finalPack = finalPack
          session.currentStage = nextStage
          break

        case 'generation':
          // Final approval - save and return
          const packStore = isTestMode 
            ? new TestPackStore() as any 
            : await PackStore.createServerInstance()
          
          await packStore.save(session.finalPack)
          
          // Clean up
          await session.orchestrator.cleanup()
          activeSessions.delete(review.sessionId)
          
          return NextResponse.json({
            sessionId: review.sessionId,
            status: 'completed',
            packId: session.finalPack.id,
            pack: session.finalPack
          })

        default:
          throw new Error(`Unknown stage: ${review.stage}`)
      }

      return NextResponse.json({
        sessionId: review.sessionId,
        stage: nextStage,
        data: nextData,
        nextAction: 'review'
      })
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )

  } catch (error) {
    permanentLogger.captureError('STAGE_REVIEW_API', new Error('Request failed'), {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateCompleteness(data: any): number {
  let score = 0
  let total = 0
  
  const checkField = (field: any, weight: number = 1) => {
    total += weight
    if (field && (Array.isArray(field) ? field.length > 0 : field !== '')) {
      score += weight
    }
  }
  
  // Check various fields
  checkField(data.companyName, 2)
  checkField(data.basics?.description, 2)
  checkField(data.pages?.length, 3)
  checkField(data.productsServices?.products, 2)
  checkField(data.people?.leadership, 1)
  checkField(data.contact?.emails, 1)
  
  return Math.round((score / total) * 100)
}

function calculateQuality(data: any): number {
  // Simple quality scoring based on content depth
  let quality = 70 // Base quality
  
  if (data.pages?.some((p: any) => p.data?.structured?.h1)) quality += 5
  if (data.pages?.some((p: any) => p.data?.structured?.heroText)) quality += 5
  if (data.pages?.some((p: any) => p.data?.structured?.blogPosts?.length > 0)) quality += 10
  if (data.pages?.some((p: any) => p.data?.structured?.brandAssets?.logo)) quality += 5
  if (data.pages?.length > 5) quality += 5
  
  return Math.min(quality, 100)
}

function calculateDiversity(data: any): number {
  // Score based on variety of data sources
  const sources = new Set<string>()
  
  if (data.pages?.length > 0) sources.add('website')
  if (data.recentActivity?.news?.length > 0) sources.add('news')
  if (data.online?.socialMedia?.length > 0) sources.add('social')
  if (data.competitors?.length > 0) sources.add('competitors')
  if (data.techStack?.length > 0) sources.add('tech')
  
  return (sources.size / 5) * 100
}

function cleanupOldSessions() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.timestamp < oneHourAgo) {
      session.orchestrator?.cleanup()
      activeSessions.delete(sessionId)
    }
  }
}