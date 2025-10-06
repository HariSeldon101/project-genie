/**
 * Performance Optimization Utilities
 * CLAUDE.md Compliant - Debouncing, Lazy Loading, and Performance Hooks
 * Provides optimized utilities for better application performance
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Debounce hook for optimizing expensive operations
 * Delays execution until after wait milliseconds have passed since last call
 * 
 * @template T - Function type to debounce
 * @param {T} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {T} Debounced function
 * 
 * @example
 * ```tsx
 * const debouncedSearch = useDebounce((query: string) => {
 *   searchAPI(query)
 * }, 500)
 * ```
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)
  
  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        permanentLogger.breadcrumb('debounced_execution', 'Executing debounced function', {
          delay,
          argsCount: args.length
        })
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  ) as T
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return debouncedCallback
}

/**
 * Throttle hook for rate-limiting function calls
 * Ensures function is called at most once per specified interval
 * 
 * @template T - Function type to throttle
 * @param {T} callback - Function to throttle
 * @param {number} limit - Minimum interval between calls in milliseconds
 * @returns {T} Throttled function
 * 
 * @example
 * ```tsx
 * const throttledScroll = useThrottle((event) => {
 *   handleScroll(event)
 * }, 100)
 * ```
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T {
  const inThrottle = useRef(false)
  const lastArgs = useRef<any[]>([])
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  
  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      lastArgs.current = args
      
      if (!inThrottle.current) {
        inThrottle.current = true
        
        permanentLogger.breadcrumb('throttled_execution', 'Executing throttled function', {
          limit
        })
        
        callbackRef.current(...args)
        
        setTimeout(() => {
          inThrottle.current = false
          // Execute with latest args if called during throttle
          if (lastArgs.current.length > 0) {
            callbackRef.current(...lastArgs.current)
            lastArgs.current = []
          }
        }, limit)
      }
    },
    [limit]
  ) as T
  
  return throttledCallback
}

/**
 * Lazy loading hook with IntersectionObserver
 * Detects when element enters viewport for lazy loading
 * 
 * @param {Object} options - IntersectionObserver options
 * @returns {[React.RefObject, boolean]} Ref to attach and visibility state
 * 
 * @example
 * ```tsx
 * const [ref, isVisible] = useLazyLoad({ threshold: 0.1 })
 * 
 * return (
 *   <div ref={ref}>
 *     {isVisible && <ExpensiveComponent />}
 *   </div>
 * )
 * ```
 */
export function useLazyLoad(
  options: IntersectionObserverInit = { threshold: 0.1 }
): [React.RefObject<HTMLElement>, boolean] {
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  
  useEffect(() => {
    if (!elementRef.current) return
    
    // Create observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          
          permanentLogger.breadcrumb('lazy_load_triggered', 'Element became visible', {
            threshold: options.threshold
          })
          
          // Disconnect after first visibility (one-time lazy load)
          observerRef.current?.disconnect()
        }
      },
      options
    )
    
    // Start observing
    observerRef.current.observe(elementRef.current)
    
    // Cleanup
    return () => {
      observerRef.current?.disconnect()
    }
  }, [options.threshold, options.root, options.rootMargin])
  
  return [elementRef as React.RefObject<HTMLElement>, isVisible]
}

/**
 * Virtual scrolling hook for large lists
 * Only renders visible items for performance
 * 
 * @template T - Item type
 * @param {T[]} items - Array of items to render
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} containerHeight - Height of container in pixels
 * @param {number} overscan - Number of items to render outside viewport
 * @returns {Object} Virtual scrolling state and handlers
 * 
 * @example
 * ```tsx
 * const virtual = useVirtualScroll(items, 50, 500, 3)
 * 
 * return (
 *   <div style={{ height: virtual.totalHeight }} onScroll={virtual.handleScroll}>
 *     {virtual.visibleItems.map(item => (
 *       <div key={item.id} style={virtual.getItemStyle(item.index)}>
 *         {item.content}
 *       </div>
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 3
) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const virtualState = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    
    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, idx) => ({
      ...item,
      index: startIndex + idx
    }))
    
    permanentLogger.breadcrumb('virtual_scroll_update', 'Virtual scroll state updated', {
      totalItems: items.length,
      visibleCount: visibleItems.length,
      startIndex,
      endIndex
    })
    
    return {
      visibleItems,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }, [items, itemHeight, containerHeight, overscan, scrollTop])
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])
  
  const getItemStyle = useCallback((index: number): React.CSSProperties => ({
    position: 'absolute',
    top: index * itemHeight,
    height: itemHeight,
    width: '100%'
  }), [itemHeight])
  
  return {
    ...virtualState,
    handleScroll,
    getItemStyle
  }
}

/**
 * Memoized search hook with debouncing
 * Optimizes search operations with caching and debouncing
 * 
 * @template T - Item type
 * @param {T[]} items - Items to search
 * @param {string} searchTerm - Search query
 * @param {Function} searchFn - Search function
 * @param {number} debounceMs - Debounce delay
 * @returns {T[]} Filtered results
 * 
 * @example
 * ```tsx
 * const results = useMemoizedSearch(
 *   items,
 *   query,
 *   (item, term) => item.name.includes(term),
 *   300
 * )
 * ```
 */
