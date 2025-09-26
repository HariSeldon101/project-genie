/**
 * Base Data Item Types
 * Standardized data structures for ALL captured content
 * MANDATORY: All data MUST extend BaseDataItem (as of 2025-01-11)
 * Following Next.js/React best practices for immutable state
 */


export enum DataType {
  LINK = 'link',
  TEXT = 'text',
  IMAGE = 'image',
  CONTACT = 'contact',
  SOCIAL = 'social',
  METADATA = 'metadata',
  BRAND = 'brand',
  PRODUCT = 'product',
  TEAM = 'team',
  TESTIMONIAL = 'testimonial',
  FAQ = 'faq',
  UNKNOWN = 'unknown'
}

export enum DataSource {
  SCRAPING = 'scraping',
  EXTRACTION = 'extraction',
  EXTERNAL = 'external',
  ANALYSIS = 'analysis',
  ENRICHMENT = 'enrichment',
  USER = 'user'
}

export type DataQuality = 'high' | 'medium' | 'low'

export type LinkType = 'internal' | 'external' | 'navigation' | 'resource' | 'social' | 'download'

/**
 * Base interface for ALL captured data
 * Using readonly for immutable fields (Next.js/React best practice)
 */
export interface BaseDataItem {
  readonly id: string
  readonly type: DataType
  readonly source: DataSource
  readonly timestamp: number
  readonly url?: string
  confidence: number
  quality: DataQuality
  metadata: Record<string, any>
  selected?: boolean
  enhanced?: boolean
}

/**
 * Link data item for URLs and navigation
 */
export interface LinkDataItem extends BaseDataItem {
  readonly type: DataType.LINK
  linkType: LinkType
  text?: string
  target: string
  normalized?: string
  isDuplicate?: boolean
  isAsset?: boolean
  fragment?: string
  queryParams?: Record<string, string>
}

/**
 * Text content data item
 */
export interface TextDataItem extends BaseDataItem {
  readonly type: DataType.TEXT
  content: string
  format: 'plain' | 'html' | 'markdown'
  category?: string
  subcategory?: string
  wordCount?: number
}

/**
 * Image data item
 */
export interface ImageDataItem extends BaseDataItem {
  readonly type: DataType.IMAGE
  src: string
  alt?: string
  title?: string
  width?: number
  height?: number
  format?: string
  size?: number
  isLogo?: boolean
  isBrandAsset?: boolean
}

/**
 * Contact information data item
 */
export interface ContactDataItem extends BaseDataItem {
  readonly type: DataType.CONTACT
  contactType: 'email' | 'phone' | 'address' | 'form'
  value: string
  label?: string
  isPrimary?: boolean
}

/**
 * Social media data item
 */
export interface SocialDataItem extends BaseDataItem {
  readonly type: DataType.SOCIAL
  platform: string
  profileUrl: string
  handle?: string
  followerCount?: number
  verified?: boolean
}

/**
 * Metadata data item
 */
export interface MetadataDataItem extends BaseDataItem {
  readonly type: DataType.METADATA
  metaType: 'og' | 'twitter' | 'schema' | 'meta' | 'other'
  property: string
  content: string
}

/**
 * Brand asset data item
 */
export interface BrandDataItem extends BaseDataItem {
  readonly type: DataType.BRAND
  assetType: 'logo' | 'color' | 'font' | 'tagline' | 'value'
  value: string | string[]
  variations?: string[]
}

/**
 * Product/Service data item
 */
export interface ProductDataItem extends BaseDataItem {
  readonly type: DataType.PRODUCT
  name: string
  description?: string
  price?: string
  category?: string
  features?: string[]
  imageUrl?: string
}

/**
 * Team member data item
 */
export interface TeamDataItem extends BaseDataItem {
  readonly type: DataType.TEAM
  name: string
  role?: string
  bio?: string
  imageUrl?: string
  linkedIn?: string
  email?: string
}

/**
 * Type guard functions for runtime type checking
 */
export const isLinkDataItem = (item: BaseDataItem): item is LinkDataItem => 
  item.type === DataType.LINK

export const isTextDataItem = (item: BaseDataItem): item is TextDataItem => 
  item.type === DataType.TEXT

