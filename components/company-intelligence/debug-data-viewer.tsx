'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, Copy, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { cn } from '@/lib/utils'
import { EnvironmentConfig } from '@/lib/config/environment'

interface DebugDataViewerProps {
  sessionId: string
}

interface DebugData {
  raw?: any
  static?: {
    pageCount: number
    dataPoints: number
    links: number
  }
  dynamic?: {
    pageCount: number
    dataPoints: number
    links: number
  }
  pages?: Record<string, any>
  links?: Array<{
    url: string
    type: string
    scraper: string
    source: string
  }>
  totalLinks?: number
  errors?: Array<{
    url: string
    scraper: string
    message: string
  }>
  contactInfo?: {
    emails?: string[]
    phones?: string[]
    addresses?: string[]
  }
  socialLinks?: Record<string, string>
  technologies?: string[]
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string | number
}

function CollapsibleSection({ title, children, defaultOpen = false, badge }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border rounded-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          {badge !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && (
        <div className="p-4 border-t">
          {children}
        </div>
      )}
    </div>
  )
}

export function DebugDataViewer({ sessionId }: DebugDataViewerProps) {
  const [data, setData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (sessionId) {
      fetchSessionData()
    }
  }, [sessionId])

  const fetchSessionData = async () => {
    // Validate sessionId before proceeding
    if (!sessionId) {
      setError('No session ID available')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch session data from API endpoint
      const response = await fetch(`/api/company-intelligence/sessions/${sessionId}`, {
        credentials: 'include'  // Include auth cookies
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session not found')
        } else if (response.status === 401) {
          throw new Error('Unauthorized - please log in')
        }
        throw new Error(`Failed to fetch session: ${response.statusText}`)
      }

      const data = await response.json()

      // Extract merged_data from the API response
      const mergedData = data.session?.merged_data || data.merged_data

      if (!mergedData) {
        setData(null)
        return
      }

      // Process the data for display
      const processedData: DebugData = {
        raw: mergedData,
        pages: mergedData.pages || {},
        static: {
          pageCount: 0,
          dataPoints: 0,
          links: 0
        },
        dynamic: {
          pageCount: 0,
          dataPoints: 0,
          links: 0
        },
        links: [],
        errors: [],
        contactInfo: {
          emails: [],
          phones: [],
          addresses: []
        },
        socialLinks: {},
        technologies: []
      }

      // Count static vs dynamic data
      Object.entries(mergedData.pages || {}).forEach(([url, page]: [string, any]) => {
        const scraper = page.phase || page.scraper || 'unknown'

        if (scraper === 'static' || scraper === 'phase1') {
          processedData.static!.pageCount++
          processedData.static!.dataPoints += countDataPoints(page)
          processedData.static!.links += (page.discoveredLinks?.length || 0) + (page.links?.length || 0)
        } else if (scraper === 'dynamic' || scraper === 'phase2' || scraper === 'playwright') {
          processedData.dynamic!.pageCount++
          processedData.dynamic!.dataPoints += countDataPoints(page)
          processedData.dynamic!.links += (page.discoveredLinks?.length || 0) + (page.links?.length || 0)
        }

        // Collect links
        if (page.discoveredLinks) {
          page.discoveredLinks.forEach((link: any) => {
            processedData.links!.push({
              url: typeof link === 'string' ? link : link.url,
              type: link.type || 'internal',
              scraper,
              source: url
            })
          })
        }

        // Collect errors
        if (page.error) {
          processedData.errors!.push({
            url,
            scraper,
            message: page.error
          })
        }

        // Aggregate contact info
        if (page.contactInfo) {
          if (page.contactInfo.emails) {
            processedData.contactInfo!.emails!.push(...page.contactInfo.emails)
          }
          if (page.contactInfo.phones) {
            processedData.contactInfo!.phones!.push(...page.contactInfo.phones)
          }
          if (page.contactInfo.addresses) {
            processedData.contactInfo!.addresses!.push(...page.contactInfo.addresses)
          }
        }

        // Aggregate social links
        if (page.socialLinks) {
          Object.assign(processedData.socialLinks!, page.socialLinks)
        }

        // Aggregate technologies
        if (page.technologies) {
          processedData.technologies!.push(...page.technologies)
        }
      })

      // Deduplicate arrays
      processedData.contactInfo!.emails = [...new Set(processedData.contactInfo!.emails)]
      processedData.contactInfo!.phones = [...new Set(processedData.contactInfo!.phones)]
      processedData.contactInfo!.addresses = [...new Set(processedData.contactInfo!.addresses)]
      processedData.technologies = [...new Set(processedData.technologies)]
      processedData.totalLinks = processedData.links!.length

      setData(processedData)
      permanentLogger.info('Session data loaded successfully', { category: 'DEBUG_VIEWER', sessionId,
        pageCount: Object.keys(processedData.pages || { }).length,
        linkCount: processedData.totalLinks || 0,
        errorCount: processedData.errors?.length || 0
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch session data'
      permanentLogger.captureError('DEBUG_VIEWER_ERROR', err as Error, {
        sessionId,
        error: errorMessage
      })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const countDataPoints = (page: any): number => {
    let count = 0
    if (page.title) count++
    if (page.description) count++
    if (page.content) count++
    if (page.textContent) count++
    if (page.structuredData) count += Object.keys(page.structuredData).length
    if (page.technologies?.length) count += page.technologies.length
    if (page.apiEndpoints?.length) count += page.apiEndpoints.length
    if (page.contactInfo) {
      count += (page.contactInfo.emails?.length || 0) +
               (page.contactInfo.phones?.length || 0) +
               (page.contactInfo.addresses?.length || 0)
    }
    if (page.socialLinks) count += Object.keys(page.socialLinks).length
    if (page.forms?.length) count += page.forms.length * 2
    if (page.images?.length) count += page.images.length
    if (page.discoveredLinks?.length) count += page.discoveredLinks.length
    return count
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Only show in development mode - use proper environment detection (NO HACKS!)
  // This replaces the old localhost hack with proper Next.js environment configuration
  if (!EnvironmentConfig.shouldShowDebugUI()) {
    return null
  }

  if (loading) {
    return (
      <div className="mt-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <p className="text-center text-muted-foreground">Loading debug data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8 p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
        <p className="text-center text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mt-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <p className="text-center text-muted-foreground">No debug data available</p>
      </div>
    )
  }

  return (
    <div className="mt-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        🔧 Debug Data Viewer (Dev Mode)
        <Badge variant="outline" className="text-xs">
          Session: {sessionId.slice(0, 8)}...
        </Badge>
      </h3>

      {/* Extraction Summary */}
      <CollapsibleSection
        title="📊 Extraction Summary"
        defaultOpen={true}
      >
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Static Scraper</h4>
            <p className="text-sm">Pages: {data.static?.pageCount || 0}</p>
            <p className="text-sm">Data Points: {data.static?.dataPoints || 0}</p>
            <p className="text-sm">Links: {data.static?.links || 0}</p>
            <p className="text-xs text-gray-500 mt-1">
              Stored in: merged_data.pages[url].*
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Dynamic Scraper</h4>
            <p className="text-sm">Pages: {data.dynamic?.pageCount || 0}</p>
            <p className="text-sm">Data Points: {data.dynamic?.dataPoints || 0}</p>
            <p className="text-sm">Links: {data.dynamic?.links || 0}</p>
            <p className="text-xs text-gray-500 mt-1">
              Stored in: merged_data.pages[url].*
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Database</h4>
            <p className="text-xs">
              Table: company_intelligence_sessions<br />
              Column: merged_data (JSONB)<br />
              Session: {sessionId.slice(0, 8)}...
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Discovered Links */}
      <CollapsibleSection
        title="🔗 Discovered Links"
        badge={data.totalLinks || 0}
      >
        <div className="space-y-2 max-h-96 overflow-auto">
          {data.links?.slice(0, 50).map((link, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Badge variant={link.type === 'internal' ? 'default' : 'secondary'} className="text-xs">
                {link.type}
              </Badge>
              <span className="font-mono text-xs truncate flex-1">{link.url}</span>
              <span className="text-gray-500 text-xs">
                via {link.scraper} → merged_data.pages["{link.source}"].discoveredLinks
              </span>
            </div>
          ))}
          {(data.links?.length || 0) > 50 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Showing first 50 of {data.links?.length} links
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* Extracted Content */}
      <CollapsibleSection
        title="📝 Extracted Content"
        badge={Object.keys(data.pages || {}).length}
      >
        <div className="space-y-4 max-h-96 overflow-auto">
          {Object.entries(data.pages || {}).slice(0, 20).map(([url, page]) => (
            <div key={url} className="border-l-2 pl-4">
              <p className="font-semibold text-sm truncate">{url}</p>
              <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                <div>Title: {page.title || '(empty)'}</div>
                <div>Scraper: {page.phase || page.scraper || 'unknown'}</div>
                <div>Description: {(page.description || '').substring(0, 100)}...</div>
                <div className="text-gray-500">
                  → merged_data.pages["{url}"].title/description
                </div>
              </div>
            </div>
          ))}
          {Object.keys(data.pages || {}).length > 20 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Showing first 20 of {Object.keys(data.pages || {}).length} pages
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* Company Data */}
      <CollapsibleSection
        title="🏢 Company Data"
      >
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <h5 className="font-semibold mb-2">Contact Info</h5>
            <p>Emails: {data.contactInfo?.emails?.length || 0}</p>
            <p>Phones: {data.contactInfo?.phones?.length || 0}</p>
            <p>Addresses: {data.contactInfo?.addresses?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-1">
              → merged_data.pages[url].contactInfo
            </p>
          </div>
          <div>
            <h5 className="font-semibold mb-2">Social Links</h5>
            {Object.entries(data.socialLinks || {}).map(([platform, url]) => (
              <p key={platform} className="text-xs truncate">
                {platform}: {url}
              </p>
            ))}
            <p className="text-xs text-gray-500 mt-1">
              → merged_data.pages[url].socialLinks
            </p>
          </div>
          <div>
            <h5 className="font-semibold mb-2">Technologies</h5>
            <div className="flex flex-wrap gap-1">
              {data.technologies?.slice(0, 10).map(tech => (
                <Badge key={tech} variant="outline" className="text-xs">
                  {tech}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              → merged_data.pages[url].technologies
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Errors & Failures */}
      <CollapsibleSection
        title="🔴 Errors & Failures"
        defaultOpen={data.errors && data.errors.length > 0}
        badge={data.errors?.length || 0}
      >
        <div className="space-y-2 max-h-96 overflow-auto">
          {data.errors?.map((error, i) => (
            <div key={i} className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
              <p className="font-semibold text-red-600 dark:text-red-400 text-sm">
                {error.url} - {error.scraper}
              </p>
              <pre className="text-xs mt-1 overflow-x-auto whitespace-pre-wrap">
                {error.message}
              </pre>
              <p className="text-xs text-gray-500 mt-1">
                → merged_data.pages["{error.url}"].error
              </p>
            </div>
          ))}
          {!data.errors?.length && (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✅ No errors detected
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* Raw Database View */}
      <CollapsibleSection
        title="📊 Raw Database View"
      >
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2 z-10"
            onClick={() => copyToClipboard(JSON.stringify(data.raw, null, 2))}
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                Copy JSON
              </>
            )}
          </Button>
          <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-96 text-xs">
            {JSON.stringify(data.raw || {}, null, 2)}
          </pre>
        </div>
      </CollapsibleSection>
    </div>
  )
}