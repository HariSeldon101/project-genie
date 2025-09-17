/**
 * Visual Asset Processor
 * Extracts and processes logos, images, and brand colors from scraped data
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { ScrapedPage } from '../types'

interface ProcessedVisualAssets {
  logos: {
    primary?: string
    svg?: string
    favicon?: string
  }
  brandColors: {
    primary?: string
    secondary?: string
    accent?: string[]
    raw?: string[]
  }
  typography?: {
    headingFont?: string
    bodyFont?: string
  }
  images: {
    products: string[]
    team: string[]
    office: string[]
    hero: string[]
    gallery: string[]
  }
}

export class VisualAssetProcessor {
  constructor() {
    permanentLogger.info('VISUAL_PROCESSOR', 'Initialized visual asset processor')
  }

  /**
   * Process all visual assets from scraped pages
   */
  async processVisualAssets(pages: ScrapedPage[]): Promise<ProcessedVisualAssets> {
    permanentLogger.info('VISUAL_PROCESSOR', 'Processing visual assets', {
      pageCount: pages.length
    })

    const assets: ProcessedVisualAssets = {
      logos: {},
      brandColors: {
        raw: []
      },
      images: {
        products: [],
        team: [],
        office: [],
        hero: [],
        gallery: []
      }
    }

    // Process each page
    for (const page of pages) {
      // Extract logos from home page primarily
      if (page.type === 'home' || page.type === 'unknown') {
        this.extractLogos(page, assets)
      }

      // Extract brand colors from any page
      this.extractBrandColors(page, assets)

      // Extract images based on page type
      this.extractImages(page, assets)

      // Extract typography
      this.extractTypography(page, assets)
    }

    // Deduplicate and clean up
    assets.images = this.deduplicateImages(assets.images)
    assets.brandColors = this.processBrandColors(assets.brandColors)

    permanentLogger.info('VISUAL_PROCESSOR', 'Visual assets processed', {
      hasLogo: !!assets.logos.primary,
      hasSvg: !!assets.logos.svg,
      colorCount: assets.brandColors.raw?.length || 0,
      imageCount: this.countImages(assets.images)
    })

    return assets
  }

  /**
   * Extract logos from page data
   */
  private extractLogos(page: ScrapedPage, assets: ProcessedVisualAssets): void {
    const logos = page.data?.logos

    if (!logos) return

    // Prefer SVG logo
    if (logos.svg && !assets.logos.svg) {
      assets.logos.svg = logos.svg
    }

    // Set primary logo URL
    if (logos.url && !assets.logos.primary) {
      assets.logos.primary = this.normalizeImageUrl(logos.url, page.url)
    }

    // Set favicon as fallback
    if (logos.favicon && !assets.logos.favicon) {
      assets.logos.favicon = this.normalizeImageUrl(logos.favicon, page.url)
    }

    // Try Open Graph image as another fallback
    const ogImage = page.data?.openGraph?.image
    if (ogImage && !assets.logos.primary) {
      assets.logos.primary = this.normalizeImageUrl(
        typeof ogImage === 'string' ? ogImage : ogImage.url,
        page.url
      )
    }
  }

  /**
   * Extract brand colors from page data
   */
  private extractBrandColors(page: ScrapedPage, assets: ProcessedVisualAssets): void {
    const colors = page.data?.brandColors

    if (!colors) return

    // Add CSS variables
    if (colors.cssVariables) {
      for (const [key, value] of Object.entries(colors.cssVariables)) {
        if (key.includes('primary') && !assets.brandColors.primary) {
          assets.brandColors.primary = value as string
        }
        if (key.includes('secondary') && !assets.brandColors.secondary) {
          assets.brandColors.secondary = value as string
        }
        if (key.includes('accent')) {
          if (!assets.brandColors.accent) assets.brandColors.accent = []
          assets.brandColors.accent.push(value as string)
        }
      }
    }

    // Add theme color
    if (colors.themeColor && !assets.brandColors.primary) {
      assets.brandColors.primary = colors.themeColor
    }

    // Add extracted colors to raw
    if (colors.extractedColors && Array.isArray(colors.extractedColors)) {
      assets.brandColors.raw?.push(...colors.extractedColors)
    }
  }

  /**
   * Extract typography information
   */
  private extractTypography(page: ScrapedPage, assets: ProcessedVisualAssets): void {
    // This would need more sophisticated CSS parsing
    // For now, we'll look for common font declarations
    const css = page.data?.raw?.html || ''
    
    if (!assets.typography) {
      assets.typography = {}
    }

    // Try to find font-family declarations
    const fontMatches = css.match(/font-family:\s*['"]?([^;'"]+)['"]?/gi)
    if (fontMatches && fontMatches.length > 0) {
      // Extract first non-generic font as heading font
      const fonts = fontMatches[0].replace(/font-family:\s*/i, '').split(',')
      const headingFont = fonts.find(f => 
        !f.includes('sans-serif') && 
        !f.includes('serif') && 
        !f.includes('monospace')
      )
      if (headingFont && !assets.typography.headingFont) {
        assets.typography.headingFont = headingFont.trim().replace(/['"]/g, '')
      }
    }
  }

  /**
   * Extract images based on page type
   */
  private extractImages(page: ScrapedPage, assets: ProcessedVisualAssets): void {
    const images = page.data?.images

    if (!images) return

    // Add images by type
    if (images.products && Array.isArray(images.products)) {
      images.products.forEach((img: any) => {
        if (img.url) {
          assets.images.products.push(this.normalizeImageUrl(img.url, page.url))
        }
      })
    }

    if (images.team && Array.isArray(images.team)) {
      images.team.forEach((img: any) => {
        if (img.url) {
          assets.images.team.push(this.normalizeImageUrl(img.url, page.url))
        }
      })
    }

    if (images.hero && Array.isArray(images.hero)) {
      images.hero.forEach((img: any) => {
        if (img.url) {
          assets.images.hero.push(this.normalizeImageUrl(img.url, page.url))
        }
      })
    }

    if (images.gallery && Array.isArray(images.gallery)) {
      images.gallery.forEach((img: any) => {
        if (img.url) {
          assets.images.gallery.push(this.normalizeImageUrl(img.url, page.url))
        }
      })
    }

    // Extract product images from product pages specifically
    if (page.type === 'products' || page.type === 'services') {
      const productImages = this.extractProductImages(page)
      assets.images.products.push(...productImages)
    }

    // Extract team photos from team pages
    if (page.type === 'team' || page.type === 'about') {
      const teamImages = this.extractTeamImages(page)
      assets.images.team.push(...teamImages)
    }
  }

  /**
   * Extract product images from product/service pages
   */
  private extractProductImages(page: ScrapedPage): string[] {
    const images: string[] = []
    
    // Look for images in structured data
    const jsonLd = page.data?.jsonLd
    if (jsonLd && Array.isArray(jsonLd)) {
      jsonLd.forEach((item: any) => {
        if (item['@type'] === 'Product' && item.image) {
          if (Array.isArray(item.image)) {
            images.push(...item.image)
          } else {
            images.push(item.image)
          }
        }
      })
    }

    return images.map(url => this.normalizeImageUrl(url, page.url))
  }

  /**
   * Extract team member photos
   */
  private extractTeamImages(page: ScrapedPage): string[] {
    const images: string[] = []
    
    // Look for person schema
    const jsonLd = page.data?.jsonLd
    if (jsonLd && Array.isArray(jsonLd)) {
      jsonLd.forEach((item: any) => {
        if (item['@type'] === 'Person' && item.image) {
          images.push(item.image)
        }
      })
    }

    return images.map(url => this.normalizeImageUrl(url, page.url))
  }

  /**
   * Normalize image URL to absolute
   */
  private normalizeImageUrl(url: string, pageUrl: string): string {
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
      const base = new URL(pageUrl)
      return new URL(url, base.origin).href
    } catch {
      return url
    }
  }

  /**
   * Deduplicate image arrays
   */
  private deduplicateImages(images: ProcessedVisualAssets['images']): ProcessedVisualAssets['images'] {
    return {
      products: [...new Set(images.products)].slice(0, 10),
      team: [...new Set(images.team)].slice(0, 10),
      office: [...new Set(images.office)].slice(0, 5),
      hero: [...new Set(images.hero)].slice(0, 5),
      gallery: [...new Set(images.gallery)].slice(0, 10)
    }
  }

  /**
   * Process and deduplicate brand colors
   */
  private processBrandColors(colors: ProcessedVisualAssets['brandColors']): ProcessedVisualAssets['brandColors'] {
    // Deduplicate raw colors
    if (colors.raw) {
      colors.raw = [...new Set(colors.raw)].slice(0, 10)
      
      // If no primary/secondary set, use most common colors
      if (!colors.primary && colors.raw.length > 0) {
        colors.primary = colors.raw[0]
      }
      if (!colors.secondary && colors.raw.length > 1) {
        colors.secondary = colors.raw[1]
      }
    }

    // Deduplicate accent colors
    if (colors.accent) {
      colors.accent = [...new Set(colors.accent)].slice(0, 3)
    }

    return colors
  }

  /**
   * Count total images
   */
  private countImages(images: ProcessedVisualAssets['images']): number {
    return Object.values(images).reduce((sum, arr) => sum + arr.length, 0)
  }
}