export const isImageDataItem = (item: BaseDataItem): item is ImageDataItem => 
  item.type === DataType.IMAGE

export const isContactDataItem = (item: BaseDataItem): item is ContactDataItem => 
  item.type === DataType.CONTACT

/**
 * Factory functions for creating data items
 */
export class DataItemFactory {
  static createLink(
    url: string,
    text?: string,
    source: DataSource = DataSource.SCRAPING
  ): LinkDataItem {
    return {
      id: crypto.randomUUID(),
      type: DataType.LINK,
      source,
      timestamp: Date.now(),
      target: url,
      text,
      linkType: url.startsWith('http') && !url.includes(typeof window !== 'undefined' ? window.location.hostname : '') 
        ? 'external' 
        : 'internal',
      confidence: 1.0,
      quality: 'high',
      metadata: {}
    }
  }

  static createText(
    content: string,
    format: 'plain' | 'html' | 'markdown' = 'plain',
    source: DataSource = DataSource.EXTRACTION
  ): TextDataItem {
    return {
      id: crypto.randomUUID(),
      type: DataType.TEXT,
      source,
      timestamp: Date.now(),
      content,
      format,
      wordCount: content.split(/\s+/).length,
      confidence: 0.9,
      quality: 'medium',
      metadata: {}
    }
  }

  static createImage(
    src: string,
    alt?: string,
    source: DataSource = DataSource.SCRAPING
  ): ImageDataItem {
    return {
      id: crypto.randomUUID(),
      type: DataType.IMAGE,
      source,
      timestamp: Date.now(),
      src,
      alt,
      confidence: 1.0,
      quality: 'high',
      metadata: {}
    }
  }

  static createContact(
    contactType: 'email' | 'phone' | 'address' | 'form',
    value: string,
    source: DataSource = DataSource.EXTRACTION
  ): ContactDataItem {
    return {
      id: crypto.randomUUID(),
      type: DataType.CONTACT,
      source,
      timestamp: Date.now(),
      contactType,
      value,
      confidence: 0.95,
      quality: 'high',
      metadata: {}
    }
  }

  /**
   * Convert legacy data to BaseDataItem
   */
  static fromLegacy(legacyData: any): BaseDataItem {
    // Attempt to determine type from legacy data
    if (legacyData.url || legacyData.href || legacyData.link) {
      return this.createLink(
        legacyData.url || legacyData.href || legacyData.link,
        legacyData.text || legacyData.title
      )
    }

    if (legacyData.content || legacyData.text) {
      return this.createText(
        legacyData.content || legacyData.text,
        legacyData.format || 'plain'
      )
    }

    if (legacyData.src || legacyData.image) {
      return this.createImage(
        legacyData.src || legacyData.image,
        legacyData.alt
      )
    }

    // Default to unknown type
    return {
      id: legacyData.id || crypto.randomUUID(),
      type: DataType.UNKNOWN,
      source: DataSource.SCRAPING,
      timestamp: legacyData.timestamp || Date.now(),
      confidence: 0.5,
      quality: 'low',
      metadata: { ...legacyData, migrated: true }
    }
  }
}

/**
 * Normalized data store for efficient lookups (React best practice)
 */
export interface NormalizedDataStore {
  byId: Record<string, BaseDataItem>
  allIds: string[]
  byType: Record<DataType, string[]>
  bySource: Record<DataSource, string[]>
}

/**
 * Helper to normalize data array into store
 */
export function normalizeDataItems(items: BaseDataItem[]): NormalizedDataStore {
  const store: NormalizedDataStore = {
    byId: {},
    allIds: [],
    byType: Object.values(DataType).reduce((acc, type) => ({ ...acc, [type]: [] }), {}) as Record<DataType, string[]>,
    bySource: Object.values(DataSource).reduce((acc, source) => ({ ...acc, [source]: [] }), {}) as Record<DataSource, string[]>
  }

  items.forEach(item => {
    store.byId[item.id] = item
    store.allIds.push(item.id)
    store.byType[item.type].push(item.id)
    store.bySource[item.source].push(item.id)
  })

  return store
}