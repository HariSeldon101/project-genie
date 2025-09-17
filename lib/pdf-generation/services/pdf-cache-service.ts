/**
 * PDF Cache Service
 * Handles caching of generated PDFs in Supabase Storage
 *
 * EXCEPTION: Uses Supabase Storage directly (not database)
 * Storage operations are different from database queries and don't
 * fit the repository pattern for database operations.
 */

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export interface CacheOptions {
  ttl?: number // Time to live in seconds (default: 1 hour)
  forceRegenerate?: boolean // Force regeneration even if cached
}

export class PDFCacheService {
  private bucketName = 'pdfs'
  
  /**
   * Generate cache key for a document
   */
  private generateCacheKey(
    documentId: string,
    documentType: string,
    content: any,
    options: any
  ): string {
    // Create a hash of the content and options to detect changes
    const contentHash = crypto
      .createHash('md5')
      .update(JSON.stringify({ content, options }))
      .digest('hex')
      .substring(0, 8)
    
    // Include document ID, type, and content hash in the key
    return `${documentId}/${documentType}_${contentHash}.pdf`
  }
  
  /**
   * Get cached PDF if available
   */
  async getCachedPDF(
    userId: string,
    documentId: string,
    documentType: string,
    content: any,
    options: any,
    cacheOptions: CacheOptions = {}
  ): Promise<{ url: string; cached: boolean } | null> {
    if (cacheOptions.forceRegenerate) {
      return null
    }
    
    const supabase = await createClient()
    const cacheKey = this.generateCacheKey(documentId, documentType, content, options)
    const filePath = `${userId}/${cacheKey}`
    
    try {
      // Check if file exists
      const { data: files } = await supabase.storage
        .from(this.bucketName)
        .list(userId, {
          search: cacheKey
        })
      
      if (!files || files.length === 0) {
        return null
      }
      
      // Check if file is still valid (TTL)
      const file = files[0]
      if (file.created_at) {
        const createdAt = new Date(file.created_at).getTime()
        const now = Date.now()
        const ttl = (cacheOptions.ttl || 3600) * 1000 // Convert to milliseconds
        
        if (now - createdAt > ttl) {
          // Cache expired, delete old file
          await this.deleteCachedPDF(userId, cacheKey)
          return null
        }
      }
      
      // Get public URL
      const { data } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath)
      
      return {
        url: data.publicUrl,
        cached: true
      }
    } catch (error) {
      console.error('Error checking cache:', error)
      return null
    }
  }
  
  /**
   * Save PDF to cache
   */
  async savePDFToCache(
    userId: string,
    documentId: string,
    documentType: string,
    content: any,
    options: any,
    pdfBuffer: Buffer
  ): Promise<{ url: string; cached: boolean } | null> {
    const supabase = await createClient()
    const cacheKey = this.generateCacheKey(documentId, documentType, content, options)
    const filePath = `${userId}/${cacheKey}`
    
    try {
      // Delete any existing file with the same key
      await this.deleteCachedPDF(userId, cacheKey)
      
      // Upload new file
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600', // 1 hour
          upsert: true
        })
      
      if (error) {
        console.error('Error uploading PDF to cache:', error)
        return null
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath)
      
      return {
        url: urlData.publicUrl,
        cached: false
      }
    } catch (error) {
      console.error('Error saving to cache:', error)
      return null
    }
  }
  
  /**
   * Delete cached PDF
   */
  async deleteCachedPDF(userId: string, cacheKey: string): Promise<void> {
    const supabase = await createClient()
    const filePath = `${userId}/${cacheKey}`
    
    try {
      await supabase.storage
        .from(this.bucketName)
        .remove([filePath])
    } catch (error) {
      // Ignore deletion errors
      console.warn('Error deleting cached PDF:', error)
    }
  }
  
  /**
   * Clear all cached PDFs for a user
   */
  async clearUserCache(userId: string): Promise<void> {
    const supabase = await createClient()
    
    try {
      // List all files for user
      const { data: files } = await supabase.storage
        .from(this.bucketName)
        .list(userId)
      
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${userId}/${file.name}`)
        
        // Delete all files
        await supabase.storage
          .from(this.bucketName)
          .remove(filePaths)
      }
    } catch (error) {
      console.error('Error clearing user cache:', error)
    }
  }
  
  /**
   * Clear all cached PDFs for a document
   */
  async clearDocumentCache(userId: string, documentId: string): Promise<void> {
    const supabase = await createClient()
    
    try {
      // List all files for document
      const { data: files } = await supabase.storage
        .from(this.bucketName)
        .list(`${userId}/${documentId}`)
      
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${userId}/${documentId}/${file.name}`)
        
        // Delete all files
        await supabase.storage
          .from(this.bucketName)
          .remove(filePaths)
      }
    } catch (error) {
      console.error('Error clearing document cache:', error)
    }
  }
}

// Singleton instance
let cacheService: PDFCacheService | null = null

/**
 * Get cache service instance
 */
export function getPDFCacheService(): PDFCacheService {
  if (!cacheService) {
    cacheService = new PDFCacheService()
  }
  return cacheService
}