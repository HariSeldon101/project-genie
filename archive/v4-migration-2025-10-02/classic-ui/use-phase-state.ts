/**
 * @deprecated ARCHIVED 2025-10-02
 * This hook is part of the legacy Classic UI (PhaseControls).
 * Replaced by V4 ScrapingDashboard architecture.
 * 
 * @see archive/v4-migration-2025-10-02/MIGRATION_NOTES.md
 * Original: components/company-intelligence/hooks/use-phase-state.ts
 */
import { useState, useCallback, useRef } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { Stage } from './use-stage-navigation'

/**
 * Centralized state management for phase data
 * Server handles all session management - client only tracks domain
 */
export function usePhaseState() {
  const [domain, setDomain] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)  // Reference only, not for management
  const [stageData, setStageData] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  // Track data changes for debugging
  const dataHistory = useRef<Array<{ timestamp: string, stage: string, action: string, data: any }>>([])

  // Request deduplication - prevents race conditions from multiple concurrent calls
  const fetchSessionPromiseRef = useRef<Promise<any> | null>(null)

  // Sliding window configuration
  const MAX_STAGES_IN_MEMORY = 2 // Keep only 2 stages in memory at once

  /**
   * Initialize domain for phase operations
   * Server automatically manages sessions based on domain + authenticated user
   */
  const initializeDomain = useCallback((newDomain: string) => {
    permanentLogger.info('PHASE_STATE', 'Initializing domain', { domain: newDomain })

    if (!newDomain) {
      throw new Error('Domain is required')
    }

    setDomain(newDomain)

    // Clear any existing stage data when domain changes
    if (newDomain !== domain) {
      setStageData({})
      setSessionId(null)  // Clear reference sessionId
    }

    permanentLogger.info('Domain initialized', {
      category: 'PHASE_STATE',
      domain: newDomain
    })
  }, [domain])

  /**
   * Fetch or create session from server
   * Called after domain is set to get the sessionId
   * INCLUDES REQUEST DEDUPLICATION to prevent race conditions
   */
  const fetchSession = useCallback(async (domain: string) => {
    if (!domain) {
      throw new Error('Domain is required to fetch session')
    }

    // REQUEST DEDUPLICATION: If already fetching, return existing promise
    if (fetchSessionPromiseRef.current) {
      permanentLogger.info('PHASE_STATE', 'Returning existing fetch promise (deduplication)', { domain })
      return fetchSessionPromiseRef.current
    }

    // Create new promise and store it to prevent concurrent calls
    fetchSessionPromiseRef.current = (async () => {
      try {
        permanentLogger.info('PHASE_STATE', 'Fetching session from server', { domain })

        const response = await fetch('/api/company-intelligence/sessions/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include auth cookies
          body: JSON.stringify({ domain })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to initialize session')
        }

        const result = await response.json()

        // Store the sessionId
        setSessionId(result.sessionId)

        permanentLogger.info('PHASE_STATE', 'Session fetched successfully', {
          sessionId: result.sessionId,
          domain: result.domain,
          isNew: result.isNew,
          phase: result.phase
        })

        return result

      } catch (error) {
        permanentLogger.captureError('PHASE_STATE', error as Error, {
          action: 'fetchSession',
          domain
        })
        throw error
      } finally {
        // Clear the promise ref after completion (success or failure)
        fetchSessionPromiseRef.current = null
      }
    })()

    return fetchSessionPromiseRef.current
  }, [])

  /**
   * Store data for a specific stage
   */
  const setStageDataForStage = useCallback((stage: Stage, data: any) => {
    permanentLogger.info('Setting stage data', {
      category: 'PHASE_STATE',
      stage,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      dataSize: JSON.stringify(data || {}).length
    })
    
    // Track in history
    dataHistory.current.push({
      timestamp: new Date().toISOString(),
      stage,
      action: 'set',
      data: { keys: data ? Object.keys(data) : [], size: JSON.stringify(data || {}).length }
    })
    
    // Keep only last 20 history entries
    if (dataHistory.current.length > 20) {
      dataHistory.current.shift()
    }
    
    setStageData(prev => {
      const newData = { ...prev, [stage]: data }

      // Implement sliding window - keep only MAX_STAGES_IN_MEMORY most recent stages
      const stageKeys = Object.keys(newData)
        .filter(key => newData[key]) // Only count stages with data
        .sort((a, b) => {
          // Sort by stage number (stage1, stage2, etc.)
          const numA = parseInt(a.replace(/\D/g, '') || '0')
          const numB = parseInt(b.replace(/\D/g, '') || '0')
          return numA - numB
        })

      // If we exceed max stages, remove oldest ones
      if (stageKeys.length > MAX_STAGES_IN_MEMORY) {
        const stagesToRemove = stageKeys.slice(0, stageKeys.length - MAX_STAGES_IN_MEMORY)

        permanentLogger.info('PHASE_STATE', 'Sliding window cleanup', {
          stagesToRemove,
          keptStages: stageKeys.slice(-MAX_STAGES_IN_MEMORY),
          totalStages: stageKeys.length
        })

        // Remove old stages from memory
        for (const stageToRemove of stagesToRemove) {
          delete newData[stageToRemove]
        }
      }

      permanentLogger.info('Stage data updated', {
        category: 'PHASE_STATE',
        stage,
        previousKeys: Object.keys(prev),
        newKeys: Object.keys(newData),
        totalStagesWithData: Object.keys(newData).filter(k => newData[k]).length,
        memorySizeEstimate: JSON.stringify(newData).length
      })

      // NO sessionStorage - data persists to DB only

      return newData
    })
  }, [sessionId])

  /**
   * Get data for a specific stage
   */
  const getStageData = useCallback<(stage: Stage) => any | undefined>((stage: Stage) => {
    const data = stageData[stage]
    
    permanentLogger.info('Getting stage data', {
      category: 'PHASE_STATE',
      stage,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : []
    })
    
    return data
  }, [stageData])

  /**
   * Clear data for a specific stage
   */
  const clearStageData = useCallback((stage: Stage) => {
    permanentLogger.info('PHASE_STATE', 'Clearing stage data', { stage})
    
    // Track in history
    dataHistory.current.push({
      timestamp: new Date().toISOString(),
      stage,
      action: 'clear',
      data: null
    })
    
    setStageData(prev => {
      const newData = { ...prev }
      delete newData[stage]
      
      permanentLogger.info('Stage data cleared', {
        category: 'PHASE_STATE',
        stage,
        remainingStages: Object.keys(newData)
      })
      
      return newData
    })
  }, [])

  /**
   * Clear all stage data
   */
  const clearAllStageData = useCallback(() => {
    permanentLogger.info('Clearing all stage data', {
      category: 'PHASE_STATE',
      previousStages: Object.keys(stageData)
    })
    
    // Track in history
    dataHistory.current.push({
      timestamp: new Date().toISOString(),
      stage: 'all',
      action: 'clear-all',
      data: null
    })
    
    setStageData({})

    // NO sessionStorage to clear - memory only
  }, [sessionId, stageData])

  /**
   * Execute a phase operation
   * Server automatically manages sessions based on domain
   */
  const executePhase = useCallback(async (phase: string, params: any = {}) => {
    if (!domain) {
      throw new Error('Domain not initialized')
    }

    try {
      setIsProcessing(true)

      const response = await fetch(`/api/company-intelligence/phases/${phase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include auth cookies
        body: JSON.stringify({
          domain,  // Only send domain, server handles session
          ...params
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `${phase} phase failed`)
      }

      const result = await response.json()

      // Store sessionId reference if returned
      if (result.sessionId && !sessionId) {
        setSessionId(result.sessionId)
      }

      permanentLogger.info('PHASE_STATE', 'Phase executed successfully', {
        phase,
        domain,
        sessionId: result.sessionId
      })

      return result

    } catch (error) {
      permanentLogger.captureError('PHASE_STATE', error as Error, { phase, domain })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [domain, sessionId])

  /**
   * Update processing state with logging
   */
  const updateProcessingState = useCallback((processing: boolean, context?: string) => {
    permanentLogger.info('Updating processing state', {
      category: 'PHASE_STATE',
      processing,
      context,
      previousState: isProcessing
    })
    
    setIsProcessing(processing)
  }, [isProcessing])

  /**
   * Get data history for debugging
   */
  const getDataHistory = useCallback(() => {
    return [...dataHistory.current]
  }, [])

  /**
   * Check if stage has data
   */
  const hasStageData = useCallback((stage: Stage): boolean => {
    const hasData = !!stageData[stage]
    
    permanentLogger.info('Checking stage data existence', {
      category: 'PHASE_STATE',
      stage,
      hasData
    })
    
    return hasData
  }, [stageData])

  /**
   * Get all stages with data
   */
  const getStagesWithData = useCallback((): Stage[] => {
    const stages = Object.keys(stageData).filter(stage => stageData[stage]) as Stage[]
    
    permanentLogger.info('Getting stages with data', {
      category: 'PHASE_STATE',
      stages,
      count: stages.length
    })
    
    return stages
  }, [stageData])

  return {
    // Domain management
    domain,
    initializeDomain,
    fetchSession,  // Fetch session from server
    sessionId,  // Reference only, not for management

    // Stage data
    stageData,
    setStageDataForStage,
    getStageData,
    clearStageData,
    clearAllStageData,
    hasStageData,
    getStagesWithData,

    // Processing state
    isProcessing,
    setIsProcessing: updateProcessingState,

    // Phase execution
    executePhase,

    // Utilities
    getDataHistory
  }
}