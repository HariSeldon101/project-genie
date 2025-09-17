/**
 * Common types for the scraper module
 */

import type { WebsiteAnalysis } from './detection/website-detector'

export interface IScraper {
  readonly name: string
  canHandle(url: string, analysis?: WebsiteAnalysis): boolean
  init?(): Promise<void>
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapedData>
  cleanup?(): Promise<void>
}

export interface ScrapeOptions {
  timeout?: number
  headers?: Record<string, string>
  userAgent?: string
  viewport?: {
    width: number
    height: number
  }
  scrollToBottom?: boolean
  waitForSelector?: string
  browserType?: string
  selectors?: Record<string, string>
  // Deep crawling options
  deepCrawl?: boolean
  maxDepth?: number
  maxPages?: number
  followLinks?: boolean
  extractFullContent?: boolean
  // Site metadata from initial analysis
  siteMetadata?: {
    organizationName?: string
    language?: string
    charset?: string
    schemaType?: string
    socialHandles?: {
      twitter?: string
      creator?: string
    }
    brandAssets?: {
      favicon?: string
      ogImage?: string
      themeColor?: string
    }
    siteType?: string
    technologies?: Record<string, string[]>
  }
}

export interface ContactInfo {
  emails: string[]
  phones: string[]
  addresses: string[]
}

export interface SocialLinks {
  twitter?: string
  linkedin?: string
  facebook?: string
  instagram?: string
  youtube?: string
  github?: string
  tiktok?: string
  medium?: string
  [key: string]: string | undefined
}

export interface TeamMember {
  name: string
  role: string | null
  bio: string | null
  image: string | null
  linkedin: string | null
  twitter: string | null
}

export interface Testimonial {
  content: string
  author: string | null
  role: string | null
  rating: number | null
  date: string | null
}

export interface ProductService {
  name: string
  description: string | null
  price: string | null
  image: string | null
  features: string[]
  link: string | null
}

export interface BlogPost {
  title: string
  excerpt: string | null
  author: string | null
  date: string | null
  link: string | null
  tags: string[]
  content?: string  // Full article content
}

export interface BrandAssets {
  logo: string | null
  favicon: string | null
  colors: string[]  // Hex color codes
  fonts: string[]   // Font family names
  gradients?: string[]  // CSS gradient definitions
  cssVariables?: Record<string, string>  // Theme colors from CSS variables
}

export interface PageData {
  url: string
  title: string
  type: 'home' | 'about' | 'blog' | 'contact' | 'product' | 'other'
  content: string
  structuredData?: any
}

export interface ScrapedData {
  url: string
  title: string
  description: string
  content: string
  logos: string[]
  brandAssets: BrandAssets  // Changed from string[] to proper type
  contactInfo: ContactInfo
  socialLinks: SocialLinks
  teamMembers: TeamMember[]
  testimonials: Testimonial[]
  products: ProductService[]
  blogPosts: BlogPost[]
  images?: {  // Add comprehensive image extraction
    hero?: string[]
    products?: string[]
    team?: string[]
    gallery?: string[]
    blog?: string[]
    all?: string[]
  }
  pages?: PageData[]  // Add pages array for better UI display
  metadata: {
    scrapedAt: string
    scraper: string
    pagesScraped?: number
    [key: string]: any
  }
  
  // Enhanced structured data
  structured?: {
    h1?: string[]
    h2?: string[]
    h3?: string[]
    paragraphs?: string[]
    aboutText?: string
    heroText?: string
    navigationItems?: Array<{ text: string; href: string }>
    [key: string]: any
  }
  
  // For compatibility with legacy format
  data?: {
    raw?: any
    structured?: any
    metadata?: any
  }
  raw?: any
  scraperUsed?: string
}