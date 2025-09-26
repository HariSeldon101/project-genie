/**
 * Content Analyzer
 * Analyzes blog posts and content strategy from scraped data
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import * as cheerio from 'cheerio'
import type { ScrapedPage, BlogPost, ContentAnalysis } from '../types'

export class ContentAnalyzer {
  constructor() {
    permanentLogger.info('CONTENT_ANALYZER', 'Initialized content analyzer')
  }

  /**
   * Analyze content from scraped pages
   */
  async analyzeContent(pages: ScrapedPage[]): Promise<ContentAnalysis> {
    permanentLogger.info('CONTENT_ANALYZER', 'Analyzing content', {
      pageCount: pages.length
    })

    const analysis: ContentAnalysis = {
      blogPosts: [],
      blogPostCount: 0,
      caseStudies: 0,
      whitepapers: 0,
      videos: 0,
      contentThemes: [],
      publishingFrequency: 'occasional',
      contentTone: 'professional',
      targetAudience: [],
      seoFocus: [],
      lastUpdated: new Date()
    }

    // Find and analyze blog pages
    const blogPages = pages.filter(p => 
      p.type === 'blog' || 
      p.url.includes('/blog') || 
      p.url.includes('/news') ||
      p.url.includes('/insights')
    )

    // Find case study pages
    const caseStudyPages = pages.filter(p => 
      p.type === 'case-studies' || 
      p.url.includes('/case-stud') ||
      p.url.includes('/portfolio') ||
      p.url.includes('/customers')
    )

    // Extract blog posts
    for (const page of blogPages) {
      const posts = this.extractBlogPosts(page)
      analysis.blogPosts?.push(...posts)
    }

    // Deduplicate and limit blog posts
    if (analysis.blogPosts) {
      analysis.blogPosts = this.deduplicatePosts(analysis.blogPosts).slice(0, 10)
      analysis.blogPostCount = analysis.blogPosts.length
    }

    // Count case studies
    analysis.caseStudies = this.countCaseStudies(caseStudyPages)

    // Analyze content patterns
    if (analysis.blogPosts && analysis.blogPosts.length > 0) {
      analysis.publishingFrequency = this.analyzePublishingFrequency(analysis.blogPosts)
      analysis.contentThemes = this.extractContentThemes(analysis.blogPosts)
      analysis.contentTone = this.analyzeContentTone(pages)
      analysis.targetAudience = this.identifyTargetAudience(analysis.blogPosts)
      analysis.seoFocus = this.extractSEOFocus(pages)
    }

    // Count other content types
    analysis.whitepapers = this.countContentType(pages, ['whitepaper', 'guide', 'ebook', 'resource'])
    analysis.videos = this.countContentType(pages, ['video', 'webinar', 'youtube', 'vimeo'])

    permanentLogger.info('CONTENT_ANALYZER', 'Content analysis complete', {
      blogPostCount: analysis.blogPostCount,
      caseStudies: analysis.caseStudies,
      themes: analysis.contentThemes?.length || 0,
      frequency: analysis.publishingFrequency
    })

    return analysis
  }

  /**
   * Extract blog posts from a page
   */
  private extractBlogPosts(page: ScrapedPage): BlogPost[] {
    const posts: BlogPost[] = []
    
    // Try to extract from structured data first
    const articles = this.extractFromStructuredData(page)
    if (articles.length > 0) {
      posts.push(...articles)
    }

    // Try to extract from page content using selectors
    const extractedPosts = this.extractFromSelectors(page)
    posts.push(...extractedPosts)

    // Parse from text content as fallback
    if (posts.length === 0) {
      const textPosts = this.extractFromText(page)
      posts.push(...textPosts)
    }

    return posts
  }

  /**
   * Extract blog posts from structured data
   */
  private extractFromStructuredData(page: ScrapedPage): BlogPost[] {
    const posts: BlogPost[] = []
    
    // Check JSON-LD
    const jsonLd = page.data?.jsonLd
    if (jsonLd && Array.isArray(jsonLd)) {
      jsonLd.forEach((item: any) => {
        if (item['@type'] === 'BlogPosting' || item['@type'] === 'Article' || item['@type'] === 'NewsArticle') {
          posts.push({
            title: item.headline || item.name || '',
            url: item.url || '',
            date: item.datePublished,
            author: typeof item.author === 'string' ? item.author : item.author?.name,
            summary: item.description || item.abstract,
            image: item.image?.url || item.image,
            tags: item.keywords ? item.keywords.split(',').map((k: string) => k.trim()) : []
          })
        }
      })
    }

    return posts
  }

  /**
   * Extract blog posts using CSS selectors with Cheerio
   */
  private extractFromSelectors(page: ScrapedPage): BlogPost[] {
    const posts: BlogPost[] = []
    
    const html = page.data?.raw?.html
    if (!html) return posts

    // Use Cheerio for proper HTML parsing
    const $ = cheerio.load(html)
    
    // Try multiple blog post selectors
    const selectors = [
      'article.post, article.blog-post, .blog-item, .post-item',
      '.blog-card, .article-card, .news-item',
      '[class*="blog-post"], [class*="article"]',
      '.post, .entry, .blog-entry',
      'article, .article'
    ]
    
    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const $el = $(el)
        
        // Extract title
        const title = $el.find('h1, h2, h3, .post-title, .article-title, .title').first().text().trim() ||
                     $el.find('a').first().text().trim()
        
        // Extract URL
        const url = $el.find('a[href]').first().attr('href') || 
                   $el.find('.read-more, .continue-reading').attr('href') || ''
        
        // Extract date
        const dateText = $el.find('time, .date, .post-date, .published-date, [class*="date"]').first().text().trim() ||
                        $el.find('span:contains("202")').first().text().trim()
        
        // Extract summary/excerpt
        const summary = $el.find('.excerpt, .summary, .description, .post-excerpt').first().text().trim() ||
                       $el.find('p').first().text().trim()
        
        // Extract author
        const author = $el.find('.author, .by-author, .post-author, [class*="author"]').first().text().trim()
                      .replace(/^by\s+/i, '')
        
        // Extract tags
        const tags: string[] = []
        $el.find('.tag, .category, .label, [class*="tag"]').each((_, tag) => {
          const tagText = $(tag).text().trim()
          if (tagText && tagText.length < 30) {
            tags.push(tagText)
          }
        })
        
        // Extract image
        const image = $el.find('img').first().attr('src')
        
        if (title && title.length > 5 && title.length < 200) {
          posts.push({
            title,
            url: this.normalizeUrl(url, page.url),
            date: this.parseDate(dateText),
            author: author || undefined,
            summary: summary?.substring(0, 300),
            tags: tags.length > 0 ? tags : undefined,
            image: image ? this.normalizeUrl(image, page.url) : undefined
          })
        }
      })
      
      if (posts.length > 0) break // Stop if we found posts
    }
    
    // If no posts found, try a more general approach
    if (posts.length === 0) {
      $('h2 a, h3 a, .title a').each((_, el) => {
        const $el = $(el)
        const title = $el.text().trim()
        const url = $el.attr('href')
        
        if (title && url && title.length > 10 && title.length < 200) {
          // Look for date near the link
          const parent = $el.closest('div, article, section')
          const dateText = parent.find('.date, time').first().text().trim()
          const summary = parent.find('p').first().text().trim()
          
          posts.push({
            title,
            url: this.normalizeUrl(url, page.url),
            date: this.parseDate(dateText),
            summary: summary?.substring(0, 300)
          })
        }
      })
    }

    return posts.slice(0, 20) // Limit to 20 posts
  }

  /**
   * Extract blog posts from text content
   */
  private extractFromText(page: ScrapedPage): BlogPost[] {
    const posts: BlogPost[] = []
    const text = page.data?.raw?.text
    
    if (!text) return posts

    // Look for common blog post patterns in text
    const lines = text.split('\n').filter(line => line.trim())
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Look for date patterns followed by titles
      const datePattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}\b/i
      const hasDate = datePattern.test(line)
      
      if (hasDate && i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        // Assume next line might be a title if it's capitalized and reasonable length
        if (nextLine.length > 10 && nextLine.length < 200 && /^[A-Z]/.test(nextLine)) {
          posts.push({
            title: nextLine.trim(),
            url: page.url,
            date: line.trim()
          })
        }
      }
    }

    return posts.slice(0, 5) // Limit to avoid noise
  }

  /**
   * Analyze publishing frequency based on post dates
   */
  private analyzePublishingFrequency(posts: BlogPost[]): ContentAnalysis['publishingFrequency'] {
    const datesWithPosts = posts.filter(p => p.date)
    
    if (datesWithPosts.length < 2) {
      return 'occasional'
    }

    // Parse dates and sort
    const dates = datesWithPosts
      .map(p => new Date(p.date!))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())

    if (dates.length < 2) {
      return 'occasional'
    }

    // Calculate average days between posts
    let totalDays = 0
    for (let i = 1; i < Math.min(dates.length, 5); i++) {
      const daysDiff = (dates[i - 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24)
      totalDays += daysDiff
    }
    
    const avgDays = totalDays / Math.min(dates.length - 1, 4)

    if (avgDays <= 3) return 'daily'
    if (avgDays <= 10) return 'weekly'
    if (avgDays <= 35) return 'monthly'
    return 'occasional'
  }

  /**
   * Extract content themes from blog posts
   */
  private extractContentThemes(posts: BlogPost[]): string[] {
    const themes = new Map<string, number>()
    
    // Common tech/business themes to look for
    const themeKeywords = {
      'Product Updates': ['release', 'update', 'feature', 'launch', 'announce'],
      'Engineering': ['engineering', 'technical', 'architecture', 'development', 'code'],
      'Customer Success': ['customer', 'success', 'case study', 'testimonial'],
      'Industry Insights': ['industry', 'trend', 'analysis', 'market', 'report'],
      'Company Culture': ['culture', 'team', 'hiring', 'values', 'people'],
      'Best Practices': ['guide', 'how to', 'tips', 'best practice', 'tutorial'],
      'Security': ['security', 'privacy', 'compliance', 'protection'],
      'Innovation': ['innovation', 'AI', 'ML', 'future', 'research']
    }

    // Analyze post titles and summaries
    posts.forEach(post => {
      const content = `${post.title} ${post.summary || ''}`.toLowerCase()
      
      for (const [theme, keywords] of Object.entries(themeKeywords)) {
        if (keywords.some(keyword => content.includes(keyword))) {
          themes.set(theme, (themes.get(theme) || 0) + 1)
        }
      }

      // Also check tags
      if (post.tags) {
        post.tags.forEach(tag => {
          const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1)
          themes.set(capitalizedTag, (themes.get(capitalizedTag) || 0) + 1)
        })
      }
    })

    // Sort by frequency and return top themes
    return Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme)
  }

  /**
   * Analyze content tone
   */
  private analyzeContentTone(pages: ScrapedPage[]): ContentAnalysis['contentTone'] {
    // Simple heuristic based on content
    const allText = pages.map(p => p.data?.raw?.text || '').join(' ').toLowerCase()
    
    const casualIndicators = ['hey', 'folks', 'awesome', 'cool', 'fun', "let's", "we're", "you'll"]
    const technicalIndicators = ['api', 'implementation', 'architecture', 'algorithm', 'framework', 'protocol']
    const marketingIndicators = ['transform', 'revolutionary', 'leading', 'best-in-class', 'innovative']
    
    const casualCount = casualIndicators.filter(word => allText.includes(word)).length
    const technicalCount = technicalIndicators.filter(word => allText.includes(word)).length
    const marketingCount = marketingIndicators.filter(word => allText.includes(word)).length
    
    if (casualCount > technicalCount && casualCount > marketingCount) return 'casual'
    if (technicalCount > marketingCount) return 'technical'
    if (marketingCount > 2) return 'marketing'
    return 'professional'
  }

  /**
   * Identify target audience from content
   */
  private identifyTargetAudience(posts: BlogPost[]): string[] {
    const audiences = new Set<string>()
    
    const audienceKeywords = {
      'Developers': ['developer', 'engineer', 'code', 'api', 'programming'],
      'Business Leaders': ['executive', 'CEO', 'leadership', 'strategy', 'ROI'],
      'Product Managers': ['product', 'feature', 'roadmap', 'user experience'],
      'Startups': ['startup', 'founder', 'entrepreneur', 'growth', 'scale'],
      'Enterprise': ['enterprise', 'compliance', 'security', 'integration'],
      'Marketing Teams': ['marketing', 'campaign', 'brand', 'content', 'social']
    }

    posts.forEach(post => {
      const content = `${post.title} ${post.summary || ''}`.toLowerCase()
      
      for (const [audience, keywords] of Object.entries(audienceKeywords)) {
        if (keywords.some(keyword => content.includes(keyword))) {
          audiences.add(audience)
        }
      }
    })

    return Array.from(audiences).slice(0, 3)
  }

  /**
   * Extract SEO focus keywords
   */
  private extractSEOFocus(pages: ScrapedPage[]): string[] {
    const keywords = new Map<string, number>()
    
    // Extract from meta keywords
    pages.forEach(page => {
      const metaKeywords = page.data?.metadata?.keywords
      if (metaKeywords && Array.isArray(metaKeywords)) {
        metaKeywords.forEach(keyword => {
          keywords.set(keyword, (keywords.get(keyword) || 0) + 1)
        })
      }

      // Also check SEO title and description
      const seoTitle = page.data?.metadata?.title || ''
      const seoDesc = page.data?.metadata?.description || ''
      
      // Extract potential focus keywords (simple approach)
      const combinedText = `${seoTitle} ${seoDesc}`.toLowerCase()
      const words = combinedText.match(/\b[a-z]{4,}\b/g) || []
      
      // Count word frequency
      words.forEach(word => {
        if (!this.isCommonWord(word)) {
          keywords.set(word, (keywords.get(word) || 0) + 1)
        }
      })
    })

    // Return top keywords
    return Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword)
  }

  /**
   * Count case studies
   */
  private countCaseStudies(pages: ScrapedPage[]): number {
    let count = 0
    
    pages.forEach(page => {
      const text = page.data?.raw?.text || ''
      const html = page.data?.raw?.html || ''
      
      // Count mentions of case studies
      const caseStudyMatches = (text + html).match(/case stud/gi) || []
      const customerStoryMatches = (text + html).match(/customer stor/gi) || []
      const successStoryMatches = (text + html).match(/success stor/gi) || []
      
      count += Math.min(caseStudyMatches.length + customerStoryMatches.length + successStoryMatches.length, 20)
    })

    return count
  }

  /**
   * Count specific content types
   */
  private countContentType(pages: ScrapedPage[], keywords: string[]): number {
    let count = 0
    
    pages.forEach(page => {
      const text = (page.data?.raw?.text || '').toLowerCase()
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          count++
        }
      })
    })

    return Math.min(count, 50) // Cap at reasonable number
  }

  /**
   * Clean text by removing HTML entities and extra whitespace
   */
  private cleanText(text: string): string {
    return text
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Check if word is too common for SEO focus
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your',
      'have', 'will', 'about', 'more', 'been', 'which', 'their',
      'would', 'there', 'could', 'these', 'other', 'after', 'first'
    ]
    return commonWords.includes(word)
  }

  /**
   * Deduplicate blog posts
   */
  private deduplicatePosts(posts: BlogPost[]): BlogPost[] {
    const seen = new Set<string>()
    return posts.filter(post => {
      const key = post.title.toLowerCase()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }
  
  /**
   * Parse various date formats
   */
  private parseDate(dateText: string | undefined): string | undefined {
    if (!dateText) return undefined
    
    // Clean the date text
    const cleaned = dateText.replace(/^(on|published|posted|updated)\s*/i, '').trim()
    
    // Try to parse the date
    const date = new Date(cleaned)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0] // Return YYYY-MM-DD format
    }
    
    // Return original if can't parse
    return cleaned
  }
  
  /**
   * Normalize relative URLs
   */
  private normalizeUrl(url: string, baseUrl: string): string {
    if (!url) return ''
    
    // Already absolute
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    
    // Protocol-relative
    if (url.startsWith('//')) {
      return 'https:' + url
    }
    
    // Relative to domain
    try {
      const base = new URL(baseUrl)
      if (url.startsWith('/')) {
        return base.origin + url
      } else {
        // Relative to current path
        const pathParts = base.pathname.split('/')
        pathParts.pop() // Remove filename if present
        return base.origin + pathParts.join('/') + '/' + url
      }
    } catch {
      return url
    }
  }
}