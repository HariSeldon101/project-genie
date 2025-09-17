/**
 * Blog Content Extractor
 * Extracts blog articles and metadata during the scraping phase
 * 
 * This extractor runs when the scraper encounters a /blog page,
 * discovering individual articles and extracting their metadata.
 */

import * as cheerio from 'cheerio'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface BlogArticle {
  url: string
  title: string
  excerpt?: string
  date?: string
  author?: string
  tags?: string[]
  readTime?: string
  imageUrl?: string
}

export interface BlogMetadata {
  articles: BlogArticle[]
  totalArticles: number
  categories?: string[]
  hasArchive?: boolean
  hasPagination?: boolean
  nextPageUrl?: string
}

export class BlogContentExtractor {
  /**
   * Extract blog article links when scraping a blog index page
   */
  extractBlogLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html)
    const articleUrls = new Set<string>()
    
    permanentLogger.info('BLOG_EXTRACTOR', 'Extracting blog article links', { baseUrl })
    
    // Common selectors for blog article links
    const articleSelectors = [
      'article a[href]',
      '.blog-post a[href]',
      '.post-title a[href]',
      '.article-link',
      'h2 a[href]',
      'h3 a[href]',
      '.blog-item a[href]',
      '.post-item a[href]',
      'a.read-more',
      'a.continue-reading',
      '.entry-title a[href]',
      '.post-headline a[href]'
    ]
    
    // Extract links using selectors
    articleSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const href = $(element).attr('href')
        if (href) {
          try {
            const fullUrl = new URL(href, baseUrl).toString()
            
            // Only include URLs that look like blog posts
            if (this.isBlogArticleUrl(fullUrl, baseUrl)) {
              articleUrls.add(fullUrl)
            }
          } catch (error) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', error as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw error
    }
        }
      })
    })
    
    // Also check for links with blog-related patterns
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href')
      if (!href) return
      
      try {
        const fullUrl = new URL(href, baseUrl).toString()
        const urlPath = new URL(fullUrl).pathname
        
        // Check if URL matches blog patterns
        const blogPatterns = ['/blog/', '/news/', '/insights/', '/articles/', '/posts/']
        const matchesBlogPattern = blogPatterns.some(pattern => {
          if (!urlPath.includes(pattern)) return false
          
          // Check there's content after the pattern (not just /blog/)
          const afterPattern = urlPath.split(pattern)[1]
          return afterPattern && 
                 afterPattern.length > 0 && 
                 !afterPattern.match(/^(page|category|tag|author|archive)\//i)
        })
        
        if (matchesBlogPattern && fullUrl.startsWith(baseUrl)) {
          articleUrls.add(fullUrl)
        }
      } catch (error) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', error as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw error
    }
    })
    
    const links = Array.from(articleUrls)
    permanentLogger.info('BLOG_EXTRACTOR', `Found ${links.length} blog article links`)
    
    return links
  }
  
  /**
   * Extract detailed blog metadata from a blog page
   */
  extractBlogMetadata(html: string, url: string): BlogMetadata {
    const $ = cheerio.load(html)
    const articles: BlogArticle[] = []
    
    permanentLogger.info('BLOG_EXTRACTOR', 'Extracting blog metadata', { url })
    
    // Find article containers
    const articleContainers = [
      'article',
      '.blog-post',
      '.post-item',
      '.article-item',
      '.entry',
      '.blog-item'
    ]
    
    let articlesFound = false
    for (const container of articleContainers) {
      const elements = $(container)
      if (elements.length > 0) {
        elements.each((_, element) => {
          const article = this.extractArticleFromElement($, element, url)
          if (article) {
            articles.push(article)
            articlesFound = true
          }
        })
        
        if (articlesFound) break
      }
    }
    
    // Extract categories
    const categories = this.extractCategories($)
    
    // Check for pagination
    const hasPagination = this.checkPagination($)
    const nextPageUrl = this.extractNextPageUrl($, url)
    
    // Check for archive
    const hasArchive = this.checkArchive($)
    
    const metadata: BlogMetadata = {
      articles,
      totalArticles: articles.length,
      categories: categories.length > 0 ? categories : undefined,
      hasArchive,
      hasPagination,
      nextPageUrl
    }
    
    permanentLogger.info('BLOG_EXTRACTOR', 'Blog metadata extracted', {
      articlesFound: articles.length,
      categories: categories.length,
      hasPagination,
      hasArchive
    })
    
    return metadata
  }
  
  /**
   * Extract article data from a single article element
   */
  private extractArticleFromElement($: cheerio.CheerioAPI, element: any, baseUrl: string): BlogArticle | null {
    const $element = $(element)
    
    // Extract URL
    const linkElement = $element.find('a[href]').first()
    const href = linkElement.attr('href')
    if (!href) return null
    
    let articleUrl: string
    try {
      articleUrl = new URL(href, baseUrl).toString()
    } catch {
      return null
    }
    
    // Extract title
    const titleSelectors = ['h2', 'h3', '.title', '.post-title', '.entry-title']
    let title = ''
    for (const selector of titleSelectors) {
      const titleText = $element.find(selector).first().text().trim()
      if (titleText) {
        title = titleText
        break
      }
    }
    
    if (!title) {
      title = linkElement.text().trim()
    }
    
    // Extract excerpt
    const excerptSelectors = ['.excerpt', '.summary', '.description', 'p']
    let excerpt = ''
    for (const selector of excerptSelectors) {
      const excerptText = $element.find(selector).first().text().trim()
      if (excerptText && excerptText.length > 20) {
        excerpt = excerptText.substring(0, 200)
        break
      }
    }
    
    // Extract date
    const dateSelectors = ['.date', '.post-date', 'time', '.published']
    let date = ''
    for (const selector of dateSelectors) {
      const dateElement = $element.find(selector).first()
      date = dateElement.attr('datetime') || dateElement.text().trim()
      if (date) break
    }
    
    // Extract author
    const authorSelectors = ['.author', '.by-author', '.post-author']
    let author = ''
    for (const selector of authorSelectors) {
      author = $element.find(selector).first().text().trim()
      if (author) break
    }
    
    // Extract tags
    const tags: string[] = []
    $element.find('.tag, .category, .post-tag').each((_, tagElement) => {
      const tag = $(tagElement).text().trim()
      if (tag) tags.push(tag)
    })
    
    // Extract read time
    const readTime = $element.find('.read-time, .reading-time').first().text().trim()
    
    // Extract image
    const imageElement = $element.find('img').first()
    const imageUrl = imageElement.attr('src') || imageElement.attr('data-src')
    
    return {
      url: articleUrl,
      title: title || 'Untitled',
      excerpt: excerpt || undefined,
      date: date || undefined,
      author: author || undefined,
      tags: tags.length > 0 ? tags : undefined,
      readTime: readTime || undefined,
      imageUrl: imageUrl || undefined
    }
  }
  
  /**
   * Check if a URL looks like a blog article
   */
  private isBlogArticleUrl(url: string, baseUrl: string): boolean {
    try {
      const urlObj = new URL(url)
      const baseObj = new URL(baseUrl)
      
      // Must be same domain
      if (urlObj.hostname !== baseObj.hostname) return false
      
      const path = urlObj.pathname
      
      // Skip common non-article pages
      const skipPatterns = [
        /\/page\/\d+/,
        /\/category\//,
        /\/tag\//,
        /\/author\//,
        /\/archive\//,
        /\/(blog|news|articles|posts)\/?$/
      ]
      
      for (const pattern of skipPatterns) {
        if (pattern.test(path)) return false
      }
      
      // Check for blog-like patterns
      const blogPatterns = ['/blog/', '/news/', '/insights/', '/articles/', '/posts/']
      for (const pattern of blogPatterns) {
        if (path.includes(pattern)) {
          const afterPattern = path.split(pattern)[1]
          // Must have content after the blog path
          return afterPattern && afterPattern.length > 0
        }
      }
      
      return false
    } catch {
      return false
    }
  }
  
  /**
   * Extract categories from the blog page
   */
  private extractCategories($: cheerio.CheerioAPI): string[] {
    const categories = new Set<string>()
    
    const categorySelectors = [
      '.category-list a',
      '.categories a',
      '.widget-categories a',
      '.blog-categories a'
    ]
    
    categorySelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const category = $(element).text().trim()
        if (category) categories.add(category)
      })
    })
    
    return Array.from(categories)
  }
  
  /**
   * Check if the blog has pagination
   */
  private checkPagination($: cheerio.CheerioAPI): boolean {
    const paginationSelectors = [
      '.pagination',
      '.pager',
      '.page-numbers',
      '.nav-links',
      'a.next',
      'a.prev'
    ]
    
    for (const selector of paginationSelectors) {
      if ($(selector).length > 0) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Extract next page URL if pagination exists
   */
  private extractNextPageUrl($: cheerio.CheerioAPI, currentUrl: string): string | undefined {
    const nextSelectors = [
      'a.next',
      'a.next-page',
      '.pagination a.next',
      'a[rel="next"]',
      '.nav-next a'
    ]
    
    for (const selector of nextSelectors) {
      const nextElement = $(selector).first()
      const href = nextElement.attr('href')
      if (href) {
        try {
          return new URL(href, currentUrl).toString()
        } catch {
          // Invalid URL
        }
      }
    }
    
    return undefined
  }
  
  /**
   * Check if the blog has an archive section
   */
  private checkArchive($: cheerio.CheerioAPI): boolean {
    const archiveSelectors = [
      '.archive',
      '.archives',
      '.widget-archive',
      'a[href*="/archive"]'
    ]
    
    for (const selector of archiveSelectors) {
      if ($(selector).length > 0) {
        return true
      }
    }
    
    return false
  }
}