/**
 * Content Pattern Matcher
 * Detects page types based on content patterns, HTML structure, and text analysis
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { PageType, URLPatternMatch, ContentSignal } from './types'

export class ContentPatternMatcher {
  private domain: string
  
  // URL patterns for different page types
  private readonly URL_PATTERNS: Array<{
    pattern: RegExp
    pageType: PageType
    confidence: number
    matchType: 'path' | 'filename' | 'parameter' | 'subdomain'
  }> = [
    // Homepage patterns
    { pattern: /^\/$/, pageType: 'homepage', confidence: 1.0, matchType: 'path' },
    { pattern: /^\/home\/?$/i, pageType: 'homepage', confidence: 0.9, matchType: 'path' },
    { pattern: /^\/index\.(html?|php)$/i, pageType: 'homepage', confidence: 0.8, matchType: 'filename' },
    
    // About pages
    { pattern: /\/about\/?$/i, pageType: 'about', confidence: 0.95, matchType: 'path' },
    { pattern: /\/about-us\/?$/i, pageType: 'about', confidence: 0.95, matchType: 'path' },
    { pattern: /\/company\/?$/i, pageType: 'about', confidence: 0.8, matchType: 'path' },
    { pattern: /\/our-story\/?$/i, pageType: 'about', confidence: 0.8, matchType: 'path' },
    { pattern: /\/who-we-are\/?$/i, pageType: 'about', confidence: 0.8, matchType: 'path' },
    
    // Team pages
    { pattern: /\/team\/?$/i, pageType: 'team', confidence: 0.95, matchType: 'path' },
    { pattern: /\/our-team\/?$/i, pageType: 'team', confidence: 0.95, matchType: 'path' },
    { pattern: /\/people\/?$/i, pageType: 'team', confidence: 0.9, matchType: 'path' },
    { pattern: /\/staff\/?$/i, pageType: 'team', confidence: 0.9, matchType: 'path' },
    { pattern: /\/leadership\/?$/i, pageType: 'team', confidence: 0.85, matchType: 'path' },
    { pattern: /\/management\/?$/i, pageType: 'team', confidence: 0.8, matchType: 'path' },
    
    // Contact pages
    { pattern: /\/contact\/?$/i, pageType: 'contact', confidence: 0.95, matchType: 'path' },
    { pattern: /\/contact-us\/?$/i, pageType: 'contact', confidence: 0.95, matchType: 'path' },
    { pattern: /\/get-in-touch\/?$/i, pageType: 'contact', confidence: 0.9, matchType: 'path' },
    { pattern: /\/reach-out\/?$/i, pageType: 'contact', confidence: 0.8, matchType: 'path' },
    
    // Blog patterns
    { pattern: /\/blog\/?$/i, pageType: 'blog', confidence: 0.95, matchType: 'path' },
    { pattern: /\/news\/?$/i, pageType: 'blog', confidence: 0.8, matchType: 'path' },
    { pattern: /\/articles\/?$/i, pageType: 'blog', confidence: 0.9, matchType: 'path' },
    { pattern: /\/insights\/?$/i, pageType: 'blog', confidence: 0.8, matchType: 'path' },
    { pattern: /\/resources\/?$/i, pageType: 'blog', confidence: 0.7, matchType: 'path' },
    { pattern: /^blog\./i, pageType: 'blog', confidence: 0.9, matchType: 'subdomain' },
    
    // Blog post patterns
    { pattern: /\/blog\/[^\/]+\/?$/i, pageType: 'blog_post', confidence: 0.9, matchType: 'path' },
    { pattern: /\/news\/[^\/]+\/?$/i, pageType: 'blog_post', confidence: 0.8, matchType: 'path' },
    { pattern: /\/articles\/[^\/]+\/?$/i, pageType: 'blog_post', confidence: 0.85, matchType: 'path' },
    { pattern: /\/posts?\/[^\/]+\/?$/i, pageType: 'blog_post', confidence: 0.9, matchType: 'path' },
    { pattern: /\/\d{4}\/\d{2}\/[^\/]+\/?$/i, pageType: 'blog_post', confidence: 0.85, matchType: 'path' },
    
    // Product pages
    { pattern: /\/products?\/?$/i, pageType: 'product_listing', confidence: 0.9, matchType: 'path' },
    { pattern: /\/shop\/?$/i, pageType: 'product_listing', confidence: 0.9, matchType: 'path' },
    { pattern: /\/store\/?$/i, pageType: 'product_listing', confidence: 0.9, matchType: 'path' },
    { pattern: /\/catalog\/?$/i, pageType: 'product_listing', confidence: 0.85, matchType: 'path' },
    { pattern: /\/products?\/[^\/]+\/?$/i, pageType: 'product', confidence: 0.85, matchType: 'path' },
    { pattern: /\/shop\/[^\/]+\/?$/i, pageType: 'product', confidence: 0.85, matchType: 'path' },
    { pattern: /\/item\/[^\/]+\/?$/i, pageType: 'product', confidence: 0.8, matchType: 'path' },
    
    // Service pages
    { pattern: /\/services?\/?$/i, pageType: 'service', confidence: 0.9, matchType: 'path' },
    { pattern: /\/solutions?\/?$/i, pageType: 'service', confidence: 0.85, matchType: 'path' },
    { pattern: /\/what-we-do\/?$/i, pageType: 'service', confidence: 0.8, matchType: 'path' },
    { pattern: /\/offerings\/?$/i, pageType: 'service', confidence: 0.8, matchType: 'path' },
    
    // Pricing pages
    { pattern: /\/pricing\/?$/i, pageType: 'pricing', confidence: 0.95, matchType: 'path' },
    { pattern: /\/plans\/?$/i, pageType: 'pricing', confidence: 0.9, matchType: 'path' },
    { pattern: /\/packages\/?$/i, pageType: 'pricing', confidence: 0.8, matchType: 'path' },
    { pattern: /\/costs?\/?$/i, pageType: 'pricing', confidence: 0.8, matchType: 'path' },
    
    // Support pages
    { pattern: /\/support\/?$/i, pageType: 'support', confidence: 0.9, matchType: 'path' },
    { pattern: /\/help\/?$/i, pageType: 'support', confidence: 0.9, matchType: 'path' },
    { pattern: /\/faq\/?$/i, pageType: 'faq', confidence: 0.95, matchType: 'path' },
    { pattern: /\/frequently-asked-questions\/?$/i, pageType: 'faq', confidence: 0.9, matchType: 'path' },
    
    // Career pages
    { pattern: /\/careers?\/?$/i, pageType: 'careers', confidence: 0.95, matchType: 'path' },
    { pattern: /\/jobs?\/?$/i, pageType: 'careers', confidence: 0.9, matchType: 'path' },
    { pattern: /\/hiring\/?$/i, pageType: 'careers', confidence: 0.8, matchType: 'path' },
    { pattern: /\/work-with-us\/?$/i, pageType: 'careers', confidence: 0.8, matchType: 'path' },
    { pattern: /\/join-our-team\/?$/i, pageType: 'careers', confidence: 0.8, matchType: 'path' },
    
    // Legal pages
    { pattern: /\/privacy\/?$/i, pageType: 'privacy', confidence: 0.95, matchType: 'path' },
    { pattern: /\/privacy-policy\/?$/i, pageType: 'privacy', confidence: 0.95, matchType: 'path' },
    { pattern: /\/terms\/?$/i, pageType: 'terms', confidence: 0.95, matchType: 'path' },
    { pattern: /\/terms-of-service\/?$/i, pageType: 'terms', confidence: 0.95, matchType: 'path' },
    { pattern: /\/legal\/?$/i, pageType: 'legal', confidence: 0.9, matchType: 'path' },
    
    // Case studies and testimonials
    { pattern: /\/case-studies?\/?$/i, pageType: 'case_study', confidence: 0.9, matchType: 'path' },
    { pattern: /\/success-stories\/?$/i, pageType: 'case_study', confidence: 0.85, matchType: 'path' },
    { pattern: /\/testimonials?\/?$/i, pageType: 'testimonial', confidence: 0.9, matchType: 'path' },
    { pattern: /\/reviews\/?$/i, pageType: 'testimonial', confidence: 0.8, matchType: 'path' },
    
    // Portfolio
    { pattern: /\/portfolio\/?$/i, pageType: 'portfolio', confidence: 0.9, matchType: 'path' },
    { pattern: /\/work\/?$/i, pageType: 'portfolio', confidence: 0.7, matchType: 'path' },
    { pattern: /\/projects?\/?$/i, pageType: 'portfolio', confidence: 0.7, matchType: 'path' },
    
    // Documentation
    { pattern: /\/docs?\/?$/i, pageType: 'documentation', confidence: 0.9, matchType: 'path' },
    { pattern: /\/documentation\/?$/i, pageType: 'documentation', confidence: 0.95, matchType: 'path' },
    { pattern: /\/api\/?$/i, pageType: 'documentation', confidence: 0.8, matchType: 'path' },
    { pattern: /\/guide\/?$/i, pageType: 'documentation', confidence: 0.8, matchType: 'path' },
    { pattern: /^docs?\./i, pageType: 'documentation', confidence: 0.9, matchType: 'subdomain' },
    
    // Downloads
    { pattern: /\/downloads?\/?$/i, pageType: 'download', confidence: 0.9, matchType: 'path' },
    { pattern: /\/files\/?$/i, pageType: 'download', confidence: 0.7, matchType: 'path' },
    
    // Auth pages
    { pattern: /\/login\/?$/i, pageType: 'login', confidence: 0.95, matchType: 'path' },
    { pattern: /\/sign-?in\/?$/i, pageType: 'login', confidence: 0.9, matchType: 'path' },
    { pattern: /\/signup\/?$/i, pageType: 'signup', confidence: 0.95, matchType: 'path' },
    { pattern: /\/sign-?up\/?$/i, pageType: 'signup', confidence: 0.9, matchType: 'path' },
    { pattern: /\/register\/?$/i, pageType: 'signup', confidence: 0.9, matchType: 'path' },
    
    // Press pages
    { pattern: /\/press\/?$/i, pageType: 'press', confidence: 0.9, matchType: 'path' },
    { pattern: /\/media\/?$/i, pageType: 'press', confidence: 0.8, matchType: 'path' },
    { pattern: /\/news-room\/?$/i, pageType: 'press', confidence: 0.85, matchType: 'path' }
  ]

  // Content signals for different page types
  private readonly CONTENT_SIGNALS: Array<{
    signal: string | RegExp
    pageType: PageType
    confidence: number
    signalType: 'html_element' | 'css_class' | 'text_content' | 'structure'
    context?: string
  }> = [
    // Homepage signals
    { signal: /<h1[^>]*>.*welcome.*<\/h1>/i, pageType: 'homepage', confidence: 0.7, signalType: 'html_element' },
    { signal: /class="[^"]*hero[^"]*"/i, pageType: 'homepage', confidence: 0.6, signalType: 'css_class' },
    { signal: /class="[^"]*banner[^"]*"/i, pageType: 'homepage', confidence: 0.5, signalType: 'css_class' },
    
    // Team page signals
    { signal: /class="[^"]*team[^"]*"/i, pageType: 'team', confidence: 0.8, signalType: 'css_class' },
    { signal: /class="[^"]*employee[^"]*"/i, pageType: 'team', confidence: 0.7, signalType: 'css_class' },
    { signal: /class="[^"]*staff[^"]*"/i, pageType: 'team', confidence: 0.7, signalType: 'css_class' },
    { signal: /class="[^"]*member[^"]*"/i, pageType: 'team', confidence: 0.6, signalType: 'css_class' },
    { signal: /<h[1-6][^>]*>.*meet.*team.*<\/h[1-6]>/i, pageType: 'team', confidence: 0.8, signalType: 'html_element' },
    { signal: /<h[1-6][^>]*>.*our.*people.*<\/h[1-6]>/i, pageType: 'team', confidence: 0.7, signalType: 'html_element' },
    
    // Blog signals
    { signal: /class="[^"]*blog[^"]*"/i, pageType: 'blog', confidence: 0.8, signalType: 'css_class' },
    { signal: /class="[^"]*post[^"]*"/i, pageType: 'blog_post', confidence: 0.7, signalType: 'css_class' },
    { signal: /class="[^"]*article[^"]*"/i, pageType: 'blog_post', confidence: 0.6, signalType: 'css_class' },
    { signal: /<time[^>]*>/i, pageType: 'blog_post', confidence: 0.6, signalType: 'html_element' },
    { signal: /class="[^"]*published[^"]*"/i, pageType: 'blog_post', confidence: 0.5, signalType: 'css_class' },
    { signal: /class="[^"]*author[^"]*"/i, pageType: 'blog_post', confidence: 0.5, signalType: 'css_class' },
    
    // Product page signals
    { signal: /class="[^"]*product[^"]*"/i, pageType: 'product', confidence: 0.8, signalType: 'css_class' },
    { signal: /class="[^"]*price[^"]*"/i, pageType: 'product', confidence: 0.7, signalType: 'css_class' },
    { signal: /class="[^"]*add-to-cart[^"]*"/i, pageType: 'product', confidence: 0.9, signalType: 'css_class' },
    { signal: /class="[^"]*buy-now[^"]*"/i, pageType: 'product', confidence: 0.8, signalType: 'css_class' },
    { signal: /<button[^>]*>.*add.*cart.*<\/button>/i, pageType: 'product', confidence: 0.8, signalType: 'html_element' },
    { signal: /\$\d+(\.\d{2})?/g, pageType: 'product', confidence: 0.4, signalType: 'text_content' },
    
    // Contact page signals
    { signal: /class="[^"]*contact[^"]*"/i, pageType: 'contact', confidence: 0.8, signalType: 'css_class' },
    { signal: /<form[^>]*.*contact.*<\/form>/i, pageType: 'contact', confidence: 0.9, signalType: 'html_element' },
    { signal: /<input[^>]*type="email"/i, pageType: 'contact', confidence: 0.6, signalType: 'html_element' },
    { signal: /<textarea/i, pageType: 'contact', confidence: 0.5, signalType: 'html_element' },
    { signal: /mailto:/i, pageType: 'contact', confidence: 0.6, signalType: 'text_content' },
    { signal: /tel:/i, pageType: 'contact', confidence: 0.5, signalType: 'text_content' },
    
    // FAQ signals
    { signal: /class="[^"]*faq[^"]*"/i, pageType: 'faq', confidence: 0.9, signalType: 'css_class' },
    { signal: /class="[^"]*accordion[^"]*"/i, pageType: 'faq', confidence: 0.6, signalType: 'css_class' },
    { signal: /<h[1-6][^>]*>.*frequently.*asked.*<\/h[1-6]>/i, pageType: 'faq', confidence: 0.9, signalType: 'html_element' },
    { signal: /Q:/g, pageType: 'faq', confidence: 0.5, signalType: 'text_content' },
    { signal: /A:/g, pageType: 'faq', confidence: 0.5, signalType: 'text_content' },
    
    // Pricing signals
    { signal: /class="[^"]*pricing[^"]*"/i, pageType: 'pricing', confidence: 0.9, signalType: 'css_class' },
    { signal: /class="[^"]*plan[^"]*"/i, pageType: 'pricing', confidence: 0.7, signalType: 'css_class' },
    { signal: /class="[^"]*package[^"]*"/i, pageType: 'pricing', confidence: 0.6, signalType: 'css_class' },
    { signal: /<h[1-6][^>]*>.*pricing.*<\/h[1-6]>/i, pageType: 'pricing', confidence: 0.8, signalType: 'html_element' },
    { signal: /\/month/g, pageType: 'pricing', confidence: 0.6, signalType: 'text_content' },
    { signal: /\/year/g, pageType: 'pricing', confidence: 0.6, signalType: 'text_content' },
    
    // Career signals
    { signal: /class="[^"]*career[^"]*"/i, pageType: 'careers', confidence: 0.8, signalType: 'css_class' },
    { signal: /class="[^"]*job[^"]*"/i, pageType: 'careers', confidence: 0.7, signalType: 'css_class' },
    { signal: /<h[1-6][^>]*>.*join.*team.*<\/h[1-6]>/i, pageType: 'careers', confidence: 0.8, signalType: 'html_element' },
    { signal: /<h[1-6][^>]*>.*careers?.*<\/h[1-6]>/i, pageType: 'careers', confidence: 0.8, signalType: 'html_element' },
    { signal: /apply now/i, pageType: 'careers', confidence: 0.6, signalType: 'text_content' }
  ]

  constructor(domain: string) {
    this.domain = domain
    permanentLogger.info('INTELLIGENCE', 'ContentPatternMatcher initialized', { domain})
  }

  /**
   * Analyze URL patterns to detect page type
   */
  public analyzeUrlPatterns(url: string): URLPatternMatch[] {
    const matches: URLPatternMatch[] = []
    
    try {
      const urlObj = new URL(url)
      const path = urlObj.pathname
      const subdomain = urlObj.hostname.split('.')[0]
      
      permanentLogger.info('INTELLIGENCE', 'Analyzing URL patterns', { url,
        path,
        subdomain,
        domain: this.domain })
      
      // Check each pattern against the URL
      for (const pattern of this.URL_PATTERNS) {
        let testString = ''
        
        switch (pattern.matchType) {
          case 'path':
            testString = path
            break
          case 'filename':
            testString = path.split('/').pop() || ''
            break
          case 'subdomain':
            testString = subdomain
            break
          case 'parameter':
            testString = urlObj.search
            break
        }
        
        if (pattern.pattern.test(testString)) {
          matches.push({
            pattern: pattern.pattern.source,
            pageType: pattern.pageType,
            confidence: pattern.confidence,
            matchType: pattern.matchType
          })
        }
      }
      
      // Sort by confidence (highest first)
      matches.sort((a, b) => b.confidence - a.confidence)
      
      permanentLogger.info('INTELLIGENCE', 'URL pattern analysis completed', {
        url,
        matchesFound: matches.length,
        topMatches: matches.slice(0, 3).map(m => ({ pageType: m.pageType, confidence: m.confidence }))
      })
      
    } catch (error) {
      permanentLogger.captureError('INTELLIGENCE', error as Error, {
        message: 'URL pattern analysis failed',
        url,
        domain: this.domain,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    return matches
  }

  /**
   * Analyze HTML content for page type signals
   */
  public analyzeContentSignals(html: string, url: string): ContentSignal[] {
    const signals: ContentSignal[] = []
    
    try {
      permanentLogger.info('INTELLIGENCE', 'Analyzing content signals', { url, domain: this.domain})
      
      // Check each content signal
      for (const signalDef of this.CONTENT_SIGNALS) {
        const evidence: string[] = []
        let matches = 0
        
        if (typeof signalDef.signal === 'string') {
          // Simple string contains check
          if (html.toLowerCase().includes(signalDef.signal.toLowerCase())) {
            matches = 1
            evidence.push(`String match: "${signalDef.signal}"`)
          }
        } else {
          // Regex pattern matching
          const regexMatches = html.match(signalDef.signal)
          if (regexMatches) {
            matches = regexMatches.length
            evidence.push(...regexMatches.slice(0, 3).map(match => `Pattern match: "${match.substring(0, 100)}"`))
          }
        }
        
        if (matches > 0) {
          // Adjust confidence based on number of matches (for regex patterns)
          let adjustedConfidence = signalDef.confidence
          if (matches > 1 && typeof signalDef.signal !== 'string') {
            adjustedConfidence = Math.min(1.0, signalDef.confidence * (1 + Math.log(matches) * 0.1))
          }
          
          signals.push({
            signal: typeof signalDef.signal === 'string' ? signalDef.signal : signalDef.signal.source,
            pageType: signalDef.pageType,
            confidence: adjustedConfidence,
            signalType: signalDef.signalType,
            evidence
          })
        }
      }
      
      // Sort by confidence (highest first)
      signals.sort((a, b) => b.confidence - a.confidence)
      
      permanentLogger.info('INTELLIGENCE', 'Content signal analysis completed', {
        url,
        signalsFound: signals.length,
        topSignals: signals.slice(0, 5).map(s => ({
          pageType: s.pageType,
          confidence: s.confidence,
          signalType: s.signalType
        }))
      })
      
    } catch (error) {
      permanentLogger.captureError('INTELLIGENCE', error as Error, {
        message: 'Content signal analysis failed',
        url,
        domain: this.domain,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    return signals
  }

  /**
   * Analyze page structure for additional type indicators
   */
  public analyzePageStructure(html: string, url: string): ContentSignal[] {
    const structuralSignals: ContentSignal[] = []
    
    try {
      permanentLogger.info('INTELLIGENCE', 'Analyzing page structure', { url, domain: this.domain})
      
      // Count different types of elements
      const elementCounts = {
        forms: (html.match(/<form/gi) || []).length,
        images: (html.match(/<img/gi) || []).length,
        links: (html.match(/<a\s+href/gi) || []).length,
        headings: (html.match(/<h[1-6]/gi) || []).length,
        paragraphs: (html.match(/<p/gi) || []).length,
        lists: (html.match(/<ul|<ol/gi) || []).length,
        tables: (html.match(/<table/gi) || []).length,
        videos: (html.match(/<video|<iframe.*youtube|<iframe.*vimeo/gi) || []).length
      }
      
      // Structural analysis for different page types
      
      // Contact page structure
      if (elementCounts.forms > 0) {
        const formInputs = (html.match(/<input/gi) || []).length
        const textareas = (html.match(/<textarea/gi) || []).length
        
        if (formInputs > 2 && textareas > 0) {
          structuralSignals.push({
            signal: `Contact form structure (${formInputs} inputs, ${textareas} textareas)`,
            pageType: 'contact',
            confidence: 0.7,
            signalType: 'structure',
            evidence: [`${formInputs} form inputs`, `${textareas} text areas`]
          })
        }
      }
      
      // Blog/article structure
      if (elementCounts.paragraphs > 5 && elementCounts.headings > 2) {
        const timeElements = (html.match(/<time/gi) || []).length
        const authorRefs = (html.match(/author|by\s+\w+/gi) || []).length
        
        if (timeElements > 0 || authorRefs > 0) {
          structuralSignals.push({
            signal: `Article structure (${elementCounts.paragraphs} paragraphs, ${elementCounts.headings} headings)`,
            pageType: 'blog_post',
            confidence: 0.6,
            signalType: 'structure',
            evidence: [`${elementCounts.paragraphs} paragraphs`, `${elementCounts.headings} headings`, 
                      `${timeElements} time elements`, `${authorRefs} author references`]
          })
        }
      }
      
      // Product page structure
      if (elementCounts.images > 3) {
        const pricePatterns = (html.match(/\$\d+|\d+\.\d{2}|price/gi) || []).length
        const buyButtons = (html.match(/add.*cart|buy.*now|purchase/gi) || []).length
        
        if (pricePatterns > 0 && buyButtons > 0) {
          structuralSignals.push({
            signal: `Product page structure (${elementCounts.images} images, pricing elements)`,
            pageType: 'product',
            confidence: 0.7,
            signalType: 'structure',
            evidence: [`${elementCounts.images} images`, `${pricePatterns} price patterns`, `${buyButtons} buy buttons`]
          })
        }
      }
      
      // Team page structure
      if (elementCounts.images > 4 && elementCounts.headings > 4) {
        const namePatterns = (html.match(/<h[2-6][^>]*>[^<]*[A-Z][a-z]+\s+[A-Z][a-z]+.*<\/h[2-6]>/g) || []).length
        
        if (namePatterns > 2) {
          structuralSignals.push({
            signal: `Team page structure (${elementCounts.images} images, ${namePatterns} name patterns)`,
            pageType: 'team',
            confidence: 0.6,
            signalType: 'structure',
            evidence: [`${elementCounts.images} images`, `${namePatterns} person name patterns`]
          })
        }
      }
      
      // FAQ structure
      if (elementCounts.headings > 5 && elementCounts.lists > 2) {
        const questionPatterns = (html.match(/\?/g) || []).length
        
        if (questionPatterns > 5) {
          structuralSignals.push({
            signal: `FAQ structure (${elementCounts.headings} headings, ${questionPatterns} questions)`,
            pageType: 'faq',
            confidence: 0.6,
            signalType: 'structure',
            evidence: [`${elementCounts.headings} headings`, `${questionPatterns} question marks`]
          })
        }
      }
      
      permanentLogger.info('INTELLIGENCE', 'Page structure analysis completed', { url,
        elementCounts,
        structuralSignalsFound: structuralSignals.length })
      
    } catch (error) {
      permanentLogger.captureError('INTELLIGENCE', error as Error, {
        message: 'Page structure analysis failed',
        url,
        domain: this.domain,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    return structuralSignals
  }

  /**
   * Get the most likely page type based on all signals
   */
  public determinePrimaryPageType(
    urlMatches: URLPatternMatch[], 
    contentSignals: ContentSignal[]
  ): { pageType: PageType; confidence: number } {
    
    const pageTypeScores: Record<string, { score: number; count: number }> = {}
    
    // Weight URL patterns more heavily (they're usually more reliable)
    const URL_WEIGHT = 0.7
    const CONTENT_WEIGHT = 0.3
    
    // Process URL patterns
    for (const match of urlMatches) {
      const key = match.pageType
      if (!pageTypeScores[key]) {
        pageTypeScores[key] = { score: 0, count: 0 }
      }
      pageTypeScores[key].score += match.confidence * URL_WEIGHT
      pageTypeScores[key].count += 1
    }
    
    // Process content signals
    for (const signal of contentSignals) {
      const key = signal.pageType
      if (!pageTypeScores[key]) {
        pageTypeScores[key] = { score: 0, count: 0 }
      }
      pageTypeScores[key].score += signal.confidence * CONTENT_WEIGHT
      pageTypeScores[key].count += 1
    }
    
    // Find the highest scoring page type
    let bestPageType: PageType = 'unknown'
    let bestScore = 0
    
    for (const [pageType, data] of Object.entries(pageTypeScores)) {
      // Average the score and apply a bonus for multiple signals
      const avgScore = data.score / data.count
      const multiSignalBonus = data.count > 1 ? 0.1 * Math.log(data.count) : 0
      const finalScore = Math.min(1.0, avgScore + multiSignalBonus)
      
      if (finalScore > bestScore) {
        bestScore = finalScore
        bestPageType = pageType as PageType
      }
    }
    
    return {
      pageType: bestPageType,
      confidence: bestScore
    }
  }
}