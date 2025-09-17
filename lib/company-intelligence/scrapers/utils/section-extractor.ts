/**
 * Section Extractor Utility
 * Intelligently identifies and extracts main content sections from web pages
 */

import { Page } from 'playwright'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface ExtractedSection {
  type: 'hero' | 'about' | 'services' | 'features' | 'testimonials' | 'pricing' | 'faq' | 'blog' | 'contact' | 'footer' | 'navigation' | 'generic'
  title?: string
  content: string
  html?: string
  selector: string
  confidence: number
  metadata?: {
    hasImages?: boolean
    hasLinks?: boolean
    wordCount?: number
    childSections?: ExtractedSection[]
  }
}

export class SectionExtractor {
  private page: Page | null = null
  
  // Common section identifiers based on class names, IDs, and semantic elements
  private sectionIdentifiers = {
    hero: [
      'hero', 'banner', 'jumbotron', 'splash', 'masthead', 'intro',
      'header[role="banner"]', 'section[class*="hero"]', '[data-section="hero"]'
    ],
    about: [
      'about', 'about-us', 'who-we-are', 'our-story', 'company',
      'section[id*="about"]', '[data-section="about"]', 'article.about'
    ],
    services: [
      'services', 'offerings', 'solutions', 'what-we-do', 'products',
      'section[class*="service"]', '[data-section="services"]'
    ],
    features: [
      'features', 'benefits', 'capabilities', 'advantages',
      'section[class*="feature"]', '[data-section="features"]'
    ],
    testimonials: [
      'testimonials', 'reviews', 'feedback', 'clients', 'case-studies',
      'section[class*="testimonial"]', '[data-testimonial]'
    ],
    pricing: [
      'pricing', 'plans', 'packages', 'rates', 'cost',
      'section[class*="pricing"]', '[data-pricing]', '.pricing-table'
    ],
    faq: [
      'faq', 'questions', 'help', 'support', 'q-and-a',
      'section[class*="faq"]', '[data-faq]', 'dl[class*="faq"]'
    ],
    blog: [
      'blog', 'news', 'articles', 'posts', 'insights',
      'section[class*="blog"]', 'article[class*="post"]', '.blog-grid'
    ],
    contact: [
      'contact', 'get-in-touch', 'reach-us', 'connect',
      'section[class*="contact"]', '[data-section="contact"]', 'form[class*="contact"]'
    ],
    footer: [
      'footer', 'site-footer', 'page-footer',
      'footer', '[role="contentinfo"]', 'section[class*="footer"]'
    ],
    navigation: [
      'nav', 'navbar', 'navigation', 'menu',
      'nav', '[role="navigation"]', 'header nav'
    ]
  }

  /**
   * Extract sections from a page
   */
  async extractSections(page: Page): Promise<ExtractedSection[]> {
    this.page = page
    const sections: ExtractedSection[] = []
    
    try {
      // Extract semantic sections
      const semanticSections = await this.extractSemanticSections()
      sections.push(...semanticSections)
      
      // Extract sections by identifiers
      for (const [type, identifiers] of Object.entries(this.sectionIdentifiers)) {
        const extractedSections = await this.extractByIdentifiers(
          type as ExtractedSection['type'],
          identifiers
        )
        sections.push(...extractedSections)
      }
      
      // Extract generic sections if needed
      const genericSections = await this.extractGenericSections()
      sections.push(...genericSections)
      
      // Deduplicate and sort by confidence
      return this.deduplicateAndSort(sections)
      
    } catch (error) {
      permanentLogger.captureError('SECTION_EXTRACTOR', error as Error, {
        phase: 'extraction'
      })
      return sections
    }
  }