export function useMemoizedSearch<T>(
  items: T[],
  searchTerm: string,
  searchFn: (item: T, term: string) => boolean,
  debounceMs = 300
): T[] {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm)
  const cache = useRef(new Map<string, T[]>())
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, debounceMs)
    
    return () => clearTimeout(timer)
  }, [searchTerm, debounceMs])
  
  // Memoize search results
  const results = useMemo(() => {
    if (!debouncedTerm) return items
    
    // Check cache
    const cached = cache.current.get(debouncedTerm)
    if (cached) {
      permanentLogger.breadcrumb('search_cache_hit', 'Using cached search results', {
        term: debouncedTerm,
        resultCount: cached.length
      })
      return cached
    }
    
    // Perform search
    const timer = permanentLogger.timing('search_execution', {
      term: debouncedTerm,
      itemCount: items.length
    })
    
    const filtered = items.filter(item => searchFn(item, debouncedTerm))
    
    timer.stop()
    
    // Cache results
    cache.current.set(debouncedTerm, filtered)
    
    // Limit cache size
    if (cache.current.size > 50) {
      const firstKey = cache.current.keys().next().value
      cache.current.delete(firstKey)
    }
    
    permanentLogger.info('SEARCH_UTIL', 'Search completed', {
      term: debouncedTerm,
      resultCount: filtered.length,
      cacheSize: cache.current.size
    })
    
    return filtered
  }, [items, debouncedTerm, searchFn])
  
  return results
}

/**
 * Batch processing hook for handling large operations
 * Processes items in chunks to avoid blocking UI
 * 
 * @template T - Item type
 * @template R - Result type
 * @param {T[]} items - Items to process
 * @param {Function} processFn - Processing function
 * @param {number} batchSize - Items per batch
 * @returns {Object} Batch processing state and controls
 * 
 * @example
 * ```tsx
 * const batch = useBatchProcess(
 *   largeArray,
 *   async (item) => await processItem(item),
 *   50
 * )
 * 
 * useEffect(() => {
 *   batch.start()
 * }, [])
 * ```
 */
