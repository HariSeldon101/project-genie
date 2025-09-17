/**
 * Structured Data Extractor
 * Extracts and processes structured data from HTML pages including JSON-LD, Microdata, and OpenGraph
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { StructuredData, MetaTagData } from './types'

export class StructuredDataExtractor {
  private domain: string
  
  constructor(domain: string) {
    this.domain = domain
    permanentLogger.info('INTELLIGENCE', 'StructuredDataExtractor initialized', { domain})
  }

  /**
   * Extract all structured data from HTML content
   */
  public extractStructuredData(html: string, url: string): StructuredData {
    const startTime = Date.now()
    
    try {
      permanentLogger.info('INTELLIGENCE', 'Starting structured data extraction', { url})
      
      const structuredData: StructuredData = {}
      
      // Extract JSON-LD data
      structuredData.jsonLd = this.extractJsonLd(html)
      
      // Extract microdata
      structuredData.microdata = this.extractMicrodata(html)
      
      // Extract schema types
      structuredData.schemaTypes = this.extractSchemaTypes(structuredData.jsonLd)
      
      // Extract organization data
      structuredData.organization = this.extractOrganizationData(structuredData.jsonLd)
      
      // Extract product data
      structuredData.products = this.extractProductData(structuredData.jsonLd)
      
      // Extract people data
      structuredData.people = this.extractPeopleData(structuredData.jsonLd)
      
      // Extract article data
      structuredData.articles = this.extractArticleData(structuredData.jsonLd)
      
      const processingTime = Date.now() - startTime
      
      permanentLogger.info('Structured data extraction completed', { category: 'INTELLIGENCE', url,
        processingTime,
        jsonLdCount: structuredData.jsonLd?.length || 0,
        microdataCount: structuredData.microdata?.length || 0,
        schemaTypes: structuredData.schemaTypes })
      
      return structuredData
      
    } catch (error) {
      permanentLogger.captureError('INTELLIGENCE', error, {
        message: 'Failed to extract structured data',
        url,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return {}
    }
  }

  /**
   * Extract enhanced meta tag data
   */
  public extractMetaData(html: string, url: string): MetaTagData {
    const startTime = Date.now()
    
    try {
      permanentLogger.info('INTELLIGENCE', 'Starting meta data extraction', { url})
      
      const metaData: MetaTagData = {}
      
      // Basic SEO meta tags
      metaData.title = this.extractMetaTag(html, 'title')
      metaData.description = this.extractMetaTag(html, 'meta[name="description"]', 'content')
      metaData.keywords = this.extractMetaTag(html, 'meta[name="keywords"]', 'content')?.split(',').map(k => k.trim())
      metaData.author = this.extractMetaTag(html, 'meta[name="author"]', 'content')
      metaData.canonical = this.extractMetaTag(html, 'link[rel="canonical"]', 'href')
      metaData.robots = this.extractMetaTag(html, 'meta[name="robots"]', 'content')
      
      // Open Graph meta tags
      metaData.ogTitle = this.extractMetaTag(html, 'meta[property="og:title"]', 'content')
      metaData.ogDescription = this.extractMetaTag(html, 'meta[property="og:description"]', 'content')
      metaData.ogImage = this.extractMetaTag(html, 'meta[property="og:image"]', 'content')
      metaData.ogType = this.extractMetaTag(html, 'meta[property="og:type"]', 'content')
      metaData.ogUrl = this.extractMetaTag(html, 'meta[property="og:url"]', 'content')
      metaData.ogSiteName = this.extractMetaTag(html, 'meta[property="og:site_name"]', 'content')
      
      // Twitter Card meta tags
      metaData.twitterCard = this.extractMetaTag(html, 'meta[name="twitter:card"]', 'content')
      metaData.twitterTitle = this.extractMetaTag(html, 'meta[name="twitter:title"]', 'content')
      metaData.twitterDescription = this.extractMetaTag(html, 'meta[name="twitter:description"]', 'content')
      metaData.twitterImage = this.extractMetaTag(html, 'meta[name="twitter:image"]', 'content')
      metaData.twitterSite = this.extractMetaTag(html, 'meta[name="twitter:site"]', 'content')
      metaData.twitterCreator = this.extractMetaTag(html, 'meta[name="twitter:creator"]', 'content')
      
      // Additional meta tags
      metaData.viewport = this.extractMetaTag(html, 'meta[name="viewport"]', 'content')
      metaData.generator = this.extractMetaTag(html, 'meta[name="generator"]', 'content')
      metaData.language = this.extractAttribute(html, 'html', 'lang')
      metaData.charset = this.extractMetaTag(html, 'meta[charset]', 'charset') || 
                        this.extractMetaTag(html, 'meta[http-equiv="content-type"]', 'content')?.match(/charset=([^;]+)/)?.[1]
      metaData.themeColor = this.extractMetaTag(html, 'meta[name="theme-color"]', 'content')
      metaData.favicon = this.extractMetaTag(html, 'link[rel*="icon"]', 'href')
      
      const processingTime = Date.now() - startTime
      
      permanentLogger.info('Meta data extraction completed', { category: 'INTELLIGENCE',
        url,
        processingTime,
        extractedFields: Object.keys(metaData).filter(k => metaData[k as keyof MetaTagData] !== undefined).length
      })
      
      return metaData
      
    } catch (error) {
      permanentLogger.captureError('INTELLIGENCE', error, {
        message: 'Failed to extract meta data',
        url,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return {}
    }
  }

  /**
   * Extract JSON-LD structured data
   */
  private extractJsonLd(html: string): Array<{ '@type': string; '@context'?: string; [key: string]: any }> {
    const jsonLdData: Array<{ '@type': string; '@context'?: string; [key: string]: any }> = []
    
    try {
      // Find all JSON-LD script tags
      const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis
      let match
      
      while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
          const jsonContent = match[1].trim()
          const parsedData = JSON.parse(jsonContent)
          
          // Handle both single objects and arrays
          if (Array.isArray(parsedData)) {
            jsonLdData.push(...parsedData.filter(item => item['@type']))
          } else if (parsedData['@type']) {
            jsonLdData.push(parsedData)
          }
          
        } catch (parseError) {
          permanentLogger.warn('INTELLIGENCE', 'Failed to parse JSON-LD block', {
            domain: this.domain,
            error: parseError instanceof Error ? parseError.message : 'Parse error'
          })
        }
      }
      
      permanentLogger.info('JSON-LD extraction completed', { category: 'INTELLIGENCE', domain: this.domain,
        blocksFound: jsonLdData.length })
      
    } catch (error) {
      permanentLogger.captureError('INTELLIGENCE', error, {
        message: 'JSON-LD extraction failed',
        domain: this.domain,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    return jsonLdData
  }

  /**
   * Extract microdata from HTML
   */
  private extractMicrodata(html: string): Array<{ type: string; properties: Record<string, any> }> {
    const microdataItems: Array<{ type: string; properties: Record<string, any> }> = []
    
    try {
      // Find elements with itemscope attribute
      const itemscopeRegex = /<[^>]*\bitemscope\b[^>]*>/gi
      const matches = html.match(itemscopeRegex)
      
      if (matches) {
        for (const match of matches) {
          const itemtypeMatch = match.match(/itemtype=["']([^"']+)["']/i)
          if (itemtypeMatch) {
            const type = itemtypeMatch[1]
            const properties: Record<string, any> = {}
            
            // Extract properties - this is a simplified extraction
            // In a full implementation, you'd need to parse the DOM structure
            const itempropRegex = /itemprop=["']([^"']+)["'][^>]*>([^<]*)</gi
            let propMatch
            while ((propMatch = itempropRegex.exec(html)) !== null) {
              properties[propMatch[1]] = propMatch[2].trim()
            }
            
            if (Object.keys(properties).length > 0) {
              microdataItems.push({ type, properties })
            }
          }
        }
      }
      
      permanentLogger.info('Microdata extraction completed', { category: 'INTELLIGENCE', domain: this.domain,
        itemsFound: microdataItems.length })
      
    } catch (error) {
      permanentLogger.captureError('INTELLIGENCE', error, {
        message: 'Microdata extraction failed',
        domain: this.domain,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    return microdataItems
  }

  /**
   * Extract schema types from JSON-LD data
   */
  private extractSchemaTypes(jsonLdData?: Array<{ '@type': string; [key: string]: any }>): string[] {
    if (!jsonLdData) return []
    
    const schemaTypes = new Set<string>()
    
    for (const item of jsonLdData) {
      if (item['@type']) {
        if (Array.isArray(item['@type'])) {
          item['@type'].forEach(type => schemaTypes.add(type))
        } else {
          schemaTypes.add(item['@type'])
        }
      }
    }
    
    return Array.from(schemaTypes)
  }

  /**
   * Extract organization data from structured data
   */
  private extractOrganizationData(jsonLdData?: Array<{ '@type': string; [key: string]: any }>): StructuredData['organization'] {
    if (!jsonLdData) return undefined
    
    const orgData = jsonLdData.find(item => 
      item['@type'] === 'Organization' || 
      (Array.isArray(item['@type']) && item['@type'].includes('Organization'))
    )
    
    if (!orgData) return undefined
    
    return {
      name: orgData.name,
      type: Array.isArray(orgData['@type']) ? orgData['@type'].join(', ') : orgData['@type'],
      url: orgData.url,
      logo: orgData.logo?.url || orgData.logo,
      description: orgData.description,
      contactPoints: orgData.contactPoint ? 
        (Array.isArray(orgData.contactPoint) ? orgData.contactPoint : [orgData.contactPoint]).map((cp: any) => ({
          type: cp['@type'] || 'ContactPoint',
          telephone: cp.telephone,
          email: cp.email
        })) : undefined
    }
  }

  /**
   * Extract product data from structured data
   */
  private extractProductData(jsonLdData?: Array<{ '@type': string; [key: string]: any }>): StructuredData['products'] {
    if (!jsonLdData) return undefined
    
    const products = jsonLdData.filter(item => 
      item['@type'] === 'Product' || 
      (Array.isArray(item['@type']) && item['@type'].includes('Product'))
    )
    
    if (products.length === 0) return undefined
    
    return products.map(product => ({
      name: product.name,
      description: product.description,
      price: product.offers?.price || product.price,
      currency: product.offers?.priceCurrency || product.priceCurrency,
      availability: product.offers?.availability,
      image: product.image?.url || product.image,
      brand: product.brand?.name || product.brand
    })).filter(product => product.name)
  }

  /**
   * Extract people data from structured data
   */
  private extractPeopleData(jsonLdData?: Array<{ '@type': string; [key: string]: any }>): StructuredData['people'] {
    if (!jsonLdData) return undefined
    
    const people = jsonLdData.filter(item => 
      item['@type'] === 'Person' || 
      (Array.isArray(item['@type']) && item['@type'].includes('Person'))
    )
    
    if (people.length === 0) return undefined
    
    return people.map(person => ({
      name: person.name,
      jobTitle: person.jobTitle,
      image: person.image?.url || person.image,
      url: person.url,
      email: person.email
    })).filter(person => person.name)
  }

  /**
   * Extract article data from structured data
   */
  private extractArticleData(jsonLdData?: Array<{ '@type': string; [key: string]: any }>): StructuredData['articles'] {
    if (!jsonLdData) return undefined
    
    const articles = jsonLdData.filter(item => 
      ['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type']) ||
      (Array.isArray(item['@type']) && item['@type'].some(type => ['Article', 'BlogPosting', 'NewsArticle'].includes(type)))
    )
    
    if (articles.length === 0) return undefined
    
    return articles.map(article => ({
      headline: article.headline || article.name,
      author: article.author?.name || article.author,
      datePublished: article.datePublished,
      dateModified: article.dateModified,
      image: article.image?.url || article.image,
      articleSection: article.articleSection
    })).filter(article => article.headline)
  }

  /**
   * Extract meta tag content using various selectors
   */
  private extractMetaTag(html: string, selector: string, attribute?: string): string | undefined {
    try {
      if (selector === 'title') {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
        return titleMatch ? this.decodeHtmlEntities(titleMatch[1].trim()) : undefined
      }
      
      const attrName = attribute || 'content'
      const regex = new RegExp(`<${selector.replace(/\[([^\]]+)\]/g, '[^>]*$1[^>]*')}[^>]*\\b${attrName}=["']([^"']+)["'][^>]*>`, 'i')
      const match = html.match(regex)
      
      return match ? this.decodeHtmlEntities(match[1]) : undefined
      
    } catch (error) {
      // Log and re-throw - no silent failures allowed
      permanentLogger.captureError('ERROR', error as Error, {
        context: 'Error caught - propagating instead of returning fallback'
      })
      throw error
    }
  }

  /**
   * Extract attribute value from HTML element
   */
  private extractAttribute(html: string, element: string, attribute: string): string | undefined {
    try {
      const regex = new RegExp(`<${element}[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`, 'i')
      const match = html.match(regex)
      return match ? match[1] : undefined
    } catch (error) {
      // Log and re-throw - no silent failures allowed
      permanentLogger.captureError('ERROR', error as Error, {
        context: 'Error caught - propagating instead of returning fallback'
      })
      throw error
    }
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
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
      .replace(/\s+/g, ' ')
      .trim()
  }
}