import { useState, useEffect } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface SiteAnalysis {
  domain: string
  technologies: {
    frontend: string[]
    backend: string[]
    cms: string[]
    analytics: string[]
    hosting: string[]
    security: string[]
  }
  metadata: any
  siteType: string
  confidence: number
}

interface SessionData {
  id: string
  domain: string
  status: string
  phase?: string
  company_name?: string
  merged_data?: {
    site_analysis?: SiteAnalysis
    pages?: any
    extractedData?: any
    stats?: any
  }
  created_at?: string
  updated_at?: string
}

interface UseSessionDataReturn {
  data: SessionData | null
  loading: boolean
  error: string | null
  siteAnalysis: SiteAnalysis | null
  refetch: () => void
}

export function useSessionData(sessionId: string | null): UseSessionDataReturn {
  const [data, setData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessionData = async () => {
    // Properly handle null, undefined, and the string "undefined"
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/company-intelligence/sessions/${sessionId}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`)
      }

      const responseData = await response.json()

      // The API returns { session, logs } structure
      const sessionData = responseData.session || responseData

      permanentLogger.info('USE_SESSION_DATA', 'Session data loaded', {
        sessionId,
        hasSiteAnalysis: !!sessionData.merged_data?.site_analysis,
        frontendTechnologies: sessionData.merged_data?.site_analysis?.technologies?.frontend || [],
        backendTechnologies: sessionData.merged_data?.site_analysis?.technologies?.backend || []
      })

      setData(sessionData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session data'
      permanentLogger.captureError('USE_SESSION_DATA', err as Error, { sessionId })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on mount or when sessionId changes
  useEffect(() => {
    fetchSessionData()
  }, [sessionId])

  // Extract site analysis for convenience
  const siteAnalysis = data?.merged_data?.site_analysis || null

  return {
    data,
    loading,
    error,
    siteAnalysis,
    refetch: fetchSessionData
  }
}