  /**
   * Extract semantic HTML5 sections
   */
  private async extractSemanticSections(): Promise<ExtractedSection[]> {
    const sections: ExtractedSection[] = []
    
    try {
      const semanticElements = await this.page!.evaluate(() => {
        const elements = ['main', 'section', 'article', 'aside', 'header', 'footer']
        const results: Array<{
          tag: string
          text: string
          html: string
          selector: string
          hasImages: boolean
          hasLinks: boolean
        }> = []
        
        elements.forEach(tag => {
          const nodes = document.querySelectorAll(tag)
          nodes.forEach((node, index) => {
            const element = node as HTMLElement
            const text = element.innerText || ''
            const html = element.innerHTML || ''
            
            // Skip empty or very small sections
            if (text.length < 50) return
            
            // Generate a unique selector
            const id = element.id ? `#${element.id}` : ''
            const classes = element.className ? `.${element.className.split(' ').join('.')}` : ''
            const selector = id || `${tag}${classes}` || `${tag}:nth-of-type(${index + 1})`
            
            results.push({
              tag,
              text,
              html,
              selector,
              hasImages: element.querySelectorAll('img').length > 0,
              hasLinks: element.querySelectorAll('a').length > 0
            })
          })
        })
        
        return results
      })
      
      // Convert to ExtractedSection format
      for (const element of semanticElements) {
        const type = this.inferSectionType(element.text, element.tag)
        sections.push({
          type,
          content: element.text,
          html: element.html,
          selector: element.selector,
          confidence: 0.7,
          metadata: {
            hasImages: element.hasImages,
            hasLinks: element.hasLinks,
            wordCount: element.text.split(/\s+/).length
          }
        })
      }
      
    } catch (error) {
      permanentLogger.debug('SECTION_EXTRACTOR', 'Error extracting semantic sections', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    return sections
  }

  /**
   * Extract sections by specific identifiers
   */
  private async extractByIdentifiers(
    type: ExtractedSection['type'],
    identifiers: string[]
  ): Promise<ExtractedSection[]> {
    const sections: ExtractedSection[] = []
    
    for (const identifier of identifiers) {
      try {
        // Build selector based on identifier type
        let selector = ''
        if (identifier.includes('[') || identifier.includes('.') || identifier.includes('#')) {
          // Already a CSS selector
          selector = identifier
        } else {
          // Build selector from keyword
          selector = `[class*="${identifier}"], [id*="${identifier}"], [data-*="${identifier}"]`
        }
        
        const elements = await this.page!.$$(selector)
        
        for (const element of elements) {
          const text = await element.innerText().catch(() => '')
          const html = await element.innerHTML().catch(() => '')
          
          // Skip empty sections
          if (!text || text.length < 20) continue
          
          // Get a more specific selector
          const specificSelector = await element.evaluate(el => {
            if (el.id) return `#${el.id}`
            if (el.className) {
              const classes = el.className.split(' ').filter(c => c).join('.')
              if (classes) return `.${classes}`
            }
            return el.tagName.toLowerCase()
          })
          
          sections.push({
            type,
            content: text,
            html,
            selector: specificSelector,
            confidence: 0.8, // Higher confidence for specific identifiers
            metadata: {
              wordCount: text.split(/\s+/).length
            }
          })
        }
      } catch (error) {
        permanentLogger.debug('SECTION_EXTRACTOR', `Failed to extract ${type} sections`, {
          identifier,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return sections
  }

  /**
   * Extract generic content sections
   */
  private async extractGenericSections(): Promise<ExtractedSection[]> {
    const sections: ExtractedSection[] = []
    
    try {
      // Look for divs with substantial content
      const genericSections = await this.page!.evaluate(() => {
        const results: Array<{
          text: string
          html: string
          selector: string
        }> = []
        
        // Find content-rich divs
        const divs = document.querySelectorAll('div')
        divs.forEach((div, index) => {
          const text = div.innerText || ''
          
          // Must have substantial content
          if (text.length < 100) return
          
          // Skip if it's mostly navigation or footer content
          if (div.querySelector('nav') || div.querySelector('footer')) return
          
          // Must have some structure (headings or paragraphs)
          const hasStructure = div.querySelector('h1, h2, h3, p, article')
          if (!hasStructure) return
          
          const selector = div.id ? `#${div.id}` : 
                           div.className ? `.${div.className.split(' ')[0]}` :
                           `div:nth-of-type(${index + 1})`
          
          results.push({
            text,
            html: div.innerHTML,
            selector
          })
        })
        
        return results
      })
      
      for (const section of genericSections) {
        const type = this.inferSectionType(section.text)
        sections.push({
          type,
          content: section.text,
          html: section.html,
          selector: section.selector,
          confidence: 0.5, // Lower confidence for generic sections
          metadata: {
            wordCount: section.text.split(/\s+/).length
          }
        })
      }
      
    } catch (error) {
      permanentLogger.debug('SECTION_EXTRACTOR', 'Error extracting generic sections', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    return sections
  }

  /**
   * Infer section type from content
   */
  private inferSectionType(
    content: string,
    tag?: string
  ): ExtractedSection['type'] {
    const lowerContent = content.toLowerCase()
    
    // Check for specific keywords
    if (lowerContent.includes('about us') || lowerContent.includes('who we are')) {
      return 'about'
    }
    if (lowerContent.includes('services') || lowerContent.includes('what we do')) {
      return 'services'
    }
    if (lowerContent.includes('pricing') || lowerContent.includes('plans')) {
      return 'pricing'
    }
    if (lowerContent.includes('testimonial') || lowerContent.includes('what our clients say')) {
      return 'testimonials'
    }
    if (lowerContent.includes('frequently asked') || lowerContent.includes('faq')) {
      return 'faq'
    }
    if (lowerContent.includes('contact us') || lowerContent.includes('get in touch')) {
      return 'contact'
    }
    if (lowerContent.includes('blog') || lowerContent.includes('news')) {
      return 'blog'
    }
    
    // Check tag hints
    if (tag === 'header') return 'hero'
    if (tag === 'footer') return 'footer'
    if (tag === 'nav') return 'navigation'
    
    return 'generic'
  }

  /**
   * Deduplicate and sort sections
   */
  private deduplicateAndSort(sections: ExtractedSection[]): ExtractedSection[] {
    // Remove duplicates based on content similarity
    const unique = new Map<string, ExtractedSection>()
    
    for (const section of sections) {
      // Create a content fingerprint
      const fingerprint = section.content.substring(0, 100).trim()
      
      if (!unique.has(fingerprint)) {
        unique.set(fingerprint, section)
      } else {
        // Keep the one with higher confidence
        const existing = unique.get(fingerprint)!
        if (section.confidence > existing.confidence) {
          unique.set(fingerprint, section)
        }
      }
    }
    
    // Sort by confidence and type priority
    const typePriority: Record<ExtractedSection['type'], number> = {
      hero: 10,
      navigation: 9,
      about: 8,
      services: 7,
      features: 6,
      pricing: 5,
      testimonials: 4,
      blog: 3,
      faq: 2,
      contact: 1,
      footer: 0,
      generic: -1
    }
    
    return Array.from(unique.values()).sort((a, b) => {
      // First sort by type priority
      const priorityDiff = (typePriority[b.type] || 0) - (typePriority[a.type] || 0)
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by confidence
      return b.confidence - a.confidence
    })
  }

  /**
   * Extract section by specific selector
   */
  async extractBySelector(selector: string): Promise<ExtractedSection | null> {
    try {
      const element = await this.page!.$(selector)
      if (!element) return null
      
      const text = await element.innerText()
      const html = await element.innerHTML()
      
      return {
        type: 'generic',
        content: text,
        html,
        selector,
        confidence: 0.9,
        metadata: {
          wordCount: text.split(/\s+/).length
        }
      }
    } catch (error) {
      permanentLogger.debug('SECTION_EXTRACTOR', 'Failed to extract by selector', {
        selector,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }
}