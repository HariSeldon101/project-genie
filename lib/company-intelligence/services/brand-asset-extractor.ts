/**
 * Shared Brand Asset Extractor Service
 * Centralizes brand asset extraction logic to avoid duplication
 * Uses existing utilities and processors
 * NO FALLBACKS - throws errors on failure
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  extractColorsFromCSS, 
  filterBrandColors, 
  parseColorToHex 
} from '../scrapers/utils/color-extractor'
import type { BrandAssets } from '../types'

interface ExtractionOptions {
  url: string
  html?: string
  $?: any // CheerioAPI
  siteMetadata?: any
  fetchExternalCSS?: boolean
}

export class BrandAssetExtractor {
  private static instance: BrandAssetExtractor
  
  static getInstance(): BrandAssetExtractor {
    if (!this.instance) {
      this.instance = new BrandAssetExtractor()
    }
    return this.instance
  }

  /**
   * Extract all brand assets from a page
   * Combines pre-scrape metadata with page content analysis
   */
  async extractBrandAssets(options: ExtractionOptions): Promise<BrandAssets> {
    const { url, html, $, siteMetadata, fetchExternalCSS = true } = options
    
    permanentLogger.info('Starting brand asset extraction', { category: 'BRAND_EXTRACTOR', url,
      hasHTML: !!html,
      hasCheerio: !!$,
      hasMetadata: !!siteMetadata,
      fetchExternalCSS })

    const brandAssets: BrandAssets = {
      logo: null,
      favicon: null,
      colors: [],
      fonts: [],
      gradients: []
    }

    try {
      // 1. Use pre-scrape metadata first (highest priority)
      if (siteMetadata) {
        this.extractFromMetadata(brandAssets, siteMetadata, url)
      }

      // 2. Extract from page content if Cheerio available
      if ($) {
        await this.extractFromPage(brandAssets, $, url, fetchExternalCSS)
      }

      // 3. Process and filter colors
      if (brandAssets.colors && brandAssets.colors.length > 0) {
        brandAssets.colors = filterBrandColors(brandAssets.colors)
        permanentLogger.info('Filtered brand colors', { category: 'BRAND_EXTRACTOR', beforeCount: brandAssets.colors.length,
          afterCount: brandAssets.colors.length,
          colors: brandAssets.colors })
      }

      // 4. Deduplicate fonts
      if (brandAssets.fonts && brandAssets.fonts.length > 0) {
        brandAssets.fonts = [...new Set(brandAssets.fonts)]
          .filter(font => !this.isGenericFont(font))
          .slice(0, 5)
      }

      // Log extraction results
      permanentLogger.info('Brand extraction complete', { category: 'BRAND_EXTRACTOR', hasLogo: !!brandAssets.logo,
        hasFavicon: !!brandAssets.favicon,
        colorCount: brandAssets.colors?.length || 0,
        fontCount: brandAssets.fonts?.length || 0,
        colors: brandAssets.colors,
        fonts: brandAssets.fonts })

      // Throw error if no brand assets found
      if (!brandAssets.logo && !brandAssets.favicon && 
          (!brandAssets.colors || brandAssets.colors.length === 0) &&
          (!brandAssets.fonts || brandAssets.fonts.length === 0)) {
        const error = new Error('No brand assets extracted')
        permanentLogger.captureError('BRAND_EXTRACTOR', error, {
          message: 'Extraction failed',
          url,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        // Return partial results instead of throwing
        return brandAssets
      }

      return brandAssets

    } catch (error) {
      permanentLogger.captureError('BRAND_EXTRACTOR', error, {
        message: 'Brand extraction error',
        url,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      // Return partial results instead of throwing
      return brandAssets
    }
  }

  /**
   * Extract brand assets from pre-scrape metadata
   */
  private extractFromMetadata(brandAssets: BrandAssets, metadata: any, baseUrl: string) {
    // Check both top-level and nested brandAssets structure
    const ogImage = metadata?.ogImage || metadata?.brandAssets?.ogImage || metadata?.metadata?.ogImage
    const favicon = metadata?.favicon || metadata?.brandAssets?.favicon || metadata?.metadata?.favicon
    const themeColor = metadata?.themeColor || metadata?.brandAssets?.themeColor || metadata?.metadata?.themeColor
    
    permanentLogger.info('BRAND_EXTRACTOR', 'Extracting from metadata', {
      hasOgImage: !!ogImage,
      hasFavicon: !!favicon,
      hasThemeColor: !!themeColor,
      metadataStructure: {
        hasTopLevel: !!(metadata?.ogImage || metadata?.favicon || metadata?.themeColor),
        hasBrandAssets: !!metadata?.brandAssets,
        hasNestedMetadata: !!metadata?.metadata
      }
    })

    // Extract logo from og:image
    if (ogImage && !brandAssets.logo) {
      brandAssets.logo = this.makeAbsoluteUrl(ogImage, baseUrl)
      permanentLogger.info('BRAND_EXTRACTOR', 'Found logo from og:image', { logo: brandAssets.logo})
    }

    // Extract favicon
    if (favicon && !brandAssets.favicon) {
      brandAssets.favicon = this.makeAbsoluteUrl(favicon, baseUrl)
    }

    // Extract theme color
    if (themeColor) {
      const hexColor = parseColorToHex(themeColor)
      if (hexColor && !brandAssets.colors?.includes(hexColor)) {
        brandAssets.colors = brandAssets.colors || []
        brandAssets.colors.push(hexColor)
        permanentLogger.info('BRAND_EXTRACTOR', 'Found theme color', { color: hexColor})
      }
    }
  }

  /**
   * Extract brand assets from page content
   */
  private async extractFromPage(
    brandAssets: BrandAssets, 
    $: any, 
    baseUrl: string,
    fetchExternalCSS: boolean
  ) {
    // Extract logo from common selectors
    if (!brandAssets.logo) {
      const logoSelectors = [
        '.logo img',
        '#logo img',
        '.navbar-brand img',
        'header img[alt*="logo" i]',
        'img[class*="logo" i]',
        'img[id*="logo" i]'
      ]
      
      for (const selector of logoSelectors) {
        const logoEl = $(selector).first()
        const logoSrc = logoEl.attr('src') || logoEl.attr('data-src')
        if (logoSrc) {
          brandAssets.logo = this.makeAbsoluteUrl(logoSrc, baseUrl)
          permanentLogger.info('Found logo from selector', { category: 'BRAND_EXTRACTOR', selector,
            logo: brandAssets.logo })
          break
        }
      }
    }

    // Extract colors from inline styles
    const inlineColors: string[] = []
    $('style').each((_: number, el: any) => {
      const styleText = $(el).text()
      const colors = extractColorsFromCSS(styleText)
      inlineColors.push(...colors)
    })

    // Extract colors from external CSS if enabled
    if (fetchExternalCSS) {
      const externalColors = await this.extractColorsFromExternalCSS($, baseUrl)
      inlineColors.push(...externalColors)
    }

    // Add unique colors
    const uniqueColors = [...new Set(inlineColors)]
      .map(c => parseColorToHex(c))
      .filter((c): c is string => c !== null)
    
    if (!brandAssets.colors) brandAssets.colors = []
    brandAssets.colors.push(...uniqueColors)
    
    permanentLogger.info('Extracted colors', { category: 'BRAND_EXTRACTOR',
      inlineCount: inlineColors.length,
      uniqueCount: uniqueColors.length,
      samples: uniqueColors.slice(0, 5)
    })

    // Extract fonts from CSS
    this.extractFonts($, brandAssets)
  }

  /**
   * Fetch and extract colors from external CSS files
   */
  private async extractColorsFromExternalCSS($: any, baseUrl: string): Promise<string[]> {
    const colors: string[] = []
    const cssLinks = $('link[rel="stylesheet"]')
    
    permanentLogger.info('BRAND_EXTRACTOR', 'Found external CSS files', { count: cssLinks.length})

    // Limit to first 3 CSS files to avoid timeout
    const cssUrls = cssLinks.slice(0, 3).map((_: number, el: any) => {
      const href = $(el).attr('href')
      return href ? this.makeAbsoluteUrl(href, baseUrl) : null
    }).get().filter((url: string | null) => url !== null)

    for (const cssUrl of cssUrls) {
      try {
        permanentLogger.info('BRAND_EXTRACTOR', 'Fetching CSS file', { url: cssUrl})
        
        // Add 5 second timeout to prevent hanging
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(cssUrl, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const cssText = await response.text()
          const cssColors = extractColorsFromCSS(cssText)
          colors.push(...cssColors)
          
          permanentLogger.info('Extracted from CSS file', { category: 'BRAND_EXTRACTOR', url: cssUrl,
            colorCount: cssColors.length })
        }
      } catch (error) {
        permanentLogger.warn('BRAND_EXTRACTOR', 'Failed to fetch CSS', {
          url: cssUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
          isTimeout: error instanceof Error && error.name === 'AbortError'
        })
      }
    }

    return colors
  }

  /**
   * Extract font families from page
   */
  private extractFonts($: any, brandAssets: BrandAssets) {
    const fonts: string[] = []
    const fontRegex = /font-family:\s*["']?([^;"']+)["']?/gi
    
    // From inline styles
    $('style').each((_: number, el: any) => {
      const styleText = $(el).text()
      let match
      while ((match = fontRegex.exec(styleText)) !== null) {
        const fontFamily = match[1].split(',')[0].trim().replace(/["']/g, '')
        if (fontFamily && !this.isGenericFont(fontFamily)) {
          fonts.push(fontFamily)
        }
      }
    })

    // From inline style attributes
    $('[style*="font-family"]').each((_: number, el: any) => {
      const style = $(el).attr('style')
      const match = style.match(/font-family:\s*["']?([^;"']+)["']?/i)
      if (match) {
        const fontFamily = match[1].split(',')[0].trim().replace(/["']/g, '')
        if (fontFamily && !this.isGenericFont(fontFamily)) {
          fonts.push(fontFamily)
        }
      }
    })

    if (!brandAssets.fonts) brandAssets.fonts = []
    brandAssets.fonts.push(...fonts)
    
    permanentLogger.info('Extracted fonts', { category: 'BRAND_EXTRACTOR',
      count: fonts.length,
      fonts: [...new Set(fonts)].slice(0, 5)
    })
  }

  /**
   * Check if font is generic
   */
  private isGenericFont(font: string): boolean {
    const genericFonts = [
      'inherit', 'initial', 'unset',
      'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
      'system-ui', '-apple-system', 'BlinkMacSystemFont'
    ]
    return genericFonts.includes(font.toLowerCase())
  }

  /**
   * Make URL absolute
   */
  private makeAbsoluteUrl(url: string, baseUrl: string): string {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    if (url.startsWith('//')) {
      return 'https:' + url
    }
    try {
      return new URL(url, baseUrl).href
    } catch {
      return url
    }
  }
}

// Export singleton instance
export const brandAssetExtractor = BrandAssetExtractor.getInstance()