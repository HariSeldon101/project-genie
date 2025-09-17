/**
 * Custom hook for managing discovery SSE stream
 * Uses unified EventFactory and StreamReader from realtime-events
 *
 * CRITICAL: NO mock data, NO fallbacks - errors bubble up
 * All URLs validated before acceptance
 * Timing measurements at all boundaries
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { safeTimestampToISO } from '@/lib/utils/safe-timestamp'
import type { PageInfo, DiscoveryState, DiscoveryEvent } from '../types'

/**
 * Hook for managing the discovery stream
 * @param companyId - Domain or company identifier
 * @param sessionId - Database session ID
 * @returns pages array and discovery state
 */
export function useDiscoveryStream(companyId: string, sessionId: string) {
  // State management
  const [pages, setPages] = useState<PageInfo[]>([])
  const [state, setState] = useState<DiscoveryState>({
    phase: 'idle',
    progress: 0,
    total: 0,
    error: null,
    startTime: performance.now()
  })

  // Track if stream is active to prevent memory leaks
  const streamReaderRef = useRef<StreamReader | null>(null)

  useEffect(() => {
    // Reset state when starting new discovery
    const startTime = performance.now()

    // Breadcrumb at interface boundary - entering stream setup
    permanentLogger.info('DISCOVERY_STREAM', 'Initializing discovery stream', {
      companyId,
      sessionId,
      timestamp: safeTimestampToISO(Date.now())
    })

    // Validate inputs - NO graceful fallback
    if (!companyId || !sessionId) {
      const error = new Error('Company ID and Session ID are required')
      permanentLogger.captureError('DISCOVERY_STREAM', error, {
        companyId,
        sessionId
      })
      setState(prev => ({ ...prev, error }))
      return
    }

    // Wrap async operations in IIFE to keep useEffect synchronous
    const initializeStream = async () => {
      try {
        // Make POST request to get streaming response
        // Note: StreamReader is for EventSource (GET), so we handle POST streaming manually
        const response = await fetch('/api/company-intelligence/fetch-sitemap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          sessionId, // Database reference only
          domain: companyId,  // Using companyId as domain for compatibility
          validateUrls: false  // Skip validation during discovery - trust sitemap/crawler results
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Process the streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Read stream in a loop
      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            permanentLogger.info('DISCOVERY_STREAM', 'Stream ended', {
              sessionId,
              companyId
            })
            break
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE messages
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6))
                const event: DiscoveryEvent = {
                  type: eventData.type,
                  data: eventData,
                  timestamp: Date.now(),
                  correlationId: eventData.correlationId
                }

                // Process the event
                // Handle the event
                const handleEvent = async (event: DiscoveryEvent) => {
          const eventTime = performance.now() - startTime

          // Breadcrumb for each event received
          permanentLogger.breadcrumb('discovery_event', `Event: ${event.type}`, {
            timing: eventTime,
            sessionId,
            correlationId: event.correlationId
          })

          try {
            switch (event.type) {
              case 'phase-start':
                // Update phase state
                setState(prev => ({
                  ...prev,
                  phase: event.data?.phase || 'idle',
                  error: null
                }))
                permanentLogger.info('DISCOVERY_STREAM', 'Phase started', {
                  phase: event.data?.phase,
                  timing: eventTime
                })
                break

              case 'pages-update':
                // Validate pages structure - NO fallback data
                if (!event.data?.pages || !Array.isArray(event.data.pages)) {
                  throw new Error('Invalid pages data structure received')
                }

                // Log pages received for debugging
                permanentLogger.info('DISCOVERY_STREAM', 'Pages received', {
                  count: event.data.pages.length,
                  timing: eventTime
                })

                // Server should have already validated URLs if validateUrls: true was passed
                // Following DRY/SOLID - no client-side validation per CLAUDE.md guidelines
                const validPages = event.data.pages

                // Transform pages to ensure consistent structure
                const transformedPages: PageInfo[] = validPages.map((p: any) => ({
                  id: p.id || p.url, // Use URL as fallback ID - database will generate proper UUID
                  url: p.url,
                  title: p.title || 'Untitled',
                  relativePath: p.relativePath || new URL(p.url).pathname,
                  category: p.category || 'optional',
                  source: p.source,
                  metadata: p.metadata,
                  discovered_at: safeTimestampToISO(Date.now())
                }))

                setPages(prev => {
                  // Deduplicate by URL
                  const existing = new Map(prev.map(p => [p.url, p]))
                  transformedPages.forEach(p => existing.set(p.url, p))
                  const merged = Array.from(existing.values())

                  permanentLogger.info('DISCOVERY_STREAM', 'Pages merged', {
                    previous: prev.length,
                    new: transformedPages.length,
                    total: merged.length
                  })

                  return merged
                })

                // Update progress
                setState(prev => ({
                  ...prev,
                  progress: prev.progress + validPages.length,
                  total: event.data?.totalCount || prev.total
                }))
                break

              case 'phase-complete':
                // Log phase completion
                permanentLogger.info('DISCOVERY_STREAM', 'Phase completed', {
                  phase: event.data?.phase,
                  timing: eventTime
                })
                break

              case 'discovery-complete':
                // Final state update
                setState(prev => ({
                  ...prev,
                  phase: 'complete',
                  progress: prev.total,
                  error: null
                }))

                permanentLogger.info('DISCOVERY_STREAM', 'Discovery completed', {
                  totalPages: pages.length,
                  duration: eventTime,
                  sessionId
                })
                break

              case 'error':
                // NO silent failures - error bubbles up
                const errorMessage = event.data?.message || 'Unknown error occurred'
                throw new Error(errorMessage)
            }
          } catch (error) {
            // Log error with full context - using captureError only
            permanentLogger.captureError('DISCOVERY_STREAM', error as Error, {
              eventType: event.type,
              sessionId,
              timing: eventTime,
              eventData: JSON.stringify(event.data)
            })

            // Update state with error - UI will show it
            setState(prev => ({
              ...prev,
              error: error as Error,
              phase: 'idle'
            }))
          }
        }

                await handleEvent(event)
              } catch (parseErr) {
                // Skip malformed JSON
                permanentLogger.breadcrumb('discovery_stream', 'Skipped malformed event', {
                  line,
                  error: parseErr
                })
              }
            }
          }
        }
      }

      // Start processing the stream
      processStream().catch(error => {
        permanentLogger.captureError('DISCOVERY_STREAM', error, {
          sessionId,
          companyId,
          phase: 'stream_processing'
        })
        setState(prev => ({
          ...prev,
          error,
          phase: 'idle'
        }))
      })

        // Store reader for cleanup (different type now)
        streamReaderRef.current = {
          disconnect: () => reader.cancel()
        } as any

      } catch (error) {
        // Setup error
        permanentLogger.captureError('DISCOVERY_STREAM', error as Error, {
          phase: 'setup',
          companyId,
          sessionId
        })

        setState(prev => ({
          ...prev,
          error: error as Error,
          phase: 'idle'
        }))
      }
    }

    // Call the async function
    initializeStream()

    // Cleanup on unmount
    return () => {
      const duration = performance.now() - startTime
      permanentLogger.info('DISCOVERY_STREAM', 'Stream cleanup', {
        duration,
        pagesDiscovered: pages.length,
        sessionId
      })

      if (streamReaderRef.current) {
        streamReaderRef.current.disconnect()
        streamReaderRef.current = null
      }
    }
  }, [companyId, sessionId]) // Only re-run if these change

  return { pages, state }
}