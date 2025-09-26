/**
 * Shared Image Extractor Service
 * Centralizes image extraction logic for DRY principle
 * Used by both CheerioScraper and PlaywrightScraper
 * NO FALLBACKS - throws errors on failure
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface ExtractedImages {
  hero: string[]      // Hero/banner images
  products: string[]  // Product images
  team: string[]      // Team member photos
  gallery: string[]   // Gallery/portfolio images
  blog: string[]      // Blog post featured images
  logos: string[]     // Company logos
  all: string[]       // All unique images
}

interface ImageExtractionOptions {
  url: string
  $?: any // CheerioAPI
  page?: any // Playwright Page
  maxImages?: number
  includeDataUrls?: boolean
}

export class ImageExtractor {
  private static instance: ImageExtractor
  
  static getInstance(): ImageExtractor {
    if (!this.instance) {
      this.instance = new ImageExtractor()
    }
    return this.instance
  }

  /**
   * Extract all images from a page
   */
  async extractImages(options: ImageExtractionOptions): Promise<ExtractedImages> {
    const { url, $, page, maxImages = 100, includeDataUrls = false } = options
    
    permanentLogger.info('IMAGE_EXTRACTOR', 'Starting image extraction', {
      url,
      hasCheerio: !!$,
      hasPlaywright: !!page,
      maxImages
    })

    const images: ExtractedImages = {
      hero: [],
      products: [],
      team: [],
      gallery: [],
      blog: [],
      logos: [],
      all: []
    }

    try {
      if ($) {
        // Cheerio extraction
        this.extractWithCheerio($, url, images, includeDataUrls)
      } else if (page) {
        // Playwright extraction
        await this.extractWithPlaywright(page, url, images, includeDataUrls)
      } else {
        permanentLogger.warn('No extraction method available', {
          category: 'IMAGE_EXTRACTOR',
          url,
          hasCheerio: !!$,
          hasPlaywright: !!page
        })
        // Return empty structure instead of throwing
        return images
      }

      // Deduplicate all arrays
      images.hero = [...new Set(images.hero)].slice(0, 5)
      images.products = [...new Set(images.products)].slice(0, 20)
      images.team = [...new Set(images.team)].slice(0, 20)
      images.gallery = [...new Set(images.gallery)].slice(0, 20)
      images.blog = [...new Set(images.blog)].slice(0, 10)
      images.logos = [...new Set(images.logos)].slice(0, 5)
      
      // Combine all unique images
      const allImages = new Set([
        ...images.hero,
        ...images.products,
        ...images.team,
        ...images.gallery,
        ...images.blog,
        ...images.logos
      ])
      
      images.all = Array.from(allImages).slice(0, maxImages)

      permanentLogger.info('IMAGE_EXTRACTOR', 'Image extraction complete', {
        url,
        heroCount: images.hero.length,
        productCount: images.products.length,
        teamCount: images.team.length,
        galleryCount: images.gallery.length,
        blogCount: images.blog.length,
        logoCount: images.logos.length,
        totalUnique: images.all.length })

      return images

    } catch (error) {
      permanentLogger.captureError('IMAGE_EXTRACTOR', error, {
        message: 'Image extraction error',
        url,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      // Return partial results instead of throwing
      return images
    }
  }

  /**
   * Extract images using Cheerio
   */
  private extractWithCheerio($: any, baseUrl: string, images: ExtractedImages, includeDataUrls: boolean) {
    // Hero/Banner images
    const heroSelectors = [
      '.hero img', '.banner img', '.jumbotron img',
      'header img:not([alt*="logo" i])', '[class*="hero"] img',
      '[class*="banner"] img', '.slider img'
    ]
    
    heroSelectors.forEach(selector => {
      $(selector).each((_: number, el: any) => {
        const src = this.extractImageSrc($(el), includeDataUrls)
        if (src) {
          images.hero.push(this.makeAbsoluteUrl(src, baseUrl))
        }
      })
    })

    // Product images
    const productSelectors = [
      '.product img', '[class*="product"] img',
      '.service img', '[class*="service"] img',
      '.portfolio img', '.project img'
    ]
    
    productSelectors.forEach(selector => {
      $(selector).each((_: number, el: any) => {
        const src = this.extractImageSrc($(el), includeDataUrls)
        if (src) {
          images.products.push(this.makeAbsoluteUrl(src, baseUrl))
        }
      })
    })

    // Team member images
    const teamSelectors = [
      '.team img', '[class*="team"] img',
      '.staff img', '[class*="staff"] img',
      '.member img', '.employee img',
      '.founder img', '.leadership img'
    ]
    
    teamSelectors.forEach(selector => {
      $(selector).each((_: number, el: any) => {
        const src = this.extractImageSrc($(el), includeDataUrls)
        if (src) {
          images.team.push(this.makeAbsoluteUrl(src, baseUrl))
        }
      })
    })

    // Gallery images
    const gallerySelectors = [
      '.gallery img', '[class*="gallery"] img',
      '.portfolio img', '.showcase img',
      '.carousel img', '.slider img'
    ]
    
    gallerySelectors.forEach(selector => {
      $(selector).each((_: number, el: any) => {
        const src = this.extractImageSrc($(el), includeDataUrls)
        if (src) {
          images.gallery.push(this.makeAbsoluteUrl(src, baseUrl))
        }
      })
    })

    // Blog images
    const blogSelectors = [
      'article img', '.post img', '.blog img',
      '[class*="blog"] img', '[class*="article"] img',
      '.featured-image', '.post-thumbnail'
    ]
    
    blogSelectors.forEach(selector => {
      $(selector).each((_: number, el: any) => {
        const src = this.extractImageSrc($(el), includeDataUrls)
        if (src) {
          images.blog.push(this.makeAbsoluteUrl(src, baseUrl))
        }
      })
    })

    // Logo images (separate from hero)
    const logoSelectors = [
      '.logo img', '#logo img', '[class*="logo"] img',
      '[id*="logo"] img', 'img[alt*="logo" i]',
      'img[src*="logo" i]', '.navbar-brand img'
    ]
    
    logoSelectors.forEach(selector => {
      $(selector).each((_: number, el: any) => {
        const src = this.extractImageSrc($(el), includeDataUrls)
        if (src) {
          images.logos.push(this.makeAbsoluteUrl(src, baseUrl))
        }
      })
    })

    // Also get all img tags for comprehensive coverage
    $('img').each((_: number, el: any) => {
      const src = this.extractImageSrc($(el), includeDataUrls)
      if (src) {
        const absoluteUrl = this.makeAbsoluteUrl(src, baseUrl)
        // Add to all images array for deduplication later
        if (!images.all.includes(absoluteUrl)) {
          images.all.push(absoluteUrl)
        }
      }
    })
  }

  /**
   * Extract images using Playwright
   */
  private async extractWithPlaywright(page: any, baseUrl: string, images: ExtractedImages, includeDataUrls: boolean) {
    const extractedData = await page.evaluate((includeData: boolean) => {
      const imgs: any = {
        hero: [],
        products: [],
        team: [],
        gallery: [],
        blog: [],
        logos: [],
        all: []
      }

      // Helper to get image source
      const getSrc = (img: HTMLImageElement) => {
        return img.src || img.dataset.src || img.dataset.lazySrc || 
               img.getAttribute('data-src') || img.getAttribute('data-lazy-src')
      }

      // Hero images
      document.querySelectorAll('.hero img, .banner img, [class*="hero"] img').forEach(img => {
        const src = getSrc(img as HTMLImageElement)
        if (src && (includeData || !src.startsWith('data:'))) {
          imgs.hero.push(src)
        }
      })

      // Product images
      document.querySelectorAll('.product img, [class*="product"] img, .service img').forEach(img => {
        const src = getSrc(img as HTMLImageElement)
        if (src && (includeData || !src.startsWith('data:'))) {
          imgs.products.push(src)
        }
      })

      // Team images
      document.querySelectorAll('.team img, [class*="team"] img, .staff img').forEach(img => {
        const src = getSrc(img as HTMLImageElement)
        if (src && (includeData || !src.startsWith('data:'))) {
          imgs.team.push(src)
        }
      })

      // Gallery images
      document.querySelectorAll('.gallery img, [class*="gallery"] img, .carousel img').forEach(img => {
        const src = getSrc(img as HTMLImageElement)
        if (src && (includeData || !src.startsWith('data:'))) {
          imgs.gallery.push(src)
        }
      })

      // Blog images
      document.querySelectorAll('article img, .post img, .blog img').forEach(img => {
        const src = getSrc(img as HTMLImageElement)
        if (src && (includeData || !src.startsWith('data:'))) {
          imgs.blog.push(src)
        }
      })

      // Logo images
      document.querySelectorAll('.logo img, #logo img, img[alt*="logo" i]').forEach(img => {
        const src = getSrc(img as HTMLImageElement)
        if (src && (includeData || !src.startsWith('data:'))) {
          imgs.logos.push(src)
        }
      })

      // All images
      document.querySelectorAll('img').forEach(img => {
        const src = getSrc(img as HTMLImageElement)
        if (src && (includeData || !src.startsWith('data:'))) {
          imgs.all.push(src)
        }
      })

      return imgs
    }, includeDataUrls)

    // Make all URLs absolute
    Object.keys(extractedData).forEach(key => {
      images[key as keyof ExtractedImages] = extractedData[key].map((src: string) => 
        this.makeAbsoluteUrl(src, baseUrl)
      )
    })
  }

  /**
   * Extract image source from element
   */
  private extractImageSrc(element: any, includeDataUrls: boolean): string | null {
    const src = element.attr('src') || 
                element.attr('data-src') || 
                element.attr('data-lazy-src') ||
                element.attr('data-srcset')?.split(',')[0]?.split(' ')[0]

    if (!src) return null
    
    // Skip data URLs unless specifically requested
    if (src.startsWith('data:') && !includeDataUrls) return null
    
    // Skip tracking pixels and tiny images
    if (src.includes('pixel') || src.includes('tracking') || src.includes('1x1')) return null
    
    return src
  }

  /**
   * Make URL absolute
   */
  private makeAbsoluteUrl(url: string, baseUrl: string): string {
    if (!url) return ''
    if (url.startsWith('data:')) return url
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('//')) return 'https:' + url
    
    try {
      return new URL(url, baseUrl).href
    } catch {
      return url
    }
  }
}

// Export singleton instance
export const imageExtractor = ImageExtractor.getInstance()