export function useBatchProcess<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  batchSize = 10
) {
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<R[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef(false)
  
  const processBatch = useCallback(async () => {
    setIsProcessing(true)
    setError(null)
    setResults([])
    setProgress(0)
    abortRef.current = false
    
    const timer = permanentLogger.timing('batch_processing', {
      totalItems: items.length,
      batchSize
    })
    
    try {
      const allResults: R[] = []
      
      for (let i = 0; i < items.length; i += batchSize) {
        if (abortRef.current) {
          permanentLogger.info('BATCH_PROCESS', 'Batch processing aborted', {
            processed: i,
            total: items.length
          })
          break
        }
        
        const batch = items.slice(i, i + batchSize)
        const batchResults = await Promise.all(batch.map(processFn))
        allResults.push(...batchResults)
        
        const currentProgress = Math.round(((i + batch.length) / items.length) * 100)
        setProgress(currentProgress)
        setResults([...allResults])
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      
      timer.stop()
      
      permanentLogger.info('BATCH_PROCESS', 'Batch processing completed', {
        processedCount: allResults.length,
        totalItems: items.length
      })
      
    } catch (err) {
      timer.stop()
      const error = err as Error
      setError(error)
      permanentLogger.captureError('BATCH_PROCESS', error, {
        context: 'Batch processing failed'
      })
    } finally {
      setIsProcessing(false)
    }
  }, [items, processFn, batchSize])
  
  const abort = useCallback(() => {
    abortRef.current = true
  }, [])
  
  return {
    progress,
    results,
    isProcessing,
    error,
    start: processBatch,
    abort
  }
}

/**
 * Image lazy loading hook with placeholder
 * Loads images when they enter viewport with loading state
 * 
 * @param {string} src - Image source URL
 * @param {string} placeholder - Placeholder image URL
 * @returns {Object} Image loading state
 * 
 * @example
 * ```tsx
 * const image = useImageLazyLoad(highResSrc, placeholderSrc)
 * 
 * return (
 *   <img 
 *     ref={image.ref}
 *     src={image.src}
 *     className={image.isLoading ? 'blur' : ''}
 *   />
 * )
 * ```
 */
export function useImageLazyLoad(
  src: string,
  placeholder?: string
) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [ref, isVisible] = useLazyLoad({ threshold: 0.01 })
  
  useEffect(() => {
    if (!isVisible || !src) return
    
    setIsLoading(true)
    const img = new Image()
    
    img.onload = () => {
      setImageSrc(src)
      setIsLoading(false)
      permanentLogger.breadcrumb('image_loaded', 'Image lazy loaded successfully', {
        src
      })
    }
    
    img.onerror = () => {
      const error = new Error(`Failed to load image: ${src}`)
      setError(error)
      setIsLoading(false)
      permanentLogger.captureError('IMAGE_LAZY_LOAD', error, {
        src
      })
    }
    
    img.src = src
  }, [isVisible, src])

  return {
    ref,
    src: imageSrc,
    isLoading,
    error,
    isVisible
  }
}

/**
 * ADDED: 2025-09-29T09:05:00Z
 * Export for value debouncing (as opposed to function debouncing)
 *
 * IMPORTANT: This re-exports from the industry-standard use-debounce library
 * which was installed to fix the missing import error.
 *
 * USAGE for VALUE debouncing (what site-analyzer needs):
 * ```typescript
 * import { useDebouncedValue } from '@/lib/utils/ui-performance-utils'
 * const [debouncedValue] = useDebouncedValue(inputValue, 300)
 * ```
 *
 * USAGE for FUNCTION debouncing (original useDebounce in this file):
 * ```typescript
 * import { useDebounce } from '@/lib/utils/ui-performance-utils'
 * const debouncedSearch = useDebounce((query) => search(query), 500)
 * ```
 *
 * The distinction is important:
 * - useDebouncedValue: Debounces a VALUE (returns [debouncedValue, cancel])
 * - useDebounce: Debounces a FUNCTION (returns debounced function)
 *
 * @since 2025-09-29 - Added to fix site-analyzer import issue
 */
export { useDebounce as useDebouncedValue } from 'use-debounce'

/**
 * PerformanceMonitor class for tracking operation timings
 * Simple timer wrapper for kanban integration
 *
 * ADDED: 2025-10-01 - For intelligence-kanban integration
 *
 * @example
 * ```typescript
 * const monitor = new PerformanceMonitor()
 * monitor.start('render')
 * // ... operation ...
 * const duration = monitor.end('render')
 * console.log(`Render took ${duration}ms`)
 * ```
 */
export class PerformanceMonitor {
  private timers: Map<string, number> = new Map()

  /**
   * Start timing an operation
   */
  start(label: string): void {
    this.timers.set(label, performance.now())
    permanentLogger.breadcrumb('perf_monitor_start', `Performance monitoring started: ${label}`)
  }

  /**
   * End timing an operation and return duration
   * @returns Duration in milliseconds
   */
  end(label: string): number {
    const startTime = this.timers.get(label)
    if (!startTime) {
      permanentLogger.warn('PERF_MONITOR', `No start time found for label: ${label}`)
      return 0
    }

    const duration = performance.now() - startTime
    this.timers.delete(label)

    permanentLogger.breadcrumb('perf_monitor_end', `Performance monitored: ${label}`, {
      duration: `${duration.toFixed(2)}ms`
    })

    return duration
  }

  /**
   * Clear all timers
   */
  clear(): void {
    this.timers.clear()
  }

  /**
   * Get all active timers (for debugging)
   */
  getActiveTimers(): string[] {
    return Array.from(this.timers.keys())
  }
}